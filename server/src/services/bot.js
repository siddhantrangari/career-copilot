import { many, one, query } from '../db/pool.js';
import { config } from '../config.js';
import { chatWithTools } from './ai.js';
import { tg, tgDocument, sendMarkdown, telegramReady } from './telegram.js';
import { toolSchemas, runTool, documentFiles } from './bot-tools.js';
import { getJob } from './jobs.js';
import { jobActionsMessage, parseJobAction, jobForAction } from './job-actions.js';
import { companyPeopleLinks } from './search-links.js';

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
- Facts about a company (what it does, news, challenges, culture) come only from its research in get_company. If research is empty, say so and offer to run research.
- General questions (how to answer an interview question, what a recruiter means, salary norms, how to phrase something, career advice) — answer them directly from your own knowledge, labelled as advice. Facts about HIS data still come only from tools.
- Short copy he needs now — an application-form answer, a "message to the hiring team", a reply to a recruiter, a referral ask, a LinkedIn note (up to ~150 words) — write it yourself, immediately, copy-ready: his real achievements from get_profile and the role's JD from get_job (by jobId, or company + title). Use only his real experience and metrics; never invent. Follow his standing rules: Bangalore, Vertex AI (not Gemini), no personal finances.
- Long documents — tailored resume, full cover letter, WIN doc, interview prep, research, cold email sequence, LinkedIn post — run the AI task (tailor_resume, cover_letter, win_doc, interview_prep, research, cold_email, linkedin_post): it uses his whole achievement bank and fact-checks.
- Never put a link in a reply unless it appeared in a tool result.
- Jobs and companies may carry a stored why_role / whyThisCompany line (written from his profile and the JD); include it when listing them.
- You may refer back to items you listed earlier, but call the tool again before quoting details you did not show, and before changing data.

Acting on his behalf: when he asks for something, that request IS his go-ahead — do it now with the tools (an AI task he asks for starts at once with confirmedByUser true). Never answer "reply yes and I'll do it" to something he just asked for. Ask first only when it is ambiguous (which company / role), or it would close, skip or overwrite something, or it is a paid task (research, WIN doc, interview prep) he did not ask for.

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

Targeting: companies are tagged apply (a fit-75+ role is open — apply and ask for a referral), outreach (no matching role posted — reach insiders before one is) and priority (hiring hard and a best fit). For "what should I do / where to focus" use get_outreach_plan or list_targets. When he reports outreach ("sent 5 requests at Adyen", "had a call with…"), log it with log_activity (and add_contact when he names a person). "What's on today" → get_today. "What should I apply to" → get_apply_queue; "applied to X" → mark_applied. "Tailor my resume / cover letter for it" about a role from get_apply_queue or search_jobs → start_ai_task with that role's jobId (its stored JD is used); a company found by discovery is added with add_to_companies, never as a blank add_company. When he sends a job link, add_role with jobLink saves the JD. "Help me apply to X" → get_apply_pack, ask only its needsYou questions, save_apply_answers; you never submit an application — he presses Submit. "Tell me about X" → get_company_detail (offer its news/people searches as links). Follow-ups: list_followups, then act_on_followup only for what he says happened; draft_followup / draft_outreach / draft_linkedin_post when he asks for a draft. A post needs his real material: if he gives none, show the angles and ask.

ATS score under 85: when a tailored resume (or an improved one) comes back with matchScore below 85, call get_ats_gaps for it right away and send ONE message: the summary, then its questions numbered (he answers like "1 yes — used at Growlogic for AKS provisioning, 2 no"), then the rewordings as a short numbered list he can accept ("accept all" / "accept 1,3"). Then improve_resume with his answers and accepted rewordings; never add a skill he did not confirm. He can also ask "improve the ATS score for X" any time. Answers are remembered — never ask about a keyword he already answered.

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
  'tailor-resume': 'resume', 'improve-resume': 'resume', 'generate-win-doc': 'win_doc', 'interview-prep': 'interview_prep',
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
    const listed = []; // roles from job-list tools this turn, for the buttons
    for (let round = 0; round < config.bot.maxToolRounds; round++) {
      const { message } = await chatWithTools({ messages, tools: toolSchemas, model: config.bot.model });
      const calls = message.tool_calls || [];
      if (!calls.length) {
        const text = guardLinks((message.content || '').trim() || 'Done.', allowedLinks);
        await remember(chatId, { role: 'assistant', content: text });
        await sendMarkdown(chatId, text);
        await sendJobButtons(chatId, listed, text);
        return;
      }

      messages.push({ role: 'assistant', content: message.content || null, tool_calls: calls });
      await remember(chatId, { role: 'assistant', content: message.content || null, toolCalls: calls });

      for (const call of calls) {
        let result = await runTool(call.function?.name, call.function?.arguments);
        listed.push(...rolesIn(call.function?.name, result));
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

// ── Buttons under job lists ───────────────────────────────────────────

/** Roles a job-list tool returned, as { id, company, title }. */
function rolesIn(tool, result) {
  if (tool === 'get_apply_queue') return (result?.roles || []).map((r) => ({ id: r.jobId, company: r.company, title: r.title }));
  if (tool === 'search_jobs') return (result?.jobs || []).map((j) => ({ id: j.id, company: j.company, title: j.title }));
  return [];
}

/** Buttons for the roles the reply mentions (all listed, if it names none). */
async function sendJobButtons(chatId, listed, replyText) {
  if (!listed.length) return;
  const said = String(replyText || '').toLowerCase();
  const named = listed.filter((j) => said.includes(String(j.company || '').toLowerCase()) || said.includes(String(j.title || '').toLowerCase()));
  const body = jobActionsMessage(named.length ? named : listed);
  if (body) await tg('sendMessage', { chat_id: chatId, ...body }).catch((err) => log.error(`[bot] buttons failed: ${err.message}`));
}

/**
 * A button press under a job list. The press is his go-ahead: resume and
 * cover letter start right away; guided apply and people need no AI call.
 */
async function handleJobAction(chatId, { action, jobId }) {
  const job = await jobForAction(jobId);
  if (!job) { await sendMarkdown(chatId, 'That role is no longer in Career Copilot.'); return; }
  const what = `**${job.company}** — ${job.title}`;
  if (action === 'r' || action === 'l') {
    const task = action === 'r' ? 'tailor_resume' : 'cover_letter';
    const res = await runTool('start_ai_task', { task, confirmedByUser: true, company: job.company, role: job.title, jobId: job.id });
    if (res.error) { await sendMarkdown(chatId, `Could not start the ${action === 'r' ? 'tailored resume' : 'cover letter'} for ${what}: ${res.error}`); return; }
    watchTask(chatId, res.taskId);
    await remember(chatId, { role: 'assistant', content: `Started ${task} for ${job.company} — ${job.title} (button).` });
    await sendMarkdown(chatId, `${action === 'r' ? '📄 Tailoring your resume' : '✉️ Writing the cover letter'} for ${what} — it will arrive here in ~1 min.`);
    return;
  }
  if (action === 'g') {
    await converse(chatId, `[Button pressed by Siddhant] Guided apply for ${job.company} — ${job.title} (jobId ${job.id}). Run get_apply_pack and ask only its needsYou questions.`);
    return;
  }
  const links = companyPeopleLinks(job.company).filter((l) => ['hm', 'peer', 'hr'].includes(l.type) || /LinkedIn/.test(l.name));
  await sendMarkdown(chatId, [`👥 People to connect with at ${what}`, ...links.map((l) => `• [${l.name}](${l.url}) — ${l.hint}`),
    'Send connection requests, then tell me who you reached ("sent 5 at …") and I\'ll log them.'].join('\n'));
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
      if (file.link) {
        await sendMarkdown(chatId, `📄 ${file.title}: [open it in the Resume Studio](${file.link}) once to export the PDF — it will arrive here.`).catch(() => {});
        continue;
      }
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
  try {
    await converse(chatId, `[Background task update — not typed by Siddhant] The ${job.kind} task${company ? ` for ${company}` : ''} finished${docType || job.kind === 'cover-letter' ? ' and the document has been attached above' : ''}. Result: ${summary}\nSummarise what matters for him in a few lines (for a LinkedIn post or outreach messages, give the full text he can copy).`);
  } catch (err) {
    // The summary needs the model; the facts don't. Never leave a finished task unreported.
    log.error(`[bot] task summary failed: ${err.message}`);
    const text = [plainResult(job, company), aiDownNote(err)].filter(Boolean).join('\n\n');
    await remember(chatId, { role: 'assistant', content: text }).catch(() => {});
    await sendMarkdown(chatId, text).catch(() => {});
  }
}

/** A finished task's key facts, written without the model. */
function plainResult(job, company) {
  const r = job.result || {};
  const v = r.resume?.verification || r.verification || {};
  const check = v.safeToSend === false ? `⚠️ ${v.blockingCount || 0} claim(s) to review` : v.safeToSend ? '🛡️ fact-check passed' : '';
  if (job.kind === 'improve-resume') {
    return `✅ **Improved resume ready** — ${r.companyName || company} ${r.jobTitle ? `· ${r.jobTitle}` : ''}\nATS **${r.scoreBefore} → ${r.scoreAfter}**${check ? ` · ${check}` : ''}${r.remembered?.confirmed?.length ? `\nRemembered: ${r.remembered.confirmed.join(', ')}` : ''}`;
  }
  if (job.kind === 'tailor-resume') {
    return `✅ **Tailored resume ready** — ${company}\nATS match **${Math.round(r.resume?.matchScore || 0)}**${check ? ` · ${check}` : ''}`;
  }
  return `✅ The ${job.kind} task${company ? ` for ${company}` : ''} finished.`;
}

/** Out of AI credit or rate-limited: say so plainly, since every AI feature stops until it's fixed. */
function aiDownNote(err) {
  const m = String(err?.message || '');
  if (/spend.?limit|spend cap|insufficient_quota|credit_balance|no credits|402|429/i.test(m)) {
    return '⚠️ **AI credits are used up** (gateway spend cap reached and the OpenAI fallback has no credits). Replies, tailoring and other AI tasks will fail until the credits are topped up.';
  }
  return `⚠️ I couldn't write the summary: ${m.slice(0, 160)}`;
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
  const cb = update.callback_query;
  if (cb) {
    const chatId = cb.message?.chat?.id;
    await tg('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
    if (String(chatId) !== myChat()) { log.warn(`[bot] ignored button from chat ${chatId}`); return; }
    const a = parseJobAction(cb.data);
    if (!a) return;
    try {
      await handleJobAction(chatId, a);
    } catch (err) {
      log.error(`[bot] button failed: ${err.message}`);
      await sendMarkdown(chatId, `Sorry — that failed: ${err.message.slice(0, 300)}`).catch(() => {});
    }
    return;
  }
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
    await sendMarkdown(chatId, /spend.?limit|insufficient_quota|credit_balance|402|429/i.test(err.message) ? aiDownNote(err) : `Sorry — that failed: ${err.message.slice(0, 300)}`).catch(() => {});
  }
}

async function pollLoop() {
  let offset = await getOffset();
  while (running) {
    try {
      const updates = await tg('getUpdates', { offset, timeout: 50, allowed_updates: ['message', 'callback_query'] }, { timeoutMs: 65_000 });
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
