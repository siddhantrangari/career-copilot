# NxtJob.ai Method — Reverse Engineered

This is the outreach and job search methodology used by NxtJob.ai that Career Copilot should replicate and automate.

## Core Philosophy
"You are not a job seeker. You are a consultant having genuine conversations about business problems."

The standard job search fails because:
1. Poor targeting — applying everywhere instead of targeting where evidence wins
2. Generic outreach — "I am looking for a job" messages get ignored
3. No research — don't understand the company's actual problems
4. No WIN document — no way to stand out from other applicants

## The NxtJob 9-Agent System
They built 9 AI agents that each own one piece of the pipeline:
1. **Nova** — orchestrator/command center
2. **Navigator** — identifies best target roles for the candidate
3. **Hunter** — finds unlisted jobs on ATS boards
4. **Tailor** — ATS-optimised resume per JD
5. **Networker** — finds DMs, drafts outreach messages
6. **Pitcher** — builds WIN project deck
7. **Influencer** — LinkedIn content strategy
8. **Interviewer** — two-way mock interviews with recording + feedback
9. **Negotiator** — salary research + counter-offer scripts

## The Core Outreach Sequence (what Career Copilot must replicate)

### Step 1: Research First (before ANY contact)
Use AI to find what real problems the company is facing RIGHT NOW:
- Their engineering blog posts
- Recent news / funding / expansions
- Job descriptions (reveal what they're struggling to hire for)
- LinkedIn posts from their leadership
- Glassdoor reviews (what employees say is broken)
- Their product/website (what they're building)

Output needed:
- 3-5 specific technical/business challenges they face
- Evidence for each (source + date)
- One "curiosity hook" — a single sentence that references a real problem and makes the recipient want to reply

### Step 2A: Connection Request (300 char max)
**NOT**: "I am a senior engineer looking for opportunities at your company"
**YES**: "Hi [Name] — I came across [Company]'s work on [specific thing]. I have an interesting perspective on [problem area]. Would love to connect."

Key: Mention something specific. Spark curiosity. Do NOT mention job search.

### Step 2B: First DM (after they accept — within 24hrs)
Reference a real specific article/post/JD you found in research.
Mention 1-2 sentences about your relevant experience.
End with a question about their problem (not asking for a job).
Example:
"Hi [Name], thanks for connecting. I was going through [specific article] and noticed [Company] seems to be focused on [specific challenge]. I've spent the last few years working on exactly this — at Philips I built [relevant thing] and more recently I [relevant thing at MyAgentFirm]. Is [challenge] something your team is actively working through? Happy to jump on a 15-min call if useful."

### Step 2C: Peer Referral DM
For Indian engineers at target companies:
- More casual and warm
- Ask to learn about their experience (not asking for a job directly)
- 15-min chat, no agenda
- Referrals come from people who like you

### Step 2D: Follow-up (Day 4 if no reply)
ONE follow-up only. Reference NEW information you found since the first message.
Never "just checking in" — always add new value.

### Step 3: The 15-Minute Validation Call
This call is NOT an interview. You are a consultant validating hypotheses.
Listen 80%, talk 20%.

Opening: "I've been researching [Company] and had some hypotheses about [problem area] — wanted to validate them with someone on the inside."

Key questions:
- "Is [challenge from research] something your team is actively working on?"
- "What's the biggest technical problem you're solving in the next 6 months?"
- "What engineer profile is hardest to hire for right now?"
- "Are there internal roles not posted yet?"

Closing: "Based on what you shared about [specific problem], I'd love to put together a quick 2-page doc with thoughts on how I'd approach it. Can I send that across?"

Notes to take immediately after:
- The 2-3 real problems they confirmed (in their exact words)
- Whether a role exists or is upcoming
- Who else to talk to

### Step 4: WIN Document
Built AFTER the call using the validated problems (not before).
The problems come from what the person said on the call — in their own words.

Structure:
1. **THEIR 3 PROBLEMS** — stated clearly, backed by evidence (their exact words from call + public evidence)
2. **MY SOLUTIONS** — one consultant-grade, specific, actionable solution per problem
3. **WHY ME** — for each solution, which of my real projects proves I can solve it (CAR format)
4. **30-DAY PLAN** — what I would do in my first month specifically
5. **CLOSING** — one sentence inviting a follow-up call

Tone: "I'm a consultant presenting a proposal" NOT "I'm a job seeker asking for a chance"
Format: 2 pages max, designed for slide deck export, send as PDF

### Step 4B: Send the WIN Doc
Short message, let the doc do the talking:
"Hi [Name], really enjoyed our conversation on [day]. Based on what you shared about [specific problem], I put together a short 2-page doc with thoughts on how I'd approach it. Happy to walk you through it on a quick call, or feel free to share with whoever's relevant. [Attach PDF]"

## The "Memory" System
NxtJob stores the user's achievement stories (CAR format) as "memories" that all agents can access.
When the Interviewer agent prepares an answer, it reads the memories to find relevant stories.
Career Copilot should implement the same: a bank of CAR stories that the AI uses to:
- Auto-personalise outreach messages
- Auto-generate WIN documents
- Auto-prepare interview answers

## The Interview Agent
Most impressive feature: conducts actual two-way mock interviews.
- Researches the company + role (Reddit, Glassdoor, Blind for real interview questions)
- Predicts interview rounds (screening → hiring manager → VP)
- Asks questions in sequence, simulates real interviewer
- Records audio, analyses: filler words, speaking speed, answer quality
- Gives feedback: "Your answer was solid but lacked specificity on the leadership component"
- Shows how you SHOULD have answered and why

Career Copilot can implement a simpler version: text-based mock interview using AI.

## Metrics That Work
From the workshop (Robin's case study):
- 250+ connection requests per week → 4-5 calls per week
- 200+ referral requests over 12 weeks → job offer
- CEO waited for flight to interview him because CHR said "we need to close this guy"
- Robin applied for Senior Manager, got bumped to Director + 67% salary increase
- Another candidate: initial offer 14 LPA → negotiated to 30 LPA

## Salary Negotiation Method
1. Research salary data first: AmbitionBox, Glassdoor, Levels.fyi, LinkedIn Salary
2. Never give a number first
3. When they give a number: "I was hoping for [X]% more based on market data showing [range] for this role with my experience"
4. Use competing offers if you have them
5. Negotiate total comp: base + equity + bonus + benefits

## The Workshop Funnel
NxtJob's business model:
1. 2-day paid bootcamp (~₹5,000-10,000)
2. Teaches manual workflow using ChatGPT prompts (Day 1 and Day 2 prompt files)
3. The experience of doing it manually is deliberately clunky
4. Platform pitch: "Everything you just did manually, our agents do in one click"
5. Platform subscription: recurring monthly fee
6. Coaching community: upsell

## What to Build vs What They Have
| Feature | NxtJob | Career Copilot |
|---------|--------|----------------|
| Target role identification | AI agent (Navigator) | Done: manual, can add AI |
| Job hunting | AI agent (Hunter) | Done: Boolean search + job boards |
| Resume tailoring | AI agent (Tailor) | Done: AI prompt generator |
| Outreach messages | AI agent (Networker) | Partially done: need AI auto-gen |
| WIN document | AI agent (Pitcher) | Done: AI prompt generator |
| LinkedIn content | AI agent (Influencer) | Done: post template |
| Mock interviews | AI agent (Interviewer) | NOT built — future feature |
| Salary negotiation | AI agent (Negotiator) | NOT built — future feature |
| Memory/CAR bank | Stored in platform | Done: 12 stories in SIDDHANT_CONTEXT.md |
| Pipeline tracking | Not in NxtJob | Done: full pipeline + Kanban |
| Connection tracking | Not in NxtJob | Done: full connection log |
