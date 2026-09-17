# Career Copilot — Engineering Roadmap & Features

## ✅ Shipped & Active Features

### 1. Authentic NxtJob AI SaaS Layout & Boards Redesign (2026-09-15)
- **100% Theme Purity & Harmonization (`nxtjob-theme.css`, `apple-theme.css`)**: Eliminated all theme collisions between dark and light modes. Light mode features crisp white cards (`#ffffff`) on a clean grey canvas (`#f8fafc`) with dark slate typography (`#0f172a`), subtle grey borders (`#e2e8f0`), and clean hover states. Dark mode features rich slate/navy panels (`#111827`) on deep base canvas (`#0b0f19`) with high-contrast text (`#f8fafc`). All legacy cards, gauges, segmented controls, and forms now dynamically bind to theme variables.
- **Expandable & Collapsible Left Navigation Rail (`NxtJobLayout.jsx`, `nxtjob-theme.css`)**: 56px slim icon-rail with smooth toggle expansion to full 240px sidebar with labels, active indicators, dark/light switcher, saved bookmarks, user account profile card, and persist state in `localStorage`.
- **Top Sub-Navigation Pill Bar**: Horizontal tabs for `Job Board`, `My Jobs`, `Target Companies`, `Recruitment Agencies`, `My Network`, `Influencer`, `Pitcher`, and `Career Navigator`.
- **Persistent Split-Screen Nova AI Copilot**: Right sidebar (420px) with live chat, search, clear chat, collapse/expand toggle, and dynamic action chips (`Check ATS for this job ↗`, `Find Employees for potential referrals ↗`, `Find Recruiters ↗`, `Customize Resume ↗`, `Practice Interview ↗`).
- **Recommended Jobs Board (`JobBoardPage.jsx`)**: Comprehensive search filter box (Job Title, Experience, Location, Recent searches chips, Focused mode, Suggest filters, Filters drawer) and 3-column job cards with `Check Score`, `✨ Ask Nova`, and `Apply Now` / `Tailor`.
- **Target Companies Board & Discovery Modal (`TargetCompaniesPage.jsx`)**: Company cards with HQ/Target locations, Jobs & Network counters, and interactive LinkedIn `Discover companies` modal.
- **Recruitment Agencies Board & Discovery Modal (`RecruitmentAgenciesPage.jsx`)**: Headhunter & agency cards with `✨ Ask Nova`, `👥 Find people`, and LinkedIn `Discover agencies` modal.
- **Career Navigator 8-Step Stepper Journey (`CareerNavigatorPage.jsx`)**: 8-step journey stepper (Kickoff, Market scan, Your stories, Achievements, Where you stand, AI interview, Game plan, Resume) with experience history sidebar and situational STAR question reflection cards.

### 2. User Authentication (Signup / Login) & Permanent Database Persistence (2026-09-15)
- **Multi-User Authentication (`authController.js`, `AuthContext.jsx`, `AuthModal.jsx`)**: Complete JWT / Bearer token authentication with Signup, Login, 1-Click Quick Demo Sign In, and account dropdown in the Navbar.
- **Permanent Zero-Data-Loss Persistence (`server/src/db/fileStore.js` + PostgreSQL)**: Automatically persists user profiles, resumes, target roles, application pipeline, and network contacts to disk (`server/data/career_store.json`) with PostgreSQL database synchronization.
- **Persistent Profile State**: Once a user completes their profile setup or uploads a resume, `is_profile_setup` is permanently saved to their account and never prompts them repeatedly on refresh.

### 2. Targeted Job Roles & Dream Jobs Vault (2026-09-14)
- **Targeted Roles Vault (`TargetJobsRadar.jsx`)**: Saved target dream roles (e.g. Granola AI Engineer) with capability match scores, gap analysis, and tactical attack strategies.
- **1-Click Execution**: Instant handoffs to ATS Tailor, 30-60-90 WIN deck generator, LinkedIn leads finder, and active Kanban pipeline.
- **AI Role Enrichment (`/api/target-jobs/analyze`)**: Ingests any JD or job URL and returns tailored attack plans and match scores.

### 2. Nova Executive AI Copilot & NxtJob Brain (2026-09-14)
- **Nova Engine (`aiService.js`, `copilotController.js`)**: Real-time context injection of candidate profile, 58 candidate strategies from NxtJob research, and tool dispatching for tailored resumes, 30-60-90 WIN decks, LinkedIn sequences, and salary counter-offers.
- **Nova UI & Global Drawer (`NovaPage.jsx`, `NovaFloatingDrawer.jsx`, `NovaActionCard.jsx`)**: Full-screen workspace with knowledge explorer and persistent floating button available on every page.
- **5-Slide Executive WIN Document Pitcher (`ExecutiveToolsPage.jsx`)**: Presentation-grade 5-slide viewer, deliverables, OKRs, and markdown download.

### 3. Job Link Auto-Fetch Engine & Web Extraction (2026-09-15)
- **Live URL Job Scraper & Extractor (`aiService.js`, `AtsTailorPage.jsx`)**: Ingests job posting links from any company website or job portal (Granola, LinkedIn, Lever, Greenhouse, Ashby, Stripe, Workday).
- **Intelligent Parameter Extraction**: Auto-fetches live HTML, sanitizes scripts/tags, and parses out Company Name, Role Title, and the complete structured Job Description into the ATS Engine.
- **Quick Preset Chips**: 1-click test chips for Granola AI Engineer, Stripe Eng Manager, and OpenAI MTS.
- **Seamless 1-Click ATS Diagnostics & Tailoring**: Immediately runs ATS Gap Analysis and tailored resume generation on the auto-fetched content.

### 4. Relevant LinkedIn Profiles Radar (2026-09-14)
- **Profiles Vault (`RelevantProfilesRadar.jsx`)**: Track key influencers, hiring leaders, and mentors (e.g. Anubhav Tech).
- **AI Profile Extraction & Sequence Generator**: Auto-analyzes profile skills, produces personalized 3-tier cold outreach sequences.

### 5. ATS Scanner & Star Bullet Optimizer
- **ATS Tailor (`AtsTailorPage.jsx`)**: Keyword gap scoring, 70% custom match tailoring with before/after comparison.
- **Resume Studio (`ResumeStudioPage.jsx`)**: Google XYZ bullet optimization, structured export.

### 6. Live Job Scraping & 15-ATS Boolean Search Matrix (2026-09-15)
- **Live ATS Feed & Search Scraper (`JobBoardPage.jsx`, `aiService.js`, `/api/jobs/live`)**: Replaced static seed job lists with live scraping across Greenhouse, Lever, Ashby, and verified company boards. Displays real company names, verified job URLs, real locations, and live salaries.
- **15-ATS Boolean Search Matrix & Hidden Jobs Toolbar (`/api/jobs/boolean-matrix`)**: Instant 15-portal Google string generation (`site:greenhouse.io OR site:lever.co OR site:jobs.ashbyhq.com ...`), LinkedIn hiring manager signal string, with 1-click **Launch Google ↗**, **Launch LinkedIn ↗**, **Copy String**, and **Live Scrape to Board**.
- **1-Click Direct ATS Tailor Handoff**: Every scraped job card includes direct link, match score, Ask Nova, and **`⚡ 1-Click Tailor`** to pre-populate ATS gap analysis.
- **Left Sidebar Collapse/Expand Toggle Fix (`NxtJobLayout.jsx`, `nxtjob-theme.css`)**: Squeezed 60px header overflow in 40px container resolved; centered logo with top & bottom dedicated rail toggle items and smooth hover expansion.
- **Nova AI End-to-End Chat Engine Fix (`copilotController.js`, `api.js`, `aiService.js`)**: Fixed missing `sendNovaMessage` API route, structured context injection (job context, candidate resume, and page state), and rich context-aware markdown responses for Boolean strings, referral pitches, and salary negotiation.

### 7. Multi-Company Networker & Application Kanban
- **Networker Intelligence (`NetworkerPage.jsx`)**: Real-time company search, decision maker mapping, and Boolean query builder.
- **Job Tracker (`JobTrackerPage.jsx`)**: 5-stage opportunity pipeline with drag-and-drop status flow.


