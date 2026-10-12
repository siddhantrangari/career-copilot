# NxtJob.ai Workshop Prompts — Day 1 & Day 2

Source: NxtJob.ai 2-day Agentic Job Search Bootcamp by Major Richik (richik@nxtjob.ai)

## DAY 1

### Prompt 01 — Identify Your Right Target Roles
> "Act as a top executive recruiter, career strategist, and leadership talent market analyst. Analyze my resume based on evidence from my work experience. Not my job titles. Identify the recurring patterns in my strengths, business problems solved, functional expertise, seniority, leadership scope, industries, customers, and company types/sizes. Reverse-engineer my professional positioning and recommend the highest-probability target niche (roles, industries, company sizes, and seniority) where I am most competitive. Then provide an exhaustive list of relevant job title aliases used across startups, scale-ups, enterprises, consulting firms, and MNCs. Base every recommendation on recurring patterns, not isolated experiences."

### Prompt 02 — Find Companies Likely to Have Hidden Roles
> "Act as an expert labor-market researcher and business analyst. For [THIS NICHE], identify companies with the strongest current and forward-looking hiring signals. Research credible, recent sources and rank companies based on: 1. Fastest revenue/business growth in the last 2–3 years. 2. Entering the target geography recently or this year. 3. Expanding offices, GCCs, plants, teams, products, or operations. 4. Employee headcount growth over the last 6–24 months. 5. Increasing job openings or actively hiring for relevant functions. 6. Recent Series C+ funding, IPO, major investment, acquisition, or large contracts. 7. Senior leadership appointments indicating expansion. 8. Highest compensation based on Levels.fyi, Glassdoor, AmbitionBox, etc. 9. Strong employee growth opportunities and culture. 10. Any other credible hiring signal suggesting increased hiring over the next 6–12 months. Prioritize hiring probability over company popularity. For each company, provide the evidence, hiring signal, source, date, and relevant roles/functions being hired. Finally, create a Top 20 Target Companies ranking with: Company | Hiring Signal | Headcount Trend | Relevant Hiring | Growth Signal | Pay | Hiring Probability (High/Medium/Low) | Why Target Now. Exclude companies with significant recent layoffs, hiring freezes, or declining headcount unless there is clear evidence that my target function is expanding."

### Google Boolean String
```
(site:myworkdayjobs.com OR site:greenhouse.io OR site:icims.com OR site:taleo.net OR site:lever.co OR site:smartrecruiters.com OR site:jobvite.com OR site:workforcenow.adp.com OR site:successfactors.com OR site:brassring.com OR site:jazzhr.com OR site:breezy.hr OR site:jobdiva.com OR site:bullhorn.com OR site:bamboohr.com) ("JOB TITLE") ("LOCATION")
```

## DAY 2

### Prompt 01 — Identify Company Challenges
> "I have been shortlisted for a [Job Title] role at [Company]. Based on the job description below, act as a top-tier management consultant and industry researcher. Research the company, its recent developments, strategy, market, competitors, and relevant function. Identify the 5–7 most important challenges this role is likely expected to help solve. Use the JD to infer likely priorities, but validate each challenge with recent credible online evidence, data, company statements, earnings reports, leadership commentary, or industry trends. Clearly distinguish between verified facts and informed hypotheses. For each challenge, provide: Challenge | Evidence | Why it matters to this role | Root cause | Consultant-grade solution | Recommended actions/KPIs. Prioritize challenges by business impact and relevance to the role, not generic company problems. Job Description: {Paste JD}"

### Prompt 02 — Predict Interview Rounds and Questions
> "I am interviewing for a [Job Title] role at [Company]. Act as an expert interview researcher and executive recruiter. Research recent interview experiences specifically for [Job Title] or closely related roles at [Company] across Glassdoor, Reddit, Quora, Blind, LinkedIn, and other credible candidate forums. Also review [Company]'s official careers, hiring process, and interview-preparation resources. Based on the evidence, predict: 1. The likely number of interview rounds and purpose of each round. 2. Who is likely to interview me at each stage. 3. The most likely questions asked in each round. 4. Any recurring case studies, presentations, portfolio reviews, technical/functional assessments, or behavioral themes. 5. What interviewers appear to evaluate most heavily for this role. Separate directly reported interview experiences from informed predictions. Prioritize recent, role-specific evidence; if exact-role evidence is limited, use the closest comparable roles and clearly state that. For each finding, include the source and date."

### Prompt 03 — Salary Research and Benchmarking
> "You are an expert researcher and recruiter specialising in understanding salary trends in the market. I want you to tell me detailed salary trends for a {Job Title} with {years of experience} in {Industry} in {region}. Search the internet for the most recent articles and information so that your response is up-to-date. Specifically, search for data on Ambition Box, PayScale, LinkedIn Salary Calculator, Levels.fyi, Glassdoor Know Your Worth, Salary.com and other similar websites. Please check the URLs you give me to make sure that they are accurate. Give me a summary of the salary trends and companies that pay the highest salaries for these roles. Give Data from each website."

## KEY INSIGHTS FROM WORKSHOP TRANSCRIPTS

### The "Interesting Story" Hook
- People don't respond to job applications
- They respond to interesting conversations about their own problems
- The curiosity hook is a one-liner that references a specific real problem, written as a peer observation, not a job application

### WIN Document — The Core Differentiator
- Most candidates: apply → CV → hope
- WIN doc candidates: research → conversation → validate problem → present solution
- The WIN doc says: "I understand your problem better than other candidates because I talked to someone on your team"
- This gets you past HR directly to the hiring manager

### The "Memory" System
- NxtJob stores candidate's achievement stories (CAR format) in a "memory" database
- Every agent accesses these memories to personalise messages and answers
- The more memories stored, the more personalised the output
- For Siddhant: 12 CAR stories are in SIDDHANT_CONTEXT.md — these are the "memories"

### Metrics From Actual Users
- Robin: 37 interviews → got bumped from Senior Manager to Director application → 67% salary increase
- 250+ LinkedIn connection requests per week → 4-5 calls per week
- 1500+ actions over 12 weeks → 202 referrals → job offer
- Vinayak: applied for Technical Program Delivery Manager, got offered Director level based on interview confidence
- Someone: initial offer 14 LPA → negotiated to 30 LPA

### Interview Agent (NxtJob's Most Impressive Feature)
- Researches Reddit/Glassdoor/Blind for real questions from that company
- Conducts a full multi-round mock interview via voice
- Records the session
- Analyses: filler words, speaking speed (shows on a meter), answer quality
- Gives structured feedback per question
- Shows how you SHOULD have answered and why
- "By the time you interview for real, the real interview will feel like a highlights reel"

### Bootcamp → Platform Funnel
1. 2-day bootcamp teaches manual workflow with ChatGPT prompts
2. The pain of doing it manually IS the demo of the platform
3. Platform pitch: "Everything you just did manually, our agents do in one click"
4. This is a classic "show the pain, sell the painkiller" SaaS funnel
