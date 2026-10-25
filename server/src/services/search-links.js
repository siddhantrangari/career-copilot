/**
 * Google boolean searches and portal search links — opened by him, never
 * fetched by the server.
 *
 * LinkedIn, Naukri, Instahyre, foundit and Indeed forbid automated reading,
 * and so does Google's own search page. A link he clicks is ordinary use, and
 * a site: query reaches postings on all of them at once, limited to the past
 * week and to his locations (in India: Bangalore/Bengaluru or remote only).
 */

const q = encodeURIComponent;
const slug = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Title synonyms recruiters actually use, so one search covers them all.
// The Navigator's evidence-based aliases (target_profile) extend these.
const ROLE_VARIANTS = [
  { test: /\b(ai|ml|llm|machine learning|genai|applied ai)\b/i, terms: ['AI Engineer', 'ML Engineer', 'LLM Engineer', 'Applied AI Engineer', 'GenAI Engineer'] },
  { test: /full[- ]?stack/i, terms: ['Full Stack Engineer', 'Fullstack Engineer', 'Full Stack Developer', 'Full-Stack Developer'] },
  { test: /forward[- ]deployed|\bfde\b/i, terms: ['Forward Deployed Engineer', 'Forward Deployed Software Engineer'] },
  { test: /solutions? engineer/i, terms: ['Solutions Engineer', 'Solutions Architect', 'Customer Engineer'] },
  { test: /back[- ]?end/i, terms: ['Backend Engineer', 'Back-end Engineer', 'Backend Developer'] },
];

let navigatorAliases = null; // { group: [titles] } loaded by setNavigatorAliases()
export function setNavigatorAliases(aliases) { navigatorAliases = aliases || null; }

function roleTerms(role) {
  const v = ROLE_VARIANTS.find((x) => x.test.test(role));
  const base = v ? v.terms : [role];
  // Navigator aliases for the same group, without duplicates.
  const extra = navigatorAliases
    ? Object.values(navigatorAliases).flat().filter((a) => v && v.test.test(a) && !base.some((b) => b.toLowerCase() === a.toLowerCase()))
    : [];
  return [...base, ...extra];
}

const LOCATIONS = {
  bangalore: '(Bangalore OR Bengaluru)',
  remote: '("Remote India" OR "India Remote" OR "work from home")',
  both: '(Bangalore OR Bengaluru OR "Remote India")',
};
function locationExpr(location = '') {
  const l = location.toLowerCase();
  if (/remote/.test(l) && /india/.test(l)) return LOCATIONS.remote;
  if (/bangalore|bengaluru|blr/.test(l)) return LOCATIONS.bangalore;
  if (!l || /india/.test(l)) return LOCATIONS.both;
  return `"${location}"`;
}

/**
 * Google ignores everything after 32 words, and OR counts as one. Without
 * this, a long ATS query silently loses its trailing terms — usually the
 * location. Every word inside quotes, every operator and every site: counts.
 */
export function googleTokens(query) {
  return query.replace(/[()"]/g, ' ').split(/\s+/).filter(Boolean).length;
}
const MAX_TOKENS = 32;

const orGroup = (items) => (items.length === 1 ? items[0] : `(${items.join(' OR ')})`);

/**
 * Build site-scoped queries that each fit the word limit: role synonyms are
 * trimmed first (down to two), then the site list is split into groups.
 */
function fitQueries(sites, role, loc, tail = '') {
  // A single portal gets every synonym; a multi-site group keeps the top
  // three, then two if the whole group still does not fit, before splitting.
  let terms = roleTerms(role);
  const build = (group, t) => [orGroup(group), orGroup(t.map((x) => `"${x}"`)), loc, tail].filter(Boolean).join(' ');
  if (sites.length > 1) terms = terms.slice(0, 3);
  while (terms.length > 2 && googleTokens(build(sites, terms)) > MAX_TOKENS) terms = terms.slice(0, -1);
  while (terms.length > 2 && googleTokens(build(sites.slice(0, 1), terms)) > MAX_TOKENS) terms = terms.slice(0, -1);
  const out = [];
  let group = [];
  for (const site of sites) {
    if (group.length && googleTokens(build([...group, site], terms)) > MAX_TOKENS) { out.push(build(group, terms)); group = []; }
    group.push(site);
  }
  if (group.length) out.push(build(group, terms));
  return out;
}

const PERIOD = { day: 'qdr:d', week: 'qdr:w', month: 'qdr:m' };
const google = (query, period) => `https://www.google.com/search?q=${q(query)}&tbs=${PERIOD[period] || PERIOD.week}`;

// Job-page paths, not search pages, so results are individual postings.
const PORTALS = [
  ['LinkedIn', ['site:linkedin.com/jobs/view']],
  ['Naukri', ['site:naukri.com/job-listings']],
  ['Instahyre', ['site:instahyre.com/job']],
  ['foundit', ['site:foundit.in/job']],
  ['Indeed India', ['site:in.indeed.com/viewjob']],
  ['Wellfound', ['site:wellfound.com/jobs']],
  ['Cutshort', ['site:cutshort.io/job']],
  ['Hirist', ['site:hirist.tech/j']],
];

// ATS platforms (NxtJob's list plus what Bangalore startups use), grouped
// so each query stays under the word limit.
const ATS = [
  ['ATS · Greenhouse, Lever, Ashby, Workable', ['site:boards.greenhouse.io', 'site:job-boards.greenhouse.io', 'site:jobs.lever.co', 'site:jobs.ashbyhq.com', 'site:apply.workable.com']],
  ['ATS · Workday, SmartRecruiters, iCIMS, Taleo, Jobvite, SuccessFactors', ['site:myworkdayjobs.com', 'site:jobs.smartrecruiters.com', 'site:icims.com', 'site:taleo.net', 'site:jobs.jobvite.com', 'site:successfactors.com', 'site:successfactors.eu']],
  ['ATS · Oracle, ADP, BrassRing, BambooHR, Breezy, JazzHR', ['site:oraclecloud.com', 'site:workforcenow.adp.com', 'site:brassring.com', 'site:bamboohr.com', 'site:breezy.hr', 'site:applytojob.com']],
  ['ATS · Keka, Darwinbox, Zoho Recruit, Freshteam (India)', ['site:keka.com', 'site:darwinbox.in', 'site:zohorecruit.in', 'site:zohorecruit.com', 'site:freshteam.com']],
];

/** Google boolean searches for one role and location, past week by default. */
export function googleBooleanLinks(role = 'AI Engineer', location = 'Bangalore', period = 'week') {
  const loc = locationExpr(location);
  const links = [];
  for (const [name, sites] of [...PORTALS, ...ATS]) {
    const queries = fitQueries(sites, role, loc);
    queries.forEach((query, i) => links.push({ name: `Google · ${name}${queries.length > 1 ? ` (${i + 1})` : ''}`, query, url: google(query, period) }));
  }
  // Company career pages outside every board above.
  const exclude = '-site:linkedin.com -site:naukri.com -site:indeed.com -site:glassdoor.com -site:foundit.in';
  const careers = fitQueries(['inurl:careers', 'inurl:jobs'], role, loc, exclude)[0];
  links.push({ name: 'Google · company careers pages', query: careers, url: google(careers, period) });
  return links;
}

/** The portals' own search pages. */
export function portalSearchLinks(role = 'AI Engineer', location = 'Bangalore') {
  const loc = location || 'Bangalore';
  return [
    { name: 'Instahyre', url: `https://www.instahyre.com/${slug(role)}-jobs-in-${slug(loc)}/` },
    { name: 'Naukri', url: `https://www.naukri.com/${slug(role)}-jobs-in-${slug(loc)}?jobAge=7` },
    { name: 'LinkedIn', url: `https://www.linkedin.com/jobs/search/?keywords=${q(role)}&location=${q(`${loc}, India`)}&f_TPR=r604800` },
    { name: 'foundit', url: `https://www.foundit.in/srp/results?query=${q(role)}&locations=${q(loc)}` },
    { name: 'Indeed India', url: `https://in.indeed.com/jobs?q=${q(role)}&l=${q(loc)}&fromage=7` },
    { name: 'Wellfound', url: `https://wellfound.com/role/l/${slug(role)}/${slug(loc)}` },
  ];
}

/** His standing searches, for the digest: one boolean search per target role. */
export function dailySearches() {
  const loc = locationExpr('');
  const plain = (role) => {
    let terms = roleTerms(role);
    let query = `${orGroup(terms.map((t) => `"${t}"`))} ${loc}`;
    while (terms.length > 2 && googleTokens(query) > MAX_TOKENS) { terms = terms.slice(0, -1); query = `${orGroup(terms.map((t) => `"${t}"`))} ${loc}`; }
    return query;
  };
  return [
    { label: 'AI Engineer', url: google(plain('AI Engineer'), 'day') },
    { label: 'Full Stack', url: google(plain('Full Stack'), 'day') },
    { label: 'Forward Deployed', url: google(plain('Forward Deployed'), 'day') },
  ];
}
