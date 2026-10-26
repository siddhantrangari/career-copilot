import { many, one, query } from '../db/pool.js';
import { config } from '../config.js';

/**
 * AI quality and cost, by the model that wrote each resume.
 *
 * Every tailored / refined / improved resume is a finished task with its
 * match score and fact-check result; the usage log has the model and cost of
 * each call made while it ran. Put together, that compares the current
 * cheap writer with the Sonnet baseline on what matters — does it pass the
 * fact-check, does it match the JD, what does a resume cost — and turns the
 * numbers into what to do (raise the gateway cap, move tailoring to a
 * stronger model, find what is driving spend).
 */

const BASELINE = 'anthropic/claude-sonnet-4-6';
const STRONGER = 'anthropic/claude-sonnet-5.5';
const MIN_SAMPLE = 5;

/** Per writer model: resumes, average match, fact-check pass rate, corrections, words, cost per resume. */
export async function resumeQuality({ days = 30 } = {}) {
  return many(
    `WITH j AS (
       SELECT id, kind, started_at, finished_at, result FROM ai_jobs
       WHERE kind IN ('tailor-resume', 'refine-resume', 'improve-resume') AND status = 'done'
         AND started_at IS NOT NULL AND finished_at > now() - make_interval(days => $1)
     ), w AS (
       SELECT j.*,
         COALESCE((SELECT r.model FROM ai_runs r WHERE r.ok AND r.kind IN ('tailor-resume', 'refine-resume')
                     AND r.created_at BETWEEN j.started_at AND j.finished_at + interval '2 seconds'
                   ORDER BY r.created_at LIMIT 1), 'unknown') AS writer,
         (SELECT COALESCE(sum(r.cost_usd), 0) FROM ai_runs r
           WHERE r.created_at BETWEEN j.started_at AND j.finished_at + interval '2 seconds')::float AS cost,
         -- The fixed scorer's score: from resume_scores, else the task's own when the scorer wrote it.
         COALESCE((SELECT s.score FROM resume_scores s WHERE s.job_id = j.id)::float,
                  CASE WHEN j.result->'resume' ? 'scoredBy' THEN NULLIF(j.result->'resume'->>'matchScore', '')::float END) AS match,
         j.result->'resume'->'verification'->>'safeToSend' AS safe,
         COALESCE(NULLIF(j.result->'resume'->'verification'->>'autoCorrected', '')::int, 0) AS corrected,
         array_length(regexp_split_to_array(trim(COALESCE(j.result->'resume'->>'tailoredResumeText', '')), '\\s+'), 1) AS words
       FROM j
     )
     SELECT regexp_replace(writer, '^(openai|anthropic|google)/', '') AS model, writer, count(*)::int AS resumes,
            round(avg(match))::int AS avg_match,
            round(100.0 * avg(CASE safe WHEN 'true' THEN 1 WHEN 'false' THEN 0 END))::int AS pass_pct,
            round(100.0 * avg(CASE WHEN corrected > 0 THEN 1 ELSE 0 END))::int AS corrected_pct,
            round(avg(words))::int AS avg_words,
            round(avg(cost)::numeric, 4)::float AS cost_per_resume
     FROM w GROUP BY writer ORDER BY max(finished_at) DESC`,
    [days],
  );
}

/**
 * Score finished resume tasks that have no fixed-scorer score yet (older
 * ones were self-scored by their writer). Cheap: one small call each.
 */
export async function backfillScores({ limit = 60 } = {}) {
  const { atsScore } = await import('./tasks.js');
  const rows = await many(
    `SELECT j.id, j.company_id, j.result->'resume'->>'tailoredResumeText' AS text,
            COALESCE((SELECT NULLIF(v.job_description, '') FROM resume_versions v WHERE v.id::text = j.result->>'id'), j.input->>'jobDescription') AS jd
     FROM ai_jobs j
     WHERE j.kind IN ('tailor-resume', 'refine-resume', 'improve-resume') AND j.status = 'done'
       AND NOT (j.result->'resume' ? 'scoredBy') AND NOT EXISTS (SELECT 1 FROM resume_scores s WHERE s.job_id = j.id)
     ORDER BY j.finished_at DESC LIMIT $1`, [limit]);
  let scored = 0;
  for (const r of rows) {
    if (!r.text || !r.jd || /^https?:\/\//.test(r.jd.trim())) continue;
    const s = await atsScore(r.text, r.jd, { companyId: r.company_id, input: { backfill: r.id } });
    if (!s) continue;
    await query(`INSERT INTO resume_scores (job_id, score, scorer) VALUES ($1, $2, $3) ON CONFLICT (job_id) DO NOTHING`, [r.id, s.score, config.ai.scorerModel]);
    scored += 1;
  }
  return { candidates: rows.length, scored };
}

/** Spend and health of the AI calls themselves. */
export async function aiHealth() {
  return one(
    `SELECT
       COALESCE(sum(cost_usd) FILTER (WHERE created_at > now() - interval '24 hours'), 0)::float AS spend_24h,
       COALESCE(sum(cost_usd) FILTER (WHERE created_at > now() - interval '7 days'), 0)::float / 7 AS daily_avg_7d,
       COALESCE(sum(cost_usd) FILTER (WHERE created_at >= date_trunc('month', now())), 0)::float AS month_to_date,
       count(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS calls_24h,
       count(*) FILTER (WHERE created_at > now() - interval '24 hours' AND NOT ok)::int AS failed_24h,
       -- Only errors after that provider's last success count: a cap raised or a top-up clears the alert.
       count(*) FILTER (WHERE created_at > now() - interval '24 hours' AND NOT ok AND error ~* 'spend.?limit|spend cap'
         AND created_at > COALESCE((SELECT max(created_at) FROM ai_runs WHERE ok AND model ~ '/'), 'epoch'))::int AS capped_24h,
       count(*) FILTER (WHERE created_at > now() - interval '24 hours' AND NOT ok AND error ~* 'insufficient_quota|credit_balance|no credits'
         AND created_at > COALESCE((SELECT max(created_at) FROM ai_runs WHERE ok AND model !~ '/'), 'epoch'))::int AS openai_dry_24h,
       count(*) FILTER (WHERE created_at > now() - interval '24 hours' AND ok AND model !~ '/')::int AS fallback_24h,
       (SELECT kind FROM ai_runs WHERE created_at > now() - interval '7 days' GROUP BY kind ORDER BY sum(cost_usd) DESC LIMIT 1) AS top_kind,
       (SELECT sum(cost_usd)::float FROM ai_runs WHERE created_at > now() - interval '7 days'
          GROUP BY kind ORDER BY sum(cost_usd) DESC LIMIT 1) AS top_kind_cost
     FROM ai_runs`,
  );
}

/** What to do, from the numbers. Each item: { level: 'act' | 'watch' | 'ok', text }. */
export function recommend(quality, health) {
  const out = [];
  const writer = config.ai.tailorModel || config.ai.mesh.model;
  const current = quality.find((q) => q.writer === writer) || quality.find((q) => q.writer !== BASELINE && q.writer !== 'unknown');
  const base = quality.find((q) => q.writer === BASELINE);

  if (health.capped_24h) {
    out.push({ level: 'act', text: `Gateway spend cap hit ${health.capped_24h}× in 24h — raise it on the key. Until then everything runs on the OpenAI fallback (GPT-5.6 Luna).` });
  } else if (health.fallback_24h > 0.3 * Math.max(1, health.calls_24h)) {
    out.push({ level: 'watch', text: `${health.fallback_24h} of ${health.calls_24h} calls in 24h went to the OpenAI fallback — the gateway may be failing.` });
  }
  if (health.openai_dry_24h) out.push({ level: 'act', text: 'OpenAI fallback is out of credits — top it up, or an outage on the gateway stops everything.' });
  if (health.calls_24h >= 10 && health.failed_24h / health.calls_24h > 0.1) {
    out.push({ level: 'watch', text: `${health.failed_24h} of ${health.calls_24h} AI calls failed in 24h.` });
  }

  if (current && current.resumes >= MIN_SAMPLE && base) {
    const lowerPass = current.pass_pct != null && base.pass_pct != null && current.pass_pct < base.pass_pct - 15;
    const lowerMatch = current.avg_match != null && base.avg_match != null && current.avg_match < base.avg_match - 5;
    if (lowerPass || lowerMatch || (current.pass_pct != null && current.pass_pct < 70)) {
      out.push({ level: 'act', text: `${current.model} resumes ${lowerPass || current.pass_pct < 70 ? `pass the fact-check ${current.pass_pct}% (Sonnet ${base.pass_pct}%)` : ''}${lowerPass && lowerMatch ? ' and ' : ''}${lowerMatch ? `match ${current.avg_match} (Sonnet ${base.avg_match})` : ''} — move tailoring to Sonnet 5.5: set TAILOR_MODEL=${STRONGER} (about $0.10/resume instead of $${current.cost_per_resume}).` });
    } else {
      out.push({ level: 'ok', text: `${current.model} is holding up: ${current.resumes} resumes, match ${current.avg_match} vs Sonnet ${base.avg_match}, fact-check ${current.pass_pct}% vs ${base.pass_pct}%, $${current.cost_per_resume}/resume vs $${base.cost_per_resume}.` });
    }
  } else {
    const name = writer.replace(/^(openai|anthropic|google)\//, '');
    out.push({ level: 'watch', text: `${name}: ${current?.resumes || 0} of ${MIN_SAMPLE} resumes so far — the comparison with Sonnet (ATS ${base?.avg_match ?? '–'}, fact-check ${base?.pass_pct ?? '–'}%, $${base?.cost_per_resume ?? '–'}/resume) starts at ${MIN_SAMPLE}.` });
  }

  const budget = config.ai.monthlyBudget;
  const dayOfMonth = new Date().getDate();
  const pace = health.month_to_date / Math.max(1, dayOfMonth) * 30;
  if (budget && pace > budget) {
    out.push({ level: 'act', text: `On pace for $${pace.toFixed(0)} this month against the $${budget} cap ($${health.month_to_date.toFixed(2)} so far) — the gateway will stop before month-end. Biggest cost: ${health.top_kind}.` });
  } else if (health.daily_avg_7d > 1) {
    out.push({ level: 'watch', text: `Spending $${health.daily_avg_7d.toFixed(2)}/day (7-day average); biggest: ${health.top_kind} ($${(health.top_kind_cost || 0).toFixed(2)} this week).` });
  }
  return out;
}

/** Everything, for the digest, weekly review and the bot. */
export async function aiReport({ days = 30 } = {}) {
  const [quality, health] = await Promise.all([resumeQuality({ days }), aiHealth()]);
  return {
    writer: config.ai.tailorModel || config.ai.mesh.model,
    verifier: config.ai.verifyModel, monthlyBudget: config.ai.monthlyBudget,
    fallback: config.ai.openai.model,
    quality, health, recommendations: recommend(quality, health),
  };
}
