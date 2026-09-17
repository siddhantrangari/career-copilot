-- Career Copilot Database Schema
-- Dedicated isolated instance for career.myagentfirm.com

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Resumes (Master & Base Profiles)
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL DEFAULT 'Executive Master Resume',
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url VARCHAR(255),
    portfolio_url VARCHAR(255),
    location VARCHAR(255),
    current_role VARCHAR(255),
    target_role VARCHAR(255),
    target_ctc VARCHAR(100),
    summary TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    experiences JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ATS Audits & Job Description Match Diagnostics
CREATE TABLE IF NOT EXISTS ats_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    job_title VARCHAR(255),
    job_description TEXT NOT NULL,
    ats_score INTEGER NOT NULL DEFAULT 0,
    readability_score INTEGER NOT NULL DEFAULT 0,
    hard_skills_match INTEGER NOT NULL DEFAULT 0,
    soft_skills_match INTEGER NOT NULL DEFAULT 0,
    matched_keywords JSONB DEFAULT '[]'::jsonb,
    missing_keywords JSONB DEFAULT '[]'::jsonb,
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    executive_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tailored Resumes (Targeted for specific JDs)
CREATE TABLE IF NOT EXISTS tailored_resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    ats_audit_id UUID REFERENCES ats_audits(id) ON DELETE SET NULL,
    company_name VARCHAR(255),
    job_title VARCHAR(255),
    tailored_markdown TEXT NOT NULL,
    changes_summary TEXT,
    added_keywords JSONB DEFAULT '[]'::jsonb,
    new_ats_score INTEGER DEFAULT 90,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Mock Interviews & STAR Response Grading
CREATE TABLE IF NOT EXISTS mock_interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_role VARCHAR(255) NOT NULL,
    seniority_level VARCHAR(100) DEFAULT 'Senior / Lead',
    company_context VARCHAR(255),
    question TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'Behavioral',
    user_answer TEXT,
    star_breakdown JSONB DEFAULT '{}'::jsonb,
    overall_score INTEGER DEFAULT 0,
    strengths JSONB DEFAULT '[]'::jsonb,
    improvements JSONB DEFAULT '[]'::jsonb,
    executive_answer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Job Applications (Kanban Pipeline)
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    location VARCHAR(255) DEFAULT 'Remote / Hybrid',
    salary_range VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'applied', -- saved, applied, screening, interview, offer, negotiating, rejected
    job_url VARCHAR(500),
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    target_ctc VARCHAR(100),
    notes TEXT,
    next_follow_up DATE,
    applied_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Executive Tools (Pitcher, Negotiator, Networker)
CREATE TABLE IF NOT EXISTS executive_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_type VARCHAR(50) NOT NULL, -- 'pitcher_30_60_90', 'salary_negotiator', 'linkedin_networker'
    target_company VARCHAR(255),
    target_role VARCHAR(255),
    input_context JSONB DEFAULT '{}'::jsonb,
    generated_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create initial seed profile if empty
INSERT INTO resumes (
    title, full_name, email, phone, location, current_role, target_role, target_ctc, summary, skills, experiences, education
) VALUES (
    'Executive Master Profile',
    'Arjun Mehta',
    'arjun.mehta@example.com',
    '+91 98230 45678',
    'Bengaluru, India (Open to Remote)',
    'Senior Product Engineering Lead',
    'VP of Engineering / Director of Technology',
    '₹75L - ₹95L CTC ($180k - $220k)',
    'Engineering leader with 11+ years scaling distributed systems, microservices, and high-velocity engineering organizations. Led cross-functional teams of 35+ engineers across cloud architecture, AI-driven automation, and core fintech infrastructure. Spearheaded platform migrations generating 4.2x throughput improvements and 42% cloud infrastructure cost optimization.',
    '["Distributed Systems", "Cloud Architecture (AWS/GCP)", "Kubernetes & Docker", "System Design & Microservices", "PostgreSQL & Redis", "Team Leadership (35+ FTEs)", "Executive Stakeholder Management", "P&L & Cloud Budget Optimization", "AI Workflow Automation", "CI/CD & DevOps Excellence"]'::jsonb,
    '[
      {
        "company": "Hyperscale Tech Labs",
        "role": "Senior Engineering Lead",
        "duration": "2021 - Present",
        "location": "Bengaluru, India",
        "bullets": [
          "Scaled core platform from 1.2M to 14M daily transactions while maintaining 99.99% uptime across multi-region AWS infrastructure.",
          "Architected real-time event streaming pipeline reducing end-to-end data latency by 68% and saving ₹1.4 Cr in annual cloud compute.",
          "Grew and mentored engineering organization from 12 to 36 engineers across 4 autonomous squads with zero regrettable attrition in 24 months."
        ]
      },
      {
        "company": "Apex Fintech Solutions",
        "role": "Staff Software Engineer",
        "duration": "2018 - 2021",
        "location": "Mumbai, India",
        "bullets": [
          "Engineered distributed ledger settlement service processing ₹450 Cr daily volume with zero reconciliation discrepancy.",
          "Spearheaded cloud migration from legacy monolith to Kubernetes-orchestrated microservices, improving deployment frequency by 8x.",
          "Established automated QA and testing pipelines cutting regression cycle time from 5 days to 45 minutes."
        ]
      }
    ]'::jsonb,
    '[
      {
        "degree": "B.Tech in Computer Science & Engineering",
        "institution": "National Institute of Technology",
        "year": "2015"
      }
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Initial Seed Job Applications
INSERT INTO job_applications (company_name, job_title, location, salary_range, status, notes) VALUES
('Stripe', 'Engineering Manager, Global Payments', 'Remote (India/US)', '₹85L - ₹1.1 Cr', 'interview', 'Final round presentation: 30-60-90 plan scheduled for Thursday with Director of Eng'),
('Razorpay', 'Director of Engineering, Core Banking', 'Bengaluru, India', '₹90L - ₹1.2 Cr', 'offer', 'Initial offer received at ₹82L. Used Negotiator tool to prepare counter-proposal for ₹94L + equity bonus'),
('Atlassian', 'Principal System Architect', 'Bengaluru / Remote', '₹78L - ₹92L', 'screening', 'Recruiter phone screen cleared with flying colors; preparing for system design panel'),
('Swiggy', 'Associate Director, Platform Engineering', 'Bengaluru', '₹70L - ₹85L', 'applied', 'Applied with tailored ATS resume (Score 94%). Sent LinkedIn networking InMail to hiring manager')
ON CONFLICT DO NOTHING;
