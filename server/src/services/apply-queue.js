import { one, many, query } from '../db/pool.js';
import { config } from '../config.js';
import { addToList } from './company-detail.js';

/**
 * The Apply queue: the next roles worth applying to, at volume (his target
 * is 30–45 a day: abroad 15–20, India 10–15, remote 5–10), best first.
 *
 * Eligible = Bangalore/Bengaluru, remote that is open to India, or abroad
 * with evidence the employer will move him: visa sponsorship or relocation
 * support stated in the JD (the Gulf counts — employers there issue the
 * work visa as standard). Other Indian cities are out; abroad without that
 * evidence and region-locked remote are hidden unless asked for.
 *
 * Luxembourg and Sydney are his preferred abroad cities: a role there that
 * offers visa sponsorship, relocation or remote work goes to the top.
 *
 * Order: fit first, then the company's hiring signals, then freshness.
 * Marking a role applied records it on the job and as a role in his
 * pipeline (flagged `quick`, so follow-up nudges stay for the ones that
 * matter); skipping hides it as "not for me" — nothing is deleted.
 */

const BLR = /\b(bangalore|bengaluru)\b/i;
const INDIA = /\bindia\b/i;
const REMOTE = /\b(remote|work from home|wfh|anywhere|distributed)\b/i;
const OPEN_REGION = /\b(india|apac|asia|anywhere|worldwide|global|any location|all locations)\b/i;
const LOCKED_REGION = /\b(us|usa|u\.s\.|united states|canada|uk|united kingdom|europe|eu|emea|germany|france|spain|netherlands|poland|ireland|portugal|latam|brazil|mexico|australia|americas|north america|new york|san francisco|london|berlin)\b/i;
const GULF = /\b(dubai|abu dhabi|uae|united arab emirates|riyadh|saudi|ksa|doha|qatar|bahrain|kuwait|muscat|oman)\b/i;
// Preferred abroad cities — top of the queue when the employer will move him or lets him work remote.
const PREFERRED = /\b(luxembourg|sydney)\b/i;
const OTHER_INDIA = /\b(mumbai|pune|hyderabad|chennai|delhi|gurgaon|gurugram|noida|kolkata|ahmedabad|kochi|jaipur|chandigarh|coimbatore|indore|thiruvananthapuram|trivandrum)\b/i;

const VISA_YES = /(visa sponsorship (is )?(available|provided|offered|supported)|we (can |will |do |are able to )?sponsor|sponsor(ing|ship)? (of |for )?(work |employment )?(visas?|permits?)|offer(s|ing)? (visa )?sponsorship|sponsorship (is )?available|blue card|h-?1b (sponsorship|transfer)|skilled worker visa)/i;
const VISA_NO = /((not|unable to|cannot|can't|won't|will not|do not|don't|no) (be able to )?(provide |offer |support )?(visa |immigration )?sponsor|sponsorship (is )?not (available|provided|offered)|without (the need for )?(visa )?sponsorship|must (already )?(have|hold|be) (the )?(legal |unrestricted )?(right|authori[sz]ed|eligible) to work|no visa)/i;
const RELOC_YES = /(relocation (assistance|support|package|bonus|allowance|stipend|benefits?|is (available|provided|offered))|(help|assist|support)(s|ing)? (you |with )?(relocat|moving)|relocation to .{2,40} (is )?(provided|supported|available)|we (will |can )?relocate|open to relocation)/i;
const LOCKED_JD = /(must (be )?(located|based|reside) in|only (open|available) to candidates in)/i;
const RELOC_NO = /(no relocation|relocation (is )?not (available|provided|offered|supported)|not (offer|provide|support)(ing)? relocation)/i;

/** One sentence around the match, so he can see the evidence. */
function snippet(text, re) {
  const m = re.exec(text);
  if (!m) return null;
  const start = Math.max(0, text.lastIndexOf('.', m.index) + 1, m.index - 140);
  let end = text.indexOf('.', m.index + m[0].length);
  if (end === -1 || end - m.index > 220) end = Math.min(text.length, m.index + m[0].length + 120);
  return text.slice(start, end + 1).replace(/\s+/g, ' ').trim().slice(0, 260);
}

/** Where a role stands for him: eligible or not, and why. */
export function classifyRole({ location = '', description = '', flags = null }) {
  const loc = String(location || '');
  const jd = String(description || '').replace(/<[^>]+>/g, ' ');
  // flags: the same tests run in Postgres, so the queue needn't load every JD.
  const f = flags || { visaNo: VISA_NO.test(jd), visaYes: VISA_YES.test(jd), relocNo: RELOC_NO.test(jd), relocYes: RELOC_YES.test(jd), locked: LOCKED_JD.test(jd) && !INDIA.test(jd) };
  const visa = f.visaNo ? 'no' : f.visaYes ? 'yes' : null;
  const reloc = f.relocNo ? 'no' : f.relocYes ? 'yes' : null;
  const evidence = !jd ? null : visa === 'yes' ? snippet(jd, VISA_YES) : reloc === 'yes' ? snippet(jd, RELOC_YES)
    : visa === 'no' ? snippet(jd, VISA_NO) : null;

  if (BLR.test(loc)) return { place: 'bangalore', eligible: true, visa, reloc, evidence, label: 'Bangalore' };
  const pref = PREFERRED.exec(loc);
  if (pref && visa !== 'no') {
    const city = pref[1][0].toUpperCase() + pref[1].slice(1).toLowerCase();
    if (visa === 'yes' || reloc === 'yes') {
      return { place: 'abroad', eligible: true, preferred: true, visa, reloc, evidence, label: `★ ${city} — ${visa === 'yes' ? 'visa sponsorship' : 'relocation support'}` };
    }
    if (REMOTE.test(loc) && !f.locked) return { place: 'remote', eligible: true, preferred: true, visa, reloc, evidence, label: `★ ${city} — remote` };
  }
  if (REMOTE.test(loc)) {
    if (INDIA.test(loc) || OPEN_REGION.test(loc)) return { place: 'remote', eligible: true, visa, reloc, evidence, label: 'Remote (open to India)' };
    if (LOCKED_REGION.test(loc)) return { place: 'remote_locked', eligible: false, visa, reloc, evidence, label: 'Remote, region-locked' };
    // Plain "Remote": open unless the JD restricts it.
    const locked = f.locked;
    return { place: locked ? 'remote_locked' : 'remote', eligible: !locked, visa, reloc, evidence, label: locked ? 'Remote, region-locked' : 'Remote (region not stated)' };
  }
  if (INDIA.test(loc) || OTHER_INDIA.test(loc)) return { place: 'india_other', eligible: false, visa, reloc, evidence, label: 'Other Indian city' };
  if (GULF.test(loc)) return { place: 'abroad', eligible: visa !== 'no', visa: visa || 'employer', reloc, evidence, label: 'Gulf — employer work visa' };
  if (!loc.trim()) return { place: 'unknown', eligible: false, visa, reloc, evidence, label: 'Location not stated' };
  const moves = visa === 'yes' || reloc === 'yes';
  return { place: 'abroad', eligible: moves && visa !== 'no', visa, reloc, evidence,
    label: visa === 'yes' ? 'Abroad — visa sponsorship' : reloc === 'yes' ? 'Abroad — relocation support' : visa === 'no' ? 'Abroad — no sponsorship' : 'Abroad — sponsorship not stated' };
}

/** India, remote or abroad — for the job feed's tabs. Location only, no JD. */
export function regionOf(location) {
  const { place } = classifyRole({ location });
  if (place === 'bangalore' || place === 'india_other') return 'india';
  if (place === 'remote' || place === 'remote_locked') return 'remote';
  return place === 'abroad' ? 'abroad' : 'unknown';
}

const SCOPES = ['all', 'bangalore', 'remote', 'abroad'];

/**
 * Next roles to apply to. scope narrows by place; showUnverified adds
 * abroad roles that don't state sponsorship (to check by hand).
 */
export async function applyQueue({ scope = 'all', minFit = 70, limit = 40, showUnverified = false } = {}) {
  const s = SCOPES.includes(scope) ? scope : 'all';
  const rows = await many(
    `SELECT j.id, j.title, j.url, j.location, j.source, j.fit_score, j.relevance, j.why_role,
            j.description ~* $2 AS visa_no, j.description ~* $3 AS visa_yes, j.description ~* $4 AS reloc_no,
            j.description ~* $5 AS reloc_yes, (j.description ~* $6 AND j.description !~* 'india') AS locked,
            COALESCE(j.posted_at, j.discovered_at) AS posted, j.company_id,
            COALESCE(c.name, j.company_name) AS company,
            t.key AS target_key, t.tag, t.priority, t.hiring_score, t.rank, t.why_now,
            (SELECT w.why FROM company_why w WHERE w.key = lower(trim(COALESCE(c.name, j.company_name)))) AS why_company
     FROM jobs j
     LEFT JOIN companies c ON c.id = j.company_id
     LEFT JOIN company_targets t ON t.key = lower(trim(COALESCE(c.name, j.company_name)))
     WHERE j.closed_at IS NULL AND NOT j.dismissed AND j.app_status IS NULL
       AND COALESCE(j.engagement, 'fte') = 'fte' AND j.relevance >= 40
       AND COALESCE(j.fit_score, LEAST(j.relevance, 60)) >= $1
     ORDER BY COALESCE(j.fit_score, 0) DESC, COALESCE(t.hiring_score, 0) DESC, posted DESC NULLS LAST
     LIMIT 1500`,
    [Math.max(0, Math.min(100, Number(minFit) || 70)), VISA_NO.source, VISA_YES.source, RELOC_NO.source, RELOC_YES.source, LOCKED_JD.source],
  );

  // Roles already applied (or further) in his tracker, by company + title.
  const done = new Set();
  for (const t of await many(`SELECT t.company_id, c.name, t.notes FROM tracked_companies t JOIN companies c ON c.id = t.company_id WHERE t.notes LIKE '%CC_ROLES%'`)) {
    for (const r of splitNotes(t.notes).roles) {
      if (STAGE_ORDER.indexOf(r.stage || 'new') >= STAGE_ORDER.indexOf('applied') || r.stage === 'failed') {
        done.add(`${String(t.name).toLowerCase().trim()}|${String(r.title || '').toLowerCase().trim()}`);
        if (r.jobId) done.add(r.jobId);
      }
    }
  }

  const now = Date.now();
  const out = [];
  const counts = { bangalore: 0, remote: 0, abroad: 0, unverifiedAbroad: 0 };
  for (const r of rows) {
    if (done.has(r.id) || done.has(`${String(r.company).toLowerCase().trim()}|${String(r.title).toLowerCase().trim()}`)) continue;
    const c = classifyRole({ location: r.location, flags: { visaNo: r.visa_no, visaYes: r.visa_yes, relocNo: r.reloc_no, relocYes: r.reloc_yes, locked: r.locked } });
    const unverified = c.place === 'abroad' && !c.eligible && c.visa !== 'no';
    if (c.eligible) counts[c.place] += 1;
    if (unverified) counts.unverifiedAbroad += 1;
    if (!(c.eligible || (showUnverified && unverified))) continue;
    if (s !== 'all' && c.place !== s) continue;
    const ageDays = r.posted ? Math.max(0, (now - new Date(r.posted).getTime()) / 86_400_000) : 30;
    // Fit leads; hiring signals and freshness break ties; a stated move helps abroad;
    // Luxembourg / Sydney with a way in jump to the top.
    const score = (r.fit_score ?? Math.min(r.relevance, 60)) + (r.hiring_score || 0) * 0.15 + (r.priority ? 5 : 0)
      + Math.max(0, 7 - ageDays) * 0.6 + (c.visa === 'yes' || c.reloc === 'yes' ? 2 : 0) + (c.preferred ? 30 : 0);
    out.push({
      id: r.id, title: r.title, url: r.url, location: r.location, source: r.source, company: r.company, companyId: r.company_id,
      fit: r.fit_score, whyRole: r.why_role, whyCompany: r.why_company, posted: r.posted,
      tag: r.tag, priority: !!r.priority, hiring: r.hiring_score, rank: r.rank, whyNow: r.why_now, targetKey: r.target_key,
      place: c.place, placeLabel: c.label, preferred: !!c.preferred, visa: c.visa, relocation: c.reloc, evidence: null, unverified, score: Math.round(score * 10) / 10,
    });
  }
  out.sort((a, b) => b.score - a.score);
  // At most two roles per company near the top: a burst of applications to
  // one company in a day reads as spam to its recruiters. The rest follow.
  const seen = new Map();
  const first = []; const rest = [];
  for (const x of out) {
    const n = seen.get(x.company) || 0;
    (n < 2 ? first : rest).push(x);
    seen.set(x.company, n + 1);
  }
  const ordered = [...first, ...rest];
  const page = ordered.slice(0, Math.min(Number(limit) || 40, 200));
  // Evidence sentences for the roles on screen only.
  const withVisa = page.filter((x) => x.visa === 'yes' || x.visa === 'no' || x.relocation === 'yes');
  if (withVisa.length) {
    const jds = new Map((await many(`SELECT id, description FROM jobs WHERE id = ANY($1::uuid[])`, [withVisa.map((x) => x.id)])).map((r) => [r.id, r.description]));
    for (const x of withVisa) x.evidence = classifyRole({ location: x.location, description: jds.get(x.id) || '' }).evidence;
  }
  const applied = await one(
    `SELECT count(*) FILTER (WHERE app_status_at >= (date_trunc('day', now() AT TIME ZONE $1) AT TIME ZONE $1))::int AS today,
            count(*) FILTER (WHERE app_status_at >= (date_trunc('week', now() AT TIME ZONE $1) AT TIME ZONE $1))::int AS week
     FROM jobs WHERE app_status = 'applied' AND COALESCE(engagement, 'fte') = 'fte'`,
    [config.digest.timeZone],
  );
  return {
    items: page, total: out.length, counts,
    appliedFromQueue: applied, target: { daily: config.targets.daily.applications, stretch: config.targets.daily.applicationsStretch },
  };
}

const appliedOn = () => new Intl.DateTimeFormat('en-IN', { timeZone: config.digest.timeZone, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());

function splitNotes(notes) {
  const raw = String(notes || '');
  const m = raw.match(/<!--CC_ROLES:([\s\S]*?)-->/);
  let roles = [];
  if (m) { try { roles = JSON.parse(m[1]); } catch { roles = []; } }
  return { roles: Array.isArray(roles) ? roles : [], text: raw.replace(/<!--CC_ROLES:[\s\S]*?-->/g, '').trim() };
}
const joinNotes = (text, roles) => (roles.length ? `${text}${text ? '\n\n' : ''}<!--CC_ROLES:${JSON.stringify(roles)}-->` : text);
const STAGE_ORDER = ['new', 'interested', 'applied', 'networking', 'call', 'win', 'interview', 'offer'];

/** Applied: on the job, and as a role in his pipeline. Idempotent. */
export async function markApplied(jobId, { tailored = false } = {}) {
  const job = await one(`SELECT id, title, url, company_id, company_name, app_status FROM jobs WHERE id = $1`, [jobId]);
  if (!job) throw Object.assign(new Error('Role not found'), { statusCode: 404 });
  const name = job.company_name || (job.company_id ? (await one(`SELECT name FROM companies WHERE id = $1`, [job.company_id]))?.name : '');
  const listed = await addToList(job.company_id ? { id: job.company_id } : { name }, { stage: 'new' });
  if (!listed) throw Object.assign(new Error('Could not add the company to your list'), { statusCode: 400 });
  const companyId = listed.companyId;

  await query(`UPDATE jobs SET app_status = 'applied', app_status_at = COALESCE(app_status_at, now()), company_id = COALESCE(company_id, $2) WHERE id = $1`, [jobId, companyId]);

  const t = await one(`SELECT stage, notes FROM tracked_companies WHERE company_id = $1`, [companyId]);
  const { roles, text } = splitNotes(t?.notes);
  let role = roles.find((r) => r.jobId === jobId || (r.title || '').toLowerCase() === job.title.toLowerCase());
  if (!role) {
    role = { id: `role-${Date.now()}`, title: job.title, stage: 'applied', pay: '', jobLink: job.url, jdText: '', appliedAt: appliedOn(),
      interviewAt: '', outreachSent: '', notes: '', isPrimary: roles.length === 0, quick: !tailored, jobId };
    roles.push(role);
  } else if (STAGE_ORDER.indexOf(role.stage || 'new') < STAGE_ORDER.indexOf('applied')) {
    role.stage = 'applied';
    role.appliedAt = role.appliedAt || appliedOn();
    role.jobId = role.jobId || jobId;
  }
  // The company moves to Applied only from New / Interested — never backwards.
  const stage = ['new', 'interested'].includes(t?.stage || 'new') ? 'applied' : t.stage;
  await query(`UPDATE tracked_companies SET stage = $2, notes = $3, updated_at = now() WHERE company_id = $1`, [companyId, stage, joinNotes(text, roles)]);
  return { jobId, company: listed.name, companyId, role: role.title, stage };
}

/** Not for me: hidden from the queue and discovery (soft — reversible). */
export async function skipRole(jobId, { undo = false } = {}) {
  const r = await one(
    `UPDATE jobs SET dismissed = $2, dismissed_at = CASE WHEN $2 THEN now() ELSE NULL END WHERE id = $1 RETURNING id, title`,
    [jobId, !undo],
  );
  if (!r) throw Object.assign(new Error('Role not found'), { statusCode: 404 });
  return { jobId, skipped: !undo };
}
