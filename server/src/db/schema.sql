-- ============================================================
-- Career Copilot OS — schema
-- Single-user tool: user_id is present for future-proofing but
-- always resolves to the one configured operator.
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  region        TEXT NOT NULL DEFAULT 'global',   -- eu | gulf | global
  roles         TEXT[] NOT NULL DEFAULT '{}',     -- fde | ai | fs | se
  pay           TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  apply_url     TEXT NOT NULL DEFAULT '',
  dsa           BOOLEAN NOT NULL DEFAULT false,   -- true = expects LeetCode-style rounds
  custom        BOOLEAN NOT NULL DEFAULT false,
  research      JSONB,                            -- { challenges[], hookSentence, recentNews[], lastResearched }
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS companies_region_idx ON companies (region);

CREATE TABLE IF NOT EXISTS tracked_companies (
  company_id    TEXT PRIMARY KEY REFERENCES companies (id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL DEFAULT 'siddhant',
  stage         TEXT NOT NULL DEFAULT 'new',      -- new|applied|networking|call|win|interview|offer|failed
  win_status    TEXT NOT NULL DEFAULT 'none',     -- none|drafted|sent
  msgs          TEXT NOT NULL DEFAULT '',         -- free-text outreach log from the prototype
  jd            TEXT NOT NULL DEFAULT '',
  job_link      TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tracked_stage_idx ON tracked_companies (stage);

CREATE TABLE IF NOT EXISTS connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,       -- preserves prototype array ordering
  name          TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT 'peer',     -- peer|hm|hr|indian|other
  linkedin_url  TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'req',      -- req|dm|reply|fu1|fu2|fu3|win|call|ref|ab
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS connections_company_idx ON connections (company_id, position);

CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  connection_id UUID REFERENCES connections (id) ON DELETE SET NULL,
  kind          TEXT NOT NULL,                    -- connectionNote|firstDM|peerDM|followUp|winDocNote|coldEmail|linkedinPost
  body          TEXT NOT NULL DEFAULT '',
  model         TEXT,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_company_idx ON messages (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS win_docs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  contact_name  TEXT NOT NULL DEFAULT '',
  problems      JSONB NOT NULL DEFAULT '[]'::jsonb,
  markdown      TEXT NOT NULL DEFAULT '',
  sections      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS win_docs_company_idx ON win_docs (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS resume_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        TEXT REFERENCES companies (id) ON DELETE SET NULL,
  company_name      TEXT NOT NULL DEFAULT '',
  job_title         TEXT NOT NULL DEFAULT '',
  job_description   TEXT NOT NULL DEFAULT '',
  tailored_text     TEXT NOT NULL DEFAULT '',
  keywords_matched  TEXT[] NOT NULL DEFAULT '{}',
  keywords_missing  TEXT[] NOT NULL DEFAULT '{}',
  match_score       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS achievements (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  company     TEXT NOT NULL DEFAULT '',
  period      TEXT NOT NULL DEFAULT '',
  challenge   TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL DEFAULT '',
  result      TEXT NOT NULL DEFAULT '',
  metrics     TEXT[] NOT NULL DEFAULT '{}',
  skills      TEXT[] NOT NULL DEFAULT '{}',
  used_for    TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    TEXT REFERENCES companies (id) ON DELETE SET NULL,
  company_name  TEXT NOT NULL DEFAULT '',
  title         TEXT NOT NULL DEFAULT '',
  url           TEXT NOT NULL DEFAULT '',
  location      TEXT NOT NULL DEFAULT '',
  source        TEXT NOT NULL DEFAULT 'manual',
  description   TEXT NOT NULL DEFAULT '',
  no_dsa        BOOLEAN,
  posted_at     TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (url)
);

-- Master profile / resume context injected into every AI prompt.
CREATE TABLE IF NOT EXISTS profile (
  id          TEXT PRIMARY KEY DEFAULT 'siddhant',
  full_name   TEXT NOT NULL DEFAULT '',
  headline    TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  linkedin    TEXT NOT NULL DEFAULT '',
  website     TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  summary     TEXT NOT NULL DEFAULT '',
  master_resume TEXT NOT NULL DEFAULT '',
  target_roles  TEXT[] NOT NULL DEFAULT '{}',
  skills        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit trail for every AI call (cost/debug visibility).
CREATE TABLE IF NOT EXISTS ai_runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        TEXT NOT NULL,
  company_id  TEXT,
  model       TEXT NOT NULL DEFAULT '',
  ok          BOOLEAN NOT NULL DEFAULT true,
  error       TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  input       JSONB,
  output      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_runs_kind_idx ON ai_runs (kind, created_at DESC);

-- Free-form key/value mirror for prototype UI state (daily checklist, etc).
CREATE TABLE IF NOT EXISTS ui_state (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Live web-search evidence backing research briefs and WIN documents.
-- Cached so a WIN doc can reuse the same grounded sources the brief used.
CREATE TABLE IF NOT EXISTS research_evidence (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  findings    JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ key, query, content, citations, sources }]
  sources     JSONB NOT NULL DEFAULT '[]'::jsonb,   -- de-duplicated [{ title, url, date }]
  model       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_evidence_company_idx
  ON research_evidence (company_id, created_at DESC);

-- Background AI jobs. Grounded research exceeds Cloudflare's ~100s proxy
-- limit, so the browser creates a job and polls instead of holding a request.
CREATE TABLE IF NOT EXISTS ai_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        TEXT NOT NULL,
  company_id  TEXT,
  status      TEXT NOT NULL DEFAULT 'queued',   -- queued|running|done|error
  input       JSONB,
  result      JSONB,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ai_jobs_status_idx ON ai_jobs (status, created_at DESC);

-- ── Interview simulator ───────────────────────────────────────────────
-- A session is one mock interview against a specific company + round.
-- The plan is generated up front from the JD, tailored resume, WIN doc and
-- grounded research; turns are appended live as the conversation happens.
CREATE TABLE IF NOT EXISTS interview_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    TEXT REFERENCES companies (id) ON DELETE SET NULL,
  company_name  TEXT NOT NULL DEFAULT '',
  role_title    TEXT NOT NULL DEFAULT '',
  round         TEXT NOT NULL DEFAULT 'screening', -- screening|technical|manager|behavioural|win-defence
  interviewer   JSONB NOT NULL DEFAULT '{}'::jsonb, -- { name, title, persona, voice }
  plan          JSONB NOT NULL DEFAULT '{}'::jsonb, -- { sections[], questions[] }
  job_description TEXT NOT NULL DEFAULT '',
  win_doc_id    UUID REFERENCES win_docs (id) ON DELETE SET NULL,
  resume_id     UUID REFERENCES resume_versions (id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'active',     -- active|finished|abandoned
  duration_min  INTEGER NOT NULL DEFAULT 30,
  report        JSONB,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS interview_sessions_company_idx
  ON interview_sessions (company_id, started_at DESC);

CREATE TABLE IF NOT EXISTS interview_turns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES interview_sessions (id) ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,
  speaker       TEXT NOT NULL,                      -- interviewer|candidate
  text          TEXT NOT NULL DEFAULT '',
  question_ref  TEXT,                               -- which planned question this serves
  answer_ms     INTEGER,                            -- how long the candidate spoke
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interview_turns_session_idx
  ON interview_turns (session_id, position);

-- Token usage per AI call, so spend is visible rather than guessed.
ALTER TABLE ai_runs ADD COLUMN IF NOT EXISTS tokens_in  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_runs ADD COLUMN IF NOT EXISTS tokens_out INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_runs ADD COLUMN IF NOT EXISTS cost_usd   NUMERIC(12,6) NOT NULL DEFAULT 0;
ALTER TABLE ai_runs ADD COLUMN IF NOT EXISTS session_id UUID;

-- LinkedIn entity IDs. The people-search `currentCompany` facet takes a
-- numeric organisation id; passing a company NAME is silently ignored and
-- returns unfiltered results that look plausible, which is worse than an
-- error. Resolved ids are stored so the URLs we build actually filter.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_company_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_slug       TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_name       TEXT;
-- false = auto-resolved by slug guess and unverified; the resolver can match
-- the wrong entity (e.g. "Cohere" → "Cohere Labs"), so the UI shows the
-- resolved name and lets you correct it.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_verified   BOOLEAN NOT NULL DEFAULT false;

-- Interview recordings. Chunks land on the VPS during the session, then a
-- background task moves the finished file to Cloudflare R2 and frees the disk.
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS recording_status TEXT NOT NULL DEFAULT 'none';
  -- none | recording | local | uploading | stored | failed
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS recording_bytes  BIGINT NOT NULL DEFAULT 0;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS recording_mime   TEXT;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS recording_key    TEXT;   -- R2 object key once uploaded
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS recording_error  TEXT;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS delivery         JSONB;  -- countable delivery metrics

-- Public ATS job board feeds. Greenhouse, Lever and Ashby all expose a free
-- JSON endpoint with real posted dates — far more reliable than asking an LLM
-- when something was posted, and it costs nothing to poll.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ats_provider   TEXT;   -- greenhouse | lever | ashby
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ats_slug       TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ats_checked_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ats_job_count  INTEGER NOT NULL DEFAULT 0;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS relevance     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS matched_roles TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ats           TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_id   TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS seen_at       TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closed_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS jobs_posted_idx ON jobs (posted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS jobs_discovered_idx ON jobs (discovered_at DESC);

-- Every agent run, logged in full so the discovery is auditable rather than
-- a black box that silently stops working.
CREATE TABLE IF NOT EXISTS agent_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT NOT NULL DEFAULT 'job-discovery',
  trigger       TEXT NOT NULL DEFAULT 'manual',   -- manual | scheduled
  status        TEXT NOT NULL DEFAULT 'running',  -- running | done | error
  companies     INTEGER NOT NULL DEFAULT 0,
  jobs_seen     INTEGER NOT NULL DEFAULT 0,
  jobs_new      INTEGER NOT NULL DEFAULT 0,
  jobs_closed   INTEGER NOT NULL DEFAULT 0,
  errors        JSONB NOT NULL DEFAULT '[]'::jsonb,
  detail        JSONB NOT NULL DEFAULT '[]'::jsonb,
  error         TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS agent_runs_idx ON agent_runs (kind, started_at DESC);

-- Live step log for background tasks, so a running job can show what it is
-- actually doing rather than only "running".
ALTER TABLE ai_jobs ADD COLUMN IF NOT EXISTS steps JSONB NOT NULL DEFAULT '[]'::jsonb;

-- "Interested in this" — marks a company or a specific role worth applying to
-- and tracking. Favouriting a job also starts tracking its company.
ALTER TABLE jobs      ADD COLUMN IF NOT EXISTS favourite BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS favourite BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS jobs_fav_idx ON jobs (favourite) WHERE favourite;

-- "Not for me" — the role stays in the list but sinks to the bottom, so a
-- decision is recorded rather than the row vanishing and being rediscovered
-- on the next scan.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dismissed    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

ALTER TABLE profile ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';

-- Company brand data (domain + logo + palette) used to style the WIN document
-- presentation. Fetched on demand from Brandfetch when a client id is set;
-- otherwise a stable fallback palette is derived from the company id so the
-- deck still looks intentional. Cached per company so we do not re-fetch on
-- every render.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS brand   JSONB;

-- Freelance platforms (Upwork, Mercor, A.Team, …) sit in the same catalogue
-- as FTE targets so they share the Track / Prep / Pipeline flows, but they
-- are tagged here so the UI can filter / badge them differently — a bidding
-- marketplace is not the same thing as an employer with a careers page.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS freelance BOOLEAN NOT NULL DEFAULT false;

-- Interview prep guides — the recap/study counterpart to the mock interview.
-- Reads the JD, tailored resume, WIN doc and grounded research, then runs a
-- fresh search on candidate reports (Glassdoor, Reddit, Blind, engineering
-- blogs) and synthesises "here is what to prepare, why, and how your real
-- experience answers it". Distinct from interview_sessions because there are
-- no turns, no transcript, no delivery metrics — it is a document, not a
-- conversation.
CREATE TABLE IF NOT EXISTS interview_preps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      TEXT REFERENCES companies (id) ON DELETE SET NULL,
  company_name    TEXT NOT NULL DEFAULT '',
  role_title      TEXT NOT NULL DEFAULT '',
  round           TEXT NOT NULL DEFAULT 'any',
  job_description TEXT NOT NULL DEFAULT '',
  guide           JSONB NOT NULL DEFAULT '{}'::jsonb,
  sources         JSONB NOT NULL DEFAULT '[]'::jsonb,
  win_doc_id      UUID REFERENCES win_docs (id) ON DELETE SET NULL,
  resume_id       UUID REFERENCES resume_versions (id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interview_preps_company_idx
  ON interview_preps (company_id, created_at DESC);

-- Freelance / contract gigs share the jobs table with full-time postings so
-- they reuse favourite / dismiss / close handling, but carry their own shape:
-- a rate instead of a salary, an engagement type, platform-specific details
-- (bid count, hours per week) and an application status the user moves along
-- by hand, since marketplaces have no applicant tracking we could read.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS engagement    TEXT;          -- NULL/fte | freelance | contract | part-time
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rate_min      NUMERIC;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rate_max      NUMERIC;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rate_unit     TEXT;          -- hour | fixed | task | year
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS currency      TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills        TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS meta          JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS app_status    TEXT;          -- NULL | applied | talking | won | lost
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS app_status_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS proposal      JSONB;
CREATE INDEX IF NOT EXISTS jobs_engagement_idx ON jobs (engagement, posted_at DESC NULLS LAST);
