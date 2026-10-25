#!/usr/bin/env node
/**
 * Builds server/public from the untouched prototypes in /artifacts.
 *
 * The prototypes stay pristine — every change happens here, so re-running this
 * after editing an artifact re-applies the wiring. Two transformations:
 *
 *   1. inject bridge.css + bridge.js into <head>
 *   2. retag the prototype's inline <script> as type="text/cc-app" so it does
 *      NOT auto-run — the bridge executes it after hydrating localStorage from
 *      the server. Without this the app would read empty state on first paint.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'server/public');

const PAGES = [
  { src: 'artifacts/job_search_os_main.html', out: 'index.html', title: 'Companies & Pipeline' },
  { src: 'artifacts/job_search_os_outreach_resume.html', out: 'outreach.html', title: 'Outreach & Resume' },
];

const NAV = `
<div id="cc-nav" style="position:fixed;top:0;left:0;right:0;height:36px;z-index:9997;display:flex;align-items:center;gap:4px;
     padding:0 14px;background:rgba(10,13,18,.96);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
     border-bottom:1px solid #232a38;font:600 12px -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;box-sizing:border-box">
  <a href="/" data-short="Companies" style="padding:4px 12px;border-radius:6px;color:#a9b6c9;text-decoration:none">Companies &amp; Pipeline</a>
  <a href="/outreach.html" data-short="Studio" style="padding:4px 12px;border-radius:6px;color:#a9b6c9;text-decoration:none">Outreach &amp; Studio</a>
  <a href="/interview.html" data-short="Interview" style="padding:4px 12px;border-radius:6px;color:#a9b6c9;text-decoration:none">Interview Room</a>
</div>
<script>
  (function () {
    var here = location.pathname === '/' ? '/' : location.pathname;
    document.querySelectorAll('#cc-nav a').forEach(function (a) {
      if (a.getAttribute('href') === here) { a.style.background = '#1e2635'; a.style.color = '#fff'; }
    });
    document.body.style.paddingTop = '36px';
  })();
</script>`;


/**
 * The prototypes tell you to copy a prompt into Claude or ChatGPT. The server
 * now runs all of it directly, so this stale instruction copy is rewritten at
 * build time — leaving it would describe a workflow that no longer exists.
 */
const RELABEL = [
  ['🤖 Company Research Prompt (paste into Claude/GPT)', '🤖 Company Research — live web search'],
  ['Use this to research any company before reaching out. Click Generate → copy → paste into Claude or ChatGPT.',
   'Runs a live web search and builds a consultant-grade brief with cited sources. Saved to the company automatically. Takes about two minutes.'],
  ['Generate Research Prompt', 'Run live research'],
  ['Copy this → paste into Claude:', 'Result:'],
  ['STEP 1 — Research Prompt (paste into Claude before contacting anyone)',
   'STEP 1 — Research (runs a live web search here)'],
  ['STEP 4 — WIN Document Builder Prompt (paste into Claude after your call)',
   'STEP 4 — WIN Document (built here from your call notes + live evidence)'],
  ['Paste a JD below → copy the prompt → paste into Claude → get a tailored resume in 30 seconds',
   'Paste a JD below and get a tailored resume, fact-checked against your real history.'],
  ['Generate Tailored Resume Prompt', 'Tailor my resume'],
  ['Copy this prompt → paste into Claude:', 'Result:'],
];

const headInject = (v) => `
<link rel="stylesheet" href="/bridge.css?v=${v.bridgeCss}">
<script src="/html2pdf.bundle.min.js"></script>
<script>window.CC_ASSET_VERSION=${JSON.stringify(v.actions)};</script>
<script src="/bridge.js?v=${v.bridgeJs}"></script>`;

/**
 * Static assets are served with a 4-hour cache, so a deploy alone does not
 * reach a browser that already has them — the fix shipped but was invisible
 * until a hard refresh. Every asset URL now carries a content hash, and the
 * HTML that references them is served with max-age=0, so new code propagates
 * on the next normal page load.
 */
async function hashOf(file) {
  const buf = await fs.readFile(file);
  return crypto.createHash('md5').update(buf).digest('hex').slice(0, 10);
}

async function build() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });

  await fs.copyFile(path.join(ROOT, 'web/html2pdf.bundle.min.js'), path.join(OUT, 'html2pdf.bundle.min.js'));
  await fs.copyFile(path.join(ROOT, 'web/bridge.js'), path.join(OUT, 'bridge.js'));
  await fs.copyFile(path.join(ROOT, 'web/bridge.css'), path.join(OUT, 'bridge.css'));
  await fs.copyFile(path.join(ROOT, 'web/prototype-actions.js'), path.join(OUT, 'prototype-actions.js'));
  await fs.copyFile(path.join(ROOT, 'web/interview.html'), path.join(OUT, 'interview.html'));
  await fs.copyFile(path.join(ROOT, 'web/interview.js'), path.join(OUT, 'interview.js'));

  const v = {
    bridgeJs: await hashOf(path.join(ROOT, 'web/bridge.js')),
    bridgeCss: await hashOf(path.join(ROOT, 'web/bridge.css')),
    actions: await hashOf(path.join(ROOT, 'web/prototype-actions.js')),
    interviewJs: await hashOf(path.join(ROOT, 'web/interview.js')),
  };

  // The interview page references its assets directly, so version those too.
  const interviewHtml = (await fs.readFile(path.join(OUT, 'interview.html'), 'utf8'))
    .replace('/bridge.css"', `/bridge.css?v=${v.bridgeCss}"`)
    .replace('"/bridge.js"', `"/bridge.js?v=${v.bridgeJs}"`)
    .replace('"/interview.js"', `"/interview.js?v=${v.interviewJs}"`)
    .replace('<head>', `<head>\n<script>window.CC_ASSET_VERSION=${JSON.stringify(v.actions)};</script>`);
  await fs.writeFile(path.join(OUT, 'interview.html'), interviewHtml);

  for (const page of PAGES) {
    let html = await fs.readFile(path.join(ROOT, page.src), 'utf8');

    // 1. Defer the app script — the bridge runs it after hydration.
    const before = html;
    html = html.replace(/<script>(?![\s\S]{0,200}?src=)/, '<script type="text/cc-app">');
    if (html === before) {
      throw new Error(`${page.src}: could not find the inline <script> to defer`);
    }

    // 1a. Let the server's live company catalogue override the artifact's
    //     hard-coded COS[]. The array in the file stays as a fallback for
    //     offline / auth-failed loads — no data is lost. The bridge populates
    //     window.__CC_CATALOGUE__ from /api/companies before this script runs.
    const withOverride = html.replace(
      /const COS=\[/,
      'const COS=(typeof window!=="undefined"&&window.__CC_CATALOGUE__&&window.__CC_CATALOGUE__.length)?window.__CC_CATALOGUE__:[',
    );
    // Only warn on failure — the outreach page has no COS of its own, so an
    // artifact without one is legitimate.
    if (withOverride !== html) html = withOverride;

    // 2. Inject bridge assets and the cross-page nav.
    if (!html.includes('</head>')) throw new Error(`${page.src}: no </head> found`);
    html = html.replace('</head>', `${headInject(v)}\n</head>`);
    html = html.replace('<body>', `<body>\n${NAV}`);
    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>${page.title} — Career Copilot</title>`,
    );

    for (const [from, to] of RELABEL) html = html.split(from).join(to);

    await fs.writeFile(path.join(OUT, page.out), html);
    console.log(`[build:web] ${page.src} → server/public/${page.out}`);
  }

  console.log('[build:web] done');
}

build().catch((err) => {
  console.error(`[build:web] ${err.message}`);
  process.exit(1);
});
