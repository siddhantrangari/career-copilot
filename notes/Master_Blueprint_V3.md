# NxtJob.ai Career Copilot Master Blueprint — Version 3

> **System Target:** Career Copilot (`career.myagentfirm.com` / local deployment)
>
> **Version 3 focus:** Preserve the original NxtJob.ai framework while introducing two clearly separated execution tracks: **Freelancing** and **Full-Time Jobs**.

## 1. Product Direction

The product should have a shared career foundation and two separate execution tracks. The tracks must not become one mixed CRM.

- Shared profile, skills, experience, portfolio, documents, Black Folder, CAR memories, evidence, AI gateway, notifications, and activity history.
- Dedicated Freelancing orchestrator, agents, records, workflow, dashboard, and metrics.
- Dedicated Full-Time Jobs orchestrator, agents, records, workflow, dashboard, and metrics.
- The original NxtJob agent architecture remains the foundation of Full-Time Jobs.

> **Core principle:** Shared intelligence, separate execution tracks.

## 2. High-Level Architecture

```text
Shared Career Foundation
│
├── Profile, Skills, Experience, Portfolio, Documents
├── Black Folder / Memory / CAR
├── Evidence, AI Gateway, Storage, Notifications
│
├── Freelancing Track
│   └── Freelance Orchestrator + Freelance Agents
│
└── Full-Time Jobs Track
    └── Nova + Original NxtJob Agents
```

## 3. Shared Black Folder / Memory

The Black Folder is the factual source of truth for the entire product.

It stores:

- Authentic experiences and projects.
- Responsibilities and technical challenges.
- Achievements and quantified outcomes.
- Skills and business problems solved.
- CAR statements.
- Supporting evidence.
- Approved wording and related roles.

### CAR structure

```text
Challenge
Action
Result
```

The system must never invent employers, clients, metrics, responsibilities, projects, or achievements. When a result is not measurable, it may use a qualitative result but must not create a false number.

### Memory statuses

```text
Draft → Needs Review → Verified → Approved → Archived
```

Memory is used by Navigator, Hunter, Tailor, Networker, Pitcher, Influencer, Interviewer, Negotiator, and the Freelance agents.

## 4. Track Selection

The primary UI must make the two tracks unmistakable:

```text
[ Freelancing ] [ Full-Time Jobs ]
```

The selected track changes the orchestrator, dashboard, navigation, available agents, records, workflow, metrics, and recommended actions.

---

# 5. Full-Time Jobs Track

## 5.1 Navigation

```text
Full-Time Jobs
│
├── Overview
├── Job Board
├── Discover Jobs
├── Networking
├── WIN Projects
├── Interviews
├── Offers
└── Memory / CAR
```

> **Discover Jobs finds opportunities. Job Board tracks them. The job detail view contains the NxtJob workflow.**

## 5.2 Job discovery filters

Primary filter row:

```text
[ All ] [ Remote ] [ On-site ] [ Hybrid ] [ Visa Sponsorship ]
```

Additional filters:

```text
Location: India, UAE, Europe, USA, Custom
Experience: Any, 0–3, 3–6, 6–10, 10+
Employment: Full-Time, Permanent, Contract-to-Hire
Salary: When available
```

Visa sponsorship must support:

```text
Available
Unavailable
Unknown
```

Unknown must not be presented as confirmed sponsorship. Store source, eligible countries, and verification date when available.

## 5.3 Job Board — central workspace

The main Full-Time Jobs workspace is a Kanban board:

```text
Saved
  ↓
Researching
  ↓
Networking
  ↓
WIN Project
  ↓
Referral
  ↓
Applied
  ↓
Interview
  ↓
Offer
  ↓
Accepted / Rejected
```

A desktop board may display columns such as:

```text
┌────────────┬──────────────┬─────────────┬────────────┬────────────┬───────────┐
│ Saved      │ Researching  │ Networking  │ Applied    │ Interview  │ Offer     │
├────────────┼──────────────┼─────────────┼────────────┼────────────┼───────────┤
│ Job cards  │ Job cards    │ Job cards   │ Job cards  │ Job cards  │ Job cards │
│            │ WIN status   │ Referral    │ Resume     │ Round info │ Package   │
└────────────┴──────────────┴─────────────┴────────────┴────────────┴───────────┘
```

### Job card contents

- Job title and company.
- Location and work mode.
- Visa sponsorship status.
- Match summary.
- Current stage.
- Next action.
- Follow-up date.
- Networking, WIN Project, referral, and interview status.

The board must remain scannable; detailed information belongs in the job detail drawer.

### Board interactions

Users can:

- Drag jobs between stages.
- Move jobs with a status menu on mobile.
- Open a job detail drawer.
- Add notes and next actions.
- Set follow-up dates.
- Archive, reject, or restore jobs.
- View activity history.

The workflow is flexible. Valid paths include:

```text
Saved → Applied
Saved → Networking → Referral → Applied
Saved → Researching → WIN Project → Applied
Saved → Networking → Applied
```

The user must not be blocked when a referral or WIN Project is unavailable.

## 5.4 Discover Jobs and Recommended Jobs

Discover Jobs is a search and recommendation experience, not another Kanban column.

It contains:

- Search input.
- Work-mode filters.
- Visa sponsorship filter.
- Location, experience, salary, and freshness filters.
- Recommended job cards.
- Source and freshness information.

Each recommendation should show:

- Job title and company.
- Location and work mode.
- Visa sponsorship status.
- Experience level and salary when available.
- Posted date and source.
- Why the role matches the candidate.
- Relevant Memory / CAR evidence.

Primary actions:

```text
[ View Job ] [ Save to Board ]
```

A discovered job enters the `Saved` column.

## 5.5 Job detail view

Clicking a job card opens a drawer or full-page view:

```text
Job Details
│
├── Overview
├── Requirements
├── Company Research
├── Match Analysis
├── Resume Used
├── Networking
├── WIN Project
├── Referral
├── Application
├── Interviews
├── Notes
└── Activity History
```

## 5.6 Correct Full-Time Job cycle

```text
Career Direction
      ↓
Memory / Black Folder
      ↓
Job Discovery
      ↓
Company and Role Research
      ↓
Resume Tailoring
      ↓
Networking
      ↓
WIN Project
      ↓
Referral
      ↓
Application
      ↓
Interview Preparation
      ↓
Interview
      ↓
Offer Negotiation
```

Referral is optional:

```text
Networking
    ↓
WIN Project
    ↓
Referral available?
    ├── Yes → Request / receive referral → Apply
    └── No  → Apply directly
```

The recommended default for high-value roles is:

```text
Networking → WIN Project → Referral → Application
```

## 5.7 Original NxtJob agents

### Nova — Master Orchestrator

Coordinates career state, Memory retrieval, agent handoffs, job-board transitions, and next actions.

### Navigator — Career GPS and Niche Positioning

Handles career direction, evidence-based positioning, target niche, title aliases, skill heatmaps, and role prioritization.

### Hunter — Job Radar

Handles job discovery, hiring signals, target companies, matching, work-mode filters, visa evidence, freshness, and duplicate detection.

### Tailor — Resume Optimizer

Handles the five cardinal resume sections, ATS alignment, job-specific summaries, Before-After bullets, keyword mapping, and resume versions.

### Networker — Referral and Outreach Engine

Handles alumni, peers, hiring managers, recruiters, connection messages, follow-ups, and referral requests.

### Pitcher — WIN Method

Handles company challenge diagnosis, WIN Projects, 30-60-90 decks, value hypotheses, outreach pitches, and CAR-based “Why Me” proof.

### Influencer — Authority and Inbound Visibility

Handles LinkedIn authority posts, technical content, industry perspectives, and carousel outlines.

### Interviewer — Predictive Interview Coach

Handles predictive rounds, likely questions, CRJIR answers, CAR retrieval, mock interviews, SOLER, RSCP, filler-word, and WPM feedback.

### Negotiator — Compensation and Offer Strategy

Handles salary benchmarking, compensation, equity, benefits, counter-offer scripts, notice period, and negotiation history.

## 5.8 Networking

The original Networker workflow remains:

```text
Day 1: Connection
Day 4: Value add
Day 8: Soft referral ask
```

Messages should use relevant approved CAR memories and require user approval before sending.

## 5.9 WIN Projects

WIN Projects remain inside Pitcher. They are focused company-specific value hypotheses, not large unpaid assignments.

Supported formats:

- One-page solution brief.
- Five-slide 30-60-90 deck.
- Short technical demo.
- Product improvement analysis.
- Architecture or automation concept.

Structure:

```text
Challenge
Evidence
Why it matters to this role
Root cause
Consultant-grade solution
Recommended actions / KPIs
Why Me
```

The system must label verified facts, hypotheses, assumptions, sources, and candidate-created recommendations.

## 5.10 Full-Time job statuses

```text
SAVED
RESEARCHING
NETWORKING
WIN_PROJECT
REFERRAL
APPLIED
INTERVIEW
OFFER
ACCEPTED
REJECTED
ARCHIVED
```

Every status transition records the previous status, new status, actor, timestamp, and optional reason.

---

# 6. Freelancing Track

Freelancing is a separate product track with its own orchestrator and workflow.

## 6.1 Navigation

```text
Freelancing
│
├── Overview
├── Find Work
├── Offers
├── Proposals
├── Clients
├── Projects
└── Revenue
```

## 6.2 Freelance workflow

```text
Opportunity Found
      ↓
Qualified
      ↓
Offer Selected
      ↓
Proposal Drafted
      ↓
Proposal Sent
      ↓
Client Reply
      ↓
Discovery Call
      ↓
Negotiation
      ↓
Won / Lost
      ↓
Delivery
      ↓
Payment
      ↓
Testimonial / Referral / Retainer
```

## 6.3 Freelance-specific records

```text
FreelanceOpportunity
ServiceOffer
Client
ClientContact
Proposal
DiscoveryCall
FreelanceProject
ProjectMilestone
ProjectTask
Invoice
Payment
Retainer
ClientFollowUp
```

Freelance records must not be mixed with full-time job applications.

---

# 7. Shared Memory, Separate Outputs

The same approved memory can be transformed differently by each track.

### Shared memory

```text
Built an AI-powered SaaS platform using Spring Boot,
React, PostgreSQL, and LLM APIs.
```

### Full-time output

> Designed and developed an AI-powered SaaS platform using Spring Boot, React, PostgreSQL, and LLM APIs, contributing across backend architecture and product integration.

### Freelance output

> I can help your team integrate LLM workflows, backend APIs, and production-ready automation using the same technologies I have used to build AI-powered SaaS systems.

The factual source remains shared; the presentation changes according to the selected track.

# 8. Data Model Separation

## Shared entities

```text
User
Workspace
Profile
Skill
Experience
Achievement
PortfolioItem
Document
BlackFolderStory
Evidence
AIInteraction
Notification
```

## Full-Time entities

```text
Job
Company
JobApplication
ResumeVersion
RecruiterContact
Referral
NetworkingActivity
WINProject
Interview
InterviewRound
InterviewQuestion
JobOffer
CompensationPackage
ApplicationFollowUp
```

## Freelance entities

```text
FreelanceOpportunity
ServiceOffer
Client
ClientContact
Proposal
DiscoveryCall
FreelanceProject
ProjectMilestone
ProjectTask
Invoice
Payment
Retainer
ClientFollowUp
```

# 9. API Starting Point

The original NxtJob APIs remain the starting point:

```text
POST /api/resume/parse/v5
POST /api/resume/calculateScore/v3
POST /api/resume/ats/fix/v2
POST /api/resume/jobMatch/v2
POST /api/omega/trial/suggest-niches
GET  /api/job/fetch/recommendations
POST /api/network/referrers
POST /api/network/draft-outreach
POST /api/pitcher/trial/problems
POST /api/pitcher/generate-deck
POST /api/tools/influencer
POST /api/interview/ai/create
POST /api/interview/ai/deepgram-token
POST /api/interview/ai/submit-answer
POST /api/tools/negotiate
POST /api/trial/resume-pdf
```

Version 3 adds track-specific API groups:

```text
GET  /api/full-time/jobs
POST /api/full-time/jobs/save
PATCH /api/full-time/jobs/:id/status
GET  /api/full-time/jobs/:id
POST /api/full-time/jobs/:id/networking
POST /api/full-time/jobs/:id/win-project
POST /api/full-time/jobs/:id/referral
POST /api/full-time/jobs/:id/application

GET  /api/freelance/opportunities
POST /api/freelance/offers
POST /api/freelance/proposals
GET  /api/freelance/clients
POST /api/freelance/projects
GET  /api/freelance/revenue
```

All APIs require authentication, validation, structured errors, rate limiting, idempotency where appropriate, audit history, and persistent storage.

# 10. Implementation Architecture

```text
career-copilot/
├── client/src/
│   ├── pages/
│   │   ├── FullTimeJobs/
│   │   │   ├── FullTimeOverviewPage.jsx
│   │   │   ├── JobBoardPage.jsx
│   │   │   ├── DiscoverJobsPage.jsx
│   │   │   ├── NetworkingPage.jsx
│   │   │   ├── WinProjectsPage.jsx
│   │   │   ├── InterviewsPage.jsx
│   │   │   ├── OffersPage.jsx
│   │   │   └── MemoryPage.jsx
│   │   └── Freelancing/
│   │       ├── FreelanceOverviewPage.jsx
│   │       ├── FindWorkPage.jsx
│   │       ├── OffersPage.jsx
│   │       ├── ProposalsPage.jsx
│   │       ├── ClientsPage.jsx
│   │       ├── ProjectsPage.jsx
│   │       └── RevenuePage.jsx
│   └── components/
│       ├── JobKanbanBoard.jsx
│       ├── JobCard.jsx
│       ├── JobDetailDrawer.jsx
│       ├── RecommendedJobCard.jsx
│       ├── BlackFolderPanel.jsx
│       └── TrackSwitcher.jsx
│
└── server/src/
    ├── services/
    │   ├── aiService.js
    │   ├── novaCareerService.js
    │   ├── freelanceOrchestrator.js
    │   ├── memoryService.js
    │   └── jobService.js
    ├── routes/
    │   ├── fullTimeJobs.js
    │   ├── freelancing.js
    │   ├── memory.js
    │   └── api.js
    └── models/
        ├── fullTime/
        ├── freelance/
        └── shared/
```

# 11. Definition of Done

Version 3 is complete when:

- Freelancing and Full-Time Jobs are separate top-level tracks.
- Each track has its own orchestrator.
- Full-Time Jobs preserves the original NxtJob agents.
- Black Folder / Memory / CAR is visible and usable.
- Discover Jobs is separate from Job Board tracking.
- Full-Time Jobs has a working Kanban board.
- Jobs can move through the NxtJob workflow.
- Remote, on-site, hybrid, and visa sponsorship filters work.
- Visa sponsorship can be available, unavailable, or unknown.
- Networking, WIN Project, referral, application, interview, and offer stages are represented.
- Jobs can skip unnecessary stages without breaking the workflow.
- Recommended jobs can be added to the board.
- Outputs use approved memory and do not invent unsupported facts.
- Freelance records are not mixed with full-time records.
- Desktop and mobile layouts are usable.
- Loading, empty, error, retry, and fallback states exist.
- Important actions are auditable.

# 12. Final Product Principle

The product remains faithful to NxtJob.ai:

> Build a strong memory foundation, identify the right opportunities, tailor the candidate’s positioning, create meaningful relationships, demonstrate value through WIN Projects, prepare predictively for interviews, and negotiate from evidence.

Version 3 gives this framework two clear paths:

```text
Freelancing
    → Find clients, win projects, deliver, and get paid

Full-Time Jobs
    → Discover jobs, track them on a Kanban board, network,
      create WIN Projects, get referrals, apply, interview,
      and negotiate
```

The result is one shared factual memory with two focused execution tracks.
