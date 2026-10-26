import crypto from 'node:crypto';
import { one, many, query } from '../db/pool.js';
import { chatJson } from './ai.js';
import { candidateBlock } from './context.js';
import { classifyRole } from './apply-queue.js';
import { contentHash, latestPdf } from './resume-pdf.js';

/**
 * Guided apply: the application form, prepared — never submitted.
 *
 * For Greenhouse roles the real questions come from the public job board
 * API (labels, field names, options). Others get the standard set every
 * ATS asks. Each question is answered from, in order: his profile, his
 * answer bank (anything he has answered before), sensible defaults he must
 * confirm (work authorisation by country, "decline to self-identify"), and
 * one AI draft for the open-ended ones. What only he can answer — salary,
 * notice period, a consent box — is flagged for him. He reviews, the
 * browser extension fills the form, and he presses Submit.
 */

const DRAFT_MODEL = 'openai/gpt-5.6-luna';

// Category tests run on the question label. Order matters: first match wins.
export const CATEGORIES = [
  ['first_name', /^(legal )?first name|^given name|preferred first name/i],
  ['last_name', /^(legal )?last name|^surname|family name/i],
  ['preferred_name', /prefer(red)? (us to use|name)|name you'?d prefer/i],
  ['full_name', /^(full )?name$|^your name/i],
  ['email', /e-?mail/i],
  ['phone', /phone|mobile|contact number/i],
  ['resume', /resume|\bcv\b/i],
  ['cover_letter', /cover letter/i],
  ['linkedin', /linkedin/i],
  ['github', /github|open[- ]source (projects?|contributions?|work)/i],
  ['website', /website|portfolio|personal (site|url)|other (link|url)/i],
  ['eeo', /gender|race|ethnic|veteran|disabilit|pronoun|sexual orientation|hispanic|latino|demographic/i],
  ['restrictions', /non-?compete|employment agreements?|post-employment|restrictive covenant/i],
  ['consent', /consent|\bagree\b|\bi agree|privacy (policy|notice)|acknowledge|terms (and|&) conditions|data (processing|retention)|certif(y|ication) that/i],
  ['sponsorship', /sponsor/i],
  ['work_auth', /(legally )?(authori[sz]ed|eligible|right) to work|work (permit|authori[sz]ation)/i],
  ['relocate', /relocat/i],
  ['located_in', /are you (currently )?(located|based|living|residing) in/i],
  ['contractor', /(current|currently (a|an)?) ?contractor|work(ing)? as a contractor/i],
  ['address', /\baddress\b(?!.*e-?mail)|street|postal code|zip ?code|pin ?code/i],
  ['country', /country of residence|which country|current country|country do you (live|reside)/i],
  ['location', /current location|where are you (based|located)|city|location/i],
  ['notice_period', /notice period|how soon|earliest start|start date|available to start|availability/i],
  ['current_salary', /current (ctc|salary|compensation|base)/i],
  ['salary', /salary|compensation|ctc|pay expectation|expected (pay|package)/i],
  ['experience_years', /years of (professional )?experience|how many years/i],
  ['current_company', /current (company|employer)|most recent (company|employer)/i],
  ['current_title', /current (title|role|position)|job title/i],
  ['previous_employee', /previously (worked|been employed)|former employee|worked (at|for) .{0,30} before|consulted for/i],
  ['how_heard', /how did you (hear|find|learn)|where did you (hear|find|see)|referr(ed|al) source|^source$/i],
  ['accessibility', /accommodat|accessib|adjustments/i],
  ['why_company', /why (do you want|are you interested|.*join|this company)|what (excites|interests|draws) you/i],
  ['open_text', /tell us|describe|explain|share|what|how|why/i],
];

export const categoryOf = (label) => (CATEGORIES.find(([, re]) => re.test(String(label || ''))) || ['other'])[0];

// Categories whose answer is the same for every application: kept in the bank.
const REUSABLE = new Set(['phone', 'github', 'website', 'notice_period', 'salary', 'current_salary', 'experience_years', 'current_company',
  'current_title', 'how_heard', 'location', 'country', 'address', 'contractor', 'preferred_name', 'restrictions', 'accessibility', 'linkedin',
  'work_auth:india', 'work_auth:abroad', 'sponsorship:india', 'sponsorship:abroad', 'relocate:abroad', 'relocate:india']);

// What only he can decide, even with a default.
const ALWAYS_YOU = new Set(['consent', 'salary', 'current_salary', 'notice_period']);

const STANDARD = [
  ['first_name', 'First name', 'input_text', true], ['last_name', 'Last name', 'input_text', true],
  ['email', 'Email', 'input_text', true], ['phone', 'Phone', 'input_text', true],
  ['resume', 'Resume/CV', 'input_file', true], ['linkedin', 'LinkedIn profile', 'input_text', false],
  ['github', 'GitHub', 'input_text', false], ['website', 'Website / portfolio', 'input_text', false],
  ['location', 'Current location', 'input_text', false], ['current_company', 'Current company', 'input_text', false],
  ['work_auth', 'Are you legally authorized to work in the country of this role?', 'multi_value_single_select', true],
  ['sponsorship', 'Will you now or in the future require visa sponsorship?', 'multi_value_single_select', true],
  ['notice_period', 'Notice period / earliest start date', 'input_text', false],
  ['salary', 'Expected compensation', 'input_text', false],
  ['why_company', 'Why do you want to join us?', 'textarea', false],
  ['how_heard', 'How did you hear about us?', 'input_text', false],
].map(([cat, label, type, required]) => ({ id: cat, label, type, required, options: type.includes('select') ? ['Yes', 'No'] : [] }));

function greenhouseRef(job, board) {
  const id = job.external_id || (job.url.match(/(?:jobs\/|gh_jid=|token=)(\d{6,})/) || [])[1];
  const slug = board || (job.url.match(/greenhouse\.io\/(?:embed\/job_app\?for=)?([a-z0-9_-]+)/i) || [])[1];
  return id && slug ? { id, slug } : null;
}

/** The form's real questions (Greenhouse), else the standard set. */
export async function formQuestions(job) {
  if (job.ats === 'greenhouse') {
    const co = job.company_id ? await one(`SELECT ats_slug FROM companies WHERE id = $1`, [job.company_id]) : null;
    const ref = greenhouseRef(job, co?.ats_slug);
    if (ref) {
      try {
        const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(ref.slug)}/jobs/${ref.id}?questions=true`, { signal: AbortSignal.timeout(15_000) });
        if (res.ok) {
          const d = await res.json();
          const out = [];
          const add = (q, extra = {}) => {
            for (const f of q.fields || []) {
              if (f.type === 'input_hidden' || /_text$/.test(f.name)) continue; // resume_text / cover_letter_text duplicate the file
              out.push({ id: f.name, label: q.label, type: f.type, required: !!q.required, options: (f.values || []).map((v) => v.label), ...extra });
            }
          };
          (d.questions || []).forEach((q) => add(q));
          (d.location_questions || []).forEach((q) => add(q));
          for (const c of d.compliance || []) (c.questions || []).forEach((q) => add(q, { eeo: true }));
          if (out.length) return { source: 'greenhouse', questions: out, applyUrl: d.absolute_url || job.url };
        }
      } catch { /* fall through to the standard set */ }
    }
  }
  return { source: 'standard', questions: STANDARD, applyUrl: job.url };
}

/** Pick the option that matches an answer, if the question has options. */
function matchOption(options, want) {
  if (!options?.length || want == null) return want;
  const w = String(want).toLowerCase();
  return options.find((o) => o.toLowerCase() === w) || options.find((o) => o.toLowerCase().startsWith(w)) || options.find((o) => o.toLowerCase().includes(w)) || null;
}
const declineOption = (options) => (options || []).find((o) => /decline|don.?t wish|prefer not|not to (say|disclose|answer)|choose not/i.test(o)) || null;

async function profileFacts() {
  const p = await one(`SELECT full_name, email, phone, linkedin, website, location, headline FROM profile LIMIT 1`) || {};
  const [first, ...rest] = String(p.full_name || '').trim().split(/\s+/);
  return { ...p, first_name: first || '', last_name: rest.join(' '), full_name: p.full_name || '' };
}

/** Build (or rebuild) the pack for one job. */
export async function buildPack(jobId, { rebuild = false } = {}) {
  const existing = await one(`SELECT * FROM application_packs WHERE job_id = $1`, [jobId]);
  const job = await one(
    `SELECT j.id, j.title, j.url, j.location, j.ats, j.external_id, j.company_id, j.description, j.why_role,
            COALESCE(c.name, j.company_name) AS company,
            (SELECT w.why FROM company_why w WHERE w.key = lower(trim(COALESCE(c.name, j.company_name)))) AS why_company
     FROM jobs j LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1`,
    [jobId],
  );
  if (!job) throw Object.assign(new Error('Role not found'), { statusCode: 404 });
  if (existing && !rebuild) return packView(existing, job);

  const { source, questions } = await formQuestions(job);
  const place = classifyRole({ location: job.location, description: job.description });
  const region = place.place === 'bangalore' || (place.place === 'remote' && /india/i.test(job.location)) ? 'india' : 'abroad';
  const me = await profileFacts();
  const bank = Object.fromEntries((await many(`SELECT category, answer FROM application_answers`)).map((r) => [r.category, r.answer]));
  const kept = existing?.answers || {};

  const answers = {};
  const needDraft = [];
  for (const q of questions) {
    if (kept[q.id]?.source === 'you') { answers[q.id] = kept[q.id]; continue; } // never overwrite what he typed
    const cat = q.eeo ? 'eeo' : categoryOf(q.label);
    const a = { category: cat, value: '', source: '', needsYou: false, note: '' };
    const fromBank = (k) => bank[k] ?? bank[k.split(':')[0]];
    const set = (v, src, note = '') => { a.value = matchOption(q.options, v) ?? (q.options?.length ? '' : v); a.source = a.value ? src : ''; a.note = note; };

    if (cat === 'resume') { a.value = 'Resume PDF from the Studio'; a.source = 'file'; }
    else if (cat === 'cover_letter') { a.value = ''; a.source = ''; a.note = 'Optional — attach one from the Studio if you like'; }
    else if (['first_name', 'last_name', 'full_name', 'email'].includes(cat)) set(me[cat], 'profile');
    else if (cat === 'phone') set(me.phone || fromBank('phone'), me.phone ? 'profile' : 'bank');
    else if (cat === 'linkedin') set(me.linkedin || fromBank('linkedin'), 'profile');
    else if (cat === 'website') set(me.website || fromBank('website'), 'profile');
    else if (cat === 'location') set(fromBank('location') || me.location, fromBank('location') ? 'bank' : 'profile');
    else if (cat === 'country') set(fromBank('country') || 'India', fromBank('country') ? 'bank' : 'default', fromBank('country') ? '' : 'Country of residence');
    else if (cat === 'preferred_name') set(fromBank('preferred_name') || me.first_name, fromBank('preferred_name') ? 'bank' : 'profile');
    else if (cat === 'eeo') { const d = declineOption(q.options); a.value = d || ''; a.source = d ? 'default' : ''; a.note = 'Voluntary — set to "decline" unless you change it'; }
    else if (cat === 'work_auth') {
      const k = `work_auth:${region}`;
      set(fromBank(k) || (region === 'india' ? 'Yes' : 'No'), fromBank(k) ? 'bank' : 'default', region === 'india' ? 'Role in India' : 'Role outside India');
    } else if (cat === 'sponsorship') {
      const k = `sponsorship:${region}`;
      const v = fromBank(k) || (region === 'india' ? 'No' : 'Yes');
      a.value = matchOption(q.options, v) ?? matchOption(q.options, v === 'Yes' ? 'yes' : 'no') ?? (q.options?.length ? '' : v);
      a.source = a.value ? (fromBank(k) ? 'bank' : 'default') : ''; a.note = region === 'india' ? 'Role in India' : 'Role outside India — pick the visa type if it lists several';
    } else if (cat === 'located_in') {
      const inIndia = /india|bangalore|bengaluru/i.test(q.label);
      set(inIndia ? 'Yes' : (fromBank('located_in') || 'No'), 'default', inIndia ? 'You live in Bangalore' : 'Check the place it asks about');
    } else if (cat === 'github') set(fromBank('github') || (/github\.com/i.test(me.website || '') ? me.website : ''), 'bank');
    else if (cat === 'relocate') set(fromBank(`relocate:${region}`) || 'Yes', fromBank(`relocate:${region}`) ? 'bank' : 'default');
    else if (cat === 'previous_employee') set(fromBank(`previous:${job.company}`) || 'No', 'default', 'Have you worked there before?');
    else if (cat === 'address') set(fromBank('address') || '', 'bank');
    else if (cat === 'contractor') set(fromBank('contractor') || 'No', fromBank('contractor') ? 'bank' : 'default');
    else if (cat === 'restrictions') set(fromBank('restrictions') || 'No', fromBank('restrictions') ? 'bank' : 'default');
    else if (cat === 'how_heard') set(fromBank('how_heard') || (q.options?.length ? (matchOption(q.options, 'Company website') || matchOption(q.options, 'Job board') || '') : 'Company careers page'), fromBank('how_heard') ? 'bank' : 'default');
    else if (['notice_period', 'salary', 'current_salary', 'experience_years', 'current_company', 'current_title', 'accessibility'].includes(cat)) set(fromBank(cat) || '', 'bank');
    else if (cat === 'consent') { a.value = ''; a.note = 'You tick this yourself on the form'; }
    else if (['why_company', 'open_text', 'other'].includes(cat) && /textarea|input_text/.test(q.type)) needDraft.push(q);
    else if (q.options?.length) a.note = 'Pick one';

    if (cat === 'consent') a.needsYou = true;
    else if (ALWAYS_YOU.has(cat) && a.source !== 'bank') a.needsYou = true;
    else if (!a.value && cat !== 'cover_letter' && !needDraft.includes(q) && (q.required || cat !== 'other')) a.needsYou = !!q.required || ['salary', 'notice_period'].includes(cat);
    if (a.source === 'default' && q.required) a.needsYou = a.needsYou || ['work_auth', 'sponsorship', 'country'].includes(cat) && !bank[`${cat}:${region}`] && !bank[cat];
    answers[q.id] = a;
  }

  if (needDraft.length) {
    const res = await chatJson({
      kind: 'apply-drafts', model: DRAFT_MODEL, maxTokens: 1800,
      system: `You draft answers to job application questions for Siddhant. Use ONLY his profile/achievements and the role/company facts given; never invent employers, numbers or dates. Short questions get one line; "why" questions 60-110 words, specific to this company and role, no flattery, no "I am passionate". If a question asks for something not in the context, answer "" and it will be asked of him. Return JSON only.`,
      user: `${await candidateBlock({ limit: 8 })}

ROLE: ${job.title} at ${job.company} (${job.location})
WHY THIS COMPANY: ${job.why_company || ''}
WHY THIS ROLE: ${job.why_role || ''}
JD (start): ${String(job.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 2500)}

QUESTIONS
${JSON.stringify(needDraft.map((q) => ({ id: q.id, question: q.label, required: q.required })))}

Return {"answers":[{"id":"...","answer":"..."}]}`,
      input: { jobId },
    }).catch(() => ({ answers: [] }));
    for (const d of res?.answers || []) {
      const q = needDraft.find((x) => x.id === d.id);
      if (!q) continue;
      const text = String(d.answer || '').trim();
      answers[q.id] = { category: categoryOf(q.label), value: text, source: text ? 'ai' : '', needsYou: !text && q.required, note: text ? 'Drafted — read it before sending' : '' };
    }
    for (const q of needDraft) if (!answers[q.id]) answers[q.id] = { category: categoryOf(q.label), value: '', source: '', needsYou: !!q.required, note: '' };
  }

  const row = await one(
    `INSERT INTO application_packs (job_id, questions, answers, source) VALUES ($1, $2, $3, $4)
     ON CONFLICT (job_id) DO UPDATE SET questions = EXCLUDED.questions, answers = EXCLUDED.answers, source = EXCLUDED.source, updated_at = now()
     RETURNING *`,
    [jobId, JSON.stringify(questions), JSON.stringify(answers), source],
  );
  return packView(row, job, region);
}

/** His answers: saved on the pack, and reusable ones into the bank. */
export async function saveAnswers(jobId, updates = {}) {
  const pack = await one(`SELECT * FROM application_packs WHERE job_id = $1`, [jobId]);
  if (!pack) throw Object.assign(new Error('Build the pack first'), { statusCode: 404 });
  const job = await one(`SELECT location, description, COALESCE((SELECT name FROM companies c WHERE c.id = jobs.company_id), company_name) AS company FROM jobs WHERE id = $1`, [jobId]);
  const place = classifyRole({ location: job?.location, description: job?.description });
  const region = place.place === 'bangalore' || (place.place === 'remote' && /india/i.test(job?.location || '')) ? 'india' : 'abroad';
  const answers = pack.answers || {};
  let banked = 0;
  for (const [qid, value] of Object.entries(updates)) {
    const q = (pack.questions || []).find((x) => x.id === qid);
    if (!q) continue;
    const v = String(value ?? '').slice(0, 4000);
    const cat = answers[qid]?.category || categoryOf(q.label);
    answers[qid] = { ...(answers[qid] || {}), category: cat, value: v, source: 'you', needsYou: false, note: '' };
    const key = ['work_auth', 'sponsorship', 'relocate'].includes(cat) ? `${cat}:${region}` : cat === 'previous_employee' ? `previous:${job?.company}` : cat;
    if (v && (REUSABLE.has(key) || key.startsWith('previous:'))) {
      await query(`INSERT INTO application_answers (category, answer, question) VALUES ($1, $2, $3)
                   ON CONFLICT (category) DO UPDATE SET answer = EXCLUDED.answer, question = EXCLUDED.question, updated_at = now()`, [key, v, q.label]);
      banked += 1;
    }
  }
  const row = await one(`UPDATE application_packs SET answers = $2, updated_at = now() WHERE job_id = $1 RETURNING *`, [jobId, JSON.stringify(answers)]);
  return { ...(await packView(row, null, region)), banked };
}

/** Which Studio PDF goes with this job: its tailored version if exported, else the master. */
export async function resumeForJob(job) {
  const v = await one(
    `SELECT id, tailored_text, company_name, job_title FROM resume_versions
     WHERE (company_id = $1 OR lower(company_name) = lower($2))
     ORDER BY (lower(job_title) = lower($3)) DESC, created_at DESC LIMIT 1`,
    [job.company_id || '', job.company || '', job.title || ''],
  );
  if (v) {
    const pdf = await latestPdf({ hash: contentHash(v.tailored_text) });
    if (pdf) return { kind: 'tailored', versionId: v.id, label: `Tailored — ${v.company_name} ${v.job_title}`.trim(), pdf };
  }
  const master = await latestPdf({ kind: 'master' });
  return master ? { kind: 'master', versionId: 'master', label: 'Master resume', pdf: master, tailoredNotExported: v ? v.id : null } : { kind: null, tailoredNotExported: v ? v.id : null };
}

async function packView(row, job, region) {
  const j = job || await one(`SELECT j.id, j.title, j.url, j.company_id, COALESCE(c.name, j.company_name) AS company FROM jobs j LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1`, [row.job_id]);
  const resume = await resumeForJob(j);
  const items = (row.questions || []).map((q) => ({ ...q, answer: row.answers?.[q.id] || { value: '', source: '', needsYou: !!q.required } }));
  return {
    jobId: row.job_id, company: j.company, title: j.title, applyUrl: j.url, source: row.source, region,
    resume: { kind: resume.kind, label: resume.label || null, ready: Boolean(resume.pdf), versionId: resume.versionId || null,
      tailoredNotExported: resume.tailoredNotExported || null, filename: resume.pdf?.filename || null },
    questions: items,
    needsYou: items.filter((q) => q.answer.needsYou).length,
    updatedAt: row.updated_at,
  };
}

// ── Browser autofill (extension) ─────────────────────────────────────────

const keyHash = (k) => crypto.createHash('sha256').update(String(k)).digest('hex');

export async function newAutofillKey() {
  const key = `ccaf_${crypto.randomBytes(24).toString('base64url')}`;
  await query(`UPDATE autofill_keys SET revoked_at = now() WHERE revoked_at IS NULL`);
  await query(`INSERT INTO autofill_keys (key_hash) VALUES ($1)`, [keyHash(key)]);
  return { key };
}

export async function checkAutofillKey(key) {
  if (!key || !String(key).startsWith('ccaf_')) return false;
  return Boolean(await one(`SELECT 1 FROM autofill_keys WHERE key_hash = $1 AND revoked_at IS NULL`, [keyHash(key)]));
}

/** The job behind an application page URL (Greenhouse, Lever, Ashby, SmartRecruiters, Workday…). */
export async function jobForPage(pageUrl) {
  const u = String(pageUrl || '');
  const gh = u.match(/(?:greenhouse\.io\/[^?#]*jobs\/|gh_jid=|[?&]token=)(\d{6,})/i);
  if (gh) { const j = await one(`SELECT id FROM jobs WHERE ats = 'greenhouse' AND external_id = $1 ORDER BY closed_at NULLS FIRST LIMIT 1`, [gh[1]]); if (j) return j.id; }
  const uuid = u.match(/(?:jobs\.lever\.co|jobs\.ashbyhq\.com)\/[^/]+\/([0-9a-f-]{36})/i);
  if (uuid) { const j = await one(`SELECT id FROM jobs WHERE external_id = $1 OR url ILIKE $2 LIMIT 1`, [uuid[1], `%${uuid[1]}%`]); if (j) return j.id; }
  const sr = u.match(/jobs\.smartrecruiters\.com\/[^/]+\/(\d{6,})/i);
  if (sr) { const j = await one(`SELECT id FROM jobs WHERE url ILIKE $1 LIMIT 1`, [`%${sr[1]}%`]); if (j) return j.id; }
  const clean = u.split(/[?#]/)[0].replace(/\/(apply|application)\/?$/i, '');
  const j = await one(`SELECT id FROM jobs WHERE url = $1 OR url LIKE $2 ORDER BY closed_at NULLS FIRST LIMIT 1`, [clean, `${clean}%`]);
  return j?.id || null;
}

/** What the extension needs to fill one form: answers by field and by label, and the PDF. */
export async function autofillPayload(pageUrl) {
  const jobId = await jobForPage(pageUrl);
  if (!jobId) return { found: false, message: 'This role is not in Career Copilot yet — open it from the Apply queue, or add it there first.' };
  const pack = await buildPack(jobId);
  const job = await one(`SELECT j.id, j.title, j.company_id, COALESCE(c.name, j.company_name) AS company FROM jobs j LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1`, [jobId]);
  const resume = await resumeForJob(job);
  const me = await profileFacts();
  return {
    found: true, jobId, company: pack.company, title: pack.title,
    fields: pack.questions.map((q) => ({ id: q.id, label: q.label, type: q.type, category: q.answer.category, value: q.answer.value, options: q.options || [], needsYou: !!q.answer.needsYou, required: !!q.required })),
    profile: { first_name: me.first_name, last_name: me.last_name, full_name: me.full_name, email: me.email, phone: me.phone, linkedin: me.linkedin, website: me.website, location: me.location },
    categories: CATEGORIES.map(([k, re]) => [k, re.source]),
    // Answers he gave before, with their question: the extension matches a new form's question against these.
    // Region- or company-specific ones (work_auth:india, sponsorship:abroad, previous:<company>) stay with the pack, which knows the role.
    bank: (await many(`SELECT category, answer, question FROM application_answers WHERE question <> '' AND category NOT LIKE '%:%'`))
      .map((b) => ({ category: b.category, question: b.question, value: b.answer })),
    resume: resume.pdf ? { filename: resume.pdf.filename, label: resume.label, base64: Buffer.from(resume.pdf.pdf).toString('base64') } : null,
    resumeNote: resume.pdf ? null : 'No Studio PDF yet — export your resume once from the Resume Studio.',
    needsYou: pack.needsYou,
  };
}
