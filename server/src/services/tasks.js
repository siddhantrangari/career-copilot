import { many, one, query } from '../db/pool.js';
import { chatJson, AiError } from './ai.js';
import { activeProviders } from './providers.js';
import { candidateBlock } from './context.js';
import { getGrounding, renderGrounding } from './search.js';
import { config } from '../config.js';
import {
  researchPrompt,
  messagesPrompt,
  winDocPrompt,
  tailorResumePrompt,
  refineResumePrompt,
  verifyResumePrompt,
  condenseResumePrompt,
  coverLetterPrompt,
  refineCoverLetterPrompt,
  coldEmailPrompt,
  callPrepPrompt,
  linkedInPostPrompt,
} from './prompts.js';
import { extractJdFromUrl } from './fetch-jd.js';

/**
 * Every AI capability as a plain async function.
 *
 * Extracted from the routes so the same code path serves both the synchronous
 * endpoint and the background job runner. Grounded research takes ~2 minutes,
 * which is well past Cloudflare's ~100s proxy limit, so the UI always goes
 * through jobs — but curl and scripts can still call the sync route.
 */

export async function resolveCompany({ companyId, companyName }) {
  if (companyId) {
    const row = await one('SELECT * FROM companies WHERE id = $1', [companyId]);
    if (row) return row;
  }
  if (companyName) {
    const row = await one('SELECT * FROM companies WHERE lower(name) = lower($1)', [companyName]);
    if (row) return row;
  }
  return null;
}

async function requireCompanyName(payload) {
  const company = await resolveCompany(payload);
  const name = company?.name || payload.companyName;
  if (!name) throw new AiError('companyId or companyName is required', 400);
  return { company, name };
}

// ── Research ──────────────────────────────────────────────────────────
export async function research(payload = {}, ctx = {}) {
  const onStep = ctx.onStep || (() => {});
  const { roleName, force } = payload;
  const { company, name } = await requireCompanyName(payload);
  const maxAge = config.ai.search.maxAgeDays;

  if (company?.research && !force) {
    const age = Date.now() - new Date(company.research.lastResearched || 0).getTime();
    if (age < maxAge * 24 * 60 * 60 * 1000) {
      return { research: company.research, cached: true, companyId: company.id };
    }
  }

  // Stage 1 — live web grounding.
  const grounding = await getGrounding(company?.id, name, roleName, {
    force: Boolean(force),
    maxAgeDays: maxAge,
    onStep,
  });

  // Stage 2 — synthesise the consultant brief from that evidence.
  onStep({
    phase: 'synthesis', status: 'start',
    message: `Building the consultant brief from ${grounding.sources?.length || 0} sources ` +
             `(${config.ai.planModel || 'the configured model'})`,
  });
  const candidate = await candidateBlock();
  const prompt = researchPrompt({
    companyName: name,
    roleName,
    companyDesc: company?.description,
    candidate,
    grounding: renderGrounding(grounding),
  });

  const result = await chatJson({
    kind: 'research',
    companyId: company?.id,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 16_000,
    input: { companyName: name, roleName, sources: grounding.sources?.length },
  });

  const brief = {
    ...result,
    lastResearched: new Date().toISOString(),
    grounded: true,
    searchedAt: grounding.searchedAt,
    searchModel: grounding.model,
    sources: grounding.sources || [],
    searchGaps: grounding.failures?.length ? grounding.failures : undefined,
  };

  onStep({
    phase: 'synthesis', status: 'done',
    message: `Brief ready — ${(result.challenges || []).length} challenges, ` +
             `${(result.recentNews || []).length} news items, ` +
             `${(result.gaps || []).length} stated gaps`,
  });

  if (company) {
    await query('UPDATE companies SET research = $2, updated_at = now() WHERE id = $1', [
      company.id,
      JSON.stringify(brief),
    ]);
  }

  return { research: brief, cached: false, companyId: company?.id || null };
}

// ── Outreach messages ─────────────────────────────────────────────────
export async function generateMessages(payload = {}) {
  const { roleName, messageType = 'all', contact, callNotes, save = true } = payload;
  const { company, name } = await requireCompanyName(payload);

  const candidate = await candidateBlock();
  const prompt = messagesPrompt({
    companyName: name,
    roleName,
    research: company?.research,
    messageType,
    contact,
    callNotes,
    candidate,
  });

  const result = await chatJson({
    kind: 'generate-messages',
    companyId: company?.id,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 6_000,
    input: { companyName: name, messageType, contact },
  });

  if (result.connectionNote) {
    result.connectionNoteChars = result.connectionNote.length;
    result.connectionNoteOverLimit = result.connectionNote.length > 300;
  }

  if (save && company) {
    for (const kind of ['connectionNote', 'firstDM', 'peerDM', 'followUp']) {
      if (!result[kind]) continue;
      await query(
        `INSERT INTO messages (company_id, connection_id, kind, body, model)
         VALUES ($1, $2, $3, $4, $5)`,
        [company.id, contact?.id || null, kind, result[kind], activeProviders()[0]?.model || ''],
      );
    }
  }

  return { messages: result, companyId: company?.id || null };
}

// ── WIN document ──────────────────────────────────────────────────────
export async function generateWinDoc(payload = {}, ctx = {}) {
  const onStep = ctx.onStep || (() => {});
  const { contactName, roleTitle, problems = [], save = true, refreshEvidence = false } = payload;
  const { company, name } = await requireCompanyName(payload);

  // The WIN doc is built from research. Call notes are an upgrade, not a
  // precondition — before any conversation it is the thing that earns one.
  const confirmed = (problems || []).filter((p) => (typeof p === 'string' ? p.trim() : p));
  const mode = confirmed.length
    ? (contactName ? 'validated' : 'partly-validated')
    : 'research-only';

  onStep({
    phase: 'win-doc', status: 'start',
    message: confirmed.length
      ? `Building from ${confirmed.length} confirmed problem(s)${contactName ? ` from ${contactName}` : ''}`
      : 'No call yet — deriving problems from research and marking them as hypotheses',
  });

  let grounding = null;
  try {
    grounding = await getGrounding(company?.id, name, roleTitle, {
      force: Boolean(refreshEvidence),
      maxAgeDays: config.ai.search.maxAgeDays,
      onStep,
    });
  } catch (err) {
    console.warn(`[win-doc] live grounding unavailable: ${err.message}`);
    onStep({ phase: 'win-doc', status: 'failed', message: `Live evidence unavailable: ${err.message}` });
  }

  // Research-only mode leans entirely on the brief, so it must exist.
  if (!confirmed.length && !company?.research && !grounding) {
    throw new AiError(
      'Run Research on this company first — a WIN doc with no call notes and no ' +
      'research has nothing real to stand on.',
      400,
    );
  }

  const candidate = await candidateBlock();
  const prompt = winDocPrompt({
    companyName: name,
    roleTitle,
    contactName,
    problems: confirmed,
    mode,
    research: company?.research,
    candidate,
    grounding: grounding
      ? renderGrounding(grounding)
      : 'LIVE WEB RESEARCH: unavailable for this run. Do not cite any public evidence, ' +
        'dates or figures — work only from what the insider said on the call, and say ' +
        'explicitly where public corroboration is missing.',
  });

  const result = await chatJson({
    kind: 'win-doc',
    companyId: company?.id,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 20_000,
    input: { companyName: name, contactName, problems, sources: grounding?.sources?.length || 0 },
  });

  result.grounded = Boolean(grounding);
  result.sources = grounding?.sources || [];
  result.searchedAt = grounding?.searchedAt || null;
  result.mode = mode;

  onStep({
    phase: 'win-doc', status: 'done',
    message: `WIN doc ready — ${mode.replace('-', ' ')}, ` +
             `${(result.sections?.problems || []).filter((p) => p.status === 'CONFIRMED').length} confirmed, ` +
             `${(result.sections?.problems || []).filter((p) => p.status === 'HYPOTHESIS').length} hypotheses`,
  });

  let saved = null;
  if (save && company) {
    // sections is JSONB, so we tuck the presentation payload (title, subtitle,
    // slide list) alongside the structured sections — one blob, one column,
    // still queryable, and the PPTX/HTML renderers read straight from it.
    const sections = {
      ...(result.sections || {}),
      title: result.title || '',
      subtitle: result.subtitle || '',
      slides: Array.isArray(result.slides) ? result.slides : [],
    };
    saved = await one(
      `INSERT INTO win_docs (company_id, contact_name, problems, markdown, sections)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
      [
        company.id, contactName || '', JSON.stringify(problems),
        result.markdown || '', JSON.stringify(sections),
      ],
    );
    await query(
      `UPDATE tracked_companies SET win_status = 'drafted', stage =
         CASE WHEN stage IN ('new','interested','applied','networking','call') THEN 'win' ELSE stage END,
         updated_at = now()
       WHERE company_id = $1`,
      [company.id],
    );
  }

  return { winDoc: result, id: saved?.id || null, companyId: company?.id || null };
}

// ── Ensure JD Text (auto-fetches real posting if given a URL) ────────
export async function ensureJdText(rawJd, rawTitle, onStep = () => {}) {
  let jd = (rawJd || '').trim();
  let title = (rawTitle || '').trim();
  let autoFetched = false;

  if (/^https?:\/\/\S+$/i.test(jd) || (jd.length < 200 && /^https?:\/\//i.test(jd))) {
    const urlMatch = jd.match(/https?:\/\/\S+/i);
    if (urlMatch) {
      if (typeof onStep === 'function') {
        onStep({ phase: 'fetch-jd', status: 'running', message: 'Fetching real job posting details from URL…' });
      }
      try {
        const extracted = await extractJdFromUrl(urlMatch[0]);
        if (extracted && extracted.ok && extracted.jdText) {
          jd = extracted.jdText;
          if (!title && extracted.title) title = extracted.title;
          autoFetched = true;
          if (typeof onStep === 'function') {
            onStep({
              phase: 'fetch-jd',
              status: 'done',
              message: `Loaded job description (${jd.length} chars) from ${extracted.source}`,
            });
          }
        }
      } catch (err) {
        console.warn('[ensureJdText] Auto-extract JD error:', err.message);
      }
    }
  }

  return { jd, title, autoFetched };
}

// ── His standing edits, applied to every resume and cover letter ──────
/**
 * The prompts carry these rules too; this pass makes them hold when the
 * model slips. Bangalore is where he lives (never Mumbai); Google's stack is
 * written as Vertex AI only.
 */
export function applyDocumentRules(text) {
  if (!text) return text;
  return String(text)
    .replace(/Bangalore\s*\/\s*Mumbai|Mumbai\s*\/\s*Bangalore/gi, 'Bangalore')
    .replace(/\bMumbai\b/g, 'Bangalore')
    .replace(/Gemini\s*2\.5\s*Flash\s*(?:\/|\(|·|,)\s*Vertex AI\)?/gi, 'Vertex AI')
    .replace(/Vertex AI\s*(?:\/|\(|·|,)\s*Gemini\s*2\.5\s*Flash\)?/gi, 'Vertex AI')
    .replace(/\s*\(\s*Gemini\s*2\.5\s*Flash\s*\)/gi, '')
    .replace(/Gemini\s*2\.5\s*Flash/gi, 'Vertex AI')
    .replace(/Vertex AI(\s*(?:·|,|\/)\s*Vertex AI)+/g, 'Vertex AI')
    .replace(/Vertex AI\s*\(Vertex AI\)/g, 'Vertex AI')
    .replace(/Bangalore, India,\s*India/g, 'Bangalore, India');
}

// ── Resume length: two A4 pages ─────────────────────────────────────────
const RESUME_MAX_WORDS = 790;
const wordCount = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
// Role-header lines (title | company | dates | location): a shortened version must keep them all.
const roleLines = (t) => String(t || '').split('\n').filter((l) => (l.match(/\|/g) || []).length >= 2).length;

/**
 * Over budget → one tightening pass. The shorter text is kept only if it
 * is actually shorter, not gutted, and still has every role header.
 */
export async function fitResumeLength(text, { companyId, kind = 'condense-resume' } = {}) {
  const words = wordCount(text);
  if (words <= RESUME_MAX_WORDS) return { text, words, condensed: false };
  try {
    const p = condenseResumePrompt({ resumeText: text, words });
    const out = await chatJson({ kind, companyId, system: p.system, user: p.user, maxTokens: 8_000, input: { words } });
    const next = String(out.tailoredResumeText || '');
    const n = wordCount(next);
    if (n < words && n >= 500 && roleLines(next) >= roleLines(text)) return { text: next, words: n, condensed: true, from: words };
  } catch (err) {
    console.warn('[fitResumeLength] condense failed:', err.message);
  }
  return { text, words, condensed: false };
}

// ── Tailored resume (+ fact-check pass) ───────────────────────────────
export async function tailorResume(payload = {}, ctx = {}) {
  const onStep = ctx?.onStep || (() => {});
  const { save = true, verify = true, instructions, comments } = payload;
  const resolved = await ensureJdText(payload.jobDescription, payload.jobTitle, onStep);
  const jobDescription = resolved.jd;
  const jobTitle = resolved.title || 'Senior Engineer';

  if (!jobDescription?.trim()) throw new AiError('jobDescription is required', 400);

  const company = await resolveCompany(payload);
  const name = company?.name || payload.companyName || 'Target company';

  const candidate = await candidateBlock();
  const prompt = tailorResumePrompt({
    companyName: name,
    jobTitle: jobTitle || 'Senior Engineer',
    jobDescription,
    instructions: instructions || comments || '',
    candidate,
  });

  const result = await chatJson({
    kind: 'tailor-resume',
    companyId: company?.id,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 16_000,
    input: { companyName: name, jobTitle },
  });

  if (result.tailoredResumeText) {
    const fit = await fitResumeLength(applyDocumentRules(result.tailoredResumeText), { companyId: company?.id });
    result.tailoredResumeText = applyDocumentRules(fit.text);
    result.length = { words: fit.words, condensedFrom: fit.from || null };
  }

  // A hallucinated bullet only surfaces in the interview — audit before saving.
  if (result.tailoredResumeText && verify !== false) {
    const check = verifyResumePrompt({ tailoredResume: result.tailoredResumeText, candidate });
    try {
      const verification = await chatJson({
        kind: 'verify-resume',
        companyId: company?.id,
        system: check.system,
        user: check.user,
        maxTokens: 6_000,
        input: { companyName: name, jobTitle },
      });

      const issues = Array.isArray(verification.issues) ? verification.issues : [];
      const blocking = issues.filter((i) => ['critical', 'moderate'].includes(i.severity));

      result.verification = {
        ...verification,
        issues,
        clean: issues.length === 0,
        safeToSend: blocking.length === 0,
        blockingCount: blocking.length,
      };
    } catch (err) {
      result.verification = {
        clean: null, issues: [],
        verdict: `Verification unavailable: ${err.message}`,
      };
    }
  }

  let saved = null;
  if (save) {
    saved = await one(
      `INSERT INTO resume_versions
         (company_id, company_name, job_title, job_description, tailored_text,
          keywords_matched, keywords_missing, match_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`,
      [
        company?.id || null, name, jobTitle || '', jobDescription,
        result.tailoredResumeText || '',
        result.keywordsMatched || [],
        (result.keywordsMissing || []).map((k) => (typeof k === 'string' ? k : k.keyword)),
        Math.round(result.matchScore || 0),
      ],
    );
  }

  return { resume: result, id: saved?.id || null };
}

// ── Refine resume (chat / feedback revisions) ─────────────────────────
export async function refineResume(payload = {}) {
  const {
    resumeId,
    currentResumeText,
    feedback,
    comments,
    chatHistory,
    companyName,
    jobTitle,
    jobDescription,
    verify = true,
  } = payload;

  const userFeedback = feedback || comments;
  if (!userFeedback?.trim()) throw new AiError('feedback or comments is required to refine resume', 400);
  if (!currentResumeText?.trim()) throw new AiError('currentResumeText is required', 400);

  const company = await resolveCompany(payload);
  const name = company?.name || companyName || 'Target company';

  const resolved = await ensureJdText(jobDescription, jobTitle);
  const activeJd = resolved.jd;
  const activeTitle = resolved.title || 'Senior Engineer';

  const candidate = await candidateBlock();
  const prompt = refineResumePrompt({
    companyName: name,
    jobTitle: activeTitle,
    jobDescription: activeJd,
    currentResumeText,
    feedback: userFeedback,
    chatHistory: Array.isArray(chatHistory) ? chatHistory : [],
    candidate,
  });

  const result = await chatJson({
    kind: 'refine-resume',
    companyId: company?.id,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 16_000,
    input: { companyName: name, jobTitle, feedback: userFeedback },
  });

  if (result.tailoredResumeText) {
    const fit = await fitResumeLength(applyDocumentRules(result.tailoredResumeText), { companyId: company?.id });
    result.tailoredResumeText = applyDocumentRules(fit.text);
    result.length = { words: fit.words, condensedFrom: fit.from || null };
  }

  // Verification pass
  if (result.tailoredResumeText && verify !== false) {
    const check = verifyResumePrompt({ tailoredResume: result.tailoredResumeText, candidate });
    try {
      const verification = await chatJson({
        kind: 'verify-resume',
        companyId: company?.id,
        system: check.system,
        user: check.user,
        maxTokens: 6_000,
        input: { companyName: name, jobTitle },
      });

      const issues = Array.isArray(verification.issues) ? verification.issues : [];
      const blocking = issues.filter((i) => ['critical', 'moderate'].includes(i.severity));

      result.verification = {
        ...verification,
        issues,
        clean: issues.length === 0,
        safeToSend: blocking.length === 0,
        blockingCount: blocking.length,
      };
    } catch (err) {
      result.verification = {
        clean: null,
        issues: [],
        verdict: `Verification unavailable: ${err.message}`,
      };
    }
  }

  let savedId = resumeId || null;
  if (resumeId) {
    await query(
      `UPDATE resume_versions
       SET tailored_text = $1,
           match_score = COALESCE(NULLIF($2, 0), match_score)
       WHERE id = $3`,
      [result.tailoredResumeText || '', Math.round(result.matchScore || 0), resumeId],
    );
  } else {
    const saved = await one(
      `INSERT INTO resume_versions
         (company_id, company_name, job_title, job_description, tailored_text, match_score)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [
        company?.id || null,
        name,
        jobTitle || '',
        jobDescription || '',
        result.tailoredResumeText || '',
        Math.round(result.matchScore || 0),
      ],
    );
    savedId = saved?.id || null;
  }

  return { resume: result, id: savedId };
}

// ── Tailored cover letter ─────────────────────────────────────────────
export async function generateCoverLetter(payload = {}, ctx = {}) {
  const onStep = ctx?.onStep || (() => {});
  const { instructions, comments } = payload;
  const resolved = await ensureJdText(payload.jobDescription, payload.jobTitle, onStep);
  const jobDescription = resolved.jd;
  const jobTitle = resolved.title || 'Senior Full-Stack & AI Engineer';

  const company = await resolveCompany(payload);
  const name = company?.name || payload.companyName || 'Target Company';

  const candidate = await candidateBlock();
  const prompt = coverLetterPrompt({
    companyName: name,
    jobTitle: jobTitle || 'Senior Full-Stack & AI Engineer',
    jobDescription: jobDescription || '',
    instructions: instructions || comments || '',
    candidate,
  });

  const result = await chatJson({
    kind: 'cover-letter',
    companyId: company?.id,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 8_000,
    input: { companyName: name, jobTitle },
  });

  if (result?.coverLetterText) result.coverLetterText = applyDocumentRules(result.coverLetterText);
  return {
    coverLetter: result,
    companyName: name,
    jobTitle: jobTitle || 'Senior Full-Stack & AI Engineer',
  };
}

export async function refineCoverLetter(payload = {}) {
  const {
    currentLetterText,
    feedback,
    comments,
    companyName,
    jobTitle,
  } = payload;

  const userFeedback = feedback || comments;
  if (!userFeedback?.trim()) throw new AiError('feedback or comments is required to refine cover letter', 400);
  if (!currentLetterText?.trim()) throw new AiError('currentLetterText is required', 400);

  const company = await resolveCompany(payload);
  const name = company?.name || companyName || 'Target Company';

  const candidate = await candidateBlock();
  const prompt = refineCoverLetterPrompt({
    companyName: name,
    jobTitle: jobTitle || 'Senior Full-Stack & AI Engineer',
    currentLetterText,
    userFeedback,
    candidate,
  });

  const result = await chatJson({
    kind: 'refine-cover-letter',
    companyId: company?.id,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 8_000,
    input: { companyName: name, jobTitle, feedback: userFeedback },
  });

  if (result?.coverLetterText) result.coverLetterText = applyDocumentRules(result.coverLetterText);
  return {
    coverLetter: result,
    companyName: name,
    jobTitle: jobTitle || 'Senior Full-Stack & AI Engineer',
  };
}

// ── Cold email ────────────────────────────────────────────────────────
export async function coldEmail(payload = {}) {
  const { roleName, recipient } = payload;
  const { company, name } = await requireCompanyName(payload);

  const candidate = await candidateBlock();
  const prompt = coldEmailPrompt({
    companyName: name, roleName, recipient, research: company?.research, candidate,
  });

  const email = await chatJson({
    kind: 'cold-email',
    companyId: company?.id,
    system: prompt.system,
    user: prompt.user,
    maxTokens: 4_000,
    input: { companyName: name, roleName, recipient },
  });

  if (company) {
    await query(
      'INSERT INTO messages (company_id, kind, body, model) VALUES ($1, $2, $3, $4)',
      [company.id, 'coldEmail', `${email.subject}\n\n${email.body}`, activeProviders()[0]?.model || ''],
    );
  }

  return { email };
}

// ── Call prep ─────────────────────────────────────────────────────────
export async function callPrep(payload = {}) {
  const { contactName } = payload;
  const { company, name } = await requireCompanyName(payload);

  const candidate = await candidateBlock();
  const prompt = callPrepPrompt({
    companyName: name, contactName, research: company?.research, candidate,
  });

  return {
    callPrep: await chatJson({
      kind: 'call-prep',
      companyId: company?.id,
      system: prompt.system,
      user: prompt.user,
      maxTokens: 6_000,
      input: { companyName: name, contactName },
    }),
  };
}

// ── LinkedIn post ─────────────────────────────────────────────────────
export async function linkedInPost(payload = {}) {
  const { topic } = payload;
  if (!topic?.trim()) throw new AiError('topic is required', 400);

  const candidate = await candidateBlock();
  const prompt = linkedInPostPrompt({ topic, candidate });

  return {
    post: await chatJson({
      kind: 'linkedin-post',
      system: prompt.system,
      user: prompt.user,
      maxTokens: 4_000,
      input: { topic },
    }),
  };
}

// Interview planning and report generation run as jobs too; imported lazily
// to avoid a cycle (interview.js imports resolveCompany from this module).
async function interviewStart(payload) {
  const { startInterview } = await import('./interview.js');
  return startInterview(payload);
}

async function interviewReport(payload) {
  const { finishInterview } = await import('./interview.js');
  return finishInterview(payload.sessionId, { regenerate: Boolean(payload.regenerate) });
}

// The prep guide is a fresh live search + synthesis; goes through the same
// job queue as the mock's plan/report so the UI can reuse its polling code.
async function interviewPrep(payload, ctx) {
  const { generateInterviewPrep } = await import('./interview-prep.js');
  return generateInterviewPrep(payload, ctx);
}

async function linkedinResolve(payload) {
  const { resolveAllMissing } = await import('./linkedin.js');
  return resolveAllMissing(payload || {});
}

async function recordingUpload(payload) {
  const { uploadToR2 } = await import('./recording.js');
  return uploadToR2(payload.sessionId);
}

async function gigDiscovery(payload, ctx) {
  const { runGigDiscovery } = await import('./gigs.js');
  return runGigDiscovery({ trigger: 'manual', ...(payload || {}), onStep: ctx?.onStep });
}

async function targetsRefresh(payload, ctx) {
  const { refreshTargets } = await import('./targets.js');
  return refreshTargets({ trigger: 'manual', research: true, ...(payload || {}), onStep: ctx?.onStep });
}

async function navigator() {
  const { generateNavigator } = await import('./targets.js');
  return { navigator: await generateNavigator() };
}

async function googleJobs(payload) {
  const { runGoogleJobs } = await import('./google-jobs.js');
  return runGoogleJobs({ trigger: 'manual', ...(payload || {}) });
}

async function whyLines(payload, ctx) {
  const { generateWhyLines } = await import('./why.js');
  return generateWhyLines({ ...(payload || {}), onStep: ctx?.onStep });
}

async function indiaDiscovery(payload) {
  const { runIndiaDiscovery } = await import('./india-sources.js');
  return runIndiaDiscovery({ trigger: 'manual', ...(payload || {}) });
}

async function jobDiscovery(payload) {
  const { runDiscovery } = await import('./discovery.js');
  return runDiscovery({ trigger: 'manual', ...(payload || {}) });
}

/** Everything the job runner is allowed to execute. */
export const TASKS = {
  'job-discovery': jobDiscovery,
  'india-discovery': indiaDiscovery,
  'why-lines': whyLines,
  'google-jobs': googleJobs,
  'targets-refresh': targetsRefresh,
  'navigator': navigator,
  'gig-discovery': gigDiscovery,
  'recording-upload': recordingUpload,
  'linkedin-resolve': linkedinResolve,
  'interview-start': interviewStart,
  'interview-report': interviewReport,
  'interview-prep': interviewPrep,
  research,
  'generate-messages': generateMessages,
  'generate-win-doc': generateWinDoc,
  'tailor-resume': tailorResume,
  'refine-resume': refineResume,
  'cover-letter': generateCoverLetter,
  'refine-cover-letter': refineCoverLetter,
  'cold-email': coldEmail,
  'call-prep': callPrep,
  'linkedin-post': linkedInPost,
};

export const TASK_KINDS = Object.keys(TASKS);
