# Career Copilot OS

Personal job search OS for **Siddhant Rangari** — Senior Full-Stack + AI Engineer targeting
Forward Deployed Engineer, AI Engineer and Senior Full-Stack roles across EU remote, the Gulf
and global remote. Self-hosted replacement for NxtJob.ai, extended with AI-generated company
research, outreach, WIN documents and tailored resumes.

**Live:** https://career.myagentfirm.com

---

## Stack

| Layer | Choice |
|---|---|
| Backend | Node.js 22 (ESM) + Fastify 5 |
| Database | PostgreSQL 16 (Docker, port 5438, database `career_copilot_os`) |
| AI | MeshAPI → `anthropic/claude-sonnet-4-6`, OpenAI `gpt-5.6-sol` as failover |
| Frontend | The `/artifacts` prototypes, wired to the API by `web/bridge.js` |
| Auth | Single-user JWT (30-day tokens) |
| Deploy | Hostinger KVM VPS, pm2 + nginx + Cloudflare |

No build step, no framework on the frontend. The two single-file prototypes stay
untouched in `/artifacts`; `scripts/build-web.js` injects the bridge and writes the
result to `server/public`.

---

## Layout

```
career-copilot-new/
├── artifacts/                 # the original prototypes — never edited by the build
├── web/
│   ├── bridge.js              # auth gate, server sync, AI drawer
│   └── bridge.css
├── scripts/
│   ├── build-web.js           # artifacts + bridge → server/public
│   └── deploy.sh              # rsync deploy to career.myagentfirm.com
├── server/
│   ├── data/                  # achievements.json (CAR bank), profile.json
│   └── src/
│       ├── index.js           # Fastify bootstrap
│       ├── config.js
│       ├── db/                # pool, schema.sql, migrate, seed
│       ├── routes/            # auth, companies, tracked, pipeline, ai, library, jobs, state
│       └── services/          # ai.js (failover), providers.js, prompts.js, context.js
├── docs/companies.json        # the 44 target companies
├── nginx/career.myagentfirm.conf
└── ecosystem.config.cjs       # pm2
```

---

## Local development

The app needs PostgreSQL on port 5438. Either run it locally with Docker:

```bash
npm run db:up
```

…or tunnel to the VPS instance (useful when Docker will not run locally):

```bash
ssh -f -N -o ServerAliveInterval=30 -L 15438:127.0.0.1:5438 vps
```

Then point `DATABASE_URL` at port 15438 and start:

```bash
npm install
npm run seed        # applies schema + loads companies, achievements, profile
npm run build:web   # artifacts → server/public
npm run dev
```

Open http://localhost:4010 and sign in with `APP_USER_EMAIL` / `APP_USER_PASSWORD` from `.env`.

---

## How the frontend is wired

The prototypes keep everything in two localStorage blobs, `sr_tracked` and `sr_custom`.
Rather than rewrite them, the build retags their inline `<script>` as `type="text/cc-app"`
so it does **not** auto-run. `bridge.js` then:

1. gates the page behind the login,
2. fetches `GET /api/state` and writes those two keys,
3. executes the deferred app script,
4. patches `localStorage.setItem` so every write debounce-pushes to `PUT /api/state`,
5. adds the AI drawer.

Edit an artifact, re-run `npm run build:web`, and the wiring re-applies. Both pages share
the same keys, so they share state through the server.

### Multi-Role & Studio Integration
- **Multi-Role Tracking per Company**: Companies in the pipeline support tracking multiple open roles simultaneously, with individual application stages (`Interested`, `Applied`, `Networking`, etc.), JDs, applied dates, and outreach logs.
- **Role-Specific Documents**: Directly links to tailored resumes, cover letters, and JDs on every company card via interactive chips (`📄 Resume (Score%)`, `✉️ Letter ✓`, `📋 JD`, `Apply ↗`).
- **Quick Document Viewer**: Preview formatted documents and download clean PDFs in one click without leaving the Kanban board.
- **Safe Persistence**: Stores multi-role records in database `notes` via safe `<!--CC_ROLES:...-->` metadata, adhering strictly to zero accidental data loss guidelines.
- **Custom Company Auto-Resolution**: Automatically maps custom company identifiers (`c_<timestamp>`) to human-readable names when opening Resume & Cover Letter Studio.

---

## API

All routes need `Authorization: Bearer <token>` except `/api/health` and `/api/auth/login`.

### Data
```
POST   /api/auth/login                      # → { token }
GET    /api/health                          # db + provider status
GET    /api/companies?region=&role=&tracked=
POST   /api/companies                       # add custom company
GET    /api/companies/:id                   # company + tracking + connections + messages
PATCH  /api/companies/:id
DELETE /api/companies/:id                   # custom only
GET    /api/tracked
POST   /api/tracked/:id                     # upsert stage/notes/jd/jobLink
DELETE /api/tracked/:id
GET    /api/tracked/:id/connections
POST   /api/tracked/:id/connections
PUT    /api/tracked/:id/connections/:connId
DELETE /api/tracked/:id/connections/:connId
GET    /api/pipeline                        # kanban columns
GET    /api/stats                           # funnel + reply rate + 12-week trend
GET    /api/state  |  PUT /api/state        # prototype compatibility blob
GET    /api/state/ui/:key | PUT /api/state/ui/:key
GET    /api/achievements?tag=&skill=
POST   /api/achievements
GET    /api/profile  |  PATCH /api/profile
GET    /api/messages?companyId=
POST   /api/messages/:id/sent
GET    /api/jobs  |  POST /api/jobs  |  DELETE /api/jobs/:id
GET    /api/jobs/search-links?role=&location=
POST   /api/jobs/dsa-check                  # regex JD scan for LeetCode signals
```

### AI

Each capability runs synchronously at its own path (fine for curl) or as a background
task via `/api/tasks` (what the browser uses — nothing else survives Cloudflare's limit).

```
POST   /api/tasks  { kind, ...payload }     # → 202 { job: { id } }
GET    /api/tasks/:id                       # → { job: { status, result, error } }
GET    /api/tasks?limit=                    # recent tasks
GET    /api/evidence/:companyId             # the live search results behind a brief

POST   /api/research                        # cached 7 days unless { force: true }
POST   /api/generate-messages               # connection note / first DM / peer DM / follow-up
POST   /api/call-prep                       # 15-minute validation call script
POST   /api/generate-win-doc                # requires problems[] from the call
POST   /api/tailor-resume                   # includes the fact-check pass
POST   /api/cold-email
POST   /api/linkedin-post
GET    /api/win-docs  |  GET /api/win-docs/:id
GET    /api/resumes   |  GET /api/resumes/:id
GET    /api/ai-runs?limit=                  # audit trail of every AI call
```

---

## AI design

**Provider failover** — `AI_PROVIDER_ORDER=mesh,openai`. Each provider owns its request
shape in `services/providers.js`, because the wire formats genuinely differ: Mesh's
Anthropic models take `max_tokens`, while `gpt-5.6-*` needs `max_completion_tokens`,
`temperature: 1` and `reasoning_effort: 'none'`. If every provider fails, the error lists
all of them rather than silently degrading.

**Prompts** (`services/prompts.js`) encode the NxtJob method: the candidate is a consultant
validating hypotheses, never a job seeker. Every claim must trace to a real CAR story with
its real metric. `services/context.js` injects the profile, the full tech stack and the
12-story achievement bank into every call.

**Live grounding** — research and WIN documents run a two-stage pipeline:

1. `perplexity/sonar-pro` (via Mesh) runs three real web searches — current engineering
   challenges, recent news, hiring signals — returning prose plus citations.
2. `anthropic/claude-sonnet-4-6` synthesises the structured brief from that evidence.

The synthesis prompt treats the search results as the source of truth and forbids
presenting remembered facts as current, stating dates absent from the results, or
attaching a plausible-but-unrelated URL to a claim. Evidence is cached in
`research_evidence` for `RESEARCH_MAX_AGE_DAYS` (default 7) so the WIN document reuses
the same sources the brief was built from. Set `RESEARCH_LIVE_SEARCH=false` to disable.

**Background tasks** — grounded research takes roughly two minutes, and Cloudflare drops
a proxied request at about 100 seconds. So the browser never waits on a request: it
POSTs to `/api/tasks`, gets an id back immediately, and polls. The work runs in-process
(single user, so no separate worker is warranted); tasks orphaned by a restart are
marked failed at boot so the UI stops polling them.

**Resume tailoring gets a fact-check pass.** A hallucinated bullet only surfaces in an
interview, so every tailored resume is diffed back against the master resume by a
separate adversarial call. `safeToSend` is computed from the issue list, not from the
model's own `clean` flag — it has been observed reporting `clean: true` while listing
real problems.

---

## Deploying

```bash
bash scripts/deploy.sh
```

rsyncs to `vps:/var/www/career-copilot-os`, installs production deps, applies the schema,
restarts pm2 `career-copilot-os` on port 4011, and reloads nginx.

The previous deployment (`/var/www/career-copilot`, pm2 `career-copilot-api`, port 4005,
database `career_copilot_db`) is stopped but fully intact. To roll back:

```bash
ssh vps 'cp /etc/nginx/sites-available/career-copilot.bak /etc/nginx/sites-available/career-copilot \
  && nginx -t && systemctl reload nginx && pm2 start career-copilot-api'
```

Note: nginx on the VPS is 1.24, which predates the `http2 on;` directive — the config uses
`listen 443 ssl http2;`.

---

## The prototypes' own buttons

The prototypes originally generated prompts to paste into Claude or ChatGPT by hand.
`web/prototype-actions.js` replaces those with real executed actions — Company Research,
Cold Email, Tailored Resume, and the outreach page's STEP 1 and STEP 4 all now run
server-side and persist their output. The build step also rewrites the stale
"paste into Claude" instruction copy. The visa-sponsorship prompt is left as copy-paste
because it genuinely still is one.

## Interview Room

A live voice mock interview at `/interview.html`, against a real company in the pipeline.
Five rounds: screening, technical, manager, behavioural, and **win-defence** — where the
interviewer is the manager who received your WIN document and makes you defend the
architecture you proposed.

The interviewer is planned from the job description, the tailored resume, the grounded
research and the WIN doc, so it probes exactly where your history is thin. It refuses
vague answers and follows up instead of moving on. The report afterwards quotes your
actual words, marks untested competencies `not-assessed` rather than scoring them, and
names the real achievements you had available but failed to use.

**Cost, measured not estimated** — **$0.0127 per interview**, regardless of length:

| Part | Model | Cost |
|---|---|---|
| Speech recognition | browser Web Speech API | **free** |
| Interviewer voice | browser speech synthesis (default) | **free** |
| Interview plan | `gpt-5.6-luna`, once | $0.0038 |
| Live turns | `gpt-5.6-luna`, ~$0.0013 each | $0.0053 |
| Feedback report | `gpt-5.6-luna`, once | $0.0036 |

Daily practice costs about **$0.38/month**.

Everything runs on `gpt-5.6-luna`, chosen by measurement rather than assumption:

- **Against `gpt-4o-mini` for live turns** — luna asks sharper questions and holds an
  unanswered question across turns instead of drifting. Headline input is dearer
  ($0.20 vs $0.15/1M) but cached input is 3.75x cheaper ($0.02 vs $0.075), and an
  interview re-sends a large constant prefix every turn, so luna wins once caching warms.
- **Against `claude-sonnet-4-6` for the plan and report** — on the same transcript luna
  caught the candidate's deflection, quoted real evidence for every competency, marked
  untested ones `not-assessed`, and named unused achievements with their real metrics.
  Sonnet was no better on any of those, at **27x the price** ($0.055 vs $0.0020).
- **`gpt-5-nano` is unusable here.** It rejects `reasoning_effort: 'none'`, spends its
  whole output budget on reasoning tokens, and returns empty content.

gpt-5.x models need `temperature: 1` and `reasoning_effort: 'none'` or they emit billable
reasoning tokens; `services/providers.js` applies that by model id. Set
`INTERVIEW_PLAN_MODEL` / `INTERVIEW_REPORT_MODEL` / `INTERVIEW_TURN_MODEL` to
`anthropic/claude-sonnet-4-6` to trade cost back for depth.

**MeshAPI charges exactly OpenAI's list prices** — verified against OpenAI's own pricing
page for luna, sol, terra, 4o-mini and nano. There is no cost saving in calling OpenAI
directly, and Mesh additionally provides Claude, Perplexity search and the failover chain
on one key.

A paid voice is opt-in per interview from the dropdown (`x-ai/tts-v1`, ~$0.13), or set
`ELEVENLABS_API_KEY` to use an ElevenLabs plan. The default never calls a paid voice API.
Every session meters its own spend live in the header and on the report.

Speech recognition is Chrome-only in practice and routes audio through Google; the
"Type instead" path exists for when that is not acceptable.

```
GET  /api/interview/rounds          # rounds + voice options and their costs
POST /api/interview/start           # → 202 job (planning takes ~50s)
POST /api/interview/:id/turn        # live turn, runs inline on the cheap model
POST /api/interview/:id/finish      # → 202 job, generates the report
GET  /api/interview/:id             # session + full transcript + cost
GET  /api/interview/:id/cost        # live spend
POST /api/interview/speak           # TTS; 204 = use the free browser voice
```

## Still to build

See `HANDOFF.md` for the full list. The significant ones:

- Live job discovery (LinkedIn / NaukriGulf scraping into the `jobs` table)
- WIN doc → PDF export
- Daily digest (email or WhatsApp via Twilio)
- Mock interview and salary negotiation agents
