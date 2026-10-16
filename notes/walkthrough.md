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

