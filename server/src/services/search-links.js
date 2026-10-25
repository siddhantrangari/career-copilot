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
const ROLE_VARIANTS = [
  { test: /\b(ai|ml|llm|machine learning|genai|applied ai)\b/i, terms: ['AI Engineer', 'ML Engineer', 'LLM Engineer', 'Applied AI Engineer', 'GenAI Engineer'] },
  { test: /full[- ]?stack/i, terms: ['Full Stack Engineer', 'Fullstack Engineer', 'Full-Stack Developer', 'Full Stack Developer'] },
  { test: /forward[- ]deployed|\bfde\b/i, terms: ['Forward Deployed Engineer', 'Forward Deployed Software Engineer'] },
  { test: /solutions? engineer/i, terms: ['Solutions Engineer', 'Solutions Architect', 'Customer Engineer'] },
  { test: /back[- ]?end/i, terms: ['Backend Engineer', 'Back-end Engineer', 'Backend Developer'] },
];

function roleExpr(role) {
  const v = ROLE_VARIANTS.find((x) => x.test.test(role));
  const terms = v ? v.terms : [role];
  return terms.length === 1 ? `"${terms[0]}"` : `(${terms.map((t) => `"${t}"`).join(' OR ')})`;
}

function locationExpr(location = '') {
  const l = location.toLowerCase();
  if (/remote/.test(l) && /india/.test(l)) return '("Remote India" OR "India Remote" OR "Remote - India" OR "work from home")';
  if (/bangalore|bengaluru|blr/.test(l)) return '(Bangalore OR Bengaluru)';
  if (!l || /india/.test(l)) return '(Bangalore OR Bengaluru OR "Remote India" OR "India Remote")';
  return `"${location}"`;
}

const PERIOD = { day: 'qdr:d', week: 'qdr:w', month: 'qdr:m' };
const google = (query, period) => `https://www.google.com/search?q=${q(query)}&tbs=${PERIOD[period] || PERIOD.week}`;

const SITES = [
  ['LinkedIn', 'site:linkedin.com/jobs/view'],
  ['Naukri', 'site:naukri.com/job-listings'],
  ['Instahyre', 'site:instahyre.com/job'],
  ['foundit', 'site:foundit.in/job'],
  ['Indeed India', 'site:in.indeed.com'],
  ['Wellfound', 'site:wellfound.com/jobs'],
  ['Cutshort', 'site:cutshort.io/job'],
  ['Hirist', 'site:hirist.tech'],
  ['ATS boards', '(site:boards.greenhouse.io OR site:job-boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com OR site:apply.workable.com OR site:myworkdayjobs.com OR site:jobs.smartrecruiters.com)'],
];

/** Google boolean searches for one role and location, past week by default. */
export function googleBooleanLinks(role = 'AI Engineer', location = 'Bangalore', period = 'week') {
  const r = roleExpr(role);
  const l = locationExpr(location);
  const links = SITES.map(([name, site]) => {
    const query = `${site} ${r} ${l}`;
    return { name: `Google · ${name}`, query, url: google(query, period) };
  });
  const careers = `${r} ${l} (inurl:careers OR inurl:jobs) -site:linkedin.com -site:naukri.com -site:indeed.com -site:glassdoor.com -site:foundit.in`;
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
  return [
    { label: 'AI Engineer', url: google(`${roleExpr('AI Engineer')} ${locationExpr('')}`, 'day') },
    { label: 'Full Stack', url: google(`${roleExpr('Full Stack')} ${locationExpr('')}`, 'day') },
    { label: 'Forward Deployed', url: google(`${roleExpr('Forward Deployed')} ${locationExpr('')}`, 'day') },
  ];
}
