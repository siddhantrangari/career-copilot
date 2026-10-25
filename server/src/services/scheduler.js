import { one } from '../db/pool.js';
import { config } from '../config.js';

/**
 * Keeps the discovery agent running on its own.
 *
 * In-process rather than cron: single user, single server, and the agent is
 * cheap (public JSON endpoints, no AI spend). On boot it checks how long ago
 * the last successful run finished, so a restart does not skip a cycle or
 * trigger a redundant one.
 */
let timer = null;

async function dueForRun(intervalMs, kind = 'job-discovery') {
  const last = await one(
    `SELECT finished_at FROM agent_runs
     WHERE kind = $1 AND status = 'done'
     ORDER BY finished_at DESC LIMIT 1`,
    [kind],
  );
  if (!last?.finished_at) return true;
  return Date.now() - new Date(last.finished_at).getTime() >= intervalMs;
}

let digestTimer = null;

/**
 * The morning digest has its own five-minute check, independent of the
 * discovery switch. digestDue() decides — past the local send time and not
 * yet sent today — so a restart at 8:10 still delivers, and only once.
 */
function startDigest(log) {
  if (!config.digest.enabled) {
    log.info('[digest] disabled (DIGEST_ENABLED=false)');
    return;
  }
  const check = async () => {
    try {
      const { digestDue, runDigest } = await import('./digest.js');
      if (!(await digestDue())) return;
      const { counts } = await runDigest({ trigger: 'scheduled' });
      log.info(`[digest] sent — ${counts.jobs} roles, ${counts.followUps} follow-ups, ${counts.interviews} interviews`);
    } catch (err) {
      log.error(`[digest] failed: ${err.message}`);
    }
  };
  setTimeout(check, 90_000);
  digestTimer = setInterval(check, 5 * 60_000);
  const { hour, minute, timeZone, telegram } = config.digest;
  log.info(
    `[digest] daily at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${timeZone}` +
    (telegram.botToken && telegram.chatId ? '' : ' — waiting for TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID'),
  );
}

export function startScheduler(log) {
  startDigest(log);

  if (!config.discovery.enabled) {
    log.info('[agent] job discovery is disabled (DISCOVERY_ENABLED=false)');
    return;
  }

  const intervalMs = config.discovery.intervalHours * 3600_000;

  const tick = async () => {
    try {
      if (!(await dueForRun(intervalMs))) return;
      const { runDiscovery } = await import('./discovery.js');
      log.info('[agent] job discovery starting');
      const res = await runDiscovery({ trigger: 'scheduled' });
      log.info(
        `[agent] job discovery done — ${res.jobsNew} new, ${res.jobsSeen} seen ` +
        `across ${res.boardsFound}/${res.companies} boards`,
      );
    } catch (err) {
      log.error(`[agent] job discovery failed: ${err.message}`);
    }
  };

  const gigIntervalMs = config.discovery.gigIntervalHours * 3600_000;
  const gigTick = async () => {
    try {
      if (!(await dueForRun(gigIntervalMs, 'gig-discovery'))) return;
      const { runGigDiscovery } = await import('./gigs.js');
      log.info('[agent] gig discovery starting');
      const res = await runGigDiscovery({ trigger: 'scheduled' });
      log.info(`[agent] gig discovery done — ${res.added} new, ${res.seen} relevant, ${res.closed} closed`);
    } catch (err) {
      log.error(`[agent] gig discovery failed: ${err.message}`);
    }
  };

  // A short delay on boot keeps startup fast and avoids a thundering restart.
  setTimeout(tick, 60_000);
  setTimeout(gigTick, 120_000);
  timer = setInterval(() => { tick(); gigTick(); }, 30 * 60_000); // dueForRun gates each
  log.info(
    `[agent] job discovery every ${config.discovery.intervalHours}h, ` +
    `gig discovery every ${config.discovery.gigIntervalHours}h`,
  );
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  if (digestTimer) clearInterval(digestTimer);
  timer = null;
  digestTimer = null;
}
