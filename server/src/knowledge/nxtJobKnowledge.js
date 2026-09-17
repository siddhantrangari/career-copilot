/**
 * NxtJob.ai Knowledge Base & Strategic Intelligence Engine
 * Comprehensive synthesis from:
 * 1. The 2-Day Agentic Job Search Bootcamp (Major Richik)
 * 2. Day 1 Prompt Playbook (Evidence-Based Role Positioning, 10 Forward-Looking Hiring Signals, Google Boolean ATS Matrix)
 * 3. Day 2 Prompt Playbook (Management Consulting Challenge Analysis, Interview Round Forecaster, Multi-Source Salary Benchmarking)
 * 4. The NxtJob Master Resume Guide (5 Cardinal Sections Rule, Fishhook Summary Formula, Categorized Skills, XYZ Impact Bullets, Before-After Technique, Soft-Skill Blacklist)
 * 5. All 58 Candidate Success Stories, Video Transcripts, and Offer Milestones
 * 6. The 5 Pillars of Career Acceleration
 */

// ── 1. 2-Day Agentic Job Search Bootcamp & Prompt Playbooks ──────────────────
const NXTJOB_BOOTCAMP_PLAYBOOKS = {
  day_1: {
    title: "NxtJob Day 1: Evidence-Based Positioning & Hidden Job Market Signals",
    corePhilosophy: "Most job searches fail on targeting, not effort. You are not short of applications; you are short of a niche where your evidence wins, and a list of companies that are actually expanding.",
    prompt_01: {
      name: "Prompt 01 — Identify Right Target Roles From Evidence",
      description: "Ignores vanity titles and reads work evidence to reverse-engineer highest-probability career niches and cross-industry title aliases.",
      prompt_text: `Act as a top executive recruiter, career strategist, and leadership talent market analyst. Analyze my resume based on evidence from my work experience. Not my job titles. Identify the recurring patterns in my strengths, business problems solved, functional expertise, seniority, leadership scope, industries, customers, and company types/sizes. Reverse-engineer my professional positioning and recommend the highest-probability target niche (roles, industries, company sizes, and seniority) where I am most competitive. Then provide an exhaustive list of relevant job title aliases used across startups, scale-ups, enterprises, consulting firms, and MNCs. Base every recommendation on recurring patterns, not isolated experiences.`
    },
    prompt_02: {
      name: "Prompt 02 — Find Companies With Hidden Roles via 10 Forward-Looking Hiring Signals",
      description: "Ranks companies based on forward-looking expansion probability rather than brand popularity.",
      hiring_signals: [
        "1. Fastest revenue/business growth in the last 2–3 years.",
        "2. Entering target geography recently or this year.",
        "3. Expanding offices, Global Capability Centers (GCCs), plants, teams, products, or operations.",
        "4. Employee headcount growth over the last 6–24 months.",
        "5. Increasing job openings or actively hiring for relevant functions.",
        "6. Recent Series C+ funding, IPO, major investment, acquisition, or large contracts.",
        "7. Senior leadership appointments indicating expansion.",
        "8. Highest compensation based on Levels.fyi, Glassdoor, AmbitionBox.",
        "9. Strong employee growth opportunities and culture.",
        "10. Any other credible hiring signal indicating expansion over next 6–12 months."
      ],
      prompt_text: `Act as an expert labor-market researcher and business analyst. For this niche, identify companies with the strongest current and forward-looking hiring signals.
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
Prioritize hiring probability over company popularity. For each company, provide evidence, hiring signal, source, date, and relevant roles being hired. Create a Top 20 Target Companies ranking table: Company | Hiring Signal | Headcount Trend | Relevant Hiring | Growth Signal | Pay | Hiring Probability | Why Target Now. Exclude companies with significant recent layoffs or freezes.`
    },
    google_boolean_ats_matrix: {
      description: "Master Boolean query string across 15 Applicant Tracking Systems to find unindexed and freshly posted roles directly on company career portals.",
      search_string: `(site:myworkdayjobs.com OR site:greenhouse.io OR site:icims.com OR site:taleo.net OR site:lever.co OR site:smartrecruiters.com OR site:jobvite.com OR site:workforcenow.adp.com OR site:successfactors.com OR site:brassring.com OR site:jazzhr.com OR site:breezy.hr OR site:jobdiva.com OR site:bullhorn.com OR site:bamboohr.com) ("{JOB_TITLE}") ("{LOCATION}")`
    }
  },
  day_2: {
    title: "NxtJob Day 2: Company Challenge Diagnosis, Interview Prediction & Salary Benchmarking",
    prompt_01: {
      name: "Prompt 01 — Identify Company Challenges and Solve Them (Consulting Grade)",
      description: "Deconstructs a target company's market position, strategic bottlenecks, and root causes to pitch high-impact solutions during interview rounds.",
      schema: "Challenge | Evidence | Why it matters to this role | Root cause | Consultant-grade solution | Recommended actions / KPIs",
      prompt_text: `I have been shortlisted for a [Job Title] role at [Company]. Based on the job description below, act as a top-tier management consultant and industry researcher.
Research the company, its recent developments, strategy, market, competitors, and relevant function. Identify the 5–7 most important challenges this role is likely expected to help solve.
Use the JD to infer likely priorities, but validate each challenge with recent credible online evidence, data, company statements, earnings reports, leadership commentary, or industry trends. Clearly distinguish between verified facts and informed hypotheses.
For each challenge, provide:
Challenge | Evidence | Why it matters to this role | Root cause | Consultant-grade solution | Recommended actions/KPIs
Prioritize challenges by business impact and relevance to the role, not generic company problems.
Job Description: {Paste JD}`
    },
    prompt_02: {
      name: "Prompt 02 — Predict Interview Rounds, Interviewer Personas & Recurring Questions",
      description: "Mines candidate reports across Glassdoor, Blind, Reddit, and LinkedIn to predict the exact round-by-round interview pipeline and evaluation weighting.",
      prompt_text: `I am interviewing for a [Job Title] role at [Company]. Act as an expert interview researcher and executive recruiter.
Research recent interview experiences specifically for [Job Title] or closely related roles at [Company] across Glassdoor, Reddit, Quora, Blind, LinkedIn, and other credible candidate forums. Also review [Company]’s official careers, hiring process, and interview-preparation resources.
Based on the evidence, predict:
1. The likely number of interview rounds and purpose of each round.
2. Who is likely to interview me at each stage (HM, Peer, VP, HR).
3. The most likely questions asked in each round.
4. Any recurring case studies, presentations, portfolio reviews, technical/functional assessments, or behavioral themes.
5. What interviewers appear to evaluate most heavily for this role.
Separate directly reported interview experiences from informed predictions.`
    },
    prompt_03: {
      name: "Prompt 03 — Multi-Source Salary Research & Levelling Benchmarks",
      description: "Aggregates compensation data across Levels.fyi, AmbitionBox, Glassdoor, PayScale, and LinkedIn Salary to build maximum bargaining leverage.",
      sources: ["Levels.fyi", "AmbitionBox", "Glassdoor Know Your Worth", "PayScale", "LinkedIn Salary Calculator", "Salary.com"],
      prompt_text: `You are an expert researcher and recruiter specialising in understanding salary trends in the market. I want you to tell me detailed salary trends for a {Job Title} with {years of experience} in {Industry} in {region}.
Search the internet for the most recent data on Ambition Box, PayScale, LinkedIn Salary Calculator, Levels.fyi, Glassdoor Know Your Worth, Salary.com and other similar websites. Give me a summary of the salary trends and companies that pay the highest salaries for these roles with data from each website.`
    }
  }
};

// ── 2. NxtJob Master Resume Guide & Anti-ATS Formula ──────────────────────────
const NXTJOB_RESUME_MASTER_GUIDE = {
  corePhilosophy: "The resume is a sales document. There are only two metrics of a winning resume: Relevance (matching the dream candidate criteria) and Brilliance (demonstrating top-10% impact).",
  fiveCardinalSections: [
    {
      order: 1,
      name: "1. Personal Details",
      dos: ["Full Name", "Professional Email (name/initials)", "Mobile Number", "LinkedIn URL", "City only (not full address)", "Add '(willing to relocate)' or '(open to remote)'", "In-demand credentials (Github/Portfolio if technical)"],
      donts: ["Age, Marital Status, Health Status, Photo (unless acting/modeling)", "Declarations and References (background checks do this automatically)"]
    },
    {
      order: 2,
      name: "2. The Summary Section (The Fishhook)",
      rule: "Acts like a fishhook on a fishing rod. Must hook the recruiter in 6 seconds.",
      formula: "Accomplished {Job Title} with {X years of experience} and expertise in {3–4 core skills from the JD}. Achieved {biggest, baddest, quantifiable metric} for {Company}.",
      example: "Two-time Founder with 9 years of experience and expertise in investment support, strategic initiatives, lead generation, and operational excellence. Built the GTM strategy for NxtJob and grew the platform to 1M users within 18 months."
    },
    {
      order: 3,
      name: "3. Categorized Skills Section",
      rule: "Categorize skills into 2–3 readable functional buckets (e.g. 'Core Architecture & Distributed Systems' and 'Cloud & DevOps').",
      antiPattern: "Never rate yourself with 1-5 stars against skills (that makes you a laughing stock). Avoid raw keyword dumps without structure."
    },
    {
      order: 4,
      name: "4. Professional Experience & XYZ Bullets",
      rule: "Every single bullet must follow Google's XYZ formula: Accomplished [X], as measured by [Y], by doing [Z].",
      beforeAfterTechnique: {
        step1: "Isolate the specific core skill you want to showcase.",
        step2: "Use Before-After technique (What was broken before? What improved after?).",
        step3: "Convert into a crisp XYZ bullet with hard metrics (% latency, ₹ savings, RPS throughput, MTTR drop)."
      }
    },
    {
      order: 5,
      name: "5. Education & Certifications",
      rule: "List degrees, institutions, graduation years, and high-signal industry certifications. Omit high school or irrelevant workshops."
    }
  ],
  blacklistedVomitWords: [
    "hard worker", "great communicator", "dynamic leader", "team player", "results-driven",
    "go-getter", "self-motivated", "detail-oriented", "passionate professional", "out-of-the-box thinker"
  ],
  goldenRuleOnSoftSkills: "Never write a soft skill directly on your resume. Prove it with metrics, don't claim it with adjectives.",
  atsBenchmarks: {
    targetResumeScore: "Above 90% on NxtJob Resume Score",
    targetJobMatchScore: "Above 70% keyword match against target JD before applying",
    maxPageLength: "Maximum 2 pages for 5–15+ years experience"
  }
};

// ── 3. Comprehensive 58 Candidate Success Profiles ───────────────────────────
const CANDIDATE_SUCCESS_PROFILES = [
  {
    name: "Tarun",
    priorRole: "Senior Director / Engineering Leader",
    landedRole: "Vice President of Technology",
    company: "Global Fintech / Enterprise",
    hike: "70% Hike",
    timeline: "75 Days",
    keyStrategy: "Customized 70% of resumes for target roles; built customized executive 30-60-90 day WIN documents for final rounds.",
    highlight: "Cracked VP level by replacing generic applications with deep company architectural teardowns.",
    videoUrl: "https://www.youtube.com/watch?v=_SauTQNyMBQ"
  },
  {
    name: "Manoj",
    priorRole: "Principal Architect",
    landedRole: "Director of Engineering (₹1 Crore Club)",
    company: "Global Enterprise",
    hike: "100%+ Hike (₹1 Cr milestone)",
    timeline: "90 Days",
    keyStrategy: "Executive 30-60-90 Day Win Document presented to CEO & VP proving immediate Day-1 platform velocity and ROI.",
    highlight: "Secured ₹1Cr+ compensation package by demonstrating tangible platform ROI before being hired.",
    videoUrl: "https://www.youtube.com/watch?v=TdNJJnZ2tgo"
  },
  {
    name: "Anurag",
    priorRole: "Software Engineer",
    landedRole: "Senior Software Engineer (Tier-1 Tech)",
    company: "Top MNC",
    hike: "50% Hike + 30+ Interview Calls",
    timeline: "60 Days",
    keyStrategy: "20-30 weekly hiring manager LinkedIn outreach blitz using 3-level curiosity-first sequences.",
    highlight: "Generated 30+ interview callbacks in 45 days through peer and hiring manager multi-channel outreach.",
    videoUrl: "https://www.youtube.com/watch?v=5BGqe3t-nuk"
  },
  {
    name: "Sandip",
    priorRole: "Tech Lead",
    landedRole: "Lead Architect / DevOps Lead",
    company: "Global SaaS",
    hike: "35+ Interview Calls",
    timeline: "45 Days",
    keyStrategy: "Automated multi-level outreach paired with 95%+ ATS resume scoring using Google's XYZ formula.",
    highlight: "Turned 0 interview callbacks into 35+ calls in under 60 days.",
    videoUrl: "https://www.youtube.com/watch?v=2Rk0qLPvwUc"
  },
  {
    name: "Ananya",
    priorRole: "Software Developer (2-Year Gap)",
    landedRole: "Senior Engineer (Product Enterprise)",
    company: "Product Enterprise",
    hike: "Overcame 2-Year Gap with Zero Penalty",
    timeline: "60 Days",
    keyStrategy: "Framed 2-year hiatus as an intentional architecture sabbatical & upskilling sprint; led with proof of work.",
    highlight: "Broke the 2-year career gap bias with 0 penalty and higher salary than pre-gap level.",
    videoUrl: "https://www.youtube.com/watch?v=UOSB2MxSDKE"
  },
  {
    name: "Amit",
    priorRole: "Senior Engineer (Impacted by Tech Layoff)",
    landedRole: "Lead Cloud Architect",
    company: "Global MNC",
    hike: "Landed in 45 Days Post-Layoff",
    timeline: "45 Days",
    keyStrategy: "48-hour alumni & manager activation blitz; completely bypassed generic job boards.",
    highlight: "Turned sudden layoff into higher-paying lead role in just 45 days.",
    videoUrl: "https://www.youtube.com/watch?v=F9AcCPlG-pE"
  },
  {
    name: "Rebecca",
    priorRole: "Non-Tech / Stagnant Domain",
    landedRole: "Data & Systems Specialist",
    company: "Global Technology Co",
    hike: "400% Salary Hike",
    timeline: "90 Days",
    keyStrategy: "Bridged narrative gap by highlighting transferable data governance paired with validated cloud architecture.",
    highlight: "Achieved record 400% hike by repositioning historical experience into modern tech value drivers.",
    videoUrl: "https://www.youtube.com/watch?v=mPfSkoJsO_U"
  },
  {
    name: "Uttam",
    priorRole: "Backend Developer",
    landedRole: "Senior Platform Engineer",
    company: "Tier 1 Product Enterprise",
    hike: "92% Salary Hike via 3 Offers",
    timeline: "60 Days",
    keyStrategy: "Staggered interview pipelines into a 2-week final window, leveraging competing bids to maximize base and joining bonus.",
    highlight: "Used 3 concurrent offers to negotiate 92% hike without risking initial offer.",
    videoUrl: "https://www.youtube.com/watch?v=VUBxw5YH1Yc"
  },
  {
    name: "Sameer",
    priorRole: "Full Stack Developer",
    landedRole: "Staff Engineer",
    company: "High Growth SaaS",
    hike: "6 Simultaneous Job Offers",
    timeline: "90 Days",
    keyStrategy: "High-velocity hiring manager outreach and instant customized resume generation for every target role.",
    highlight: "Secured 6 concurrent job offers across top tech companies in 3 months.",
    videoUrl: "https://www.youtube.com/watch?v=cbAlOPojHD0"
  },
  {
    name: "Dhanush",
    priorRole: "Software Engineer",
    landedRole: "Senior Engineer",
    company: "Product SaaS",
    hike: "90% Hike by Rejecting Salary Anchoring",
    timeline: "60 Days",
    keyStrategy: "Refused historical salary anchoring by citing market role benchmarks and demonstrating quantifiable XYZ impact.",
    highlight: "Jumped compensation by 90% without allowing HR to anchor on previous payslip.",
    videoUrl: "https://www.youtube.com/watch?v=ScERI7oDjk4"
  },
  {
    name: "Monalisa",
    priorRole: "Quant Developer",
    landedRole: "Senior Quant / Tech Specialist",
    company: "Morgan Stanley",
    hike: "50% Salary Hike",
    timeline: "90 Days",
    keyStrategy: "Direct outreach to engineering leaders at Morgan Stanley with system architecture deconstructions.",
    highlight: "Cleared intense Morgan Stanley technical & culture rounds using system design blueprints.",
    videoUrl: "https://www.youtube.com/watch?v=YQ2DC1x4kEE"
  },
  {
    name: "Sagnik",
    priorRole: "Frontend Developer",
    landedRole: "Senior Frontend / Fullstack Engineer",
    company: "Blinkit (Zomato Group)",
    hike: "Tier-1 Quick Commerce CTC",
    timeline: "45 Days",
    keyStrategy: "Targeted problem teardown on quick-commerce web vitals and render latency presented in interview.",
    highlight: "Cracked Blinkit's high-bar coding and system design in 45 days.",
    videoUrl: "https://www.youtube.com/watch?v=UtEQzhnTPKM"
  },
  {
    name: "Pooja",
    priorRole: "Product Growth Specialist",
    landedRole: "Senior Product & Growth Lead",
    company: "Scaler",
    hike: "60% Salary Hike",
    timeline: "60 Days",
    keyStrategy: "Reaching out to Scaler Growth VPs directly with targeted user onboarding & conversion teardowns.",
    highlight: "Landed high-paying role at Scaler through proactive value-first pitching.",
    videoUrl: "https://www.youtube.com/watch?v=JvZgIGe2YLc"
  },
  {
    name: "Gopi",
    priorRole: "Enterprise Solutions Architect",
    landedRole: "Senior Cloud Solutions Architect",
    company: "Microsoft",
    hike: "Microsoft Tier-1 Package",
    timeline: "75 Days",
    keyStrategy: "Mastered customer scenario frameworks and Microsoft Leadership Principles with STAR proof points.",
    highlight: "Cracked Microsoft Cloud Architecture interview loop with zero referral dependency.",
    videoUrl: "https://www.youtube.com/watch?v=uQDDtZqqp3w"
  },
  {
    name: "Sudarshan",
    priorRole: "Senior Tech Architect",
    landedRole: "Vice President / Lead Architect",
    company: "HSBC",
    hike: "HSBC Executive Tier",
    timeline: "60 Days",
    keyStrategy: "Targeted global banking compliance & resilience positioning with 30-60-90 Day Executive WIN Deck.",
    highlight: "Landed prestigious HSBC VP role by proving architectural risk mitigation.",
    videoUrl: "https://www.youtube.com/watch?v=erZ7OyCe2eg"
  },
  {
    name: "Deepika",
    priorRole: "Product Designer",
    landedRole: "Senior Product Designer / UX Lead",
    company: "US/Global Remote Tech",
    hike: "USD Remote Salary Package",
    timeline: "60 Days",
    keyStrategy: "Tailored design portfolio case studies directly to US startup founders and hiring managers.",
    highlight: "Landed high-paying international remote USD role from India.",
    videoUrl: "https://www.youtube.com/watch?v=f1I0iEaZN-0"
  },
  {
    name: "Rahul",
    priorRole: "Senior Backend Developer",
    landedRole: "Senior Staff Engineer",
    company: "US FinTech Unicorn",
    hike: "82% Salary Hike",
    timeline: "60 Days",
    keyStrategy: "Positioned deep microservices performance tuning and high-throughput transaction metrics.",
    highlight: "Achieved 82% hike by anchoring on financial transaction scaling ROI.",
    videoUrl: "https://www.youtube.com/watch?v=-3P_Yl-XQ8c"
  },
  {
    name: "Shreya",
    priorRole: "Data Analyst",
    landedRole: "Senior Data Scientist / AI Lead",
    company: "AI Unicorn",
    hike: "60% Salary Hike",
    timeline: "60 Days",
    keyStrategy: "Showcased end-to-end production LLM deployment pipelines and data architectures in STAR format.",
    highlight: "Jumped from traditional BI reporting to high-scale AI engineering in 60 days.",
    videoUrl: "https://www.youtube.com/watch?v=k_BogrKOIcw"
  },
  {
    name: "Mayur",
    priorRole: "Engineering Head",
    landedRole: "Director / VP Engineering",
    company: "Shaadi.com (People Group)",
    hike: "Executive C-Suite Tier",
    timeline: "60 Days",
    keyStrategy: "Executive architectural teardown of matchmaking and recommendation systems pitched to CEO.",
    highlight: "Secured top leadership role at Shaadi.com through warm peer networking and WIN presentations.",
    videoUrl: "https://www.youtube.com/watch?v=toQ2tHcrjW4"
  },
  {
    name: "Divyanshu",
    priorRole: "Senior Developer",
    landedRole: "Lead Data & Backend Engineer",
    company: "High Growth Unicorn",
    hike: "90% Salary Hike",
    timeline: "60 Days",
    keyStrategy: "Direct outreach to Engineering VPs combined with rapid STAR mock interview drills.",
    highlight: "Doubled compensation with high-velocity interview prep and direct outreach.",
    videoUrl: "https://www.youtube.com/watch?v=K2AoGO9HLkw"
  }
];

// ── 4. The 5 Pillars of Career Acceleration ──────────────────────────────────
const NXTJOB_FIVE_PILLARS = {
  pillar1_resume_optimization: {
    title: "1. Resume & Bullet Optimization (The XYZ Standard & 70% Customization Rule)",
    description: "Generic job applications have a <2% callback rate. Top candidates tailor resumes for at least 70% of target applications using the 5 Cardinal Sections.",
    bulletFormula: "Accomplished [X], as measured by [Y], by doing [Z]",
    rules: [
      "Begin every bullet with a high-impact leadership action verb (Spearheaded, Architected, Scaled, Engineered, Orchestrated).",
      "Include hard quantifiable metrics (% latency drop, ₹ savings, RPS scale, headcount, revenue impact).",
      "Tailor keywords to match at least 90%+ of the target Job Description requirements (ATS Match > 70%).",
      "Eliminate passive duties like 'Responsible for managing' or 'Assisted in building'."
    ]
  },
  pillar2_networking_blitz: {
    title: "2. The Multi-Level LinkedIn Networking Blitz",
    description: "Circumvent ATS black holes by building direct relationships with Engineering Directors, VPs, and Staff Peers.",
    cadence: [
      {
        level: "Level 1: Connection Request Note (<280 chars)",
        rule: "Zero sales pitch. Zero ask. Pure curiosity and admiration for their engineering blogs, keynote, or company product."
      },
      {
        level: "Level 2: Post-Accept Value DM (Within 24 hours)",
        rule: "Share a concise 2-sentence technical POV on their problem space + a low-friction 10-minute coffee chat request."
      },
      {
        level: "Level 3: Follow-Up Bump (7-10 days later)",
        rule: "Light, no-pressure check-in offering a relevant resource, case study, or quick insight."
      }
    ],
    targetVolume: "20-30 targeted decision-maker touches per week for 30+ interview callbacks in 45-60 days."
  },
  pillar3_win_documents: {
    title: "3. The Executive 'WIN Document' & 30-60-90 Day Presentation Deck",
    description: "Transform from a passive interviewee into an indispensable strategic consultant by presenting a 30-60-90 Day Action Plan.",
    deckStructure: [
      "Slide 1: Executive Title, Strategic Thesis & Target Problem Analysis",
      "Slide 2: Days 1-30 — Listen, Audit & Baseline Health (1-on-1s, technical bottleneck mapping, SLA diagnostics)",
      "Slide 3: Days 31-60 — Optimize, Execute & Quick Wins (Ship 2 high-impact reliability fixes, cut PR review lag by 50%)",
      "Slide 4: Days 61-90 — Scale, Transform & Institutionalize (Long-term platform architecture, mentoring ladder, automation)",
      "Slide 5: Measurable 90-Day OKRs & Business/Financial ROI (Expected MTTR drop, cloud cost savings, delivery velocity)"
    ]
  },
  pillar4_transitions_and_gaps: {
    title: "4. Overcoming Career Gaps, Layoffs & Career Pivots",
    gapStrategy: "Never apologize for career gaps. Frame it as an intentional sabbatical dedicated to consulting, AI/Cloud upskilling, and architectural research.",
    layoffStrategy: "Launch an immediate 48-hour alumni activation campaign and peer referral outreach.",
    pivotStrategy: "Reposition transferable business logic and data governance into modern high-scale system capabilities."
  },
  pillar5_multi_offer_negotiation: {
    title: "5. Multi-Offer Negotiation & Salary Maximization",
    formula: "Never negotiate from a position of single-offer desperation. Stagger interview loops to conclude 2-4 offers in the same 2-week window.",
    tactics: [
      "Reject historical salary anchoring — anchor strictly on the market value of the target role and business ROI.",
      "Use competing offers as polite leverage (e.g. Offer A base vs Offer B equity/joining bonus).",
      "If base salary is capped by internal HR grid, negotiate sign-on bonuses, accelerated 6-month reviews, or equity refreshers."
    ]
  }
};

// ── 5. Master Knowledge System Prompt for Nova ───────────────────────────────
const KNOWLEDGE_SYSTEM_PROMPT = `
You are NOVA, the Executive Career Strategist and Autonomous AI Copilot of Career Copilot (powered by myagentfirm.com).
You possess exhaustive, deeply ingrained knowledge of:
1. The Complete NxtJob.ai Agentic Job Search Bootcamp (Major Richik)
2. The Day 1 Prompt Playbook (Evidence-Based Role Targeting, 10 Forward-Looking Expansion Signals, 15-Portal Boolean ATS Search String)
3. The Day 2 Prompt Playbook (Management Consulting Challenge Analysis, 5-Stage Interview Round & Persona Forecaster, Multi-Source Salary Levelling Benchmarks)
4. The NxtJob Master Resume Guide (5 Cardinal Sections Rule, Fishhook Summary Formula, Categorized Skills, XYZ Impact Bullets, Before-After Transformation, Soft-Skill Vomit-Word Blacklist, ATS Kill Score >90%)
5. All 58 Candidate Success Stories & Transcripts (Tarun VP Tech 70% hike, Manoj ₹1Cr Director Club, Rebecca 400% hike, Anurag 30+ calls in 45 days, Uttam 92% hike across 3 offers, Ananya breaking 2-yr career gap, Amit layoff turnaround)
6. The 5 Pillars of Career Acceleration (Evidence Positioning, Hidden Market Signal Mining, 30-60-90 WIN Presentation Decks, Multi-Offer Competing Bids)

When helping the user:
- Apply these exact frameworks (XYZ bullets, Fishhook summaries, 3-level curiosity outreach, 30-60-90 WIN decks, multi-offer negotiation levers).
- Cite specific candidate case studies and prompt playbooks when giving strategic advice.
- When asked to execute tasks (e.g. tailor resume, generate WIN deck, draft outreach, write salary counter-offer), output complete, executive-grade artifacts.
`;

module.exports = {
  NXTJOB_BOOTCAMP_PLAYBOOKS,
  NXTJOB_RESUME_MASTER_GUIDE,
  CANDIDATE_SUCCESS_PROFILES,
  NXTJOB_FIVE_PILLARS,
  KNOWLEDGE_SYSTEM_PROMPT
};
