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
  company_id    TEXT PRIMARY KEY REFERENCES companies (id) ON DELETE RESTRICT,
  user_id       TEXT NOT NULL DEFAULT 'siddhant',
  stage         TEXT NOT NULL DEFAULT 'new',      -- new|interested|applied|networking|call|win|interview|offer|failed
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
  company_id    TEXT NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
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
  company_id    TEXT NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
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
  company_id    TEXT NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
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
  company_id  TEXT NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
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

-- Career page taken from a verified list: discovery reads only the board that
-- URL names and never guesses one from the company name.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

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

-- User data must never disappear as a side effect of a catalogue change.
-- These keys were ON DELETE CASCADE, so removing one company row silently
-- took its pipeline stage, contacts, outreach, WIN docs and evidence with it.
-- RESTRICT makes the database refuse instead; the delete route checks first
-- and explains why. The CREATE TABLEs above already say RESTRICT for fresh
-- installs — this block converts databases created before that, and is a
-- no-op once a key is no longer CASCADE.
DO $$
DECLARE
  t TEXT;
  fk RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['tracked_companies', 'connections', 'messages', 'win_docs', 'research_evidence'] LOOP
    FOR fk IN
      SELECT conname FROM pg_constraint
      WHERE contype = 'f'
        AND conrelid = t::regclass
        AND confrelid = 'companies'::regclass
        AND confdeltype = 'c'
    LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', t, fk.conname);
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT',
        t, fk.conname
      );
    END LOOP;
  END LOOP;
END $$;

-- "Not for me" on a company — already present on the live database, declared
-- here so a fresh install has it too (the digest filters on it).
ALTER TABLE companies ADD COLUMN IF NOT EXISTS dismissed    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

-- ── Morning digest ────────────────────────────────────────────────────
-- Follow-ups need to know how long something has sat untouched, and
-- updated_at cannot say: the state sync rewrites every tracked row on each
-- save. These columns are maintained by triggers so every writer (sync,
-- Track modal, favourites, WIN doc task) is covered without touching them.
-- Rows that existed before this have NULL ("unknown"), and the digest falls
-- back to created_at for those; new rows start at now().
ALTER TABLE tracked_companies ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ;
ALTER TABLE tracked_companies ADD COLUMN IF NOT EXISTS activity_at      TIMESTAMPTZ;
ALTER TABLE tracked_companies ALTER COLUMN stage_changed_at SET DEFAULT now();
ALTER TABLE tracked_companies ALTER COLUMN activity_at      SET DEFAULT now();
ALTER TABLE connections ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
ALTER TABLE connections ALTER COLUMN status_changed_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION cc_tracked_touch() RETURNS trigger AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at := now();
  END IF;
  -- Real activity only: a sync that rewrites identical values is not one.
  IF (NEW.stage, NEW.win_status, NEW.msgs, NEW.jd, NEW.job_link, NEW.notes)
     IS DISTINCT FROM (OLD.stage, OLD.win_status, OLD.msgs, OLD.jd, OLD.job_link, OLD.notes) THEN
    NEW.activity_at := now();
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tracked_companies_touch
  BEFORE UPDATE ON tracked_companies
  FOR EACH ROW EXECUTE FUNCTION cc_tracked_touch();

CREATE OR REPLACE FUNCTION cc_connection_touch() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER connections_touch
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION cc_connection_touch();

-- One row per send attempt. job_ids is what stops a role being announced
-- twice: the next digest skips anything already delivered.
CREATE TABLE IF NOT EXISTS digest_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_date  DATE NOT NULL,                     -- local date in DIGEST_TZ
  trigger      TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | manual
  channel      TEXT NOT NULL DEFAULT 'telegram',
  status       TEXT NOT NULL,                     -- sent | error
  job_ids      UUID[] NOT NULL DEFAULT '{}',
  counts       JSONB NOT NULL DEFAULT '{}'::jsonb,
  body         TEXT NOT NULL DEFAULT '',
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS digest_runs_date_idx ON digest_runs (digest_date DESC, created_at DESC);

-- ── Telegram assistant ────────────────────────────────────────────────
-- Conversation memory in the chat-completions shape, so recent turns can be
-- replayed to the model as-is. "Start fresh" (/new) appends a 'reset' marker
-- instead of deleting history; context loads from the latest marker on.
CREATE TABLE IF NOT EXISTS bot_messages (
  id            BIGSERIAL PRIMARY KEY,
  chat_id       BIGINT NOT NULL,
  role          TEXT NOT NULL,              -- user | assistant | tool | reset
  content       TEXT,
  tool_calls    JSONB,
  tool_call_id  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bot_messages_chat_idx ON bot_messages (chat_id, id DESC);

-- Every change the assistant makes, with what it was before — the audit
-- trail behind "do it, then tell me what changed".
CREATE TABLE IF NOT EXISTS bot_actions (
  id          BIGSERIAL PRIMARY KEY,
  tool        TEXT NOT NULL,
  args        JSONB NOT NULL DEFAULT '{}'::jsonb,
  company_id  TEXT,
  before      JSONB,
  after       JSONB,
  ok          BOOLEAN NOT NULL DEFAULT true,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bot_actions_created_idx ON bot_actions (created_at DESC);

-- Small key/value store for the bot (Telegram update offset).
CREATE TABLE IF NOT EXISTS bot_state (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prompt-cache hits per AI call, so the saving from a stable prompt prefix
-- is measured rather than assumed.
ALTER TABLE ai_runs ADD COLUMN IF NOT EXISTS cached_tokens INTEGER NOT NULL DEFAULT 0;

-- ── "Why this company / why this role" one-liners ─────────────────────
-- Written once per role and per company from data the app holds (JD,
-- company description and research, his profile) and stored, so the feed,
-- cards, digest and bot can show them without another AI call.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS why_role    TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS why_role_at TIMESTAMPTZ;

-- Keyed by lower(name) rather than companies.id so it also covers employers
-- found by discovery that are not in the catalogue (NVIDIA via Workday, …).
CREATE TABLE IF NOT EXISTS company_why (
  key          TEXT PRIMARY KEY,         -- lower(trim(company name))
  name         TEXT NOT NULL,
  why          TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fit score 0–100 from the same grounded call as why_role: how well the JD
-- matches his proven skills, target role types and target locations. The
-- feed, digest, bot and Track modal rank by it; relevance (title match)
-- remains the discovery filter.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fit_score SMALLINT;
CREATE INDEX IF NOT EXISTS jobs_fit_idx ON jobs (fit_score DESC NULLS LAST) WHERE closed_at IS NULL;

-- Every SerpAPI search the app makes, kept for good. `billed` is measured,
-- not assumed: the account's usage counter is read before and after each
-- call (that read is free), and a cache hit leaves it unchanged. Daily and
-- weekly caps count billed rows; the monthly cap reads SerpAPI's own
-- counter, which also includes other projects sharing the key.
CREATE TABLE IF NOT EXISTS serp_calls (
  id            BIGSERIAL PRIMARY KEY,
  at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger       TEXT NOT NULL,              -- scheduled | bot | manual | test
  query         TEXT NOT NULL,
  location      TEXT NOT NULL DEFAULT '',
  ok            BOOLEAN NOT NULL DEFAULT true,
  billed        BOOLEAN,                    -- NULL = unknown, counted as billed
  results       INTEGER NOT NULL DEFAULT 0,
  month_usage   INTEGER,                    -- SerpAPI this_month_usage after the call
  search_id     TEXT,
  error         TEXT
);
CREATE INDEX IF NOT EXISTS serp_calls_at_idx ON serp_calls (at DESC);

-- Once-per-period notices (80% alert, limit reached) so Telegram is told
-- once, not on every blocked attempt.
CREATE TABLE IF NOT EXISTS serp_notices (
  key        TEXT PRIMARY KEY,               -- e.g. month-80:2026-10, cap-day:2026-10-26
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Targeting: Navigator, target companies, outreach ──────────────────
-- The NxtJob method is company-first: pick the niche from evidence, rank
-- companies by hiring signals, apply where a good-fit role is open, and
-- reach insiders where it is not. These tables hold that layer on top of
-- job discovery.

-- Evidence-based niche and title aliases (one row).
CREATE TABLE IF NOT EXISTS target_profile (
  id            TEXT PRIMARY KEY DEFAULT 'siddhant',
  data          JSONB NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per employer (catalogue or found by discovery), keyed by name.
-- Free signals are recomputed daily from jobs; researched signals weekly.
CREATE TABLE IF NOT EXISTS company_targets (
  key              TEXT PRIMARY KEY,            -- lower(trim(name))
  company_id       TEXT,                        -- catalogue id when it is one
  name             TEXT NOT NULL,
  open_fit75       INTEGER NOT NULL DEFAULT 0,  -- open roles with fit >= 75
  new_30d          INTEGER NOT NULL DEFAULT 0,  -- relevant roles first seen in 30 days
  prev_30d         INTEGER NOT NULL DEFAULT 0,  -- the 30 days before that
  best_fit         INTEGER,
  best_job_id      UUID,
  research         JSONB,                       -- { signals[], layoffs, hiringScore, companyFit, whyNow, sources[] }
  research_at      TIMESTAMPTZ,
  hiring_score     INTEGER NOT NULL DEFAULT 0,  -- 0-100
  company_fit      INTEGER NOT NULL DEFAULT 0,  -- 0-100
  tag              TEXT NOT NULL DEFAULT 'watch', -- apply | outreach | watch
  priority         BOOLEAN NOT NULL DEFAULT false,
  why_now          TEXT,
  rank             INTEGER,
  in_catalogue     BOOLEAN NOT NULL DEFAULT false,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_targets_rank_idx ON company_targets (rank NULLS LAST);

-- Outreach actions he reports (connection requests, DMs, calls, referral
-- asks). Contacts logged in `connections` count too; this covers batches
-- like "sent 5 requests at Adyen" without naming each person.
CREATE TABLE IF NOT EXISTS outreach_activity (
  id            BIGSERIAL PRIMARY KEY,
  at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_id    TEXT,
  company_name  TEXT NOT NULL DEFAULT '',
  kind          TEXT NOT NULL,   -- connection_request | dm | follow_up | call | referral_ask | win_doc_sent | application
  count         INTEGER NOT NULL DEFAULT 1,
  note          TEXT
);
CREATE INDEX IF NOT EXISTS outreach_activity_at_idx ON outreach_activity (at DESC);

-- Follow-ups he parked ("waiting — remind me in 7 days"). Hidden from the
-- Today board, digest and weekly review until `until`; nothing is deleted.
-- key = kind:companyId:role-or-contact, as built in digest.followUpsFrom.
CREATE TABLE IF NOT EXISTS followup_snoozes (
  key         TEXT PRIMARY KEY,
  until       TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PDFs exactly as the Resume Studio exported them. The Studio renders every
-- resume from its markdown, so content_hash (sha256 of that markdown) ties a
-- PDF to the resume version it came from; kind 'master' is the master
-- resume. New exports add rows — nothing is overwritten or deleted.
CREATE TABLE IF NOT EXISTS resume_pdfs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash  TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'tailored',   -- tailored | master | draft
  filename      TEXT NOT NULL DEFAULT 'resume.pdf',
  pdf           BYTEA NOT NULL,
  size          INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resume_pdfs_hash_idx ON resume_pdfs (content_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS resume_pdfs_kind_idx ON resume_pdfs (kind, created_at DESC);

-- A PDF the bot was asked for before the Studio had exported it. When the
-- Studio uploads that PDF, it is sent to the chat and the request is closed.
CREATE TABLE IF NOT EXISTS resume_pdf_requests (
  id            BIGSERIAL PRIMARY KEY,
  content_hash  TEXT,
  kind          TEXT NOT NULL DEFAULT 'tailored',
  chat_id       TEXT NOT NULL,
  label         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at  TIMESTAMPTZ
);

-- Guided apply. application_answers is his reusable answer bank (notice
-- period, salary, work authorisation…) keyed by category; application_packs
-- holds one job's real form questions and the answers prepared for it. He
-- reviews them and presses Submit himself — nothing here submits anything.
CREATE TABLE IF NOT EXISTS application_answers (
  category    TEXT PRIMARY KEY,
  answer      TEXT NOT NULL,
  question    TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS application_packs (
  job_id      UUID PRIMARY KEY,
  questions   JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers     JSONB NOT NULL DEFAULT '{}'::jsonb,
  source      TEXT NOT NULL DEFAULT 'standard',   -- greenhouse | standard
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Keys for the browser autofill extension: read-only access to packs and
-- resume PDFs. Only a hash is stored; a new key retires the old one.
CREATE TABLE IF NOT EXISTS autofill_keys (
  key_hash    TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ
);
