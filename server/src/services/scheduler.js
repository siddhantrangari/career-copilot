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

export function startScheduler(log) {
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
  timer = null;
}
