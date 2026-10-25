import { config } from '../config.js';

/**
 * Thin Telegram Bot API client shared by the morning digest and the bot.
 * Every call goes through one place so the token, base URL and error shape
 * stay consistent.
 */

export class TelegramError extends Error {
  constructor(message, statusCode = 502, description = '') {
    super(message);
    this.name = 'TelegramError';
    this.statusCode = statusCode;
    this.description = description;
  }
}

export const telegramReady = () => Boolean(config.digest.telegram.botToken);

const endpoint = (method) => {
  const { botToken, apiBase } = config.digest.telegram;
  if (!botToken) throw new TelegramError('TELEGRAM_BOT_TOKEN is not set', 400);
  return `${apiBase}/bot${botToken}/${method}`;
};

/** JSON call. timeoutMs must exceed any long-poll timeout passed in body. */
export async function tg(method, body = {}, { timeoutMs = 20_000 } = {}) {
  const res = await fetch(endpoint(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new TelegramError(`Telegram ${method} failed: ${data.description || res.status}`, 502, data.description || '');
  }
  return data.result;
}

/** Upload a generated file (resume markdown, WIN deck, …) as a document. */
export async function tgDocument(chatId, { filename, content, mime = 'application/octet-stream', caption }) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', caption.slice(0, 1000));
  form.append('document', new Blob([content], { type: mime }), filename);
  const res = await fetch(endpoint('sendDocument'), {
    method: 'POST', body: form, signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new TelegramError(`Telegram sendDocument failed: ${data.description || res.status}`);
  return data.result;
}

const TG_LIMIT = 4000;

/** Split long text on paragraph, then line, boundaries. */
export function splitMessage(text, limit = TG_LIMIT) {
  if (text.length <= limit) return [text];
  const parts = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n\n', limit);
    if (cut < limit / 2) cut = rest.lastIndexOf('\n', limit);
    if (cut < limit / 2) cut = limit;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, '');
  }
  if (rest) parts.push(rest);
  return parts;
}

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The model writes light markdown; Telegram's HTML mode is the subset that is
 * hard to break. Everything is escaped first, then bold / italic / code /
 * links / headings / bullets are converted.
 */
export function markdownToTelegramHtml(md) {
  const codeBlocks = [];
  let text = String(md || '').replace(/```[a-z]*\n?([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(code);
    return `\u0000${codeBlocks.length - 1}\u0000`;
  });
  text = escHtml(text)
    .replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/__(.+?)__/g, '<b>$1</b>')
    .replace(/(^|[\s(])\*(?!\s)([^*\n]+?)\*(?=[\s).,!?:;]|$)/g, '$1<i>$2</i>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => `<a href="${url.replace(/"/g, '&quot;')}">${label}</a>`)
    .replace(/^\s*[-*]\s+/gm, '• ');
  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => `<pre>${escHtml(codeBlocks[Number(i)])}</pre>`);
}

/**
 * Send model-written markdown. If Telegram rejects the HTML (an unbalanced
 * tag the converter missed), resend the same chunk as plain text rather
 * than dropping the reply.
 */
export async function sendMarkdown(chatId, markdown, extra = {}) {
  for (const chunk of splitMessage(String(markdown || '').trim() || '…')) {
    try {
      await tg('sendMessage', {
        chat_id: chatId, text: markdownToTelegramHtml(chunk), parse_mode: 'HTML',
        disable_web_page_preview: true, ...extra,
      });
    } catch (err) {
      if (!/parse|entit|tag/i.test(err.description || err.message)) throw err;
      await tg('sendMessage', { chat_id: chatId, text: chunk, disable_web_page_preview: true, ...extra });
    }
  }
}
