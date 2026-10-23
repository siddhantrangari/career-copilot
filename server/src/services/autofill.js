import { many, one } from '../db/pool.js';

/**
 * Track-modal auto-fill.
 *
 * Clicking Track used to open an empty form even when the server already knew
 * the answers — messages generated, WIN docs built, connections logged, the
 * apply URL. This derives every field it can from existing records.
 *
 * Two rules:
 *  - Nothing is invented. Every suggested value carries provenance saying
 *    which record it came from, and the UI shows it.
 *  - Anything already saved wins. Auto-fill only proposes values for fields
 *    that are empty, so it can never overwrite something typed by hand.
 */

const STAGE_RANK = {
  new: 0, applied: 1, networking: 2, call: 3, win: 4, interview: 5, offer: 6, failed: 7,
};

export async function autofillCompany(companyId) {
  const company = await one('SELECT * FROM companies WHERE id = $1', [companyId]);
  if (!company) return null;

  const tracked = await one('SELECT * FROM tracked_companies WHERE company_id = $1', [companyId]);
  const connections = await many(
    'SELECT * FROM connections WHERE company_id = $1 ORDER BY position, created_at',
    [companyId],
  );
  const messages = await many(
    'SELECT kind, body, sent_at, created_at FROM messages WHERE company_id = $1 ORDER BY created_at',
    [companyId],
  );
  const winDocs = await many(
    'SELECT id, contact_name, created_at FROM win_docs WHERE company_id = $1 ORDER BY created_at DESC',
    [companyId],
  );
  const resumes = await many(
    `SELECT id, job_title, job_description, match_score, created_at
     FROM resume_versions WHERE company_id = $1 ORDER BY created_at DESC`,
    [companyId],
  );
  const interviews = await many(
    `SELECT id, round, status, started_at, report->>'readiness' AS readiness
     FROM interview_sessions WHERE company_id = $1 ORDER BY started_at DESC`,
    [companyId],
  );
  const jobs = await many(
    'SELECT title, url, location, description, discovered_at FROM jobs WHERE company_id = $1 ORDER BY discovered_at DESC LIMIT 5',
    [companyId],
  );

  const suggested = {};
  const provenance = {};

  // ── Job link ────────────────────────────────────────────────────────
  const jobFromTable = jobs[0]?.url;
  const jobFromResume = resumes.find((r) => /https?:\/\//.test(r.job_description || ''))
    ?.job_description?.match(/https?:\/\/\S+/)?.[0];

  if (jobFromTable) {
    suggested.jd = jobFromTable;
    provenance.jd = `Discovered job: ${jobs[0].title || 'posting'}`;
  } else if (jobFromResume) {
    suggested.jd = jobFromResume;
    provenance.jd = 'URL found in the job description you tailored a resume against';
  } else if (company.apply_url) {
    suggested.jd = company.apply_url;
    provenance.jd = 'Company careers page from the catalogue';
  }

export function cleanJdText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw;
  for (let i = 0; i < 2; i++) {
    if (!/&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/.test(text)) break;
    text = text
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
  text = text
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  return text
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

  // ── Job description text ────────────────────────────────────────────
  // Distinct from `jd` (which is a URL). This is the actual pasted JD body
  // that tools like Tailor Resume need — so the user does not re-paste it
  // every time. Preference: what they typed into the tracker → the JD text
  // used in the last tailored resume → the description from a discovered job.
  const trackedJdText = cleanJdText(tracked?.jdText || tracked?.jd || '');
  const jdCandidates = [
    { text: trackedJdText, where: 'Job description saved on the tracked company' },
    ...(resumes || [])
      .map((r) => ({
        text: cleanJdText(r.job_description || ''),
        where: `From your last tailored resume${r.job_title ? ` (${r.job_title})` : ''}`,
      }))
      .filter((c) => c.text.length > 200),
    ...(jobs || [])
      .map((j) => ({
        text: cleanJdText(j.description || ''),
        where: `Discovered job posting: ${j.title || 'untitled'}`,
      }))
      .filter((c) => c.text.length > 200),
  ];

  // A bare URL in the tracker's `jd` slot is not JD text — skip it, otherwise
  // the resume tool would try to tailor against "https://…".
  let jdText = jdCandidates.find(
    (c) => c.text && c.text.length > 200 && !/^https?:\/\/\S+$/i.test(c.text.trim()),
  );
  if (!jdText && trackedJdText && trackedJdText.length >= 40 && !/^https?:\/\/\S+$/i.test(trackedJdText.trim())) {
    jdText = jdCandidates[0];
  }
  if (jdText) {
    suggested.jdText = jdText.text;
    provenance.jdText = jdText.where;
  }

  // ── Messages sent ───────────────────────────────────────────────────
  if (messages.length) {
    const sent = messages.filter((m) => m.sent_at).length;
    const byKind = messages.reduce((acc, m) => {
      acc[m.kind] = (acc[m.kind] || 0) + 1;
      return acc;
    }, {});
    const parts = Object.entries(byKind).map(([k, n]) => `${n} ${k}`);
    suggested.msgs = `${messages.length} generated (${parts.join(', ')})` +
      (sent ? `, ${sent} marked sent` : '');
    provenance.msgs = 'Counted from messages generated for this company';
  }

  // ── WIN document ────────────────────────────────────────────────────
  if (winDocs.length) {
    // Only claim "sent" if the tracked record already said so.
    suggested.win = tracked?.win_status === 'sent' ? 'sent' : 'prepared';
    provenance.win = `${winDocs.length} WIN doc${winDocs.length > 1 ? 's' : ''} built` +
      (winDocs[0].contact_name ? ` (for ${winDocs[0].contact_name})` : '');
  } else if (company.research) {
    suggested.win = 'researching';
    provenance.win = 'Company research exists but no WIN doc yet';
  }

  // ── Stage ───────────────────────────────────────────────────────────
  let derivedStage = 'new';
  let stageReason = 'Not worked yet';

  if (connections.length) { derivedStage = 'networking'; stageReason = `${connections.length} connection(s) logged`; }
  if (connections.some((c) => ['reply', 'fu1', 'fu2', 'fu3'].includes(c.status))) {
    derivedStage = 'networking'; stageReason = 'A connection has replied';
  }
  if (connections.some((c) => c.status === 'call')) { derivedStage = 'call'; stageReason = 'A call is logged'; }
  if (winDocs.length) { derivedStage = 'win'; stageReason = 'A WIN doc has been built'; }
  if (interviews.length) { derivedStage = 'interview'; stageReason = `${interviews.length} interview session(s)`; }
  if (connections.some((c) => c.status === 'ref')) { derivedStage = 'interview'; stageReason = 'A referral came through'; }

  // Never walk a stage backwards from what is already saved.
  const current = tracked?.stage || 'new';
  suggested.stage = STAGE_RANK[derivedStage] > STAGE_RANK[current] ? derivedStage : current;
  provenance.stage = STAGE_RANK[derivedStage] > STAGE_RANK[current]
    ? stageReason
    : 'Keeping the stage you already set';

  // ── Notes: a concrete next action, not filler ───────────────────────
  // Work backwards from the furthest point actually reached. Checking
  // forwards meant a company with a WIN doc was still told to "research
  // first" just because research happened to be missing.
  let nextStep = null;
  if (winDocs.length && !interviews.length) {
    nextStep = 'WIN doc is built. Next: practise the win-defence round in the Interview Room.';
  } else if (winDocs.length && tracked?.win_status !== 'sent') {
    nextStep = 'WIN doc is built. Next: send it to your contact and mark it sent.';
  } else if (connections.some((c) => c.status === 'call') && !winDocs.length) {
    nextStep = 'Call is done. Next: build the WIN doc from the problems they confirmed.';
  } else if (connections.some((c) => ['reply', 'fu1', 'fu2', 'fu3'].includes(c.status))) {
    nextStep = 'Someone replied. Next: get a 15-minute validation call.';
  } else if (connections.length && connections.every((c) => c.status === 'req')) {
    nextStep = 'Connection requests are out. Next: first DMs once they accept.';
  } else if (company.research && !connections.length) {
    nextStep = 'Research is done. Next: find people and send connection requests.';
  } else if (!company.research) {
    nextStep = 'Run live research first — every message depends on it.';
  }

  // Research missing at a later stage is worth flagging, but it is not the
  // next action.
  if (nextStep) {
    suggested.notes = nextStep +
      (!company.research && connections.length ? ' (No research on file yet — worth running.)' : '');
    provenance.notes = 'Suggested next step based on how far this company has actually progressed';
  }

  return {
    company: { id: company.id, name: company.name, region: company.region },
    tracked: tracked || null,
    suggested,
    provenance,
    facts: {
      researched: Boolean(company.research),
      researchedAt: company.research?.searchedAt || company.research?.lastResearched || null,
      linkedInId: company.linkedin_company_id || null,
      connections: connections.length,
      messages: messages.length,
      winDocs: winDocs.length,
      tailoredResumes: resumes.length,
      interviews: interviews.map((i) => ({
        id: i.id, round: i.round, status: i.status, readiness: i.readiness,
      })),
      jobs: jobs.length,
    },
    connections,
  };
}
