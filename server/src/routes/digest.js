import { many } from '../db/pool.js';
import { config } from '../config.js';
import {
  buildDigest, renderDigest, runDigest, telegramChats, telegramConfigured, lastRun, localDate,
} from '../services/digest.js';

export default async function digestRoutes(app) {
  app.addHook('onRequest', app.auth);

  /** Is it wired up, when does it go out, and what happened last. */
  app.get('/status', async () => {
    const { enabled, hour, minute, timeZone } = config.digest;
    return {
      enabled,
      telegram: {
        botToken: Boolean(config.digest.telegram.botToken),
        chatId: Boolean(config.digest.telegram.chatId),
      },
      sendsAt: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${timeZone}`,
      today: localDate(),
      last: await lastRun(),
      lastToday: await lastRun(localDate()),
    };
  });

  /** What would be sent right now — read-only, records nothing. */
  app.get('/preview', async () => {
    const now = new Date();
    const digest = await buildDigest(now);
    return { digest, messages: renderDigest(digest, now) };
  });

  /** Send now. Roles it includes are marked sent and will not repeat. */
  app.post('/send', async () => runDigest({ trigger: 'manual' }));

  app.get('/runs', async (request) => {
    const limit = Math.min(Number(request.query.limit) || 20, 100);
    return {
      runs: await many(
        `SELECT id, digest_date, trigger, status, counts, error, created_at
         FROM digest_runs ORDER BY created_at DESC LIMIT $1`,
        [limit],
      ),
    };
  });

  /** Chats that messaged the bot — to find TELEGRAM_CHAT_ID during setup. */
  app.get('/telegram/chats', async () => ({
    configured: telegramConfigured(),
    chats: await telegramChats(),
  }));
}
