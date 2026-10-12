import { many, one, query } from '../db/pool.js';
import { AiError, chatJson } from './ai.js';
import { candidateBlock } from './context.js';
import { resolveCompany } from './tasks.js';
import { groundedSearch } from './search.js';
import { config } from '../config.js';
import { interviewPrepPrompt, interviewDeepDivePrompt } from './prompts.js';

/**
 * Interview PREP guide — the study/recap counterpart to the live mock.
 *
 * Different signal, different pipeline: the mock builds a live plan from the
 * company research and the WIN doc and then runs a conversation. The prep
 * guide instead runs a fresh, narrow web search on how this company actually
 * interviews for this role — Glassdoor, Reddit, Blind, engineering blogs,
 * personal writeups — and synthesises that with the JD and the candidate's
 * real experience into a "here is what to prepare and how your background
 * answers each question" document.
 *
 * Two live searches per run rather than three, because the prep guide is a
 * cheap tool that people should run whenever they update their resume, not
 * a once-a-quarter budget item.
 */

async function loadCompanyArtefacts(companyId) {
  if (!companyId) return { winDoc: null, resume: null };
  const winDoc = await one(
    `SELECT id, markdown FROM win_docs
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

/**
 * Build the two live queries that ground the guide. Kept narrow because a
 * broad "how do I interview at X" question returns Glassdoor SEO chum; the
 * specific ones surface real candidate writeups.
 *
 * When noDsa=true (the company is flagged as no-LeetCode in the catalogue),
 * the queries steer explicitly away from algorithmic questions. Without this
 * bias the searches over-index on LeetCode content because it dominates
 * Glassdoor's SEO, even for companies whose real loop is practical + system
 * design + behavioural.
 */
function buildPrepQueries(companyName, roleTitle, round, { noDsa = true, freelance = false } = {}) {
  const role = roleTitle || 'senior software engineer';

  // A marketplace or expert network has no hiring loop in the employer
  // sense — what matters is its vetting pipeline and how good freelancers
  // land and keep contracts there.
  if (freelance) {
    const r = roleTitle || 'AI / full-stack engineer';
    return [
      {
        key: 'vetting',
        query:
          `How does ${companyName} vet and onboard freelance ${r}s? Describe each screening ` +
          `step (AI interview, skills test, live coding, profile review), what the screening ` +
          `interview actually asks, acceptance rate and how long it takes. Use Reddit, blogs, ` +
          `YouTube writeups and ${companyName}'s own docs from the last 2 years. Quote ` +
          `freelancers verbatim where useful and give the source URL and date for each claim.`,
      },
      {
        key: 'winning',
        query:
          `How do experienced AI and full-stack freelancers land their first contracts and keep ` +
          `high rates on ${companyName}? Profile tips, proposal / pitch tips, typical hourly rates ` +
          `for AI engineers, what clients look for, and common mistakes. Prefer Reddit, freelancer ` +
          `blogs and ${companyName}'s help docs from the last 2 years, with source URL and date.`,
      },
    ];
  }
  const roundLine = round && round !== 'any'
    ? ` Focus especially on the ${round} round.`
    : '';

  const styleClause = noDsa
    ? `The candidate is deliberately filtering OUT LeetCode-style companies, so ` +
      `prioritise coverage of the PRACTICAL parts of the loop — take-homes, system ` +
      `design, code review, product / customer scenarios, behavioural and ownership ` +
      `questions. Only include algorithmic / LeetCode content if candidate reports ` +
      `confirm that is actually a required round at this company — otherwise treat ` +
      `absence of DSA as the signal.`
    : `Cover the full loop including algorithmic rounds.`;
  const questionsClause = noDsa
    ? `Prioritise practical coding, system design, take-home, code-review, ` +
      `product / customer scenarios, and behavioural questions. Include algorithmic ` +
      `questions only if multiple candidate reports say they were actually asked. If ` +
      `LeetCode is absent from reports on this company, say so plainly — that itself ` +
      `is useful signal.`
    : `Include technical, behavioural and company-specific questions.`;

  return [
    {
      key: 'format',
      query:
        `How does ${companyName} interview candidates for ${role} or equivalent engineering ` +
        `roles? Give me the rounds, format, style (LeetCode-style algorithmic vs practical ` +
        `vs system-design vs behavioural), typical duration, and any known quirks. Use ` +
        `Glassdoor, Reddit r/cscareerquestions, Team Blind, engineering blogs and ` +
        `personal writeups from the last 2 years. Quote candidates verbatim where useful ` +
        `and give the source URL and date for each claim.${roundLine} ${styleClause}`,
    },
    {
      key: 'questions',
      query:
        `What specific interview questions has ${companyName} asked ${role} candidates in ` +
        `the last 2 years? ${questionsClause} Prefer verbatim quotes from candidate ` +
        `reports on Glassdoor, Reddit, Blind, personal blogs. Give the source URL and ` +
        `date for each. If reports mention specific topics the company drills on (e.g. ` +
        `concurrency, distributed systems, ownership stories, product sense) name them.`,
    },
  ];
}

function renderInterviewEvidence(findings) {
  if (!findings?.length) {
    return 'LIVE INTERVIEW-EVIDENCE SEARCH: no candidate reports found for this company. ' +
      'Do not invent Glassdoor quotes or Reddit threads. Leave candidateReports empty and ' +
      'mark confidence "general".';
  }

  const blocks = findings
    .map((f) => `### Candidate-report search — ${f.key}\n${f.content}`)
    .join('\n\n');

  const seen = new Set();
  const sources = [];
  for (const f of findings) {
    const src = f.sources?.length
      ? f.sources
      : (f.citations || []).map((url) => ({ url, title: '', date: null }));
    for (const s of src) {
      if (!s.url || seen.has(s.url)) continue;
      seen.add(s.url);
      sources.push(s);
    }
  }
  const sourceList = sources
    .slice(0, 30)
    .map((s, i) => `[${i + 1}] ${s.title || s.url}${s.date ? ` (${s.date})` : ''} — ${s.url}`)
    .join('\n');

  return `LIVE INTERVIEW-EVIDENCE SEARCH — retrieved just now
These findings came from an actual web search of candidate reports on how this
company interviews. Use them as the source of truth for the "format" and
"candidateReports" sections, and to justify likely questions.

${blocks}

SOURCES
${sourceList}`;
}

/**
 * Run the guide. Progress ticks are surfaced through ctx.onStep so the UI can
 * mirror the same live search trace it already renders for research and the
 * WIN doc — one visual language across the app for "the agent is working".
 */
export async function generateInterviewPrep(payload = {}, ctx = {}) {
  const onStep = ctx.onStep || (() => {});
  const { round = 'any', jobDescription, save = true } = payload;

  const company = await resolveCompany(payload);
  const name = company?.name || payload.companyName;
  if (!name) throw new AiError('companyId or companyName is required', 400);

  const { winDoc, resume } = await loadCompanyArtefacts(company?.id);
  const jd = (jobDescription || '').trim() || resume?.job_description || '';
  const roleTitle = payload.roleTitle || resume?.job_title || '';

  // The whole company catalogue is curated no-DSA — the candidate is deliberately
  // filtering out LeetCode-style loops — so treat the catalogue flag as the
  // signal and bias both the searches and the synthesis away from DSA.
  // A company whose row somehow arrived with dsa=true (a custom addition) opts
  // back into the full-loop behaviour.
  const noDsa = company ? !company.dsa : true;
  const freelance = Boolean(company?.freelance);

  const queries = buildPrepQueries(name, roleTitle, round, { noDsa, freelance });
  onStep({
    phase: 'search',
    status: 'start',
    message: `Running ${queries.length} live searches for how ${name} actually interviews`,
    detail: queries.map((q) => ({ key: q.key, query: q.query })),
  });

  // Parallel searches with individual failure tolerance — a single dead
  // Glassdoor request must not kill the whole guide.
  const settled = await Promise.allSettled(
    queries.map((q) =>
      groundedSearch(q.query, { maxTokens: 1400 })
        .then((r) => {
          onStep({
            phase: 'search', status: 'ok', key: q.key,
            message: `"${q.key}" search — ${r.sources.length || r.citations.length} sources`,
            sources: (r.sources.length ? r.sources : r.citations.map((url) => ({ url })))
              .slice(0, 8)
              .map((x) => ({ url: x.url, title: x.title || '', date: x.date || null })),
          });
          return { ...r, key: q.key };
        })
        .catch((err) => {
          onStep({
            phase: 'search', status: 'failed', key: q.key,
            message: `"${q.key}" search failed: ${err.message}`,
          });
          throw err;
        }),
    ),
  );

  const findings = settled
    .filter((s) => s.status === 'fulfilled')
    .map((s) => s.value);

  // Dedupe sources across the two searches so persistence and rendering do
  // not double-count Glassdoor's five subdomains.
  const seen = new Set();
  const sources = [];
  for (const f of findings) {
    const src = f.sources?.length
      ? f.sources
      : (f.citations || []).map((url) => ({ url, title: '', date: null }));
    for (const s of src) {
      if (!s.url || seen.has(s.url)) continue;
      seen.add(s.url);
      sources.push({ title: s.title || '', url: s.url, date: s.date || null });
    }
  }

  onStep({
    phase: 'synthesis', status: 'start',
    message: `Building the guide from ${sources.length} sources + your JD, resume` +
             `${winDoc ? ', WIN doc' : ''}${company?.research ? ' and company brief' : ''}`,
  });

  const candidate = await candidateBlock();
  const prompt = interviewPrepPrompt({
    companyName: name,
    roleTitle,
    round,
    jobDescription: jd,
    winDoc: winDoc?.markdown,
    research: company?.research,
    interviewEvidence: renderInterviewEvidence(findings),
    candidate,
    noDsa,
    freelance,
  });

  const guide = await chatJson({
    kind: 'interview-prep',
    companyId: company?.id,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 12_000,
    // Prep quality matters more than latency here — reuse the report model
    // (the strong one) rather than the fast turn model.
    model: config.interview.reportModel || undefined,
    input: {
      companyName: name, roleTitle, round,
      sources: sources.length,
      usedWinDoc: Boolean(winDoc),
      usedResearch: Boolean(company?.research),
    },
  });

  onStep({
    phase: 'synthesis', status: 'done',
    message: `Prep guide ready — ${(guide.likelyQuestions?.technical || []).length} technical, ` +
             `${(guide.likelyQuestions?.behavioural || []).length} behavioural, ` +
             `${(guide.candidateReports || []).length} candidate reports`,
  });

  let saved = null;
  if (save) {
    saved = await one(
      `INSERT INTO interview_preps
         (company_id, company_name, role_title, round, job_description,
          guide, sources, win_doc_id, resume_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [
        company?.id || null, name, roleTitle, round || 'any', jd,
        JSON.stringify(guide), JSON.stringify(sources),
        winDoc?.id || null, resume?.id || null,
      ],
    );
    // Claim the ai_run so the interview namespace's costs stay attributable.
    await query(
      `UPDATE ai_runs SET session_id = $1::uuid
       WHERE id = (SELECT id FROM ai_runs
                   WHERE kind = 'interview-prep' AND session_id IS NULL
                   ORDER BY created_at DESC LIMIT 1)`,
      [saved.id],
    );
  }

  return {
    prep: {
      ...guide,
      sources,
      companyName: name,
      roleTitle,
      round,
      usedWinDoc: Boolean(winDoc),
      usedResume: Boolean(resume),
      usedResearch: Boolean(company?.research),
      freelance,
    },
    id: saved?.id || null,
    companyId: company?.id || null,
  };
}

/**
 * On-demand deep dive on one topic or question. Small enough to run inline
 * (no job queue): a single question is 5-15s on the strong model, which is
 * inside Cloudflare's proxy budget and does not need polling.
 */
export async function deepDivePrep({ prepId, topic, questionContext } = {}) {
  if (!topic || !topic.trim()) throw new AiError('topic is required', 400);

  // The stored prep — if the caller passed one — gives us the company, role
  // and the neighbouring question context, so the coaching is tied to THIS
  // interview rather than being generic revision.
  let prep = null;
  if (prepId) {
    prep = await one('SELECT * FROM interview_preps WHERE id = $1', [prepId]);
  }

  const candidate = await candidateBlock();
  const prompt = interviewDeepDivePrompt({
    companyName: prep?.company_name || '',
    roleTitle: prep?.role_title || '',
    topic: topic.trim(),
    questionContext: (questionContext || '').trim(),
    candidate,
  });

  const result = await chatJson({
    kind: 'interview-deep-dive',
    companyId: prep?.company_id || null,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 4_000,
    model: config.interview.reportModel || undefined,
    input: { prepId: prepId || null, topic },
  });

  return { deepDive: result };
}

export async function listPreps(limit = 25) {
  return many(
    `SELECT id, company_id, company_name, role_title, round,
            guide->>'confidence' AS confidence,
            jsonb_array_length(COALESCE(sources, '[]'::jsonb)) AS source_count,
            created_at
     FROM interview_preps
     ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
}

export async function getPrep(id) {
  return one('SELECT * FROM interview_preps WHERE id = $1', [id]);
}
