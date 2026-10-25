import { many, one, query } from '../db/pool.js';
import { config } from '../config.js';
import { chatWithTools } from './ai.js';
import { tg, tgDocument, sendMarkdown, telegramReady } from './telegram.js';
import { toolSchemas, runTool, documentFiles } from './bot-tools.js';
import { getJob } from './jobs.js';

/**
 * Telegram assistant — the whole app, from a chat.
 *
 * Long polling rather than a webhook: no nginx or Cloudflare route to keep,
 * it works the same locally, and a single-user bot needs nothing more. It
 * answers TELEGRAM_CHAT_ID only; every other chat is ignored.
 *
 * Each message runs a short tool loop: the model reads or changes data
 * through bot-tools.js, then replies. Long AI work (research, resumes, WIN
 * docs) is started as a background job and watched here; when it finishes
 * the result is summarised and any document is attached.
 */

let running = false;
let log = console;
let queue = Promise.resolve();

const myChat = () => String(config.digest.telegram.chatId || '');
const MAX_TOOL_CONTENT = 4000;

// ── Keeping requests small and replies grounded ───────────────────────

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;
const istFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: config.digest.timeZone, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/**
 * Tool output as the model sees it: empty fields dropped, and timestamps
 * already in IST so the model never does time-zone arithmetic (a common
 * source of wrong interview times).
 */
export function compactForModel(value) {
  if (Array.isArray(value)) return value.map(compactForModel).filter((v) => v !== undefined);
  if (value instanceof Date) return `${istFmt.format(value)} IST`;
  if (typeof value === 'string') return ISO.test(value) ? `${istFmt.format(new Date(value))} IST` : value;
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const c = compactForModel(v);
      if (c === undefined || c === null || c === '' || c === false) continue;
      if (Array.isArray(c) && !c.length) continue;
      if (typeof c === 'object' && !Array.isArray(c) && !Object.keys(c).length) continue;
      out[k] = c;
    }
    return out;
  }
  return value;
}

const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;
const tidy = (u) => u.replace(/&amp;/g, '&').replace(/[.,;:!?]+$/, '');
export const linksIn = (text) => (String(text || '').match(URL_RE) || []).map(tidy);

/**
 * Last line of defence against invented links: any URL that never appeared in
 * his data is removed before the reply is sent. A markdown link keeps its
 * label; a bare URL becomes a note.
 */
export function guardLinks(text, allowed) {
  const ok = (u) => allowed.has(tidy(u)) || [...allowed].some((a) => a.length > 20 && tidy(u).startsWith(a));
  let removed = 0;
  let out = text.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (m, label, url) => {
    if (ok(url)) return m;
    removed += 1;
    return label;
  });
  out = out.replace(URL_RE, (url) => {
    if (ok(url)) return url;
    removed += 1;
    return '(link not in your data)';
  });
  if (removed) log.warn(`[bot] removed ${removed} link(s) not found in tool results`);
  return out;
}

// ── Persistence ───────────────────────────────────────────────────────

async function getOffset() {
  const row = await one(`SELECT value FROM bot_state WHERE key = 'telegram_offset'`);
  return Number(row?.value) || 0;
}

async function setOffset(offset) {
  await query(
    `INSERT INTO bot_state (key, value) VALUES ('telegram_offset', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(offset)],
  );
}

async function remember(chatId, { role, content = null, toolCalls = null, toolCallId = null }) {
  await query(
    `INSERT INTO bot_messages (chat_id, role, content, tool_calls, tool_call_id) VALUES ($1, $2, $3, $4, $5)`,
    [chatId, role, content, toolCalls ? JSON.stringify(toolCalls) : null, toolCallId],
  );
}

/**
 * Earlier turns since the last /new, as text only: what he said and what the
 * assistant answered. Tool calls and raw tool output from earlier turns are
 * not replayed — they were the bulk of every request and went stale anyway;
 * the model re-reads current data with a tool when it needs a detail. The
 * current turn's tool exchange is added live in converse().
 */
async function history(chatId) {
  const rows = (await many(
    `SELECT role, content FROM bot_messages
     WHERE chat_id = $1 AND role IN ('user', 'assistant') AND tool_calls IS NULL AND content IS NOT NULL
       AND id > COALESCE((SELECT max(id) FROM bot_messages WHERE chat_id = $1 AND role = 'reset'), 0)
     ORDER BY id DESC LIMIT $2`,
    [chatId, config.bot.historyMessages],
  )).reverse();
  while (rows.length && rows[0].role !== 'user') rows.shift();
  return rows.map((r) => ({ role: r.role, content: r.content }));
}

// ── The assistant ─────────────────────────────────────────────────────

/**
 * The fixed part of every request. It must not change between calls — no
 * clock, no counts — because the provider caches a stable prefix (system
 * prompt + tool definitions) and bills cached input at a tenth of the price.
 * The current time goes in a separate note just before the latest message.
 */
const SYSTEM_PROMPT = `You are Career Copilot, Siddhant Rangari's personal job-search assistant in Telegram. You operate his Career Copilot app through tools: pipeline (companies, roles, stages, contacts, notes, outreach log), discovered jobs and freelance gigs, documents (tailored resumes, WIN docs, interview prep, mock interview reports), the morning digest, and background AI tasks.

Grounding — the most important rule:
- Every fact about his pipeline, companies, people, jobs, dates, numbers and links must come from a tool result. If a tool did not return it, you do not know it: say it is not in Career Copilot and offer the tool that would get it.
- Facts about a company (what it does, news, challenges, culture) come only from its research in get_company. If research is empty, say so and offer to run research. Never answer from general knowledge.
- Do not write outreach messages, emails, cover letters, resume text or LinkedIn posts yourself. Offer the matching AI task (outreach_messages, cold_email, cover_letter, tailor_resume, linkedin_post): it uses his real achievement bank and research.
- Never put a link in a reply unless it appeared in a tool result.
- You may refer back to items you listed earlier, but call the tool again before quoting details you did not show, and before changing data.

Spending: research, WIN doc and interview prep run paid web searches. Start an AI task only when he asks for it or agrees to your offer.

His playbook (use it instead of generic advice):
- Research a company before any outreach; the outreach generator uses that research.
- LinkedIn DM with no reply: one follow-up on day 4, with something new.
- Application quiet for 7 days: nudge the recruiter or ask a contact there for a referral.
- After a call where problems were confirmed: WIN doc with those problems.
- Before an interview: interview prep, then a mock in the web app.

How to reply:
- Do what he asks straight away, chaining tools as needed. After a change, state exactly what changed (before → after).
- You cannot delete anything. For a delete request, point to the web app (${config.digest.appUrl}) and offer the soft option: stage "failed" (closed), or mark a job "not for me".
- AI tasks run in the background: say it started and the result will arrive here. Do not poll.
- If a company, role or contact is ambiguous, ask one short question.
- Phone-sized: short, bullets, **bold** for key items, links as [Apply](url) / [Open](url) rather than bare URLs. Label opinions as suggestions. No tables, no preamble, no sign-off.

Pipeline stages: new, interested, applied, networking, call, win (WIN doc sent), interview, offer, failed (closed). Times are IST unless he says otherwise.`;

function nowNote() {
  const now = new Intl.DateTimeFormat('en-IN', {
    timeZone: config.digest.timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date());
  return { role: 'system', content: `Current time: ${now} IST.` };
}

/** Keep Telegram's "typing…" indicator alive while a turn runs. */
function typing(chatId) {
  const ping = () => tg('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});
  ping();
  const t = setInterval(ping, 4500);
  return () => clearInterval(t);
}

const DOC_FOR_TASK = {
  'tailor-resume': 'resume', 'generate-win-doc': 'win_doc', 'interview-prep': 'interview_prep',
};

/** Send any file a tool produced, and hand the model a note instead of the bytes. */
async function deliverFile(chatId, result) {
  if (!result?.file) return result;
  const { file, ...rest } = result;
  try {
    await tgDocument(chatId, file);
    return { ...rest, file: `${file.filename} sent to the chat` };
  } catch (err) {
    return { ...rest, file: `could not send ${file.filename}: ${err.message}` };
  }
}

/** One assistant turn: tool loop until the model answers in text. */
async function converse(chatId, userContent) {
  await remember(chatId, { role: 'user', content: userContent });
  const stopTyping = typing(chatId);
  try {
    const past = await history(chatId);
    const current = past.pop(); // the message just stored
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...past, nowNote(), current];
    // Links the reply may use: ones from tool results this turn, ones already
    // in the conversation (his own pastes, earlier checked replies), the app.
    const allowedLinks = new Set([config.digest.appUrl, ...past.flatMap((m) => linksIn(m.content)), ...linksIn(current?.content)]);
    for (let round = 0; round < config.bot.maxToolRounds; round++) {
      const { message } = await chatWithTools({ messages, tools: toolSchemas, model: config.bot.model });
      const calls = message.tool_calls || [];
      if (!calls.length) {
        const text = guardLinks((message.content || '').trim() || 'Done.', allowedLinks);
        await remember(chatId, { role: 'assistant', content: text });
        await sendMarkdown(chatId, text);
        return;
      }

      messages.push({ role: 'assistant', content: message.content || null, tool_calls: calls });
      await remember(chatId, { role: 'assistant', content: message.content || null, toolCalls: calls });

      for (const call of calls) {
        let result = await runTool(call.function?.name, call.function?.arguments);
        result = await deliverFile(chatId, result);
        if (result?.taskId) watchTask(chatId, result.taskId);
        let content = JSON.stringify(compactForModel(result));
        linksIn(content).forEach((u) => allowedLinks.add(u));
        if (content.length > MAX_TOOL_CONTENT) content = `${content.slice(0, MAX_TOOL_CONTENT)}… [truncated]`;
        messages.push({ role: 'tool', tool_call_id: call.id, content });
        await remember(chatId, { role: 'tool', content, toolCallId: call.id });
      }
    }
    const text = 'That took more steps than I allow in one go. Tell me which part to do first.';
    await remember(chatId, { role: 'assistant', content: text });
    await sendMarkdown(chatId, text);
  } finally {
    stopTyping();
  }
}

// ── Background task delivery ──────────────────────────────────────────

/** Drop bulky text before handing a task result to the model to summarise. */
function compactResult(value, depth = 0) {
  if (typeof value === 'string') return value.length > 700 ? `${value.slice(0, 700)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 8).map((v) => compactResult(v, depth + 1));
  if (value && typeof value === 'object') {
    if (depth > 4) return '[…]';
    return Object.fromEntries(Object.entries(value)
      .filter(([k]) => !['tailoredResumeText', 'markdown', 'sources', 'findings', 'steps'].includes(k))
      .map(([k, v]) => [k, compactResult(v, depth + 1)]));
  }
  return value;
}

function longestString(value) {
  let best = '';
  const walk = (v) => {
    if (typeof v === 'string') { if (v.length > best.length) best = v; } else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(value);
  return best;
}

function watchTask(chatId, taskId) {
  const started = Date.now();
  const poll = async () => {
    const job = await getJob(taskId).catch(() => null);
    if (job && ['done', 'error'].includes(job.status)) {
      enqueue(() => finishTask(chatId, job));
      return;
    }
    if (Date.now() - started > 25 * 60_000) {
      enqueue(() => sendMarkdown(chatId, `Task ${taskId} is still running after 25 minutes — check it in the web app.`));
      return;
    }
    setTimeout(poll, 8000);
  };
  setTimeout(poll, 8000);
}

async function finishTask(chatId, job) {
  const company = job.result?.companyName || job.result?.companyId || job.company_id || '';
  if (job.status === 'error') {
    await converse(chatId, `[Background task update — not typed by Siddhant] The ${job.kind} task${company ? ` for ${company}` : ''} failed: ${job.error}. Tell him briefly and suggest what to do.`);
    return;
  }
  // Attach the document itself where there is one.
  const docType = DOC_FOR_TASK[job.kind];
  if (docType && job.result?.id) {
    for (const file of await documentFiles(docType, job.result.id).catch(() => [])) {
      await tgDocument(chatId, file).catch((err) => log.error(`[bot] attach failed: ${err.message}`));
    }
  } else if (job.kind === 'cover-letter') {
    const letter = longestString(job.result?.coverLetter);
    if (letter) {
      await tgDocument(chatId, {
        filename: `cover-letter-${String(job.result.companyName || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`,
        content: letter, mime: 'text/markdown', caption: 'Cover letter',
      }).catch(() => {});
    }
  }
  const summary = JSON.stringify(compactResult(job.result)).slice(0, 7000);
  await converse(chatId, `[Background task update — not typed by Siddhant] The ${job.kind} task${company ? ` for ${company}` : ''} finished${docType || job.kind === 'cover-letter' ? ' and the document has been attached above' : ''}. Result: ${summary}\nSummarise what matters for him in a few lines (for a LinkedIn post or outreach messages, give the full text he can copy).`);
}

// ── Telegram plumbing ─────────────────────────────────────────────────

function enqueue(fn) {
  queue = queue.then(fn).catch((err) => log.error(`[bot] ${err.stack || err.message}`));
  return queue;
}

const HELP = `**Career Copilot on Telegram**
Ask in plain words — for example:
• what's in my pipeline? / what's due today?
• tell me about Adyen
• new AI engineer jobs in Europe this week
• moved Walmart to interview, it's Wed 3:30pm
• add Priya Shah, EM at Remote, DM sent
• research Cohere / tailor my resume for the Alan role
• send me my Adyen WIN doc as slides

/new — start a fresh conversation
/digest — send today's digest now
Deleting is only possible in the web app.`;

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg?.chat) return;
  const chatId = msg.chat.id;
  if (String(chatId) !== myChat()) {
    log.warn(`[bot] ignored message from chat ${chatId} (not TELEGRAM_CHAT_ID)`);
    return;
  }
  const text = (msg.text || msg.caption || '').trim();
  if (!text) {
    await sendMarkdown(chatId, 'I can read text for now — voice notes, photos and files are not supported yet.');
    return;
  }
  if (/^\/(start|help)\b/.test(text)) { await sendMarkdown(chatId, HELP); return; }
  if (/^\/new\b/.test(text)) {
    await remember(chatId, { role: 'reset' });
    await sendMarkdown(chatId, 'Fresh start — earlier messages are kept but no longer used as context.');
    return;
  }
  if (/^\/digest\b/.test(text)) {
    const res = await runTool('send_digest_now', {});
    if (res.error) await sendMarkdown(chatId, `Digest failed: ${res.error}`);
    return;
  }
  try {
    await converse(chatId, text);
  } catch (err) {
    log.error(`[bot] turn failed: ${err.message}`);
    await sendMarkdown(chatId, `Sorry — that failed: ${err.message.slice(0, 300)}`).catch(() => {});
  }
}

async function pollLoop() {
  let offset = await getOffset();
  while (running) {
    try {
      const updates = await tg('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] }, { timeoutMs: 65_000 });
      for (const u of updates || []) {
        offset = u.update_id + 1;
        await setOffset(offset);
        enqueue(() => handleUpdate(u));
      }
    } catch (err) {
      if (!running) break;
      // 409 = another getUpdates consumer (a second server with the same token).
      const conflict = /409|terminated by other getUpdates/i.test(err.message);
      log.error(`[bot] polling error: ${err.message}`);
      await new Promise((r) => setTimeout(r, conflict ? 30_000 : 5000));
    }
  }
}

export function startBot(logger) {
  log = logger || console;
  if (!config.bot.enabled) { log.info('[bot] disabled (BOT_ENABLED=false)'); return; }
  if (!telegramReady() || !myChat()) { log.info('[bot] waiting for TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID'); return; }
  if (running) return;
  running = true;
  log.info(`[bot] listening on Telegram (model ${config.bot.model})`);
  pollLoop().catch((err) => log.error(`[bot] stopped: ${err.message}`));
}

export function stopBot() { running = false; }
