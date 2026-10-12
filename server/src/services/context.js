import { many, one } from '../db/pool.js';

/** The candidate profile + CAR bank, formatted for prompt injection. */
export async function loadCandidateContext({ tags = [], limit = 12 } = {}) {
  const profile = await one('SELECT * FROM profile WHERE id = $1', ['siddhant']);

  const achievements = tags.length
    ? await many(
        `SELECT * FROM achievements
         WHERE used_for && $1::text[] OR skills && $1::text[]
         ORDER BY id LIMIT $2`,
        [tags, limit],
      )
    : await many('SELECT * FROM achievements ORDER BY id LIMIT $1', [limit]);

  const pool = achievements.length
    ? achievements
    : await many('SELECT * FROM achievements ORDER BY id LIMIT $1', [limit]);

  return { profile, achievements: pool };
}

export function renderCandidateBlock({ profile, achievements }) {
  if (!profile) return 'No candidate profile configured.';

  const skills = profile.skills || {};
  const constraints = skills.constraints || {};

  // Everything except the metadata keys is a real skill category. This block is
  // the verifier's source of truth too, so omitting it makes the fact-checker
  // flag genuine skills as invented.
  const skillBlock = Object.entries(skills)
    .filter(([k, v]) => !['constraints', 'gap_answer'].includes(k) && Array.isArray(v))
    .map(([category, list]) => `${category}: ${list.join(', ')}`)
    .join('\n');

  const stories = achievements
    .map(
      (a, i) => `${i + 1}. ${a.title} — ${a.company} (${a.period})
   Challenge: ${a.challenge}
   Action: ${a.action}
   Result: ${a.result}
   Skills: ${(a.skills || []).join(', ')}`,
    )
    .join('\n');

  return `CANDIDATE PROFILE
Name: ${profile.full_name}
Headline: ${profile.headline}
Location: ${profile.location}
LinkedIn: ${profile.linkedin} | Site: ${profile.website} | Email: ${profile.email}${profile.phone ? ` | Phone: ${profile.phone}` : ''}
Target roles (priority order): ${(profile.target_roles || []).join(' > ')}
Compensation target: ${constraints.compensation || 'n/a'}
Interview constraint: ${constraints.no_dsa || 'n/a'}
Availability: ${constraints.availability || 'n/a'}

SUMMARY
${profile.summary}

TECH STACK (all of this is real, verified experience)
${skillBlock}

CAREER GAP — the honest framing
${skills.gap_answer || 'n/a'}

MASTER RESUME
${profile.master_resume}

ACHIEVEMENT BANK (CAR format — use these as the proof behind every claim)
${stories}`;
}

/** Convenience: context block in one call. */
export async function candidateBlock(opts) {
  return renderCandidateBlock(await loadCandidateContext(opts));
}
