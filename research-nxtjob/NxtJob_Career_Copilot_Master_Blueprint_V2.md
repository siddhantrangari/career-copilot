# NxtJob.ai Career Copilot

## Master Product Blueprint --- Version 2

**System target:** Career Copilot / `career.myagentfirm.com` / local
deployment\
**Architecture:** Nova orchestrator + eight specialist agents\
**Primary objective:** Convert authentic career evidence into a
repeatable job-search, interview, and negotiation execution system.

------------------------------------------------------------------------

## 1. Executive Summary

This Version 2 blueprint extends the original reverse-engineered Career
Copilot architecture into a complete product specification.

The system is an evidence-driven career execution engine coordinating
nine AI agents around:

-   A persistent candidate profile
-   A Black Folder of authentic career evidence
-   Career niche and positioning analysis
-   Target-company and job intelligence
-   Resume tailoring and ATS analysis
-   Networking and referral workflows
-   WIN Projects and 30--60--90-day solution decks
-   Predictive interview preparation and voice/text practice
-   Compensation and offer negotiation
-   Daily execution, analytics, and accountability

The original blueprint establishes four central candidate shifts:

1.  **Executive-consultant positioning:** Lead with business and
    technical problems solved rather than simply asking for
    opportunities.
2.  **Black Folder foundation:** Convert authentic memories,
    achievements, and metrics into reusable CAR/STAR evidence.
3.  **WIN Project movement:** Use custom one-page or five-slide
    30--60--90-day solution decks to demonstrate value.
4.  **Predictive interviewing and negotiation:** Prepare from
    role/company intelligence and negotiate around market value and
    business scope.

Version 2 adds the production-grade details required for a dependable
product: persistence, state machines, approvals, provenance, privacy,
error handling, analytics, testing, and a clear definition of done.

------------------------------------------------------------------------

## 2. Product Goals and Non-Goals

### Goals

-   Identify a defensible niche from demonstrated work rather than job
    titles alone.
-   Turn authentic experience into reusable CAR/STAR stories, resume
    bullets, interview answers, and WIN Projects.
-   Create a measurable pipeline from target companies and jobs to
    contacts, referrals, interviews, offers, and follow-ups.
-   Keep every external action reviewable and explicitly approved by the
    user.
-   Provide transparent readiness and momentum metrics without claiming
    an exact probability of employment.
-   Help the candidate focus on the fastest realistic income
    opportunities without encouraging financially risky spending.
-   Prevent fabricated achievements, unsupported metrics, spam, and
    unsafe automation.

### Non-goals

-   Guaranteeing interviews, offers, compensation, or hiring outcomes.
-   Automatically sending uncontrolled LinkedIn messages, connection
    requests, comments, or applications.
-   Inventing achievements, metrics, employers, technologies, leadership
    scope, or interview experiences.
-   Replacing legal, tax, immigration, or financial advice with
    unsupported certainty.

------------------------------------------------------------------------

## 3. Nine-Agent Architecture

The original blueprint defines **nine coordinated agents**: Nova plus
eight specialists.

Nova owns orchestration, shared memory, workflow state, approvals, and
the dashboard. Specialist agents produce bounded outputs that are
persisted with provenance and reviewed before reuse.

  -----------------------------------------------------------------------
  Agent                   Responsibility          Main outputs
  ----------------------- ----------------------- -----------------------
  **Nova**                Orchestration, memory,  Next-best action,
                          state, approvals        readiness factors,
                                                  workflow transitions

  **Navigator**           Niche positioning and   Niche statement, skill
                          title aliases           heatmap, title matrix

  **Hunter**              Job and company         Deduplicated jobs,
                          discovery               hiring signals, source
                                                  evidence

  **Tailor**              ATS-safe resume         Resume version, keyword
                          tailoring               map, ATS audit

  **Networker**           Relationship and        Outreach drafts,
                          referral workflow       follow-ups, CRM updates

  **Pitcher**             WIN Projects and        Challenge diagnosis,
                          30--60--90-day decks    solution deck

  **Influencer**          Authority content       Posts, carousel
                                                  outlines, content
                                                  calendar

  **Interviewer**         Predictive and          Question sets,
                          simulated interviews    transcripts, feedback,
                                                  delivery metrics

  **Negotiator**          Offer analysis and      Offer comparison,
                          negotiation             questions,
                                                  counter-plan, scripts
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 4. Six-Act, Thirty-Step Funnel

The 30-step funnel must be implemented as a resumable workflow rather
than a static simulation.

Every step must define:

-   Input data
-   AI action
-   User-editable output
-   Validation rules
-   Persistence behavior
-   Completion state
-   Back/edit behavior
-   Error and recovery behavior

### Act 1 --- Diagnose

-   Import resume
-   Extract candidate facts
-   Review and correct extracted facts
-   Collect career goals and constraints
-   Create the initial candidate profile

### Act 2 --- Position

-   Analyze work evidence
-   Identify recurring strengths and business problems solved
-   Generate niche options
-   Review the skill heatmap
-   Select target roles and title aliases

### Act 3 --- Target

-   Generate a company universe
-   Score hiring signals
-   Rank the Top 20 target companies
-   Discover relevant jobs
-   Deduplicate and review job opportunities

### Act 4 --- Convert

-   Tailor the resume
-   Audit ATS alignment
-   Create target-contact lists
-   Draft outreach
-   Create a WIN Project

### Act 5 --- Perform

-   Predict interview rounds
-   Generate likely interview questions
-   Practice CRJIR answers
-   Analyze SOLER and RSCP delivery
-   Improve weak topics and repeat practice

### Act 6 --- Close

-   Compare offers
-   Prepare negotiation questions and counter-plans
-   Maintain pipeline velocity
-   Review weekly metrics
-   Select the next best actions

------------------------------------------------------------------------

## 5. Black Folder Memory Store

The Black Folder is the source of truth for authentic candidate
evidence.

AI-generated content may be proposed, but it cannot become a reusable
fact until the user approves it.

### Required entities

#### Experience record

-   Employer
-   Role
-   Dates
-   Scope
-   Team size
-   Domain
-   Systems and technologies
-   Responsibilities
-   Leadership and stakeholder scope

#### Achievement record

-   Challenge
-   Action
-   Result
-   Metric
-   Baseline
-   Timeframe
-   Evidence source
-   Confidence level

#### CAR/STAR story

-   Challenge
-   Action
-   Result
-   Situation
-   Task
-   Research
-   Judgment
-   Impact
-   Company relevance

#### Founder, freelance, and project record

-   Customer problem
-   Delivered solution
-   Technology stack
-   Measurable outcome
-   Constraints
-   Customer or stakeholder context

#### Career-gap record

-   Dates
-   Approved explanation
-   Learning
-   Projects
-   Relevant outcomes
-   Preferred wording

#### Skill record

-   Skill
-   Evidence
-   Proficiency
-   Last-used date
-   Related projects
-   Target roles

### Evidence states

-   Draft
-   User-approved
-   Needs proof
-   Rejected
-   Archived

### Required controls

-   Field-level edit history
-   Source and provenance
-   User approval
-   Duplicate detection
-   Tags and search
-   Reuse tracking
-   Export
-   Deletion
-   Restore

------------------------------------------------------------------------

## 6. Core State Machines

### Job

`discovered → reviewed → saved → applied → screening → interview → offer → accepted/rejected/withdrawn/expired`

### Contact

`identified → researched → draft-ready → approved → sent manually → connected → conversation → referral-requested → referred/no-response/closed`

### WIN Project

`idea → evidence-gathering → hypothesis → draft → user-reviewed → shared → feedback-received → revised → archived`

### Interview

`planned → question-set-ready → practice → in-progress → completed → scored → review → repeat-ready`

### Offer

`received → normalized → compared → questions-ready → negotiation → revised → accepted/declined/expired`

Every state transition should be logged, validated, and reversible where
practical.

------------------------------------------------------------------------

## 7. Functional Requirements

### 7.1 Onboarding and Workspace

-   Account creation and authentication
-   Session management
-   Timezone and location
-   Work authorization
-   Notice period
-   Compensation preferences
-   Remote and hybrid preferences
-   Job-search urgency
-   Resume PDF/DOCX import
-   Manual correction before facts enter the Black Folder
-   Multiple profile versions for different target niches

### 7.2 Hunter

-   Named and configurable sources
-   Source URL for every job
-   Retrieval timestamp
-   Freshness indicator
-   Location normalization
-   Salary normalization
-   Deduplication key
-   Clear distinction between verified facts and inferred hiring signals
-   Manual URL or CSV import fallback
-   Source attribution and refresh behavior
-   Rate-limit and failure handling

### 7.3 Tailor and Resume Studio

-   Locked factual fields
-   Warning when a rewrite introduces unsupported claims
-   Before/after diff
-   Keyword mapping
-   ATS audit
-   Resume version history
-   Restore previous versions
-   PDF and DOCX export
-   Plain-text fallback
-   No keyword stuffing
-   No guarantee of an ATS score

### 7.4 Networker and Influencer

-   Contact records
-   Relationship context
-   Conversation history
-   Follow-up dates
-   Referral status
-   Consent notes
-   Duplicate outreach prevention
-   Message preview
-   Explicit approval before sending or publishing
-   Pause and stop controls
-   No password collection
-   No uncontrolled automation
-   No fake engagement

### 7.5 Pitcher

-   One-page WIN Project mode
-   Five-slide deck mode
-   Challenge diagnosis
-   Evidence and source list
-   Fact versus hypothesis labels
-   Assumptions
-   Recommended actions
-   KPIs
-   Comments
-   Version history
-   Share links
-   PDF export
-   Follow-up tracking

### 7.6 Interviewer

-   Recording consent
-   Clear start, stop, pause, and delete controls
-   Retention settings
-   Transcript export
-   Audio export where supported
-   Browser compatibility checks
-   Accessibility support
-   Text fallback when microphone, browser, or transcription services
    fail
-   Predicted questions labeled with source, confidence, and date
-   No presentation of predictions as certainty
-   Avoid biased or opaque candidate assessments

### 7.7 Negotiator

Normalize and compare:

-   Base salary
-   Variable compensation
-   Equity
-   Bonuses
-   Benefits
-   Notice period
-   Probation
-   Remote policy
-   Location
-   Tax assumptions
-   Offer expiry
-   Negotiation history
-   Risk factors
-   Candidate priorities

The system should show trade-offs and questions, not only one aggressive
counteroffer.

### 7.8 Daily Execution

-   Prioritized daily task queue
-   Estimated time
-   Dependencies
-   Due dates
-   Follow-up queue
-   Missed-task recovery
-   Weekly review
-   Manual override
-   Reason for each recommended task
-   Next-best-action logic

------------------------------------------------------------------------

## 8. Readiness and Analytics

Replace the probability-style **"Chances of Success"** meter with a
transparent:

-   **Career Readiness Score**
-   **Job Search Momentum Score**

These scores must not imply a statistically calibrated chance of
employment.

### Readiness factors

-   Evidence completeness
-   Positioning clarity
-   Market fit
-   Resume readiness
-   Outreach readiness
-   WIN Project readiness
-   Interview readiness
-   Pipeline health

### Required analytics

-   Applications by period
-   Response rate
-   Referral rate
-   Interview rate
-   Interview-to-offer conversion
-   Offer acceptance rate
-   Average response time
-   Source performance
-   Contact response rate
-   Follow-up completion
-   Interview practice trends
-   Weak-topic trends
-   Current pipeline bottleneck

Estimates, hypotheses, and model-generated signals must be visibly
labeled.

------------------------------------------------------------------------

## 9. AI Contracts and Safety

-   Validate every AI response against a JSON schema.
-   Attach provenance to every generated claim:
    -   User fact
    -   Imported source
    -   Model inference
    -   Proposed hypothesis
-   Ask for missing evidence instead of inventing metrics.
-   Defend against prompt injection in documents, job descriptions,
    webpages, and messages.
-   Require human approval before:
    -   Sending external messages
    -   Publishing content
    -   Applying to jobs
    -   Sharing decks
    -   Changing saved factual records
-   Expose uncertainty, source date, confidence, and limitations.
-   Preserve the distinction between facts, hypotheses, recommendations,
    and drafts.

------------------------------------------------------------------------

## 10. Persistence and API Requirements

The original REST endpoints remain the functional starting point, but
Version 2 requires consistent contracts across all endpoints.

### API requirements

-   Authentication and authorization on every private route
-   Request IDs
-   Idempotency keys for mutating operations
-   Pagination
-   Input validation
-   Typed error responses
-   Rate limits
-   Audit events
-   Consistent status codes
-   Structured JSON responses
-   Versioned endpoints
-   Retry-safe operations

### Required persistence entities

-   Users
-   Workspaces
-   Candidate profiles
-   Profile versions
-   Experiences
-   Achievements
-   CAR/STAR stories
-   Skills
-   Companies
-   Jobs
-   Applications
-   Contacts
-   Conversations
-   Outreach drafts
-   Follow-ups
-   Resumes
-   Resume versions
-   WIN Projects
-   Deck versions
-   Interviews
-   Transcripts
-   Scores
-   Offers
-   Negotiation history
-   Daily tasks
-   Agent runs
-   Audit events

### Infrastructure requirements

-   Database persistence
-   File storage for resumes, exports, audio, transcripts, decks, and
    evidence
-   Retention rules
-   Search indexes
-   Optional vector retrieval
-   Delete and rebuild support
-   Background jobs
-   Retry queues
-   Backups
-   Migrations
-   Health checks
-   Structured logs
-   Secret management
-   Monitoring and alerting

------------------------------------------------------------------------

## 11. Reliability, Privacy, and Accessibility

### Reliability

Handle:

-   Provider timeouts
-   Invalid AI JSON
-   Rate limits
-   Network loss
-   Service outages
-   Cancellation
-   Partial completion
-   Duplicate requests
-   Failed document generation
-   Transcription failure

Provide:

-   Retry
-   Manual fallback
-   Draft preservation
-   Resume-after-refresh
-   Clear error messages
-   Recovery actions
-   Offline-safe editing where practical

### Privacy and security

-   Minimize data retention
-   Support export and deletion
-   Protect sensitive data in transit and at rest
-   Explain who can access audio/video artifacts
-   Require explicit consent for recording
-   Never store LinkedIn passwords
-   Do not perform uncontrolled platform automation
-   Maintain audit logs for sensitive actions

### Accessibility

-   Keyboard navigation
-   Accessible labels
-   Readable contrast
-   Mobile-responsive layouts
-   Captions and transcripts
-   Text alternatives for voice workflows
-   Screen-reader-friendly controls
-   Visible focus states
-   No hover-only essential actions

------------------------------------------------------------------------

## 12. Testing Strategy

### Unit tests

-   Scoring
-   Salary normalization
-   Job deduplication
-   State transitions
-   Validation
-   Permission checks
-   Resume fact locking

### Integration tests

-   Every agent endpoint
-   Persistence
-   File exports
-   Retry behavior
-   Provider failures
-   Search and vector retrieval
-   Audit logging

### End-to-end tests

-   Onboarding
-   30-step funnel
-   Black Folder creation and approval
-   Resume tailoring
-   Job tracking
-   Outreach approval
-   WIN Project creation
-   Interview practice
-   Offer comparison
-   Daily task execution

### AI evaluation

-   Hallucination
-   Unsupported metrics
-   Prompt injection
-   Source attribution
-   Schema compliance
-   Fact versus hypothesis classification
-   Resume factuality
-   Bias and unsafe recommendation checks

### Quality tests

-   Accessibility
-   Responsive/mobile
-   Browser compatibility
-   Performance
-   Security
-   Rate limits
-   PDF/DOCX golden-file exports
-   Version restore
-   Data deletion
-   Backup recovery

------------------------------------------------------------------------

## 13. Definition of Done

A feature is complete only when:

1.  It works from UI through API and persistence.
2.  Loading, empty, error, retry, cancellation, and manual fallback
    states exist.
3.  Generated facts are traceable.
4.  Required approvals are enforced.
5.  Unit, integration, and relevant end-to-end tests pass.
6.  Desktop and mobile layouts work.
7.  Accessibility basics are supported.
8.  Exports, edits, version history, restore, deletion, and recovery
    exist where applicable.
9.  Analytics and audit events are emitted.
10. API schemas, data model, workflow, and operational documentation are
    updated.

"Complete" must not mean only that a page or endpoint exists.

------------------------------------------------------------------------

## 14. Recommended Delivery Roadmap

  -----------------------------------------------------------------------
  Milestone               Scope                   Exit criteria
  ----------------------- ----------------------- -----------------------
  **M6**                  Black Folder            CRUD, approval, search,
                          persistence             versioning, export,
                                                  deletion

  **M7**                  Workflow state engine   Resumable funnel,
                                                  object states,
                                                  next-best-action queue

  **M8**                  Evidence-first AI       Schemas, provenance,
                          contracts               validation,
                                                  hallucination
                                                  safeguards

  **M9**                  Hunter and CRM          Freshness,
                          hardening               deduplication,
                                                  contacts, follow-ups,
                                                  analytics

  **M10**                 Interview and offer     Consent, text fallback,
                          hardening               confidence labels,
                                                  normalization

  **M11**                 Reliability and quality Retries, observability,
                                                  security,
                                                  accessibility, tests

  **M12**                 Launch readiness        Backups, documentation,
                                                  onboarding, deployment
                                                  checklist
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 15. Original API Starting Point

The original blueprint identified the following functional endpoint
families:

``` text
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

Version 2 should add explicit contracts for authentication, persistence,
audit events, permissions, pagination, validation, idempotency, errors,
and rate limits.

------------------------------------------------------------------------

## 16. Final Product Principle

The Career Copilot should behave like a disciplined operating system for
a job search:

-   Grounded in evidence
-   Explicit about uncertainty
-   Protective of the candidate's reputation and privacy
-   Human-approved at consequential boundaries
-   Focused on the next useful action
-   Measurable through real pipeline outcomes

The strongest version is not the one with the most autonomy. It is the
one that reliably turns authentic experience into better positioning,
better conversations, better interviews, and better decisions.

------------------------------------------------------------------------

*Prepared as Version 2 from the original Career Copilot blueprint and
the subsequent product-gap review.*
