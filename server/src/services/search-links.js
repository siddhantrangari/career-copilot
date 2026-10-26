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

const PERIOD = { day: 'qdr:d', week: 'qdr:w', month: 'qdr:m', year: 'qdr:y' };
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
  // Company career pages outside every board above. inurl:jobs is left out
  // on purpose: every aggregator's listing lives under /jobs, and it filled
  // the results with SimplyHired, Glassdoor and the like. -inurl:search drops
  // aggregators' search pages; the rest excludes the boards and social
  // reposts that still match /careers.
  const exclude = '-inurl:search -site:linkedin.com -site:naukri.com -site:indeed.com -site:glassdoor.co.in -site:glassdoor.com ' +
    '-site:simplyhired.co.in -site:shine.com -site:foundit.in -site:facebook.com -site:instagram.com';
  const careers = fitQueries(['inurl:careers'], role, loc, exclude)[0];
  links.push({ name: 'Google · company careers pages', query: careers, url: google(careers, period) });

  // Abroad, only where the employer moves him, and remote open to India.
  const ats = ['site:boards.greenhouse.io', 'site:job-boards.greenhouse.io', 'site:jobs.lever.co', 'site:jobs.ashbyhq.com'];
  const abroad = [
    ['Abroad · visa sponsorship', '("visa sponsorship" OR "sponsor visas" OR "visa support")'],
    ['Abroad · relocation support', '("relocation support" OR "relocation assistance" OR "relocation package")'],
    ['Gulf · Dubai, Abu Dhabi, Riyadh, Doha', '(Dubai OR "Abu Dhabi" OR Riyadh OR Doha)'],
    ['★ Luxembourg · visa, relocation or remote', 'Luxembourg ("visa sponsorship" OR "relocation" OR "remote")'],
    ['★ Sydney · visa, relocation or remote', 'Sydney ("visa sponsorship" OR "relocation" OR "remote")'],
    ['Remote · worldwide / APAC', '("remote" ("worldwide" OR "anywhere" OR APAC OR "work from anywhere"))'],
  ];
  for (const [name, expr] of abroad) {
    const query = fitQueries(ats, role, expr)[0];
    links.push({ name: `Google · ${name}`, query, url: google(query, period) });
  }
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
    // Luxembourg's government job board: employers there hire from abroad, and
    // software development is on the 2026 shortage list (no labour market test).
    { name: '★ Work in Luxembourg (gov board)', url: `https://jobs.workinluxembourg.com/offers?q=${q(role)}&page=0` },
    ...abroadBoardLinks(role),
  ];
}

/**
 * Europe boards where employers expect to sponsor or relocate, plus LinkedIn
 * across the EU with "visa sponsorship" in the search.
 */
export function abroadBoardLinks(role = 'AI Engineer') {
  const gtj = /\b(ai|ml|llm|genai)\b/i.test(role) ? 'AI' : /full[- ]?stack/i.test(role) ? 'Fullstack' : /back[- ]?end/i.test(role) ? 'Backend' : 'all';
  return [
    { name: '✈️ LinkedIn · EU, visa sponsorship', url: `https://www.linkedin.com/jobs/search/?keywords=${q(`${role} visa sponsorship`)}&location=European%20Union&f_TPR=r604800` },
    { name: '✈️ Relocate.me (relocation jobs)', url: 'https://relocate.me/international-jobs' },
    { name: '✈️ Arbeitnow · visa sponsorship', url: 'https://www.arbeitnow.com/jobs-with-visa-sponsorship' },
    { name: '✈️ Berlin Startup Jobs', url: `https://berlinstartupjobs.com/?s=${q(role)}` },
    { name: '✈️ GermanTechJobs', url: `https://germantechjobs.de/jobs/${gtj}/all` },
    { name: '✈️ English Jobs Germany', url: `https://englishjobs.de/in/germany?q=${q(role)}` },
    { name: '✈️ Landing.jobs (EU)', url: `https://landing.jobs/jobs?q=${q(role)}` },
    { name: '✈️ XING', url: `https://www.xing.com/jobs/search?keywords=${q(role)}` },
    // Denmark's official board for foreign candidates, and the Nordic startup board.
    { name: '✈️ Work in Denmark (gov board)', url: 'https://workindenmark.jobnet.dk/find-job' },
    { name: '✈️ The Hub (Nordic startups)', url: 'https://thehub.io/jobs' },
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
    { label: '★ Luxembourg gov board', url: 'https://jobs.workinluxembourg.com/offers?q=developer&page=0' },
  ];
}

// ── One company: news and people, as searches he opens ──────────────────
// Free Google searches built here and opened in his browser; the server
// never fetches them and no search API is spent.

/** "Anysphere (Cursor)" → ("Anysphere" OR "Cursor"); quotes stripped. */
function companyExpr(name) {
  const clean = String(name || '').replace(/["“”]/g, '').trim();
  const m = clean.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  const names = m ? [m[1].trim(), m[2].trim()] : [clean];
  return orGroup(names.map((n) => `"${n}"`));
}
const googleNews = (query, period) => `https://www.google.com/search?q=${q(query)}&tbm=nws&tbs=${PERIOD[period] || PERIOD.month}`;
const googleYear = (query) => `https://www.google.com/search?q=${q(query)}&tbs=qdr:y`;
const googleAny = (query) => `https://www.google.com/search?q=${q(query)}`;

/** What happened recently: news, money, layoffs, India expansion, interviews. */
export function companyNewsLinks(name) {
  const c = companyExpr(name);
  return [
    { name: 'News · past month', hint: 'Anything recent', url: googleNews(c, 'month') },
    { name: 'Funding & acquisitions', hint: 'Past year', url: googleNews(`${c} (funding OR raises OR acquisition OR acquires OR IPO OR valuation)`, 'year') },
    { name: 'Layoffs or hiring freeze', hint: 'Past year — a red flag if recent', url: googleNews(`${c} (layoffs OR "hiring freeze" OR restructuring OR "job cuts")`, 'year') },
    { name: 'India / Bangalore expansion', hint: 'Past year', url: googleYear(`${c} (Bangalore OR Bengaluru OR India) (office OR expansion OR "engineering center" OR hiring)`) },
    { name: 'Product & AI launches', hint: 'Past month', url: googleNews(`${c} (launches OR announces OR unveils OR "AI")`, 'month') },
    { name: 'Leadership changes', hint: 'Past year', url: googleNews(`${c} (appoints OR "new CEO" OR CTO OR "VP of Engineering" OR hires)`, 'year') },
    { name: 'Engineering blog', hint: 'What they are building', url: googleAny(`${c} ("engineering blog" OR "tech blog" OR inurl:engineering)`) },
    { name: 'Interview experiences', hint: 'Glassdoor, AmbitionBox, LeetCode Discuss', url: googleAny(`(site:glassdoor.co.in OR site:glassdoor.com OR site:ambitionbox.com OR site:leetcode.com/discuss) ${c} interview`) },
    { name: 'Salaries in Bangalore', hint: 'levels.fyi, AmbitionBox', url: googleAny(`(site:levels.fyi OR site:ambitionbox.com) ${c} (Bangalore OR Bengaluru OR India) salary`) },
    { name: 'Crunchbase profile', hint: 'Funding history', url: googleAny(`site:crunchbase.com/organization ${c}`) },
  ];
}

/** People to reach (Google X-ray of LinkedIn profiles), Bangalore first. */
export function companyPeopleLinks(name) {
  const c = companyExpr(name);
  const blr = '(Bangalore OR Bengaluru OR India)';
  const li = 'site:linkedin.com/in';
  return [
    { name: 'Hiring managers', type: 'hm', hint: 'Engineering managers, heads and directors', url: googleAny(`${li} ${c} ("engineering manager" OR "head of engineering" OR "director of engineering" OR "VP engineering") ${blr}`) },
    { name: 'AI / ML leads', type: 'hm', hint: 'Who owns the AI work', url: googleAny(`${li} ${c} ("head of AI" OR "AI lead" OR "ML lead" OR "applied AI" OR "machine learning manager")`) },
    { name: 'Peer engineers', type: 'peer', hint: 'Senior / staff engineers in your stack', url: googleAny(`${li} ${c} ("senior software engineer" OR "staff engineer" OR "full stack" OR "AI engineer") ${blr}`) },
    { name: 'Forward deployed / solutions', type: 'peer', hint: 'FDE and solutions engineers', url: googleAny(`${li} ${c} ("forward deployed" OR "solutions engineer" OR "solutions architect")`) },
    { name: 'Recruiters', type: 'hr', hint: 'Technical recruiters and talent partners', url: googleAny(`${li} ${c} ("technical recruiter" OR "talent acquisition" OR "talent partner") ${blr}`) },
    { name: 'LinkedIn people search', type: 'other', hint: 'LinkedIn’s own search, Bangalore', url: `https://www.linkedin.com/search/results/people/?keywords=${q(String(name || '').replace(/\s*\(.*\)\s*$/, ''))}%20Bangalore` },
  ];
}
