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
