import { cleanJdText } from './autofill.js';
import { searchProvider } from './providers.js';

/**
 * Clean and format job titles.
 * E.g. "Senior Full-Stack Engineer @ Acme Corp | Greenhouse" -> "Senior Full-Stack Engineer"
 */
function cleanJobTitle(rawTitle, company) {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  let t = rawTitle
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

  // Strip trailing company suffixes: " | Company", " - Company", " @ Company", " at Company"
  if (company) {
    const esc = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`\\s*(?:\\||-|–|—|@|at)\\s*${esc}.*$`, 'i'), '').trim();
  }
  // Strip common ATS suffixes
  t = t.replace(/\s*(?:\||-|–|—)\s*(?:Greenhouse|Lever|Ashby|Workable|SmartRecruiters|Recruitee|Careers|Jobs|Job Application).*$/i, '').trim();
  return t;
}

/**
 * Clean company name.
 */
function cleanCompanyName(rawCompany) {
  if (!rawCompany || typeof rawCompany !== 'string') return '';
  return rawCompany
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/(?:,?\s*Inc\.?|,?\s*LLC|,?\s*Ltd\.?)$/i, '')
    .trim();
}

/**
 * Parse Schema.org JSON-LD from HTML.
 * Almost all major job boards and career pages render Schema.org JobPosting for Google Jobs SEO.
 */
function parseJsonLdJob(html) {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
      for (const item of items) {
        const type = String(item['@type'] || '');
        if (type.toLowerCase() === 'jobposting' || type.toLowerCase().includes('jobposting')) {
          const title = item.title || item.name || '';
          const company = item.hiringOrganization?.name || (typeof item.hiringOrganization === 'string' ? item.hiringOrganization : '');
          const jd = cleanJdText(item.description || '');
          if (jd && jd.length > 80) {
            return {
              title: cleanJobTitle(title, company),
              company: cleanCompanyName(company),
              location: item.jobLocation?.address?.addressLocality || item.applicantLocationRequirements?.name || '',
              jdText: jd,
              source: 'json-ld',
            };
          }
        }
      }
    } catch {
      // Continue to next script
    }
  }
  return null;
}

/**
 * Extract Job Details from any Job Posting URL.
 * Supports:
 * - Greenhouse (API + HTML fallback)
 * - Lever (API + HTML fallback)
 * - Ashby (JSON-LD + HTML fallback)
 * - Workable (API + HTML fallback)
 * - SmartRecruiters (API + HTML fallback)
 * - Generic Career Pages & Job Boards (JSON-LD, OpenGraph, semantic HTML)
 * - AI Grounded Search fallback if blocked
 */
export async function extractJdFromUrl(url) {
  if (!url || typeof url !== 'string') {
    return { ok: false, error: 'URL is required' };
  }

  let rawUrl = url.trim();
  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = 'https://' + rawUrl;
  }

  // ── 1. Greenhouse fast-path ──────────────────────────────────────────
  const ghMatch = rawUrl.match(/(?:boards\.greenhouse\.io|job-boards\.eu\.greenhouse\.io)\/([^/?#]+)\/jobs\/(\d+)/i)
    || rawUrl.match(/boards\.greenhouse\.io\/embed\/job_app\?for=([^&]+)&token=(\d+)/i);
  if (ghMatch) {
    try {
      const [, board, id] = ghMatch;
      const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${id}`;
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'career-copilot/1.0 (Mozilla/5.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const jd = cleanJdText(data.content || '');
        if (jd && jd.length > 80) {
          const compName = cleanCompanyName(board.replace(/[-_]/g, ' '));
          return {
            ok: true,
            title: cleanJobTitle(data.title, compName),
            company: compName,
            location: data.location?.name || '',
            jdText: jd,
            url: rawUrl,
            source: 'greenhouse-api',
          };
        }
      }
    } catch (e) {
      console.warn('[extractJdFromUrl] GH API fast-path failed, will try HTML fetch:', e.message);
    }
  }

  // ── 2. Lever fast-path ──────────────────────────────────────────────
  const lvMatch = rawUrl.match(/jobs\.lever\.co\/([^/?#]+)\/([a-f0-9-]+)/i);
  if (lvMatch) {
    try {
      const [, board, id] = lvMatch;
      const apiUrl = `https://api.lever.co/v0/postings/${encodeURIComponent(board)}/${id}`;
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'career-copilot/1.0 (Mozilla/5.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        let full = cleanJdText(data.descriptionPlain || data.description || '');
        if (Array.isArray(data.lists)) {
          for (const l of data.lists) {
            full += '\n\n' + (l.text ? l.text + ':\n' : '') + cleanJdText(l.content || '');
          }
        }
        if (data.additionalPlain || data.additional) {
          full += '\n\nAdditional:\n' + cleanJdText(data.additionalPlain || data.additional);
        }
        if (full.trim().length > 80) {
          const compName = cleanCompanyName(board.replace(/[-_]/g, ' '));
          return {
            ok: true,
            title: cleanJobTitle(data.text, compName),
            company: compName,
            location: data.categories?.location || '',
            jdText: full.trim(),
            url: rawUrl,
            source: 'lever-api',
          };
        }
      }
    } catch (e) {
      console.warn('[extractJdFromUrl] Lever API fast-path failed, will try HTML fetch:', e.message);
    }
  }

  // ── 3. Workable fast-path ───────────────────────────────────────────
  const wkMatch = rawUrl.match(/apply\.workable\.com\/([^/?#]+)\/j\/([A-Za-z0-9]+)/i);
  if (wkMatch) {
    try {
      const [, board, id] = wkMatch;
      const apiUrl = `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(board)}/jobs/${id}`;
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'career-copilot/1.0 (Mozilla/5.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        let full = cleanJdText(data.description || '');
        if (data.requirements) full += '\n\nRequirements:\n' + cleanJdText(data.requirements);
        if (data.benefits) full += '\n\nBenefits:\n' + cleanJdText(data.benefits);
        if (full.trim().length > 80) {
          const compName = cleanCompanyName(board.replace(/[-_]/g, ' '));
          return {
            ok: true,
            title: cleanJobTitle(data.title, compName),
            company: compName,
            location: [data.city, data.country].filter(Boolean).join(', '),
            jdText: full.trim(),
            url: rawUrl,
            source: 'workable-api',
          };
        }
      }
    } catch (e) {
      console.warn('[extractJdFromUrl] Workable API fast-path failed, will try HTML fetch:', e.message);
    }
  }

  // ── 4. General HTML & JSON-LD Scraper ───────────────────────────────
  try {
    const res = await fetch(rawUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const html = await res.text();

      // Priority A: JSON-LD Schema.org JobPosting
      const jsonLd = parseJsonLdJob(html);
      if (jsonLd) {
        return {
          ok: true,
          title: jsonLd.title,
          company: jsonLd.company,
          location: jsonLd.location || '',
          jdText: jsonLd.jdText,
          url: rawUrl,
          source: 'json-ld',
        };
      }

      // Priority B: Meta Tags & OpenGraph
      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
      const ogSiteName = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)?.[1];
      const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1];
      const pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

      let titleCandidate = ogTitle || pageTitle || '';
      let companyCandidate = ogSiteName || '';

      if (!companyCandidate && titleCandidate) {
        const atMatch = titleCandidate.match(/(?:at|@)\s+([^|\-–—]+)$/i);
        if (atMatch) companyCandidate = atMatch[1].trim();
      }

      // Strip heavy non-content tags before parsing body
      const cleanHtml = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<svg[\s\S]*?<\/svg>/gi, '')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '');

      // Check common job description container elements
      let containerMatch = cleanHtml.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
      if (!containerMatch) {
        containerMatch = cleanHtml.match(/<div[^>]*(?:id|class)=["'][^"']*(?:job[-_]description|posting[-_]description|job[-_]details|content-intro|job_description)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      }

      let extractedBody = cleanJdText(containerMatch ? containerMatch[1] : cleanHtml);

      // If extracted body is very short but og:description is long, use og:description
      if (extractedBody.length < 250 && ogDesc && ogDesc.length > 120) {
        extractedBody = cleanJdText(ogDesc);
      }

      if (extractedBody.length >= 100) {
        return {
          ok: true,
          title: cleanJobTitle(titleCandidate, companyCandidate),
          company: cleanCompanyName(companyCandidate),
          jdText: extractedBody,
          url: rawUrl,
          source: 'html-scrape',
        };
      }
    }
  } catch (err) {
    console.warn('[extractJdFromUrl] Direct HTML fetch failed:', err.message);
  }

  // ── 5. Grounded Web Search Fallback (if direct fetch was blocked/failed) ──
  try {
    const search = searchProvider();
    if (search) {
      const prompt = `Extract the full job description, role title, company name, and requirements for this job posting URL: ${rawUrl}. Format as clean text.`;
      const sRes = await fetch(`${search.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${search.apiKey}`,
        },
        body: JSON.stringify({
          model: search.model,
          max_tokens: 2000,
          messages: [
            {
              role: 'system',
              content: 'You extract job posting details accurately from real web sources. Provide the Job Title, Company Name, and the full responsibilities, requirements, and qualifications.',
            },
            { role: 'user', content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (sRes.ok) {
        const sData = await sRes.json();
        const text = sData.choices?.[0]?.message?.content || '';
        const isFailure = /(?:unable to extract|nonexistent|does not resolve|cannot find any|no information found|page not found|404 not found|not accessible)/i.test(text);
        if (!isFailure && text.length > 200) {
          return {
            ok: true,
            title: '',
            company: '',
            jdText: cleanJdText(text),
            url: rawUrl,
            source: 'grounded-search',
          };
        }
      }
    }
  } catch (err) {
    console.warn('[extractJdFromUrl] Grounded search fallback failed:', err.message);
  }

  return {
    ok: false,
    error: 'Could not automatically read job description from this URL. Please paste the job description text directly.',
  };
}
