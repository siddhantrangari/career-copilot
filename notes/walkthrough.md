# Career Copilot OS — Region Options & Pipeline Walkthrough

## Summary of Changes

Added comprehensive region targeting options across the Career Copilot platform, enabling specialized filtering, badging, and LinkedIn networking automation for India Remote, Bangalore Onsite, Bangalore Hybrid, and Global On-site roles.

---

## 1. New Regions Added

| Value | Modal Dropdown Label | Card / Table Badge | Accent Color |
|---|---|---|---|
| `in_remote` | 🇮🇳 India Remote | 🇮🇳 India Remote | Warm Orange (`#ff9f43`) |
| `blr_onsite` | 🏢 Bangalore Full time 5 days | 🏢 Bangalore 5D | Coral Red (`#ff7675`) |
| `blr_hybrid` | 🏙️ Bangalore Hybrid | 🏙️ Bangalore Hybrid | Cyan Teal (`#00cec9`) |
| `global_onsite` | 🏢 Global On-site | 🏢 Global On-site | Lavender (`#a29bfe`) |

---

## 2. Key Components Updated

### Frontend Prototypes (`artifacts/`)
* **`job_search_os_main.html`**:
  * Updated `#aR` select in `+ Add Company` modal with all 4 new region options.
  * Added CSS for card border styling (`.cc.in_remote`, `.cc.blr_onsite`, `.cc.blr_hybrid`, `.cc.global_onsite`) and badge pills (`.rb.*`).
  * Created helper formatters `formatRegionBadge()` and `formatRegionName()` for clean rendering in cards, Kanban, and pipeline tables.
  * Added `🇮🇳 India / BLR` filter button (`currentF === 'in'`) and updated filter routing to match all Indian and Bangalore regions alongside job location detection.
  * Updated `openNet(id)` to map Indian regions to India's LinkedIn Geo URN (`102257491`).

* **`job_search_os_outreach_resume.html`**:
  * Removed duplicate `🏢 Companies` and `📊 Pipeline` sub-tabs to eliminate confusion with the dedicated `Companies & Pipeline` section.
  * Set `🚀 Outreach System` as the primary default active tab and view on `/outreach.html`.
  * Removed the duplicate companies grid and pipeline tracking DOM tables from this view.
  * Added all new region options to `#addRegion`.
  * Added matching CSS classes for card borders and badge pills.
  * Added `formatRegionBadge()` and `formatRegionName()` formatters.
  * Added `🇮🇳 India / BLR` filter button to target companies filter bar.
  * Updated `openNet(id)` and table rendering for India & Global Onsite locations.

### Backend Services (`server/src/services/linkedin.js`)
* Updated `networkSearches(company)` to route `in_remote`, `blr_onsite`, `blr_hybrid`, and `india` to LinkedIn's India Geo URN (`GEO.india`).
* Mapped `global_onsite` without geo restriction for broad global company search.

### Web Build
* Ran `npm run build:web` compiling artifacts into `server/public/index.html` and `server/public/outreach.html`.

---

## 3. Deployment & Production Verification

* Deployed via `scripts/deploy.sh` to Hostinger VPS (`career.myagentfirm.com`).
* Verified backend health at `https://career.myagentfirm.com/api/health`.
* Live UI accessible at `https://career.myagentfirm.com`.

---

## 4. Resume Studio — PDF Formatting & Export Fix

Fixed severe formatting issues with downloaded PDFs from the Resume Studio (`/outreach.html`):

1. **Eliminated Horizontal Left Clipping:**
   * **Root Cause:** `generateResumePdfFromMarkdown` placed elements into an offscreen wrapper with `position: fixed; left: 0; width: 718px; z-index: -99999` and specified `windowWidth: 718` in `html2canvas`. In `html2pdf.js`, the internal overlay centers the 190mm container with `margin: auto; left: 0; right: 0;` (offset by ~360px on a standard 1440px viewport). When `windowWidth: 718` forced a 718px canvas, the left 360px was sliced off horizontally.
   * **Fix:** Removed the offscreen wrapper and `windowWidth: 718` override. `html2pdf` directly renders the `.res-pdf-print-sheet` element with native coordinate mapping (`scale: 2, scrollX: 0, scrollY: 0`).

2. **Pristine A4 Print Sheet Typography & Density:**
   * Changed `.res-pdf-print-sheet` to use exact A4 printable width `190mm` (210mm minus 10mm left and 10mm right margins).
   * Refined font sizing (9.5px body, 10px headings, 18px name) and tight vertical spacing (line-height 1.32, compact 6px section margins).
   * The complete master resume (12+ years, 6 roles, 4 platforms, skills, education) now fits onto **1 crisp, executive ATS page** with zero dangling lines or awkward empty 2nd pages.

3. **Intelligent Page-Breaking:**
   * Replaced `avoid-all` with `mode: ['css', 'legacy']` and specific element avoiding (`.res-role-row`, `.res-sec-head`, `.res-stack-line`, `li`, `h1`, `h2`).
   * Added `break-after: avoid; page-break-after: avoid;` to section headers and role rows so headings and companies are never orphaned from their bullets across page boundaries.

4. **Clean Markdown Parsing & Syntax Protection:**
   * Added detection for all standard resume section titles even when AI formats them without `##` (e.g., `**PROFESSIONAL SUMMARY**` or `**TECHNICAL SKILLS**`).
   * Hardened `isDivider` to strip stray `---`, `***`, or `** --- **` lines.
   * Added support for markdown links `[text](url)` and auto-sanitized LinkedIn URLs to `https://linkedin.com/in/siddhant-rangari`.

5. **Adaptive Page-Filling & Executive Typography (Zero Bottom Void):**
   * **Root Cause:** A fixed 9.5px font size with 1.32 line height caused tailored single-page resumes (such as Ferguson, ~82 lines) to stop at ~780px height out of the 1062px A4 printable area, creating a large (~280px / 26%) empty blank void at the bottom and looking overly cramped/small.
   * **Fix:**
     * Upgraded baseline print typography to executive ATS standard: Name `22px`, Headings `11px`, Roles `10.5px`, Bullets `9.8px` with `1.40` line height and 10px section spacing.
     * Introduced **Adaptive Auto-Fit**:
       - Shorter / concise resumes (< 960px) automatically apply `.fit-spacious` (`10.6px` body, `24px` name, `1.45` line height) so they fill **95%–99%** of the page with zero bottom void.
       - Slight overflows (1062px–1160px) apply `.fit-compact` (`9.5px` body) to pull trailing lines onto a single page.
       - Resumes > 1250px span 2 pages cleanly at baseline 10.2px with intelligent page break avoidance.
     * Added manual Density / Fit dropdown (`Auto-Fit`, `Standard`, `Spacious`, `Compact`) in the live preview toolbar.
     * Live verified with Ferguson tailored resume: rendered height is **1049px** out of **1062px** (**98.8% page fill**), single page, zero void, crisp legible fonts. Overwrote `/Users/Data/Useful Files/Resumes/Tailored-Resumes/Resume_Ferguson_Principal_Software_Engineer_-_Java_Backend.pdf` directly.


---

## 6. Pipeline Direct Actions, AI Copilot "Other" Input & Unified Directory/Pipeline Sync

### 1. AI Copilot — Custom Company Option ("Other")
- Added `✏️ Other / Type Company Name…` to the AI Copilot company dropdown.
- Selecting "Other" displays an inline input for typing any custom company applied to from external job boards or sources.
- Clicking any AI action (`1. Research`, `2. Outreach messages`, `3. Call prep`, `4. WIN doc`, `Tailor resume`, `Cold email`) auto-creates the company record on the backend (`POST /api/companies`), adds it to the user's directory (`custom`) and pipeline (`tracked`), and triggers the requested generation seamlessly.

### 2. Direct Action Buttons in Pipeline & Companies
- **Kanban Cards (`renderKanban`)**: Added `.kcard-actions` quick-action toolbar to every Kanban card:
  - `🏆 WIN`: Launches Copilot directly in WIN doc generation mode for that company.
  - `🔍 Research`: Launches Copilot directly into live web research and company brief.
  - `✨ Copilot`: Opens Copilot overview with company context.
  - Interactive click handling includes `event.stopPropagation()` so clicking actions does not trigger drag-and-drop or modal click.
- **Pipeline Table (`renderTable`)**:
  - WIN Doc column enhanced with a one-click `🏆 WIN Doc` launch button.
  - Actions column enhanced with direct `✨ Copilot` button alongside `Update`.
- **Track Modal (`trackModal`)**:
  - Embedded an AI Copilot Quick Actions toolbar right below the header: buttons for `🏆 Create WIN Doc`, `🔍 Company Research`, `✉️ Outreach`, `📞 Call Prep`, and `📄 Tailor Resume`.
- **Companies Tab Cards (`renderCards`)**:
  - Added direct `🏆 WIN Doc` and `🔍 Research` action buttons next to `Network` and `Track`.

### 3. Unified "Add Company" (Directory + Pipeline)
- Clarified the shared modal title to `+ Add Company` and subtitle to: `Adds to both your Target Companies Directory & Application Pipeline — no duplicate entry needed.`
- Fixed custom company visibility bug:
  - Defaulted `window.__CC_ONLY_OPEN_JOBS__` to `false` (previously defaulted to `true`, which hid custom-added companies without scraped job boards).
  - Protected custom and tracked companies in `renderCards()`: `c.custom || tracked[c.id]` is never hidden by open jobs filter.
- Implemented `window.addCompanyFromExternal(co, stage)` to ensure immediate two-way synchronization between Copilot, Companies directory, and Application Pipeline without duplicate entry.

### 4. Strict Database Backup & Zero Accidental Loss Rule
- Established strict policy in `AGENTS.md` and `.agents/rules/data-safety.md`:
  - Mandatory verified backup (`pg_dump`) before executing any script, migration, manual query, or operation that modifies, truncates, drops, or deletes database records or schema.
  - Zero unsolicited deletions or truncates.

---

## 7. App-Specific Modals, Tailor Resume Redirection & JD Autofill Cleanup

### 1. App-Specific Confirmation & Alert Modals (`appConfirm` & `appAlert`)
- Replaced raw browser `confirm(...)` and `alert(...)` popups when deleting cards from Companies tab or Pipeline tab.
- Built `.cc-dialog-overlay` and `.cc-dialog-card` in `web/bridge.css` & `web/bridge.js` matching Career Copilot's dark glassmorphism design system:
  - Danger (soft red glow), warning (amber), and info (blue) icon headers.
  - Keyboard accessible: `Enter` confirms, `Escape` or backdrop click cancels.
  - Smooth scale and opacity transitions.
- Integrated into:
  - Companies tab card deletion (`.cc-co-delete` in `web/prototype-actions.js`).
  - Pipeline Track modal removal (`delTrack()` in `artifacts/job_search_os_main.html`).
  - Kanban card quick-remove hover button (`removeCompanyFromPipeline()` in `artifacts/job_search_os_main.html`).
  - Outreach tab saved resume deletion (`deleteSavedResume()` in `artifacts/job_search_os_outreach_resume.html`).

### 2. Tailor Resume Redirection to Outreach & Resume Studio
- Replaced cramped in-drawer "Tailor resume" sub-view inside the 360px AI Copilot drawer with instant redirection to the full **Resume Studio** in the Outreach tab (`/outreach.html?tab=resume`).
- Clicking `Tailor resume` from the AI Copilot drawer or `📄 Tailor Resume` from a pipeline card / track modal:
  - Packages company ID, company name, target role title, and cleaned JD text.
  - Passes data via `sessionStorage` (`cc_tailor_prefill`) and URL search params (`?tab=resume&company=...&role=...&companyId=...`).
  - Switches directly to the `Resume Studio` tab.
  - Autofills `#tailorCompany`, `#tailorRole`, `#tailorJD`, updates character count, and smoothly scrolls the form into view.

### 3. JD HTML Tag & Entity Stripping (`cleanJdText`)
- Resolved issue where Greenhouse and ATS scraped job descriptions contained escaped HTML tags (`&lt;div class=&quot;content-intro&quot;&gt;...`).
- Added multi-pass HTML entity decoding (`&quot;`, `&#39;`, `&lt;`, `&gt;`, `&amp;`, `&nbsp;`, numeric entities) and structural tag stripping (`<p>`, `<div>`, `<br>`, `<li>` converted to readable newlines and bullets).
- Applied in:
  - `server/src/services/autofill.js`
  - `server/src/services/discovery.js`
  - `web/bridge.js`
  - `artifacts/job_search_os_outreach_resume.html`
- Updated candidate selection in `autofill.js` to support user-entered JD notes (>= 40 chars) alongside discovered jobs.

---

## 8. Cover Letter Studio & Direct Card Navigation with Autofill

### 1. Master Resume & CAR Achievement Bank Cleanup
- **Complete Elimination**: Removed all mentions of `"serving ~200 paid customers/month at peak"` from:
  - `server/data/profile.json` (Growlogic role and Selected Achievements).
  - `server/data/achievements.json` (`growlogic-aks` result & metrics updated to `"zero missed sends"`).
  - `artifacts/job_search_os_outreach_resume.html` (`DEFAULT_MASTER_RESUME`).
  - `SIDDHANT_CONTEXT.md`.
- **Negative Prompt Hardening**: Added explicit negative constraints to all AI prompts (`tailorResumePrompt`, `refineResumePrompt`, `coverLetterPrompt`, and `refineCoverLetterPrompt` in `server/src/services/prompts.js`) ensuring LLMs never hallucinate or include this metric in future tailored documents.

### 2. Executive Cover Letter Studio
- Added first-class **Cover Letter Studio** mode within the Resume Studio tab on `/outreach.html`:
  - **Mode Toggle Buttons**: `[ 📄 Tailored Resume ]` and `[ ✉️ Cover Letter ]` in the studio hero header.
  - **Single-Page Executive Layout**: Dedicated `.cl-*` styles formatting contact bars, date, addressee blocks, subject lines, punchy narrative paragraphs, and formal sign-offs.
  - **Live Preview & Editor**: Supports Formatted A4 view, Raw Markdown view, in-place text editing, and PDF download (`Cover_Letter_[Company]_[Role].pdf`).
  - **AI Generation & Iterative Chat**:
    - Backend task `'cover-letter'` and synchronous endpoint `POST /api/cover-letter` mapping verified CAR stories (Philips Kafka 70% load reduction, MyAgentFirm multi-agent LLM failover, Growlogic AKS zero missed sends).
    - Iterative chat refinement via `'refine-cover-letter'` and `POST /api/refine-cover-letter`.

### 3. Direct Navigation from Every Company Card with Autofill
- **Directory Grid Cards**: Added `📄 Resume` and `✉️ Cover Letter` quick-action buttons to each company card.
- **Pipeline Kanban Board**: Added `📄 Resume` and `✉️ Letter` buttons in `.kcard-actions` on every board card.
- **Pipeline Table**: Added `📄 Resume` and `✉️ Letter` buttons in the table actions cell.
- **Track Modal**: Added `✉️ Cover Letter` action alongside `📄 Tailor Resume`.
- **Automated Prefill (`openCompanyStudio`)**:
  - Automatically reads the company name, target role title, and attached JD text (from tracked state or `/api/companies/:id/autofill`).
  - Persists prefill in `sessionStorage` (`cc_tailor_prefill`) with target mode (`resume` or `cover-letter`).
  - Navigates directly to `/outreach.html?tab=resume&mode=...`, toggles the requested studio mode, populates all form fields, and scrolls smoothly into view.

---

## 9. Interested Pipeline Stage & Progression Flow

Implemented a dedicated **Interested** stage in the pipeline (`new` → `interested` → `applied` → `networking` → `call` → `win` → `interview` → `offer` → `failed`):

1. **Pipeline Kanban Board**:
   - Added a 9th column: **INTERESTED** (`#fb923c` warm orange/coral accent) positioned immediately between `NEW` and `APPLIED`.
   - Updated Kanban grid to `repeat(9, minmax(160px, 1fr))` for smooth responsive horizontal layout.
   - 0ms native drag-and-drop support: drag cards into `INTERESTED`, or advance from `INTERESTED` into `APPLIED`, `NETWORKING`, etc.
   - Quick 1-click progression buttons inside card actions:
     - On `NEW` cards: `⭐ Interested ➔` (instantly moves to `interested`)
     - On `INTERESTED` cards: `📨 Applied ➔` (instantly moves to `applied`)
     - On `APPLIED` cards: `🤝 Network ➔` (instantly moves to `networking`)

2. **Target Companies Directory**:
   - Added quick `⭐ Interested` toggle button to every company card in the directory.
   - Displays `⭐ Interested ✓` in coral when active, clicking toggles between `new` and `interested`.
   - Added `⭐ Interested` quick-filter pill in the directory toolbar to immediately view all shortlisted target roles.
   - Card badge displays `<span class="stage s-interested">Interested</span>`.

3. **Modals & Filter Dropdowns**:
   - Added `Interested` to the Pipeline Stage filter dropdown (`#pf`).
   - Added `Interested (Target / Shortlisted)` to the Track Modal stage dropdown (`#tStage`).
   - Added `Interested (Target / Shortlisted)` to the Add Company Modal initial stage dropdown (`#aStage`).
   - Added `Interested` to Outreach Studio's pipeline update modal (`#updateStage`).

4. **Backend & Data Integrity**:
   - Updated `server/src/routes/tracked.js` and `server/src/routes/pipeline.js` STAGES lists.
   - Updated `server/src/services/autofill.js` `STAGE_RANK`: `{ new: 0, interested: 1, applied: 2, networking: 3, ... }`.
   - Updated `server/src/services/tasks.js` WIN document stage promotion case check.
   - Updated `web/prototype-actions.js` STAGES, STAGE_LABELS, and Kanban card stage pickers.
   - All changes compiled via `scripts/build-web.js` into `server/public/index.html` and `server/public/outreach.html`.
---

## 7. Multi-Role Tracking & Tailored Documents Pipeline

Added full end-to-end multi-role tracking for companies in the pipeline, allowing candidates to track multiple relevant openings per employer with dedicated JDs, tailored resumes, cover letters, and outreach logs.

### Features & Capabilities

1. **Company Cards in Pipeline (Kanban & Table Views)**:
   - **Multi-Role Sub-Cards**: Each role open at the company is displayed directly on the company card with its own role title, primary badge (`★`), stage badge (e.g. `[Applied]`, `[Interested]`), applied date (`📅 Applied: 24 Oct 2026`), outreach note (`✉️ 1 DM sent to EM, reply received`), and pay range.
   - **Direct Document Action Chips**:
     - `📄 Resume (Score%)`: 1-click opens the Quick Document Viewer Modal previewing the tailored resume for this specific role and match percentage.
     - `✉️ Letter ✓`: 1-click preview of the role-specific cover letter.
     - `📋 JD`: 1-click modal preview of the job description.
     - `📄 +Tailor Resume` / `✉️ +Letter`: If not yet generated, direct navigation to Resume & Cover Letter Studio pre-filled with the exact role title, JD, and `roleId`.
     - `Apply ↗`: Opens the external application URL.
     - `+ Track Another Role`: Immediately adds a new tracked opening to this company.

2. **Track Modal Multi-Role Manager (`#trackModal`)**:
   - **Role Tabs Bar**: Switch seamlessly between tracked openings (`role-1`, `role-2`, etc.) or click `+ Track Another Role`.
   - **Active Role Attributes**:
     - Target Role / Job Title
     - Role Application Stage (`Interested`, `Applied`, `Networking`, `Interview`, etc.)
     - Role Pay Range & Job Application Link
     - Applied Date (if applied)
     - Role-Specific Outreach & Messaging Log
     - Role Context Notes & Primary Role toggle (`★ Set as Primary Role for Pipeline Cards`)
   - **Connected Document Status Bar**:
     - Shows current status for Tailored Resume (with score & preview/re-tailor buttons) and Cover Letter (with view/edit buttons).
   - **Discovered Job Openings Importer**: 1-click import from live scraped openings (`window.__CC_BADGE_CACHE__`).

3. **Quick Document Viewer Modal (`#roleDocModal`)**:
   - Instant formatted markdown and plain-text preview without navigating away from the Kanban board.
   - 1-click actions:
     - `📋 Copy`: Copies document text to clipboard.
     - `📥 Download PDF`: Generates clean, ATS-compliant PDF document directly in browser.
     - `✏️ Open in Studio`: Jumps to Resume & Cover Letter Studio for comprehensive editing.

4. **Resume & Cover Letter Studio Integration (`job_search_os_outreach_resume.html`)**:
   - Accepts `roleId` and company parameters from card chips or session storage.
   - Generated tailored resumes and cover letters automatically bind to the specific `roleId` in `cc_saved_resumes_cache`, `cc_saved_cover_letters_cache`, and `sr_tracked[companyId].roles`.

5. **Storage, Serialization & Zero Data Loss**:
   - Strictly compliant with `AGENTS.md` and `accidental-data-loss-prevention`.
   - Serializes `roles` array into database `notes` column using safe metadata comments (`<!--CC_ROLES:[...]-->`), enabling multi-device persistence without destructive schema migrations.
   - Backward-compatible: primary role properties (`stage`, `roleTitle`, `jobLink`, `pay`, `jd`) remain populated on the top-level company object so existing search filters, analytics, and drag-and-drop operate flawlessly.
   - Metric Hallucination Guard: `"serving ~200 paid customers/month at peak"` is strictly forbidden and filtered from all tailored outputs.

---

## 8. Custom Company Auto-Resolution & Studio Prefill Fix

Fixed an issue where clicking "Tailor Resume" or "Letter" from a custom-added company card in the pipeline would pass the company's internal ID (`c_<timestamp>`, e.g. `c_1792024921292`) into the Company Name input field instead of its real human name (e.g. "Eli Lilly"):

1. **Sender-Side Resolution (`artifacts/job_search_os_main.html` & `web/bridge.js`)**:
   - `openCompanyStudio` and `navigateToTailorResume` now query `allCos()`, `custom`, `sr_custom`, and `sr_tracked` to resolve the human name for custom company records.
   - Strict ID guard (`!/^c_\d+/i.test(...)`) prevents internal identifiers from ever being assigned to `companyName` or appended as `&company=`.
2. **Receiver-Side Auto-Resolution & Sanitization (`artifacts/job_search_os_outreach_resume.html`)**:
   - In `checkTailorPrefill`, if `company` arrives as an internal ID or equals `companyId`, it automatically looks up the matching company record from `customCompanies` or `sr_custom` to resolve the actual company name.
   - If an unrecognized `c_...` ID is encountered, the field is cleared rather than displaying the raw internal ID.
3. **Verification**:
   - Automated unit test suite [`scratch/test-company-prefill.js`](file:///Users/siddhant/DEV-ENV/AntiGravity/career-copilot-new/scratch/test-company-prefill.js) validates name resolution, fallback handling, and c_ sanitization.

---

## 9. Automatic Job Description Details Fetching from URL (`/api/extract-jd`)

Eliminated the need to manually open job links in a browser and copy-paste text. Entering or passing any job URL now automatically fetches the role title, company name, and full formatted job description before tailoring:

1. **Extraction Engine (`server/src/services/fetch-jd.js`)**:
   - **Greenhouse Fast-Path**: Supports both `boards.greenhouse.io` and `job-boards.eu.greenhouse.io` URLs (`/v1/boards/{board}/jobs/{id}`), extracting complete HTML content, department, and location, cleaned via `cleanJdText`.
   - **Lever Fast-Path**: Parses `jobs.lever.co/{board}/{id}`, merging description, requirements bullet points, and additional notes.
   - **Workable & Ashby Fast-Paths**: Connects to posting APIs or decodes embedded JSON-LD.
   - **Universal Schema.org JSON-LD Parser**: Inspects any webpage's `<script type="application/ld+json">` for `JobPosting` structured data (standard across Workday, LinkedIn, Google Jobs).
   - **OpenGraph & Semantic HTML Scraper**: Fallback that strips noise (`nav`, `header`, `footer`, `script`) and extracts from `<main>`, `<article>`, and `[class*="description"]` containers.
   - **Grounded Web Search Fallback**: If an exotic career page blocks direct GET requests, falls back to web grounding to retrieve role responsibilities and qualifications.

2. **Backend Interceptor (`server/src/services/tasks.js` & `server/src/routes/ai.js`)**:
   - Added endpoint `POST /api/extract-jd` (`{ url }`).
   - In `tailorResume`, `generateCoverLetter`, and `refineResume`, `ensureJdText()` inspects incoming `jobDescription`. If a bare URL is provided, it automatically fetches the real posting details before compiling the LLM prompt, ensuring no model ever tailors against a raw URL string.

3. **Frontend Resume Studio Integration (`artifacts/job_search_os_outreach_resume.html`)**:
   - Typing or pasting a job URL into `#tailorJD` triggers auto-detection with visual progress pill: `◐ Connecting to job board & parsing posting…`.
   - When returned, `#tailorJD` is populated with the clean text, character counts are updated, and `#tailorRole` and `#tailorCompany` are auto-populated if empty.
   - When arriving via prefill (`checkTailorPrefill`) with a URL, auto-fetch runs immediately in the background.
   - `triggerStudioPrimaryAction`: If `#tailorJD` contains a URL, it automatically resolves the posting before triggering the tailoring job.

4. **Track Modal & Pipeline Integration (`artifacts/job_search_os_main.html`)**:
   - Added `⚡ Auto-fetch JD` button and on-change trigger beside `Job Link / URL` (`#tJD`).
   - Automatically populates `Detailed Job Description Text` (`#tJdText`) and `Target Role / Job Title` (`#tRole`).
   - In `openCompanyStudio`, preserves job link URLs so clicking "Tailor Resume" from a card with an apply URL immediately auto-fetches in Studio.


