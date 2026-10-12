# Career Copilot — Full Feature Handoff

## What's Already Built (in /artifacts/)

### job_search_os_main.html
- **Companies Tab** — 45 pre-loaded target companies with filters (EU/Gulf/Global/FDE/AI/Full-Stack), pay ranges, role tags, No DSA badge
- **Network Modal** — 4 LinkedIn search buttons per company: Peers / Hiring Managers / HR / Indians at company. Uses LinkedIn's `currentCompany` + `geoUrn` URL parameters (not keyword search). Each has a pre-written connection message to copy.
- **Track Button** — opens tracking modal per company, saves to localStorage
- **Pipeline Tab** — Table view and Kanban view (7 columns: New→Networking→Call→WIN Sent→Interview→Offer→Closed)
- **Connection Tracking** — per company, stores: name, role, type (peer/HM/HR/Indian/other), LinkedIn URL, status (Connection Req → DM Sent → Reply → Follow-up 1/2/3 → WIN Shared → Call Done → Referred → Abandoned), notes
- **Job Discovery Tab** — Quick links to LinkedIn/NaukriGulf/Bayt, Skills × 1000 worksheet, Company research prompt generator, Cold email generator, Visa sponsorship prompt
- **Add Company** — add any custom company not in the 45

### job_search_os_outreach_resume.html
- **Outreach System Tab** — Full NxtJob method: Step 1 research prompt → Step 2A connection request → Step 2B first DM → Step 2C peer/referral DM → Step 2D follow-up → Step 3 call script → Step 4 WIN doc builder prompt → Step 4B send WIN doc message → LinkedIn post → Gap answer
- **Resume Tab** — Master resume summary, tailored resume generator (paste JD → get Claude prompt → get tailored resume), achievement bank (4 CAR stories)
- **Job Search Tab** — 4 Boolean search strings for Google ATS search, 7 job board links
- **Daily System Tab** — Daily targets, clickable checklist, LinkedIn strategy, content rotation

## What's Pending / Needs to Be Built

### HIGH PRIORITY

#### 1. AI-Powered Company Research (needs API key)
When user clicks "Research This Company" on a company card:
- Call GPT/Claude API with the research prompt (already written in NXTJOB_METHOD.md)
- Return: top 3-5 company challenges, recent news, curiosity hook sentence, first DM paragraph
- Store the research result in the company's database record
- Show in the company card and auto-populate the outreach messages with company-specific content

```
Endpoint: POST /api/research
Body: { companyName, roleName }
Returns: { challenges[], hookSentence, firstDM, recentNews[] }
```

#### 2. AI-Powered Outreach Message Generator (needs API key)
For each company that has been researched:
- Auto-generate personalised connection request note (300 char limit)
- Auto-generate first DM (using company's specific challenges)
- Auto-generate follow-up messages (referencing new information)
- Auto-generate WIN document draft (after user inputs call notes)
All messages pre-populated with Siddhant's real achievements and background

```
Endpoint: POST /api/generate-messages
Body: { companyId, messageType, callNotes? }
Returns: { connectionNote, firstDM, followUp, winDoc? }
```

#### 3. WIN Document Generator
After a call is logged:
- User inputs: company name, person spoken to, 2-3 problems they confirmed (in their words)
- AI generates full 2-page WIN document
- Output: structured markdown → export to PDF
- WIN doc sections: Their Problems (with evidence) → My Solutions → Why Me (CAR format) → 30-Day Plan → Closing

```
Endpoint: POST /api/generate-win-doc
Body: { companyId, contactName, problems[], myRelevantExp }
Returns: { winDocMarkdown, sections{} }
```

#### 4. Tailored Resume Generator
- User pastes JD + company name
- API call generates tailored resume text
- Output: downloadable PDF or DOCX
- Uses Siddhant's master resume data (stored in DB) + JD keywords

```
Endpoint: POST /api/tailor-resume
Body: { companyName, jobTitle, jobDescription }
Returns: { tailoredResumeText, keywordsMatched[], keywordsMissing[] }
```

#### 5. More Achievement Stories (CAR format)
Currently only 4 in the artifact. Need 15+ for the full achievement bank.
See SIDDHANT_CONTEXT.md for all raw material. Need to be structured as:
```json
{
  "id": "philips-kafka",
  "title": "Real-time Patient Dashboard Pipeline",
  "company": "Philips Innovation Campus",
  "challenge": "...",
  "action": "...",
  "result": "70% load reduction, sub-second latency",
  "skills": ["Kafka", "AWS S3", "Spring Boot", "React"],
  "usedFor": ["performance", "distributed-systems", "healthcare"]
}
```

### MEDIUM PRIORITY

#### 6. Persistent Database (replace localStorage)
- PostgreSQL schema for: companies, tracked_companies, connections, messages, win_docs, resume_versions
- API layer to sync between frontend and DB
- Single-user auth (JWT, simple login for Siddhant only)

#### 7. Job Discovery (Live Jobs)
- LinkedIn jobs: scrape or use Apify LinkedIn Jobs scraper API
- NaukriGulf: scrape or use their RSS/API
- Filter by: role keywords, location, no DSA signal (detect from JD text)
- Store found jobs, link to company in the tracker
- Daily cron to fetch new jobs for target companies

#### 8. Daily Email/Notification
- Morning digest: which companies to reach out to today, follow-ups due, applications to send
- Send to Siddhant's email or WhatsApp (he has Twilio set up in MyAgentFirm)

#### 9. Pipeline Analytics
- Charts: applications over time, reply rate, conversion by stage
- Weekly summary: connections sent, replies, calls booked, WIN docs sent

### LOW PRIORITY (nice to have)

#### 10. LinkedIn Integration
- Can't automate LinkedIn (ToS violation), but can:
  - Pre-fill message templates based on company research
  - Track when messages were sent and auto-suggest follow-up timing
  - Show LinkedIn search links with proper filters (already done)

#### 11. More Companies
- Add 50+ more companies from research
- Categories: EU fintech, EU developer tools, Gulf banks/fintech, Gulf logistics tech
- Auto-suggest companies similar to ones already tracked

## Data Models

### Company
```typescript
{
  id: string
  name: string
  region: 'eu' | 'gulf' | 'global'
  roles: ('fde' | 'ai' | 'fs' | 'se')[]
  pay: string
  desc: string
  applyUrl: string
  researchData?: {
    challenges: string[]
    hookSentence: string
    recentNews: string[]
    lastResearched: Date
  }
  custom: boolean
}
```

### TrackedCompany
```typescript
{
  companyId: string
  stage: 'new' | 'networking' | 'call' | 'win' | 'interview' | 'offer' | 'failed'
  connections: Connection[]
  messages: Message[]
  winDoc?: string
  jobLink?: string
  notes: string
  updatedAt: Date
}
```

### Connection
```typescript
{
  name: string
  role: string
  type: 'peer' | 'hm' | 'hr' | 'indian' | 'other'
  linkedinUrl: string
  status: 'req' | 'dm' | 'reply' | 'fu1' | 'fu2' | 'fu3' | 'win' | 'call' | 'ref' | 'ab'
  notes: string
  createdAt: Date
  updatedAt: Date
}
```

### AchievementStory (CAR)
```typescript
{
  id: string
  title: string
  company: string
  period: string
  challenge: string
  action: string
  result: string
  metrics: string[]
  skills: string[]
  usedFor: string[]  // tags: 'performance', 'leadership', 'ai', 'distributed-systems', etc.
}
```

## Environment Variables Needed
```env
# AI
OPENAI_API_KEY=sk-...          # OR
ANTHROPIC_API_KEY=sk-ant-...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/career_copilot

# Auth
JWT_SECRET=...

# Optional: Job scraping
APIFY_API_KEY=...              # For LinkedIn job scraping

# Optional: Notifications
TWILIO_ACCOUNT_SID=...         # Already has this from MyAgentFirm
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=...
SIDDHANT_WHATSAPP=+91...

# Optional: Email
RESEND_API_KEY=...             # Or any email provider
SIDDHANT_EMAIL=siddhantrangari@gmail.com
```

## Deployment (his VPS)
- Hostinger KVM VPS (same as MyAgentFirm)
- Docker Compose: frontend + backend + PostgreSQL
- Nginx reverse proxy
- Domain: can use a subdomain of siddhantrangari.com or a new domain
- HTTPS: Let's Encrypt via Certbot

## API Routes Needed
```
GET    /api/companies              # Get all companies (preloaded + custom)
POST   /api/companies              # Add custom company
GET    /api/tracked                # Get all tracked companies with status
POST   /api/tracked/:id            # Update tracked company
DELETE /api/tracked/:id            # Remove tracking
POST   /api/tracked/:id/connections # Add connection to company
PUT    /api/tracked/:id/connections/:connId # Update connection status
GET    /api/pipeline               # Get pipeline view data
POST   /api/research               # AI: Research a company
POST   /api/generate-messages      # AI: Generate outreach messages
POST   /api/generate-win-doc       # AI: Generate WIN document
POST   /api/tailor-resume          # AI: Generate tailored resume
GET    /api/achievements           # Get all CAR stories
GET    /api/jobs/discover          # Fetch live jobs (scraper)
GET    /api/stats                  # Pipeline stats
```
