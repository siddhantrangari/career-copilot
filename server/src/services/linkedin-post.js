import { many } from '../db/pool.js';
import { chatJson } from './ai.js';
import { candidateBlock } from './context.js';

/**
 * LinkedIn post helper for his Daily System target (1 post a day).
 *
 * Follows his LinkedIn strategist rules: never from a blank page — it
 * drafts from what he gives it, or first suggests angles drawn from his
 * real achievements and this week's activity for him to pick. Hooks are
 * written last, in four formats whose lengths are checked in code, and the
 * draft is checked for banned phrases and dashes before he sees it.
 */

const MODEL = 'openai/gpt-5.6-luna';

const RULES = `VOICE: casual, direct, conversational; grade 7-8 readability; contractions; "you" language; "How I" over "How to". Lead with results ("here's what I did"). Name frameworks. Cut adverbs and filler (actually, basically, very, just, really, literally). Sentence case for headings.
FORMAT: paragraphs 1-3 lines, a blank line between every paragraph, bullets for lists, never 3+ lines without a break. Mobile-first.
STRUCTURE: hook (line 1) + re-hook (line 2 adds NEW information or stakes) → setup (2-3 lines of context/tension) → body (5-10 lines: the insight, framework or story) → CTA (1-2 lines, soft ask, white space before it).
HARD BANS: no emojis. No em dashes, en dashes, double hyphens or spaced hyphens; use periods, commas, colons, semicolons.
Banned openers: "I want to", "Today I", "In this post", "Here's a", "As you may know", "They called me crazy", "That night I couldn't sleep", "Here's the thing", "Here's why", "The truth is", "Then it hit me", "Plot twist", "Let that sink in", "Buckle up", "Fast forward", "And that's when".
Banned words: game-changer, unlock potential, paradigm shift, synergy, cutting-edge, revolutionize, leverage, optimize, streamline, dive deep, double down, move the needle, low-hanging fruit, circle back, ecosystem, elevate your, empower you, harness the power, next-level, North Star.
Banned patterns: "It's not X, it's Y" / "That's not X. That's Y."; crisis-to-revelation arcs; rhetorical takeaways ("The lesson? Do X."); fragment reveals ("The difference? X."); three-beat "One. Two. Three." rhythm; engagement bait ("Comment YES", "Tag a friend", "DM me").
NEVER invent: every fact, number, company and project must come from the material or his achievement bank below. If something is missing, leave it out.`;

const HOOK_SPECS = {
  dense: 'Dense: continuous text, 0 line breaks, 140-160 characters',
  punchy: 'Punchy + context: line 1 ≤50 chars, line break, line 2 ≤50 chars, ~100 chars total',
  bomb: 'Single-line bomb: one line, ≤50 characters',
  stacked: 'Stacked list: 2-3 lines, each ≤60 characters',
};

/** Check a hook against its format, in code — the model's count is not trusted. */
export function checkHook(format, text) {
  const t = String(text || '').replace(/\r/g, '').trim();
  const lines = t.split('\n').filter((l) => l.trim());
  const len = t.replace(/\n/g, '').length;
  const max = Math.max(...lines.map((l) => l.length));
  const ok = format === 'dense' ? lines.length === 1 && len >= 140 && len <= 160
    : format === 'punchy' ? lines.length === 2 && lines.every((l) => l.length <= 50)
    : format === 'bomb' ? lines.length === 1 && len <= 50
    : format === 'stacked' ? lines.length >= 2 && lines.length <= 3 && max <= 60
    : false;
  return { ok, chars: len, lines: lines.length };
}

const BANNED = [/[—–]/, / -- | - /, /\bhere's the thing\b/i, /\bthe truth is\b/i, /\blet that sink in\b/i, /\bplot twist\b/i, /\bgame[- ]changer\b/i,
  /\bleverag(e|ing)\b/i, /\boptimi[sz]e\b/i, /\bstreamline\b/i, /\bdive deep\b/i, /\bdouble down\b/i, /\bmove the needle\b/i, /\becosystem\b/i,
  /\bcutting[- ]edge\b/i, /\brevolutioni[sz]e\b/i, /\bsynergy\b/i, /\bnext-level\b/i, /\bnorth star\b/i, /\bit's not .{1,40}, it's\b/i,
  /\bcomment yes\b/i, /\btag a friend\b/i, /\b(actually|basically|literally)\b/i, /\p{Extended_Pictographic}/u];

export function lintPost(text) {
  return BANNED.filter((re) => re.test(String(text || ''))).map((re) => re.source.replace(/\\b/g, '').replace(/\\/g, ''));
}

/** What happened this week, so angles come from real events. */
async function weekFacts() {
  const [moved, roles, activity] = await Promise.all([
    many(`SELECT c.name, t.stage FROM tracked_companies t JOIN companies c ON c.id = t.company_id
          WHERE t.stage_changed_at > now() - interval '7 days' AND t.stage <> 'new' ORDER BY t.stage_changed_at DESC LIMIT 8`),
    many(`SELECT company_name, title FROM jobs WHERE app_status IS NOT NULL AND app_status_at > now() - interval '7 days' LIMIT 6`),
    many(`SELECT kind, sum(count)::int AS n FROM outreach_activity WHERE at > now() - interval '7 days' AND kind <> 'action_done' GROUP BY kind`),
  ]);
  return { pipelineMoves: moved, applications: roles, outreachThisWeek: activity };
}

/** Three angles to pick from, each tied to a real fact. */
export async function suggestAngles() {
  const res = await chatJson({
    kind: 'linkedin-angles', model: MODEL, maxTokens: 900,
    system: `You suggest LinkedIn post angles for Siddhant, a senior full-stack / AI / forward-deployed engineer in Bangalore whose posts should make hiring managers want to talk to him. Buckets: growth (hot take or pattern he has seen), authority (framework, system or result he built), personal (a real moment). Each angle MUST rest on a specific fact from his achievement bank or this week's activity, quoted in "basedOn". Never invent. Return JSON only.`,
    user: `${await candidateBlock({ limit: 10 })}

THIS WEEK
${JSON.stringify(await weekFacts())}

Return {"angles":[{"bucket":"growth|authority|personal","title":"one line","basedOn":"the real fact it uses","question":"one question to ask him for the real detail that makes it his"}]} with exactly 3 angles, one per bucket.`,
  });
  return { angles: Array.isArray(res?.angles) ? res.angles.slice(0, 3) : [] };
}

/** A post from his material (a brain dump, or a picked angle plus his answer). */
export async function draftPost({ material, bucket = 'authority' } = {}) {
  const raw = String(material || '').trim();
  if (raw.length < 20) {
    throw Object.assign(new Error('Give me the real moment first: a few lines on what happened, what you built or what you noticed. Or pick a suggested angle.'), { statusCode: 400 });
  }
  const res = await chatJson({
    kind: 'linkedin-post', model: MODEL, maxTokens: 1600,
    system: `You draft LinkedIn posts for Siddhant (senior full-stack / AI / forward-deployed engineer, Bangalore). Claude's job is structure; the substance is his material. Don't add anything he didn't say or that isn't in his achievement bank.\n${RULES}\nReturn JSON only.`,
    user: `${await candidateBlock({ limit: 8 })}

BUCKET: ${bucket}
HIS MATERIAL (the substance — use only this and the achievement bank):
${raw.slice(0, 4000)}

Write the body first, then the hooks last. Hooks: read the whole body, find the sharpest specific detail, and write one hook in each format:
${Object.values(HOOK_SPECS).map((s) => `- ${s}`).join('\n')}
Each hook is lines 1-2 of the post as it renders before "...more".

Return {"body":"the post WITHOUT the hook: setup, body, CTA, blank lines between paragraphs","hooks":{"dense":"...","punchy":"line1\\nline2","bomb":"...","stacked":"line1\\nline2\\nline3"},"recommended":"dense|punchy|bomb|stacked","why":"one sentence on why that hook"}`,
  });
  const hooks = Object.entries(res?.hooks || {})
    .filter(([f]) => HOOK_SPECS[f])
    .map(([format, text]) => ({ format, label: HOOK_SPECS[format].split(':')[0], text: String(text || '').trim(), ...checkHook(format, text) }));
  const body = String(res?.body || '').trim();
  return {
    body, hooks,
    recommended: HOOK_SPECS[res?.recommended] ? res.recommended : hooks.find((h) => h.ok)?.format || null,
    why: res?.why || '',
    warnings: lintPost(`${body}\n${hooks.map((h) => h.text).join('\n')}`),
  };
}
