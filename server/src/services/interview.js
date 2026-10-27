import { many, one, query } from '../db/pool.js';
import { chatJson, AiError } from './ai.js';
import { candidateBlock } from './context.js';
import { config } from '../config.js';
import { analyseSession } from './delivery.js';
import { resolveCompany } from './tasks.js';
import {
  interviewPlanPrompt,
  interviewTurnPrompt,
  interviewReportPrompt,
} from './prompts.js';

/**
 * Interview simulator.
 *
 * The value is not the questions — it is that the interviewer has read the
 * job description, the tailored resume, the grounded company research and,
 * crucially, the WIN document he sent them. The "win-defence" round has him
 * defend the architecture he proposed, to the manager who received it.
 *
 * Model split, deliberately, for cost: the plan and the final report use the
 * strong model once each; live turns use a small fast one, because they are
 * short, frequent and latency-sensitive.
 */

export const ROUNDS = ['screening', 'technical', 'manager', 'behavioural', 'win-defence', 'fde'];

const renderTranscript = (turns) =>
  turns
    .map((t) => `${t.speaker === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${t.text}`)
    .join('\n\n');

/** Most recent WIN doc and tailored resume for a company, if any exist. */
async function loadCompanyArtefacts(companyId) {
  if (!companyId) return { winDoc: null, resume: null };

  const winDoc = await one(
    `SELECT id, markdown, contact_name FROM win_docs
     WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [companyId],
  );
  const resume = await one(
    `SELECT id, tailored_text, job_description, job_title FROM resume_versions
     WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [companyId],
  );
  return { winDoc, resume };
}

// ── Start ─────────────────────────────────────────────────────────────
export async function startInterview(payload = {}) {
  const {
    companyId, companyName, roleTitle, round = 'screening',
    durationMin = 30, jobDescription, scenario,
  } = payload;

  if (!ROUNDS.includes(round)) {
    throw new AiError(`round must be one of: ${ROUNDS.join(', ')}`, 400);
  }

  const company = await resolveCompany({ companyId, companyName });
  const name = company?.name || companyName;
  if (!name) throw new AiError('companyId or companyName is required', 400);

  const { winDoc, resume } = await loadCompanyArtefacts(company?.id);

  if (round === 'win-defence' && !winDoc) {
    throw new AiError(
      'No WIN document exists for this company yet — build one first, then defend it here.',
      400,
    );
  }

  // Fall back to the JD captured during resume tailoring, so he does not have
  // to paste it twice.
  const jd = jobDescription?.trim() || resume?.job_description || '';
  const title = roleTitle || resume?.job_title || '';

  const candidate = await candidateBlock();
  const prompt = interviewPlanPrompt({
    companyName: name,
    roleTitle: title,
    round,
    durationMin,
    jobDescription: jd,
    winDoc: winDoc?.markdown,
    research: company?.research,
    // A drill from the FDE training panel: the customer situation to role-play.
    scenario: typeof scenario === 'string' ? scenario.trim().slice(0, 2000) : '',
    candidate,
  });

  const plan = await chatJson({
    kind: 'interview-plan',
    companyId: company?.id,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 10_000,
    model: config.interview.planModel || undefined,
    input: { companyName: name, round, durationMin },
  });

  const session = await one(
    `INSERT INTO interview_sessions
       (company_id, company_name, role_title, round, interviewer, plan,
        job_description, win_doc_id, resume_id, duration_min)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, company_id, company_name, role_title, round, interviewer,
               duration_min, status, started_at`,
    [
      company?.id || null, name, title, round,
      JSON.stringify(plan.interviewer || {}),
      JSON.stringify(plan),
      jd, winDoc?.id || null, resume?.id || null, durationMin,
    ],
  );

  // The plan is generated before the session row exists, so its cost lands
  // unattributed. Claim it now, or the meter under-reports every interview.
  await query(
    `UPDATE ai_runs SET session_id = $1
     WHERE id = (SELECT id FROM ai_runs
                 WHERE kind = 'interview-plan' AND session_id IS NULL
                 ORDER BY created_at DESC LIMIT 1)`,
    [session.id],
  );

  // The opening line is the interviewer's first turn.
  const opening = plan.openingLine ||
    `Hi, thanks for making the time. Shall we start with you walking me through your background?`;

  await query(
    `INSERT INTO interview_turns (session_id, position, speaker, text, question_ref)
     VALUES ($1, 0, 'interviewer', $2, 'opening')`,
    [session.id, opening],
  );

  return {
    session,
    interviewer: plan.interviewer || {},
    sections: plan.sections || [],
    questionCount: (plan.questions || []).length,
    opening,
    usedWinDoc: Boolean(winDoc),
    usedResume: Boolean(resume),
    usedResearch: Boolean(company?.research),
  };
}

// ── One turn ──────────────────────────────────────────────────────────
export async function interviewTurn(sessionId, payload = {}) {
  const { answer, answerMs, wrapUp } = payload;

  const session = await one('SELECT * FROM interview_sessions WHERE id = $1', [sessionId]);
  if (!session) throw new AiError('Interview session not found', 404);
  if (session.status !== 'active') throw new AiError('This interview has already finished', 400);

  const turns = await many(
    'SELECT speaker, text FROM interview_turns WHERE session_id = $1 ORDER BY position',
    [sessionId],
  );

  const nextPos = turns.length;

  if (answer?.trim()) {
    await query(
      `INSERT INTO interview_turns (session_id, position, speaker, text, answer_ms)
       VALUES ($1, $2, 'candidate', $3, $4)`,
      [sessionId, nextPos, answer.trim(), answerMs || null],
    );
    turns.push({ speaker: 'candidate', text: answer.trim() });
  }

  // A requested wrap-up is treated as being out of time, so the interviewer
  // closes the conversation instead of opening a new thread.
  const realElapsed = Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000);
  const elapsedMin = wrapUp ? Math.max(realElapsed, session.duration_min) : realElapsed;
  const candidate = await candidateBlock();

  const prompt = interviewTurnPrompt({
    companyName: session.company_name,
    roleTitle: session.role_title,
    round: session.round,
    interviewer: session.interviewer,
    plan: session.plan,
    transcript: renderTranscript(turns),
    elapsedMin,
    durationMin: session.duration_min,
    candidate,
  });

  const result = await chatJson({
    kind: 'interview-turn',
    companyId: session.company_id,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 1_200,
    model: config.interview.turnModel,
    sessionId,
    input: { sessionId, elapsedMin },
  });

  const say = (result.say || '').trim();
  if (!say) throw new AiError('The interviewer produced an empty turn');

  await query(
    `INSERT INTO interview_turns (session_id, position, speaker, text, question_ref)
     VALUES ($1, $2, 'interviewer', $3, $4)`,
    [sessionId, turns.length, say, result.questionRef || null],
  );

  // Out of time is a hard stop regardless of what the model thinks.
  const outOfTime = realElapsed >= session.duration_min;

  return {
    say,
    intent: result.intent || 'new-question',
    shouldEnd: Boolean(result.shouldEnd) || outOfTime,
    elapsedMin: realElapsed,
    durationMin: session.duration_min,
    turn: turns.length,
  };
}

// ── Finish and assess ─────────────────────────────────────────────────
export async function finishInterview(sessionId, { regenerate = false } = {}) {
  const session = await one('SELECT * FROM interview_sessions WHERE id = $1', [sessionId]);
  if (!session) throw new AiError('Interview session not found', 404);

  // Reports are cached, so an interview assessed before a feature existed keeps
  // serving the old shape. regenerate re-runs it against the current prompt.
  if (session.report && !regenerate) {
    return { session, report: session.report, delivery: session.delivery, cached: true };
  }

  const turns = await many(
    'SELECT speaker, text, answer_ms FROM interview_turns WHERE session_id = $1 ORDER BY position',
    [sessionId],
  );

  const answered = turns.filter((t) => t.speaker === 'candidate').length;
  if (!answered) {
    await query(
      `UPDATE interview_sessions SET status = 'abandoned', finished_at = now() WHERE id = $1`,
      [sessionId],
    );
    throw new AiError('You did not answer anything — nothing to assess.', 400);
  }

  const candidate = await candidateBlock();
  const prompt = interviewReportPrompt({
    companyName: session.company_name,
    roleTitle: session.role_title,
    round: session.round,
    plan: session.plan,
    transcript: renderTranscript(turns),
    candidate,
  });

  const report = await chatJson({
    kind: 'interview-report',
    companyId: session.company_id,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 10_000,
    model: config.interview.reportModel || undefined,
    sessionId,
    input: { sessionId, turns: turns.length },
  });

  // Countable delivery metrics, computed rather than guessed.
  const delivery = analyseSession(turns);

  await query(
    `UPDATE interview_sessions
     SET status = 'finished', finished_at = now(), report = $2, delivery = $3
     WHERE id = $1`,
    [sessionId, JSON.stringify(report), delivery ? JSON.stringify(delivery) : null],
  );

  return { report, delivery, turns: turns.length, answered };
}

/** What this interview has actually cost so far, from recorded token usage. */
export async function sessionCost(sessionId) {
  const row = await one(
    `SELECT COALESCE(SUM(cost_usd), 0)::float AS usd,
            COALESCE(SUM(tokens_in), 0)::int  AS tokens_in,
            COALESCE(SUM(tokens_out), 0)::int AS tokens_out,
            COUNT(*)::int                     AS calls
     FROM ai_runs WHERE session_id = $1`,
    [sessionId],
  );
  return row || { usd: 0, tokens_in: 0, tokens_out: 0, calls: 0 };
}

export async function getSession(sessionId) {
  const session = await one('SELECT * FROM interview_sessions WHERE id = $1', [sessionId]);
  if (!session) return null;
  const turns = await many(
    'SELECT position, speaker, text, question_ref, answer_ms, created_at FROM interview_turns WHERE session_id = $1 ORDER BY position',
    [sessionId],
  );
  return { session, turns };
}

export async function listSessions(limit = 25) {
  return many(
    `SELECT id, company_id, company_name, role_title, round, status, duration_min,
            started_at, finished_at,
            report->>'readiness' AS readiness,
            (SELECT COUNT(*) FROM interview_turns t WHERE t.session_id = s.id)::int AS turns
     FROM interview_sessions s
     ORDER BY started_at DESC LIMIT $1`,
    [limit],
  );
}
