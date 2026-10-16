# Reference Templates — From Workshop Materials & Research

## NxtJob Day 1 Prompts

### Prompt 01: Identify Target Roles
```
Act as a top executive recruiter, career strategist, and leadership talent market analyst. Analyze my resume based on evidence from my work experience. Not my job titles. Identify the recurring patterns in my strengths, business problems solved, functional expertise, seniority, leadership scope, industries, customers, and company types/sizes. Reverse-engineer my professional positioning and recommend the highest-probability target niche (roles, industries, company sizes, and seniority) where I am most competitive. Then provide an exhaustive list of relevant job title aliases used across startups, scale-ups, enterprises, consulting firms, and MNCs. Base every recommendation on recurring patterns, not isolated experiences.
```

### Prompt 02: Find Companies With Hidden Roles
```
Act as an expert labor-market researcher and business analyst. For [THIS NICHE], identify companies with the strongest current and forward-looking hiring signals.

Research credible, recent sources and rank companies based on:
1. Fastest revenue/business growth in the last 2–3 years.
2. Entering the target geography recently or this year.
3. Expanding offices, GCCs, plants, teams, products, or operations.
4. Employee headcount growth over the last 6–24 months.
5. Increasing job openings or actively hiring for relevant functions.
6. Recent Series C+ funding, IPO, major investment, acquisition, or large contracts.
7. Senior leadership appointments indicating expansion.
8. Highest compensation based on Levels.fyi, Glassdoor, AmbitionBox, etc.
9. Strong employee growth opportunities and culture.
10. Any other credible hiring signal suggesting increased hiring over the next 6–12 months.

Prioritize hiring probability over company popularity.

For each company, provide the evidence, hiring signal, source, date, and relevant roles/functions being hired.

Finally, create a Top 20 Target Companies ranking with:
Company | Hiring Signal | Headcount Trend | Relevant Hiring | Growth Signal | Pay | Hiring Probability (High/Medium/Low) | Why Target Now

Exclude companies with significant recent layoffs, hiring freezes, or declining headcount unless there is clear evidence that my target function is expanding.
```

### Google Boolean String
```
(site:myworkdayjobs.com OR site:greenhouse.io OR site:icims.com OR site:taleo.net OR site:lever.co OR site:smartrecruiters.com OR site:jobvite.com OR site:workforcenow.adp.com OR site:successfactors.com OR site:brassring.com OR site:jazzhr.com OR site:breezy.hr OR site:jobdiva.com OR site:bullhorn.com OR site:bamboohr.com) ("job title") ("location")
```

## NxtJob Day 2 Prompts

### Prompt 01: Company Challenges Research
```
I have been shortlisted for a [Job Title] role at [Company]. Based on the job description below, act as a top-tier management consultant and industry researcher.

Research the company, its recent developments, strategy, market, competitors, and relevant function. Identify the 5–7 most important challenges this role is likely expected to help solve.

Use the JD to infer likely priorities, but validate each challenge with recent credible online evidence, data, company statements, earnings reports, leadership commentary, or industry trends. Clearly distinguish between verified facts and informed hypotheses.

For each challenge, provide:
Challenge | Evidence | Why it matters to this role | Root cause | Consultant-grade solution | Recommended actions/KPIs

Prioritize challenges by business impact and relevance to the role, not generic company problems.

Job Description:
{Paste JD}
```

### Prompt 02: Predict Interview Rounds
```
I am interviewing for a [Job Title] role at [Company]. Act as an expert interview researcher and executive recruiter.

Research recent interview experiences specifically for [Job Title] or closely related roles at [Company] across Glassdoor, Reddit, Quora, Blind, LinkedIn, and other credible candidate forums. Also review [Company]'s official careers, hiring process, and interview-preparation resources.

Based on the evidence, predict:
1. The likely number of interview rounds and purpose of each round.
2. Who is likely to interview me at each stage.
3. The most likely questions asked in each round.
4. Any recurring case studies, presentations, portfolio reviews, technical/functional assessments, or behavioral themes.
5. What interviewers appear to evaluate most heavily for this role.

Separate directly reported interview experiences from informed predictions. Prioritize recent, role-specific evidence; if exact-role evidence is limited, use the closest comparable roles and clearly state that.

For each finding, include the source and date.
```

### Prompt 03: Salary Research
```
You are an expert researcher and recruiter specialising in understanding salary trends in the market. I want you to tell me detailed salary trends for a {Job Title} with {years of experience} in {Industry} in {region}.

Search the internet for the most recent articles and information so that your response is up-to-date. Specifically, search for data on Ambition Box, PayScale, LinkedIn Salary Calculator, Levels.fyi, Glassdoor Know Your Worth, Salary.com and other similar websites. Please check the URLs you give me to make sure that they are accurate. Give me a summary of the salary trends and companies that pay the highest salaries for these roles. Give Data from each website.
```

## Cold Email Template
```
Subject: Application for [Job Title] – [Your Name]

Hi [Recruiter's Name],

I know you're busy, so I'll keep this under 60 seconds.

I'm [Your Name], a [Your Role] with [X] years of experience in [Your Tech Track].

At [Current/Recent Company], I [key achievement — specific metric]. I'd love to bring the same value to [Company Name].

If you're hiring for [Job Title] or a similar role, I'd be happy to connect.
Here's my CV and certifications: [Google Drive Link]

Thanks for your time — looking forward to hearing from you.

Best regards,
[Your Name]
📞 [Your Phone Number]
📧 [Your Email]
🌐 [LinkedIn Profile]
```

**Siddhant's personalised version:**
```
Subject: Application for [Job Title] – Siddhant Rangari

Hi [Recruiter's Name],

I know you're busy, so I'll keep this under 60 seconds.

I'm Siddhant Rangari, a Senior Full-Stack + AI Engineer with 12+ years of experience building scalable distributed systems and production AI agent platforms.

At Philips Innovation Campus, I reduced patient dashboard load time by 70% through a Kafka→AWS S3 decoupling pipeline, and improved API efficiency by 98% through a Spring Boot microservices migration. More recently I architected a multi-tenant AI agent platform from scratch — 24 API routes, LLM failover across 3 providers, and 12+ external integrations.

I'd love to bring the same end-to-end ownership and impact to [Company Name].

If you're hiring for [Job Title] or a similar role, I'd be happy to connect.
Here's my resume: [Resume Link]

Thanks for your time.

Best regards,
Siddhant Rangari
📧 siddhantrangari@gmail.com
🌐 linkedin.com/in/siddhant-rangari
```

## Visa Sponsorship Research Prompt
```
Find 15 companies and 10 recruitment agencies in each country similar to Palantir, Grafana Labs, Elastic, and Weaviate that explicitly mention visa sponsorship, relocation support, or similar benefits on their website.

These companies should:
- Hire senior full-stack engineers, AI engineers, or forward deployed engineers
- Have offices in Netherlands, Germany, UK, Ireland, or UAE
- Actively hire internationally (India-friendly)
- Pay market rate (€80k–€150k or equivalent)
- NOT require LeetCode/algorithmic whiteboard interviews

For each company provide: Company name, country, roles typically hired, visa sponsorship info, career page URL, and why they'd be a good fit for a senior Java/Node.js/AI engineer with 12 years experience.

Format as a numbered table with URL (not hyperlink).
```

## Skills × 1000 Jobs Worksheet
```
1. Copy your full Skills section from LinkedIn

2. Choose Top 5 skills by number of jobs available:
   Skill 1: Java Spring Boot
   Skill 2: LLM / AI Engineering
   Skill 3: React / Node.js
   Skill 4: Docker / Kubernetes
   Skill 5: PostgreSQL / Kafka

3. Choose region: Europe / UAE / Worldwide

4. For each skill, check LinkedIn jobs in that region and write the count

5. For each job title, check number of jobs:
   Title 1: Forward Deployed Engineer
   Title 2: Senior AI Engineer
   Title 3: Senior Full-Stack Engineer
   Title 4: Solutions Engineer
   Title 5: Staff Engineer

6. Add all counts for total jobs available

7. If total > 1000, you have a large enough market to be selective
```

## Similar Companies Prompt
```
Find 10 companies and 10 recruitment agencies in each country similar to:
1. Picnic
2. Dynatrace
3. Swisscom

That explicitly mention visa sponsorship, relocation support, or similar benefits on their website. These companies should hire IT professionals and provide opportunities for working abroad. Focus on staffing agencies and direct employers in countries like:
Netherlands, Ireland, UK

Answer in a clear, numbered table with URL (not a hyperlink).
```

## LinkedIn "Open to Work" Post (Siddhant's)
```
I built a multi-agent AI platform from scratch over the last 6 months.

24 API routes. 6 async workers. LLM failover across 3 providers. Meta Ads automation, Twilio voice calls, WhatsApp, brand kit generation — all in one platform.

Before that: real-time patient monitoring at Philips. Sub-second latency. Kafka + AWS. 70% load reduction. 30–40% MTTR improvement.

Now I'm looking for my next challenge.

Senior Full-Stack + AI Engineer · 12+ years · Immediately available
→ Forward Deployed Engineer
→ Senior AI / Applied AI Engineer
→ Staff Full-Stack Engineer

Remote-first. Open to EU, Gulf, global.

If you're building something interesting or know someone who is — let's talk.

#OpenToWork #AIEngineer #FullStackEngineer #ForwardDeployedEngineer #LLM #MultiAgent
```
