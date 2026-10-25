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
const MAX_TOOL_CONTENT = 6000;

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
 * Recent turns since the last /new, as chat-completions messages. The window
 * is trimmed to start at a user message, and an assistant tool call whose
 * results never got stored (a crash mid-turn) is dropped, since providers
 * reject a tool call without its answer.
 */
async function history(chatId) {
  const rows = (await many(
    `SELECT role, content, tool_calls, tool_call_id FROM bot_messages
     WHERE chat_id = $1 AND id > COALESCE((SELECT max(id) FROM bot_messages WHERE chat_id = $1 AND role = 'reset'), 0)
     ORDER BY id DESC LIMIT $2`,
    [chatId, config.bot.historyMessages],
  )).reverse();
  while (rows.length && rows[0].role !== 'user') rows.shift();

  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.role === 'assistant' && r.tool_calls?.length) {
      const ids = new Set(r.tool_calls.map((c) => c.id));
      const answers = [];
      let j = i + 1;
      while (j < rows.length && rows[j].role === 'tool') { answers.push(rows[j]); j += 1; }
      if (answers.filter((a) => ids.has(a.tool_call_id)).length !== ids.size) { i = j - 1; continue; }
      out.push({ role: 'assistant', content: r.content || null, tool_calls: r.tool_calls });
      for (const a of answers) out.push({ role: 'tool', tool_call_id: a.tool_call_id, content: a.content || '' });
      i = j - 1;
    } else if (r.role === 'user' || r.role === 'assistant') {
      out.push({ role: r.role, content: r.content || '' });
    }
  }
  return out;
}

// ── The assistant ─────────────────────────────────────────────────────

function systemPrompt() {
  const now = new Intl.DateTimeFormat('en-IN', {
    timeZone: config.digest.timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date());
  return `You are Career Copilot, Siddhant Rangari's personal job-search assistant, talking to him in Telegram. You operate his Career Copilot app through tools: the pipeline (companies, roles, stages, contacts, notes, outreach log), discovered jobs and freelance gigs, documents (tailored resumes, WIN docs, interview prep guides, mock interview reports), the morning digest, and background AI tasks (company research, resume tailoring, cover letters, outreach messages, cold emails, call prep, WIN docs, interview prep, LinkedIn posts, job scans).

Now: ${now} (IST). Times he gives are IST unless he says otherwise.

How to work:
- Use tools for every fact. Never invent companies, jobs, numbers, dates, people or links. If a tool returns an error, fix the call or ask him.
- Do what he asks straight away, chaining tools as needed. After any change, say exactly what changed (before → after) in a line or two.
- You cannot delete anything. If he asks to delete or remove something, say deletions are done in the web app (${config.digest.appUrl}) and offer the soft option: move it to stage "failed" (closed), or mark a job "not for me".
- AI tasks run in the background: tell him it has started and that the result will arrive in this chat. Do not wait for it or poll it.
- If a company, role or contact is ambiguous, ask one short question.
- He reads on a phone: short and scannable, bullets, **bold** for the key items, links for jobs and documents. No tables, no preamble, no sign-off.

Pipeline stages: new, interested, applied, networking, call, win (WIN doc sent), interview, offer, failed (closed).
Web app: ${config.digest.appUrl}`;
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
    const messages = [{ role: 'system', content: systemPrompt() }, ...(await history(chatId))];
    for (let round = 0; round < config.bot.maxToolRounds; round++) {
      const { message } = await chatWithTools({ messages, tools: toolSchemas, model: config.bot.model });
      const calls = message.tool_calls || [];
      if (!calls.length) {
        const text = (message.content || '').trim() || 'Done.';
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
        let content = JSON.stringify(result);
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
