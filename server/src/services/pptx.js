import PptxGenJS from 'pptxgenjs';

/**
 * WIN document → PowerPoint deck.
 *
 * The `slides` array on a WIN doc is authored to render on both an in-browser
 * slideshow (see web/bridge.js) and a real .pptx file — same content, same
 * order, same brand colors. This module owns the .pptx half.
 *
 * We use pptxgenjs because it is pure JS (no headless Chromium, no LibreOffice
 * shell-outs), streams the file straight to the response, and the resulting
 * deck opens cleanly in PowerPoint, Keynote and Google Slides — which is the
 * whole point of shipping this format.
 */

// 16:9 widescreen dimensions, in inches — pptxgenjs's native unit.
const W = 13.333;
const H = 7.5;

// Convert "#RRGGBB" or "RRGGBB" to the bare hex pptxgenjs expects. Falls back
// to a neutral if the input is missing or malformed, so a bad palette never
// crashes deck generation.
function hex(color, fallback = '4A7CFF') {
  if (!color) return fallback;
  const clean = String(color).replace('#', '').trim();
  return /^[0-9a-fA-F]{6}$/.test(clean) ? clean.toUpperCase() : fallback;
}

function palette(brand) {
  const c = brand?.colors || {};
  return {
    primary: hex(c.primary, '4A7CFF'),
    accent:  hex(c.accent,  '8B5CF6'),
    bg:      hex(c.bg,      '0F131B'),
    surface: hex(c.surface, '151A24'),
    text:    hex(c.text,    'E7ECF3'),
    muted:   hex(c.muted,   '7C8BA3'),
  };
}

// Fetch the brand logo as a data URL so pptxgenjs can embed it. Returns null
// on any failure — the cover slide falls back to a typographic mark, and the
// deck still ships.
async function fetchLogoDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/png';
    if (!/image\/(png|jpe?g|gif|svg\+xml)/i.test(contentType)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // pptxgenjs handles data URLs directly. SVGs sometimes render off in
    // PowerPoint, but keeping the format they came in is the safest default.
    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Layout primitives shared across slide kinds.
 * The pattern: a thin brand strip on the left (primary color) and the logo
 * top-right — the two consistent brand cues on every slide.
 */
function addChrome(slide, colors, logo, pageIndex, pageCount) {
  slide.background = { color: colors.bg };

  // Left accent bar
  slide.addShape('rect', {
    x: 0, y: 0, w: 0.22, h: H,
    fill: { color: colors.primary }, line: { color: colors.primary },
  });

  if (logo) {
    slide.addImage({
      data: logo, x: W - 1.35, y: 0.35, w: 1.0, h: 0.5,
      sizing: { type: 'contain', w: 1.0, h: 0.5 },
    });
  }

  // Page number footer
  slide.addText(`${pageIndex} / ${pageCount}`, {
    x: W - 1.2, y: H - 0.45, w: 1.0, h: 0.3,
    fontSize: 9, color: colors.muted, align: 'right', fontFace: 'Inter',
  });
}

function addTitle(slide, text, colors, y = 0.5) {
  slide.addText(String(text || ''), {
    x: 0.6, y, w: W - 1.8, h: 0.9,
    fontSize: 30, bold: true, color: colors.text, fontFace: 'Inter',
    valign: 'top',
  });
  // Underline stripe
  slide.addShape('rect', {
    x: 0.6, y: y + 1.0, w: 0.9, h: 0.06,
    fill: { color: colors.accent }, line: { color: colors.accent },
  });
}

function addBullets(slide, items, colors, opts = {}) {
  const { x = 0.6, y = 2.0, w = W - 1.2, h = H - 2.6 } = opts;
  const bullets = (items || []).filter(Boolean).map((t) => ({
    text: String(t),
    options: { bullet: { code: '25CF' }, color: colors.text, fontSize: 16 },
  }));
  if (!bullets.length) return;
  slide.addText(bullets, {
    x, y, w, h,
    fontFace: 'Inter', color: colors.text,
    valign: 'top', paraSpaceAfter: 8, lineSpacingMultiple: 1.3,
  });
}

function addStatusPill(slide, status, colors) {
  if (!status) return;
  const isConfirmed = String(status).toUpperCase() === 'CONFIRMED';
  const fill = isConfirmed ? '3DDC84' : 'FFB020';
  slide.addShape('roundRect', {
    x: W - 2.6, y: 0.55, w: 1.6, h: 0.4,
    fill: { color: fill }, line: { color: fill },
    rectRadius: 0.2,
  });
  slide.addText(String(status).toUpperCase(), {
    x: W - 2.6, y: 0.55, w: 1.6, h: 0.4,
    fontSize: 10, bold: true, color: '0F131B', align: 'center', valign: 'middle',
    fontFace: 'Inter',
  });
}

// ── Slide renderers ──────────────────────────────────────────────────────
function renderCover(slide, s, ctx) {
  const { colors, logo, companyName, deckTitle, subtitle, footer } = ctx;
  slide.background = { color: colors.bg };

  // Big diagonal accent block — gives the cover its "brand" feel without
  // needing a real background image.
  slide.addShape('rect', {
    x: 0, y: 0, w: W, h: 2.4,
    fill: { color: colors.primary }, line: { color: colors.primary },
  });
  slide.addShape('rect', {
    x: 0, y: 2.4, w: W, h: 0.15,
    fill: { color: colors.accent }, line: { color: colors.accent },
  });

  if (logo) {
    slide.addImage({
      data: logo, x: 0.7, y: 0.65, w: 1.6, h: 1.0,
      sizing: { type: 'contain', w: 1.6, h: 1.0 },
    });
  } else {
    slide.addText(companyName || '', {
      x: 0.7, y: 0.8, w: 8, h: 0.8,
      fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'Inter',
    });
  }

  slide.addText(String(s.title || deckTitle || 'WIN Document'), {
    x: 0.7, y: 3.1, w: W - 1.4, h: 1.5,
    fontSize: 46, bold: true, color: colors.text, fontFace: 'Inter',
  });

  slide.addText(String(s.subtitle || subtitle || ''), {
    x: 0.7, y: 4.9, w: W - 1.4, h: 0.6,
    fontSize: 18, color: colors.muted, fontFace: 'Inter',
  });

  slide.addShape('rect', {
    x: 0.7, y: 5.7, w: 0.9, h: 0.08,
    fill: { color: colors.accent }, line: { color: colors.accent },
  });

  slide.addText(String(s.footer || footer || ''), {
    x: 0.7, y: 5.95, w: W - 1.4, h: 0.5,
    fontSize: 13, color: colors.muted, fontFace: 'Inter',
  });
}

function renderAgenda(slide, s, ctx) {
  const { colors, logo, pageIndex, pageCount } = ctx;
  addChrome(slide, colors, logo, pageIndex, pageCount);
  addTitle(slide, s.title || 'What this covers', colors);
  addBullets(slide, s.bullets, colors, { y: 2.0 });
}

function renderProblem(slide, s, ctx) {
  const { colors, logo, pageIndex, pageCount } = ctx;
  addChrome(slide, colors, logo, pageIndex, pageCount);
  addTitle(slide, s.title || 'Problem', colors);
  addStatusPill(slide, s.status, colors);

  if (s.body) {
    slide.addText(String(s.body), {
      x: 0.6, y: 1.9, w: W - 1.2, h: 0.9,
      fontSize: 18, italic: true, color: colors.muted, fontFace: 'Inter',
    });
  }
  addBullets(slide, s.bullets, colors, { y: 2.9, h: H - 3.5 });
}

function renderSolution(slide, s, ctx) {
  const { colors, logo, pageIndex, pageCount } = ctx;
  addChrome(slide, colors, logo, pageIndex, pageCount);
  addTitle(slide, s.title || 'Solution', colors);

  // Solution slides get a colored strip label so the deck's "problem → solution"
  // rhythm reads at a glance when the audience is scanning thumbnails.
  slide.addShape('roundRect', {
    x: 0.6, y: 1.8, w: 1.4, h: 0.35,
    fill: { color: colors.accent }, line: { color: colors.accent },
    rectRadius: 0.15,
  });
  slide.addText('SOLUTION', {
    x: 0.6, y: 1.8, w: 1.4, h: 0.35,
    fontSize: 10, bold: true, color: '0F131B', align: 'center', valign: 'middle',
    fontFace: 'Inter',
  });

  if (s.body) {
    slide.addText(String(s.body), {
      x: 0.6, y: 2.3, w: W - 1.2, h: 0.9,
      fontSize: 18, color: colors.text, fontFace: 'Inter',
    });
  }
  addBullets(slide, s.bullets, colors, { y: 3.4, h: H - 4.0 });
}

function renderWhyMe(slide, s, ctx) {
  const { colors, logo, pageIndex, pageCount } = ctx;
  addChrome(slide, colors, logo, pageIndex, pageCount);
  addTitle(slide, s.title || 'Why me', colors);
  addBullets(slide, s.bullets, colors, { y: 2.0 });
}

function renderPlan(slide, s, ctx) {
  const { colors, logo, pageIndex, pageCount } = ctx;
  addChrome(slide, colors, logo, pageIndex, pageCount);
  addTitle(slide, s.title || 'First 90 days', colors);

  const cols = (s.columns || []).slice(0, 3);
  const gap = 0.3;
  const availableW = W - 1.2 - gap * (cols.length - 1);
  const colW = cols.length ? availableW / cols.length : availableW;

  cols.forEach((col, i) => {
    const x = 0.6 + i * (colW + gap);
    slide.addShape('roundRect', {
      x, y: 2.1, w: colW, h: H - 2.8,
      fill: { color: colors.surface }, line: { color: colors.surface },
      rectRadius: 0.15,
    });
    slide.addShape('rect', {
      x, y: 2.1, w: colW, h: 0.08,
      fill: { color: colors.accent }, line: { color: colors.accent },
    });
    slide.addText(String(col.heading || ''), {
      x: x + 0.2, y: 2.3, w: colW - 0.4, h: 0.5,
      fontSize: 16, bold: true, color: colors.primary, fontFace: 'Inter',
    });
    slide.addText(String(col.body || ''), {
      x: x + 0.2, y: 2.9, w: colW - 0.4, h: H - 3.7,
      fontSize: 13, color: colors.text, fontFace: 'Inter',
      valign: 'top',
    });
  });
}

function renderClosing(slide, s, ctx) {
  const { colors, logo, pageIndex, pageCount } = ctx;
  addChrome(slide, colors, logo, pageIndex, pageCount);
  addTitle(slide, s.title || "Let's talk", colors);

  if (s.body) {
    slide.addText(String(s.body), {
      x: 0.6, y: 2.0, w: W - 1.2, h: 1.4,
      fontSize: 24, color: colors.text, fontFace: 'Inter',
    });
  }
  addBullets(slide, s.bullets, colors, { y: 3.6 });
}

function renderGeneric(slide, s, ctx) {
  const { colors, logo, pageIndex, pageCount } = ctx;
  addChrome(slide, colors, logo, pageIndex, pageCount);
  addTitle(slide, s.title || '', colors);
  if (s.body) {
    slide.addText(String(s.body), {
      x: 0.6, y: 2.0, w: W - 1.2, h: 1.2,
      fontSize: 18, color: colors.text, fontFace: 'Inter',
    });
  }
  addBullets(slide, s.bullets, colors, { y: s.body ? 3.4 : 2.0 });
}

const RENDERERS = {
  cover:    renderCover,
  agenda:   renderAgenda,
  problem:  renderProblem,
  solution: renderSolution,
  'why-me': renderWhyMe,
  plan:     renderPlan,
  closing:  renderClosing,
};

/**
 * Build the .pptx as a Node Buffer. Callers stream this to the HTTP response.
 * Pure function apart from the logo fetch, so it is safe to call from any
 * route or job — no shared state, no filesystem writes.
 */
export async function buildWinDocPptx({ winDoc, company, brand }) {
  const sections = winDoc?.sections || {};
  const slides = Array.isArray(sections.slides) ? sections.slides : [];
  const colors = palette(brand);
  const logo = await fetchLogoDataUrl(brand?.logoUrl || brand?.iconUrl);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = sections.title || `${company?.name || 'Company'} — WIN Document`;
  pptx.author = 'Siddhant Rangari';
  pptx.company = company?.name || '';

  // If the model returned no slides (older WIN docs, or a bad JSON response),
  // synthesise a bare deck from the markdown so the download still works.
  const effective = slides.length ? slides : synthesiseSlides(winDoc, company);

  effective.forEach((s, i) => {
    const slide = pptx.addSlide();
    const ctx = {
      colors, logo,
      companyName: company?.name || '',
      deckTitle: sections.title || `${company?.name || ''} — WIN Document`,
      subtitle: sections.subtitle || '',
      footer: 'Consultant proposal · Siddhant Rangari',
      pageIndex: i + 1,
      pageCount: effective.length,
    };
    (RENDERERS[s.kind] || renderGeneric)(slide, s, ctx);
  });

  // pptxgenjs returns a Node Buffer when nodeBuffer is requested.
  return pptx.write({ outputType: 'nodebuffer' });
}

/** Last-resort fallback if a WIN doc was saved before slides existed. */
function synthesiseSlides(winDoc, company) {
  const s = winDoc?.sections || {};
  const out = [
    {
      kind: 'cover',
      title: `${company?.name || 'Company'} — WIN Document`,
      subtitle: 'Consultant proposal',
      footer: 'Siddhant Rangari',
    },
  ];
  (s.problems || []).slice(0, 3).forEach((p, i) => {
    out.push({
      kind: 'problem',
      title: `Problem ${i + 1} — ${(p.problem || '').slice(0, 60)}`,
      status: p.status,
      body: p.rootCause || '',
      bullets: [p.publicEvidence, p.theirWords, p.sourceUrl].filter(Boolean),
    });
  });
  (s.solutions || []).slice(0, 3).forEach((sol, i) => {
    out.push({
      kind: 'solution',
      title: `Solution ${i + 1}`,
      body: sol.solution || '',
      bullets: [sol.approach, ...(sol.firstActions || []), sol.kpi && `KPI: ${sol.kpi}`].filter(Boolean),
    });
  });
  if (s.plan) {
    out.push({
      kind: 'plan',
      title: 'First 90 days',
      columns: [
        { heading: 'Days 1–30', body: s.plan.days30 || '' },
        { heading: 'Days 31–60', body: s.plan.days60 || '' },
        { heading: 'Days 61–90', body: s.plan.days90 || '' },
      ],
    });
  }
  out.push({ kind: 'closing', title: "Let's talk", body: s.closing || '' });
  return out;
}
