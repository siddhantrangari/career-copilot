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
  // Sunday 19:00 local: the weekly review, once.
  const weekly = async () => {
    try {
      const { weeklyReviewDue, sendWeeklyReview } = await import('./weekly-review.js');
      if (!(await weeklyReviewDue())) return;
      await sendWeeklyReview({ trigger: 'scheduled' });
      log.info('[weekly-review] sent');
    } catch (err) {
      log.error(`[weekly-review] failed: ${err.message}`);
    }
  };
  setTimeout(() => { check(); weekly(); }, 90_000);
  digestTimer = setInterval(() => { check(); weekly(); }, 5 * 60_000);
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

  const indiaIntervalMs = config.india.intervalHours * 3600_000;
  const indiaTick = async () => {
    if (!config.india.enabled) return;
    try {
      if (!(await dueForRun(indiaIntervalMs, 'india-discovery'))) return;
      const { runIndiaDiscovery } = await import('./india-sources.js');
      log.info('[agent] India discovery starting');
      const res = await runIndiaDiscovery({ trigger: 'scheduled' });
      log.info(`[agent] India discovery done — ${res.jobsNew} new, ${res.jobsSeen} relevant, ${res.errors.length} errors`);
    } catch (err) {
      log.error(`[agent] India discovery failed: ${err.message}`);
    }
  };

  // Fill in "why this company / role" lines for anything new. Cheap model,
  // small batches; only rows without a line are touched.
  let whyBusy = false;
  const whyTick = async () => {
    if (whyBusy) return;
    whyBusy = true;
    try {
      const { generateWhyLines, whyBacklog } = await import('./why.js');
      const backlog = await whyBacklog();
      if (!backlog.roles && !backlog.companies) return;
      const res = await generateWhyLines({ maxJobs: 150, maxCompanies: 50 });
      log.info(`[agent] why-lines — ${res.roles} roles, ${res.companies} companies, ${res.skipped} skipped`);
    } catch (err) {
      log.error(`[agent] why-lines failed: ${err.message}`);
    } finally {
      whyBusy = false;
    }
  };

  // Google Jobs: once a day after 07:15 local time, ahead of the 08:00 digest.
  const googleTick = async () => {
    try {
      const { googleJobsReady, runGoogleJobs } = await import('./google-jobs.js');
      if (!googleJobsReady()) return;
      const { localDate, localMinutes } = await import('./digest.js');
      const { hour, minute } = config.googleJobs;
      if (localMinutes() < hour * 60 + minute) return;
      const done = await one(
        `SELECT 1 FROM agent_runs WHERE kind = 'google-jobs' AND trigger = 'scheduled' AND status = 'done'
           AND (started_at AT TIME ZONE $1)::date = $2::date`,
        [config.digest.timeZone, localDate()],
      );
      if (done) return;
      log.info('[agent] Google Jobs starting');
      const res = await runGoogleJobs({ trigger: 'scheduled' });
      log.info(`[agent] Google Jobs done — ${res.searches} searches (${res.billed} billed), ${res.jobsNew} new${res.blocked ? `, stopped at ${res.blocked} cap` : ''}`);
    } catch (err) {
      log.error(`[agent] Google Jobs failed: ${err.message}`);
    }
  };

  // Targets: free signals and tags daily after 06:45 local; Mondays also
  // refresh researched hiring signals (paid, capped by researchPerWeek).
  const targetsTick = async () => {
    try {
      const { localDate, localMinutes } = await import('./digest.js');
      if (localMinutes() < 6 * 60 + 45) return;
      const done = await one(
        `SELECT 1 FROM agent_runs WHERE kind = 'targets' AND trigger = 'scheduled' AND status = 'done'
           AND (started_at AT TIME ZONE $1)::date = $2::date`,
        [config.digest.timeZone, localDate()],
      );
      if (done) return;
      const monday = new Intl.DateTimeFormat('en-GB', { timeZone: config.digest.timeZone, weekday: 'short' }).format(new Date()) === 'Mon';
      const { refreshTargets } = await import('./targets.js');
      const res = await refreshTargets({ trigger: 'scheduled', research: monday });
      log.info(`[agent] targets — ${res.apply} apply, ${res.outreach} outreach, ${res.priority} priority, ${res.researched} researched`);
    } catch (err) {
      log.error(`[agent] targets failed: ${err.message}`);
    }
  };

  // A short delay on boot keeps startup fast and avoids a thundering restart.
  setTimeout(tick, 60_000);
  setTimeout(targetsTick, 200_000);
  setTimeout(googleTick, 150_000);
  setTimeout(whyTick, 240_000);
  setTimeout(gigTick, 120_000);
  setTimeout(indiaTick, 180_000);
  timer = setInterval(() => { tick(); gigTick(); indiaTick(); whyTick(); googleTick(); targetsTick(); }, 30 * 60_000); // dueForRun gates each
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
