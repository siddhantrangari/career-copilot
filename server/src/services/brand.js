import { one, query } from '../db/pool.js';
import { config } from '../config.js';

/**
 * Company brand resolution — what makes the WIN deck look like the company's
 * own deck instead of a generic template.
 *
 * Two-tier design so the feature works out of the box, and gets richer if a
 * Brandfetch client id is configured:
 *
 *  1. Brandfetch (BRANDFETCH_CLIENT_ID set) — pulls the real logo and the
 *     dominant brand colors from the company's website. This is what makes a
 *     Remote.com deck look like Remote and a Cohere deck look like Cohere.
 *  2. Fallback (no key, or Brandfetch declined the domain) — Clearbit's public
 *     logo endpoint for the mark, plus a stable palette derived from a hash of
 *     the company id. Not the real brand, but consistent per company and safe.
 *
 * Result is cached on companies.brand so we never re-hit the network for a
 * company that already has a resolved palette. Force refresh with { force }.
 */

const BRANDFETCH_BASE = 'https://api.brandfetch.io/v2/brands';
const CACHE_TTL_DAYS = 30;

// ── Domain resolution ────────────────────────────────────────────────────
/** Best-effort URL → hostname without www. Returns null on garbage. */
function extractDomain(url) {
  if (!url) return null;
  let candidate = String(url).trim();
  if (!candidate) return null;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  try {
    const host = new URL(candidate).hostname.toLowerCase().replace(/^www\./, '');
    // Job-board hosts are not the company's own domain, so ignore them —
    // otherwise "greenhouse.io" becomes every company's brand.
    if (/\b(greenhouse|lever|ashby|workable|smartrecruiters|breezy|workday|myworkdayjobs|bamboohr|jobvite)\b/.test(host)) {
      return null;
    }
    return host;
  } catch {
    return null;
  }
}

/**
 * Figure out the company's public website domain from whatever fields we have.
 * Preference order: explicit website column → sources cited in research → the
 * apply URL (only if it is not a job-board) → a slugged guess from the name.
 */
function inferDomain(company) {
  const tries = [];
  if (company.website) tries.push(company.website);

  const sources = company.research?.sources || [];
  for (const s of sources) if (s?.url) tries.push(s.url);

  if (company.apply_url) tries.push(company.apply_url);

  for (const t of tries) {
    const d = extractDomain(t);
    if (d) return d;
  }

  // Last resort — a slugged guess. Not authoritative, but Brandfetch tolerates
  // "cohere.com" style guesses and Clearbit's logo endpoint 404s cleanly if
  // wrong, so this rarely does harm.
  const slug = String(company.name || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40);
  return slug ? `${slug}.com` : null;
}

// ── Palette fallback ─────────────────────────────────────────────────────
/**
 * Curated dark-slide palettes. Chosen for slide legibility: strong primary,
 * a lighter accent that contrasts on the primary, and a dark background that
 * white body text sits on cleanly. Indexed by a hash of the company id so the
 * same company always gets the same palette.
 */
const FALLBACK_PALETTES = [
  { primary: '#4A7CFF', accent: '#8B5CF6', bg: '#0F131B', surface: '#151A24', text: '#E7ECF3', muted: '#7C8BA3' },
  { primary: '#00A896', accent: '#02C39A', bg: '#0B1420', surface: '#12202E', text: '#EAF2F1', muted: '#7A9091' },
  { primary: '#FF6B6B', accent: '#FFB020', bg: '#1A0F12', surface: '#241419', text: '#F7E9E9', muted: '#B0898B' },
  { primary: '#7C4DFF', accent: '#E040FB', bg: '#120E24', surface: '#1D1837', text: '#EDE7FF', muted: '#8A82B5' },
  { primary: '#00B8D4', accent: '#18FFFF', bg: '#04141B', surface: '#0C2130', text: '#E0F7FA', muted: '#6A8993' },
  { primary: '#EF6C00', accent: '#FFB300', bg: '#1B120A', surface: '#251B10', text: '#FFF3E6', muted: '#B39880' },
  { primary: '#2ECC71', accent: '#1ABC9C', bg: '#0A1712', surface: '#12201A', text: '#E7F8EF', muted: '#7A9689' },
  { primary: '#E91E63', accent: '#F06292', bg: '#1A0B14', surface: '#26121D', text: '#FCE4EC', muted: '#B08095' },
];

function pickFallback(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return FALLBACK_PALETTES[Math.abs(hash) % FALLBACK_PALETTES.length];
}

function fallbackBrand(company, domain) {
  const palette = pickFallback(company.id || company.name || 'career');
  return {
    domain,
    logoUrl: domain ? `https://logo.clearbit.com/${domain}` : null,
    iconUrl: domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : null,
    colors: palette,
    source: 'fallback',
    fetchedAt: new Date().toISOString(),
  };
}

// ── Brandfetch ───────────────────────────────────────────────────────────
/**
 * Brandfetch's public brand API. Requires a free client id. Returns null if
 * unavailable, unauthorised, or the domain has no brand data — every failure
 * mode falls back to the deterministic palette rather than surfacing an error.
 */
async function fetchBrandfetch(domain) {
  const clientId = process.env.BRANDFETCH_CLIENT_ID;
  if (!clientId || !domain) return null;

  try {
    const res = await fetch(`${BRANDFETCH_BASE}/${encodeURIComponent(domain)}`, {
      headers: { Authorization: `Bearer ${clientId}` },
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || typeof data !== 'object') return null;

    // Pull the darkest and brightest colors that read as brand marks. The
    // response contains type-tagged entries ("brand", "accent", "dark",
    // "light"), so pick with intent instead of taking the first two.
    const cols = Array.isArray(data.colors) ? data.colors : [];
    const pickByType = (t) => cols.find((c) => c?.type === t)?.hex;
    const primary = pickByType('brand') || pickByType('accent') || cols[0]?.hex || '#4A7CFF';
    const accent = pickByType('accent') || cols.find((c) => c?.hex && c.hex !== primary)?.hex || '#8B5CF6';

    // Logo preference: an icon (square) for tiny placements, and a full mark
    // for the cover slide. Prefer light-on-dark variants because our slides
    // are dark; fall back to whatever exists.
    const logos = Array.isArray(data.logos) ? data.logos : [];
    const pickLogo = (theme) => {
      for (const l of logos) {
        if (!Array.isArray(l?.formats)) continue;
        if (theme && l.theme && l.theme !== theme) continue;
        const png = l.formats.find((f) => f.format === 'png') || l.formats.find((f) => f.format === 'svg');
        if (png?.src) return png.src;
      }
      return null;
    };

    return {
      domain,
      name: data.name || null,
      description: data.description || null,
      logoUrl: pickLogo('dark') || pickLogo() || `https://logo.clearbit.com/${domain}`,
      iconUrl:
        logos.find((l) => l?.type === 'icon')?.formats?.[0]?.src ||
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      colors: {
        primary,
        accent,
        // Keep slide surface colors from our curated palette so text contrast
        // stays predictable — brand colors touch the accents, not the paper.
        bg: '#0F131B',
        surface: '#151A24',
        text: '#E7ECF3',
        muted: '#7C8BA3',
      },
      source: 'brandfetch',
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Network hiccups shouldn't break WIN doc generation; log and fall back.
    console.warn(`[brand] Brandfetch lookup for ${domain} failed: ${err.message}`);
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────
function stale(brand) {
  if (!brand?.fetchedAt) return true;
  const age = Date.now() - new Date(brand.fetchedAt).getTime();
  return age > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Resolve and cache brand data for a company. Returns the cached copy unless
 * stale or force = true. Never throws — a failure returns the deterministic
 * fallback so callers can always render a themed slide.
 */
export async function resolveBrand(companyId, { force = false } = {}) {
  const company = await one(
    'SELECT id, name, website, apply_url, research, brand FROM companies WHERE id = $1',
    [companyId],
  );
  if (!company) return null;

  if (!force && company.brand && !stale(company.brand)) return company.brand;

  const domain = inferDomain(company);
  const fetched = (await fetchBrandfetch(domain)) || fallbackBrand(company, domain);

  await query(
    'UPDATE companies SET brand = $2, website = COALESCE(NULLIF(website, \'\'), $3), updated_at = now() WHERE id = $1',
    [company.id, JSON.stringify(fetched), domain ? `https://${domain}` : ''],
  );

  return fetched;
}
