import React, { useState, useEffect, useRef } from 'react';
import { AppleCard } from '../components/ui/AppleCard';
import { NovaActionCard } from '../components/nova/NovaActionCard';
import { api } from '../services/api';
import { 
  Sparkles, Send, Bot, User, FileText, Award, 
  Users, DollarSign, BookOpen, CheckCircle, RefreshCw, 
  ChevronRight, ExternalLink, Zap, Flame, Target,
  Copy, Check, Search, ShieldAlert, Compass, Lightbulb, Play
} from 'lucide-react';
import confetti from 'canvas-confetti';

const PROMPT_SUGGESTIONS = [
  {
    icon: Target,
    label: "Tailor Master Resume (XYZ Formula)",
    prompt: "Please tailor my master resume for a Staff Software Engineer role at Stripe. Emphasize distributed systems, high throughput, and latency reduction using Google's XYZ formula.",
    category: "Resume Tailor"
  },
  {
    icon: Award,
    label: "Generate 30-60-90 Day WIN Document",
    prompt: "Create an executive 30-60-90 Day WIN Document presentation deck for Razorpay targeting a Director of Engineering position.",
    category: "Win Deck"
  },
  {
    icon: Compass,
    label: "Day 1 Prompt 01: Evidence-Based Role Niche",
    prompt: "Run NxtJob Day 1 Prompt 01 on my master profile: Analyze the evidence from my work experience, ignore vanity job titles, and reverse-engineer my highest-probability target niche and title aliases across MNCs, startups, and consulting firms.",
    category: "Bootcamp Prompts"
  },
  {
    icon: Lightbulb,
    label: "Day 2 Prompt 01: Company Challenge Diagnosis",
    prompt: "Run NxtJob Day 2 Prompt 01 for Google Cloud: Act as a top-tier management consultant and identify the 5-7 most critical challenges this role must solve with evidence, root cause, and consultant-grade solutions.",
    category: "Challenge Diagnosis"
  },
  {
    icon: Users,
    label: "3-Level LinkedIn Networking Sequence",
    prompt: "Generate a high-converting 3-level LinkedIn outreach sequence to connect with an Engineering VP at Google.",
    category: "Networking"
  },
  {
    icon: DollarSign,
    label: "Salary Counter-Offer Against Capped Band",
    prompt: "HR offered ₹80L and claims it is at the maximum of their band grid. My target is ₹95L. Write a diplomatic counter-offer email and verbal talking points using NxtJob multi-lever negotiation.",
    category: "Negotiation"
  },
  {
    icon: Flame,
    label: "How Manoj Landed ₹1Cr Director Role",
    prompt: "How did candidate Manoj crack a ₹1 Crore Director of Engineering package using the NxtJob Win Document methodology?",
    category: "Case Studies"
  },
  {
    icon: Zap,
    label: "Overcome 2-Year Career Gap (Ananya Case)",
    prompt: "How did candidate Ananya successfully break a 2-year career gap with zero salary penalty? How should I frame my sabbatical?",
    category: "Career Gap"
  }
];

const NXTJOB_CASE_STUDIES = [
  { name: "Tarun", prior: "Senior Director", landed: "Vice President of Tech", company: "Global Fintech / Enterprise", hike: "70% Hike", key: "70% tailored resumes + 30-60-90 WIN decks for final VP rounds." },
  { name: "Manoj", prior: "Principal Architect", landed: "Director of Engineering", company: "Global Enterprise", hike: "₹1 Crore Package (100%+ Hike)", key: "Presented custom 30-60-90 day execution blueprint to CEO & VP." },
  { name: "Anurag", prior: "Software Engineer", landed: "Senior Engineer", company: "Top MNC", hike: "50% Hike + 30+ Calls", key: "20-30 weekly LinkedIn outreach blitz using 3-level curiosity sequences." },
  { name: "Sandip", prior: "Tech Lead", landed: "Lead Architect", company: "Global SaaS", hike: "35+ Interview Calls", key: "Turned 0 callbacks into 35+ calls via 95% ATS XYZ bullet rewrite." },
  { name: "Ananya", prior: "Developer (2-Yr Gap)", landed: "Senior Engineer", company: "Product Enterprise", hike: "Broke 2-Yr Gap with Higher Pay", key: "Framed hiatus as an intentional architecture sabbatical & upskilling sprint." },
  { name: "Amit", prior: "Impacted by Layoff", landed: "Lead Cloud Architect", company: "Global MNC", hike: "Landed in 45 Days", key: "48-hour alumni & peer activation blitz; avoided generic job boards." },
  { name: "Rebecca", prior: "Non-Tech / Stagnant", landed: "Data & Systems Specialist", company: "Global Technology Co", hike: "400% Salary Hike", key: "Repositioned historical experience into modern high-scale cloud value drivers." },
  { name: "Uttam", prior: "Backend Developer", landed: "Senior Platform Engineer", company: "Tier 1 Product Enterprise", hike: "92% Hike via 3 Offers", key: "Staggered interview loops into 2-week window to run multi-offer bidding." },
  { name: "Sameer", prior: "Full Stack Engineer", landed: "Staff Engineer", company: "High Growth SaaS", hike: "6 Concurrent Offers", key: "High-velocity networking + instant customized resumes per target role." },
  { name: "Dhanush", prior: "Software Engineer", landed: "Senior Engineer", company: "Product SaaS", hike: "90% Salary Hike", key: "Refused historical salary anchoring by citing market role benchmarks and XYZ impact." },
  { name: "Monalisa", prior: "Quant Developer", landed: "Senior Quant Specialist", company: "Morgan Stanley", hike: "50% Salary Hike", key: "Cleared intense Morgan Stanley rounds using system design blueprints and hiring manager reachouts." },
  { name: "Sagnik", prior: "Frontend Developer", landed: "Senior Fullstack Engineer", company: "Blinkit (Zomato Group)", hike: "Tier-1 Quick-Commerce Package", key: "Cracked high-bar coding & system design in 45 days using performance tuning prep." }
];

const BOOTCAMP_PROMPTS = [
  {
    id: "d1-p1",
    day: "Day 1",
    title: "Prompt 01: Evidence-Based Target Role Discovery",
    desc: "Ignores vanity titles and reads work evidence to reverse-engineer highest-probability career niches and cross-industry title aliases.",
    prompt: `Act as a top executive recruiter, career strategist, and leadership talent market analyst. Analyze my resume based on evidence from my work experience. Not my job titles. Identify the recurring patterns in my strengths, business problems solved, functional expertise, seniority, leadership scope, industries, customers, and company types/sizes. Reverse-engineer my professional positioning and recommend the highest-probability target niche (roles, industries, company sizes, and seniority) where I am most competitive. Then provide an exhaustive list of relevant job title aliases used across startups, scale-ups, enterprises, consulting firms, and MNCs. Base every recommendation on recurring patterns, not isolated experiences.`
  },
  {
    id: "d1-p2",
    day: "Day 1",
    title: "Prompt 02: 10 Forward-Looking Hiring Signals & Hidden Roles",
    desc: "Ranks companies based on forward-looking expansion probability rather than brand popularity.",
    prompt: `Act as an expert labor-market researcher and business analyst. For this niche, identify companies with the strongest current and forward-looking hiring signals.
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
  {
    id: "d1-ats",
    day: "Day 1",
    title: "Google Boolean ATS Master Matrix (15 Portals)",
    desc: "Unindexes live job openings across 15 major ATS portals directly into Google Search.",
    prompt: `(site:myworkdayjobs.com OR site:greenhouse.io OR site:icims.com OR site:taleo.net OR site:lever.co OR site:smartrecruiters.com OR site:jobvite.com OR site:workforcenow.adp.com OR site:successfactors.com OR site:brassring.com OR site:jazzhr.com OR site:breezy.hr OR site:jobdiva.com OR site:bullhorn.com OR site:bamboohr.com) ("{JOB_TITLE}") ("{LOCATION}")`
  },
  {
    id: "d2-p1",
    day: "Day 2",
    title: "Prompt 01: Consulting-Grade Company Challenge Diagnosis",
    desc: "Deconstructs a target company's market position, strategic bottlenecks, and root causes to pitch high-impact solutions.",
    prompt: `I have been shortlisted for a [Job Title] role at [Company]. Based on the job description below, act as a top-tier management consultant and industry researcher.
Research the company, its recent developments, strategy, market, competitors, and relevant function. Identify the 5–7 most important challenges this role is likely expected to help solve.
Use the JD to infer likely priorities, but validate each challenge with recent credible online evidence, data, company statements, earnings reports, leadership commentary, or industry trends. Clearly distinguish between verified facts and informed hypotheses.
For each challenge, provide:
Challenge | Evidence | Why it matters to this role | Root cause | Consultant-grade solution | Recommended actions/KPIs
Prioritize challenges by business impact and relevance to the role, not generic company problems.
Job Description: {Paste JD}`
  },
  {
    id: "d2-p2",
    day: "Day 2",
    title: "Prompt 02: Interview Round Predictor & Forecaster",
    desc: "Mines candidate reports across Glassdoor, Blind, Reddit, and LinkedIn to predict the exact round-by-round interview pipeline.",
    prompt: `I am interviewing for a [Job Title] role at [Company]. Act as an expert interview researcher and executive recruiter.
Research recent interview experiences specifically for [Job Title] or closely related roles at [Company] across Glassdoor, Reddit, Quora, Blind, LinkedIn, and other credible candidate forums. Also review [Company]’s official careers, hiring process, and interview-preparation resources.
Based on the evidence, predict:
1. The likely number of interview rounds and purpose of each round.
2. Who is likely to interview me at each stage (HM, Peer, VP, HR).
3. The most likely questions asked in each round.
4. Any recurring case studies, presentations, portfolio reviews, technical/functional assessments, or behavioral themes.
5. What interviewers appear to evaluate most heavily for this role.
Separate directly reported interview experiences from informed predictions.`
  },
  {
    id: "d2-p3",
    day: "Day 2",
    title: "Prompt 03: Multi-Source Salary Research & Levelling",
    desc: "Aggregates compensation data across Levels.fyi, AmbitionBox, Glassdoor, PayScale, and LinkedIn Salary.",
    prompt: `You are an expert researcher and recruiter specialising in understanding salary trends in the market. I want you to tell me detailed salary trends for a {Job Title} with {years of experience} in {Industry} in {region}.
Search the internet for the most recent data on Ambition Box, PayScale, LinkedIn Salary Calculator, Levels.fyi, Glassdoor Know Your Worth, Salary.com and other similar websites. Give me a summary of the salary trends and companies that pay the highest salaries for these roles with data from each website.`
  }
];

export function NovaPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'knowledge'
  const [knowledgeSubTab, setKnowledgeSubTab] = useState('bootcamp'); // 'bootcamp' | 'resume_guide' | 'case_studies' | 'transcripts'
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 **Hello! I'm Nova**, your Executive Career Strategist & Autonomous Copilot.\n\nI am fully powered by **the complete NxtJob.ai Research & Execution Brain**:\n- 📘 **The 2-Day Agentic Job Search Bootcamp & Prompt Playbooks** (Evidence-based targeting, 10 forward-looking hiring signals, 15-portal Boolean ATS matrix, and consulting-grade company challenge diagnosis)\n- 📄 **The Master NxtJob Resume Guide & 5 Cardinal Sections** (Fishhook Summary formula, Categorized Skills, Google's XYZ impact bullets, Before-After technique, and soft-skill blacklist)\n- 🏆 **All 58 Candidate Success Stories & Transcripts** (Candidates who cracked ₹1Cr+ packages, 400% hikes, 30+ interview callbacks, overcoming career gaps and layoffs)\n- ⚡ **The 5 Pillars of Career Acceleration** (Evidence Positioning, Hidden Market Signal Mining, 30-60-90 WIN Presentations, Multi-Offer Competing Bids)\n\n### What I can execute for you right now:\n1. **🎯 1-Click Resume Tailoring**: Rewrite your bullets into Google's XYZ formula with 95%+ ATS score and 5-cardinal section structure.\n2. **🏆 30-60-90 Day WIN Documents**: Generate a 5-slide executive presentation deck for your upcoming interview loop.\n3. **🤝 3-Level LinkedIn Sequences**: Cold outreach sequences that get 65%+ accept rates.\n4. **💰 Multi-Offer Salary Negotiation**: High-leverage counter-offer scripts and objection handlers.\n5. **🔍 Hidden Job Signal Mining & Challenge Diagnosis**: Run Day 1 & Day 2 playbooks on any target company.\n\nWhat would you like to build or strategize today?`,
      action_type: null,
      action_data: null
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [masterProfile, setMasterProfile] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load master profile for context display
    api.getMasterResume().then(res => setMasterProfile(res)).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    confetti({ particleCount: 25, spread: 45 });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: text.trim() }];
    setMessages(newMessages);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await api.chatWithNova({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        activePage: 'Nova Studio'
      });

      if (response) {
        setMessages([...newMessages, {
          role: 'assistant',
          content: response.reply || 'Task complete.',
          action_type: response.action_type || null,
          action_data: response.action_data || null
        }]);

        if (response.action_type) {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
        }
      }
    } catch (e) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: `⚠️ Error executing request: ${e.message}. Please verify server connection.`,
        action_type: null,
        action_data: null
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 24px 80px' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #0a84ff 0%, #bf5af2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(10,132,255,0.4)',
          }}>
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.02em' }}>
                Nova Executive Copilot
              </h1>
              <span className="apple-badge apple-badge-purple" style={{ fontSize: 11 }}>
                NxtJob Full Intelligence Brain · 58 Stories + Playbooks + Guides
              </span>
              <span className="apple-badge apple-badge-blue" style={{ fontSize: 11 }}>
                gpt-5.6-sol
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#8e8e93' }}>
              Autonomous Career Strategist · Tailored Resumes, 30-60-90 Win Decks & Multi-Offer Negotiation
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.06)',
          borderRadius: 24, padding: 3, border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button
            id="nova-tab-chat"
            className={`apple-segment-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <Sparkles size={14} />
            Copilot Chat
          </button>
          <button
            id="nova-tab-knowledge"
            className={`apple-segment-item ${activeTab === 'knowledge' ? 'active' : ''}`}
            onClick={() => setActiveTab('knowledge')}
          >
            <BookOpen size={14} />
            Full NxtJob Knowledge Brain
          </button>
        </div>
      </div>

      {activeTab === 'chat' ? (
        /* Chat & Execution Studio View */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 20 }}>
          {/* Main Chat Stream */}
          <div className="apple-glass-panel" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '75vh',
            borderRadius: 20,
            overflow: 'hidden',
          }}>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  {msg.role !== 'user' && (
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #0a84ff 0%, #bf5af2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      <Bot size={16} color="#fff" />
                    </div>
                  )}

                  <div style={{
                    maxWidth: msg.role === 'user' ? '75%' : '88%',
                    background: msg.role === 'user' ? '#0a84ff' : 'rgba(255,255,255,0.05)',
                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    padding: '14px 18px',
                    color: '#f5f5f7',
                    fontSize: 13.5,
                    lineHeight: 1.65,
                  }}>
                    {/* Render message text with simple markdown-like formatting */}
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </div>

                    {/* Render Interactive Action Artifacts if generated */}
                    {msg.action_type && msg.action_data && (
                      <NovaActionCard
                        actionType={msg.action_type}
                        actionData={msg.action_data}
                        onNavigate={onNavigate}
                      />
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      <User size={16} color="#8e8e93" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #0a84ff 0%, #bf5af2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Bot size={16} color="#fff" />
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: '#8e8e93',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#0a84ff', animation: 'pulse 1.2s infinite' }} />
                    Nova is thinking & formulating strategic artifacts...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '0 0 20px 20px',
            }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                style={{ display: 'flex', gap: 10, alignItems: 'center' }}
              >
                <input
                  id="nova-input-field"
                  className="apple-input"
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 14,
                    padding: '12px 16px',
                    fontSize: 14,
                  }}
                  placeholder="Ask Nova anything or tell it to tailor a resume, create a WIN deck, or write an outreach sequence..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={loading}
                />
                <button
                  id="nova-send-btn"
                  className="apple-btn apple-btn-primary"
                  style={{ borderRadius: 14, padding: '12px 20px', height: 46 }}
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                >
                  <Send size={15} />
                  Execute
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar: Quick Actions & Profile Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Active User Master Profile Context */}
            <AppleCard style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="apple-badge apple-badge-emerald" style={{ fontSize: 10 }}>Active Context</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Master Resume</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f5f5f7', marginBottom: 2 }}>
                {masterProfile?.full_name || 'Your Profile'}
              </div>
              <div style={{ fontSize: 11, color: '#8e8e93', marginBottom: 8 }}>
                {masterProfile?.current_role || 'Senior Professional'} → <strong style={{ color: '#5ac8fa' }}>{masterProfile?.target_role || 'Target Lead'}</strong>
              </div>
              <div style={{ fontSize: 11, color: '#636366' }}>
                Skills: {(masterProfile?.skills || ['Distributed Systems', 'Cloud', 'System Design']).slice(0, 4).join(', ')}
              </div>
            </AppleCard>

            {/* Quick Action Prompt Chips */}
            <AppleCard style={{ padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} color="#ffd60a" /> Quick Action Prompts
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PROMPT_SUGGESTIONS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      id={`nova-chip-${idx}`}
                      className="apple-btn apple-btn-secondary"
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: 12,
                        fontSize: 11.5,
                        lineHeight: 1.4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        justifyContent: 'flex-start',
                      }}
                      onClick={() => handleSendMessage(item.prompt)}
                    >
                      <Icon size={14} color="#0a84ff" style={{ flexShrink: 0 }} />
                      <span style={{ color: '#d1d1d6' }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </AppleCard>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
            FULL NXTJOB KNOWLEDGE BRAIN & PLAYBOOK EXPLORER
        ══════════════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Sub Tab Navigation */}
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', background: 'rgba(255,255,255,0.04)',
            padding: 6, borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)'
          }}>
            {[
              { id: 'bootcamp',      label: '📘 Bootcamp Prompt Playbooks', count: 'Day 1 & Day 2' },
              { id: 'resume_guide',  label: '📄 Master Resume Guide & Rules', count: '5 Cardinal Rules' },
              { id: 'case_studies',  label: '🏆 58 Candidate Stories & 5 Pillars', count: '58 Profiles' },
              { id: 'transcripts',   label: '📚 Video Transcripts & Insights', count: '58 Videos' }
            ].map(tab => (
              <button
                key={tab.id}
                id={`k-subtab-${tab.id}`}
                onClick={() => setKnowledgeSubTab(tab.id)}
                style={{
                  padding: '8px 16px', borderRadius: 14, fontSize: 12.5, fontWeight: 700,
                  background: knowledgeSubTab === tab.id ? 'rgba(10,132,255,0.2)' : 'transparent',
                  border: `1px solid ${knowledgeSubTab === tab.id ? 'rgba(10,132,255,0.45)' : 'transparent'}`,
                  color: knowledgeSubTab === tab.id ? '#5ac8fa' : '#8e8e93',
                  cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                {tab.label} <span style={{ fontSize: 10, opacity: 0.7 }}>({tab.count})</span>
              </button>
            ))}
          </div>

          {/* SUBTAB 1: BOOTCAMP PROMPTS & PLAYBOOKS */}
          {knowledgeSubTab === 'bootcamp' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AppleCard glow style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0a84ff', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Compass size={16} /> Major Richik's 2-Day Agentic Job Search Bootcamp
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 4, marginBottom: 8 }}>
                  The Operational Prompt Playbook for Target Market Dominance
                </h2>
                <p style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.6, maxWidth: 960 }}>
                  These exact prompts reverse-engineer your competitive niche, mine hidden forward-looking expansion signals across 10 vectors, diagnose consulting-grade company challenges, and aggregate multi-source salary benchmarks.
                </p>
              </AppleCard>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
                {BOOTCAMP_PROMPTS.map(p => (
                  <AppleCard key={p.id} style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span className="apple-badge apple-badge-blue" style={{ fontSize: 10, fontWeight: 800 }}>{p.day}</span>
                        <span style={{ fontSize: 11, color: '#636366' }}>Official Prompt Playbook</span>
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f5f5f7', marginBottom: 6 }}>{p.title}</h3>
                      <p style={{ fontSize: 12, color: '#8e8e93', marginBottom: 12, lineHeight: 1.5 }}>{p.desc}</p>
                      <pre style={{
                        fontFamily: 'inherit', fontSize: 12, color: '#d1d1d6', background: 'rgba(0,0,0,0.3)',
                        padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
                        whiteSpace: 'pre-wrap', maxHeight: 180, overflowY: 'auto', lineHeight: 1.5
                      }}>
                        {p.prompt}
                      </pre>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <button
                        id={`copy-prompt-${p.id}`}
                        className="apple-btn apple-btn-secondary"
                        style={{ fontSize: 11, padding: '6px 12px' }}
                        onClick={() => handleCopy(p.id, p.prompt)}
                      >
                        {copiedId === p.id ? <Check size={13} /> : <Copy size={13} />}
                        {copiedId === p.id ? 'Copied!' : 'Copy Prompt'}
                      </button>

                      <button
                        id={`run-prompt-${p.id}`}
                        className="apple-btn apple-btn-primary"
                        style={{ fontSize: 11, padding: '6px 12px' }}
                        onClick={() => {
                          setActiveTab('chat');
                          handleSendMessage(`Execute the following NxtJob Playbook prompt on my current master profile:\n\n${p.prompt}`);
                        }}
                      >
                        <Sparkles size={13} /> Run in Nova Copilot
                      </button>
                    </div>
                  </AppleCard>
                ))}
              </div>
            </div>
          )}

          {/* SUBTAB 2: MASTER RESUME GUIDE & 5 CARDINAL RULES */}
          {knowledgeSubTab === 'resume_guide' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AppleCard glow style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#32d74b', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <FileText size={16} /> The NxtJob Master Resume Guide
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 4, marginBottom: 8 }}>
                  The 5 Cardinal Sections Rule & Kill-the-ATS Standard
                </h2>
                <p style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.6, maxWidth: 960 }}>
                  A resume has only two metrics: <strong>Relevance</strong> (matching dream candidate criteria) and <strong>Brilliance</strong> (demonstrating top-10% impact). Standard resumes fail by keyword dumping or claiming soft skills.
                </p>
              </AppleCard>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
                {/* 1. Five Cardinal Sections */}
                <AppleCard style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f5f5f7', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={16} color="#32d74b" /> The 5 Cardinal Sections (Order Matters)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, color: '#d1d1d6' }}>
                    <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <strong>1. Personal Details:</strong> Name, professional email, phone, LinkedIn, City only. (No photo, marital status, or references).
                    </div>
                    <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <strong>2. Summary (The Fishhook):</strong> 6-second hook: <em>"Accomplished {`{Role}`} with {`{X yrs}`} and expertise in {`{3-4 skills}`}. Achieved {`{metric}`} for {`{Company}`}."</em>
                    </div>
                    <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <strong>3. Categorized Skills:</strong> 2 readable functional categories. Zero 5-star self-ratings.
                    </div>
                    <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <strong>4. Professional Experience:</strong> Strictly Google XYZ bullets: <em>Accomplished [X], measured by [Y], by doing [Z]</em>.
                    </div>
                    <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <strong>5. Education & Certifications:</strong> Degrees and high-signal industry credentials.
                    </div>
                  </div>
                </AppleCard>

                {/* 2. Soft-Skill Vomit Words Blacklist */}
                <AppleCard style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ff375f', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldAlert size={16} color="#ff375f" /> Blacklisted "Vomit Words"
                  </h3>
                  <p style={{ fontSize: 12, color: '#8e8e93', marginBottom: 12 }}>
                    <strong>Golden Rule:</strong> Never write a soft skill directly. Prove it with metrics, don't claim it with adjectives.
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {[
                      'hard worker', 'great communicator', 'dynamic leader', 'team player',
                      'results-driven', 'go-getter', 'self-motivated', 'detail-oriented',
                      'passionate professional', 'out-of-the-box thinker'
                    ].map((w, idx) => (
                      <span key={idx} style={{
                        fontSize: 11, fontWeight: 700, color: '#ff375f', background: 'rgba(255,55,95,0.1)',
                        border: '1px solid rgba(255,55,95,0.25)', padding: '4px 10px', borderRadius: 14
                      }}>
                        🚫 {w}
                      </span>
                    ))}
                  </div>

                  <div style={{ padding: '12px 14px', background: 'rgba(50,215,75,0.08)', borderRadius: 10, border: '1px solid rgba(50,215,75,0.2)', fontSize: 12, color: '#32d74b' }}>
                    ✅ <strong>Instead:</strong> Replace <em>"great communicator"</em> with <em>"Aligned 4 cross-functional business units across 3 time zones to deliver cloud migration 2 weeks ahead of SLA."</em>
                  </div>
                </AppleCard>
              </div>
            </div>
          )}

          {/* SUBTAB 3: 58 CANDIDATE STORIES & 5 PILLARS */}
          {knowledgeSubTab === 'case_studies' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 5 Pillars Summary Banner */}
              <AppleCard glow style={{ padding: 22 }}>
                <span className="apple-badge apple-badge-purple" style={{ fontSize: 11, marginBottom: 6 }}>
                  The NxtJob 5-Pillar Acceleration System
                </span>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
                  The Operational Playbook of 58 Top Performers
                </h2>
                <p style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.6, maxWidth: '900px', marginBottom: 18 }}>
                  Cold applying on job portals has a statistical callback rate below 2%. The candidates below bypassed portals by utilizing the strict Google XYZ bullet rewrite, 70% custom resume tailoring, 3-level hiring manager LinkedIn outreach, and 30-60-90 Day Executive WIN documents in their final rounds.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#5ac8fa', marginBottom: 4 }}>1. XYZ Bullet Format</div>
                    <div style={{ fontSize: 11, color: '#8e8e93' }}>Accomplished [X], measured by [Y], by doing [Z]. 90%+ ATS match.</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#32d74b', marginBottom: 4 }}>2. 3-Level LinkedIn Blitz</div>
                    <div style={{ fontSize: 11, color: '#8e8e93' }}>20-30 touches/week to Engineering Directors with curiosity-first notes.</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#bf5af2', marginBottom: 4 }}>3. 30-60-90 WIN Decks</div>
                    <div style={{ fontSize: 11, color: '#8e8e93' }}>Brings a proactive 5-slide strategy to interview final rounds.</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#ffd60a', marginBottom: 4 }}>4. Multi-Offer Staggering</div>
                    <div style={{ fontSize: 11, color: '#8e8e93' }}>Staggers 2-4 final loops into a 2-week window to drive bidding wars.</div>
                  </div>
                </div>
              </AppleCard>

              {/* Candidate Case Studies Grid */}
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={16} color="#0a84ff" /> 58 Candidate Profiles & Strategy Highlights
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
                  {NXTJOB_CASE_STUDIES.map((c, idx) => (
                    <AppleCard key={idx} style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{c.name}</span>
                          <span className="apple-badge apple-badge-emerald" style={{ fontSize: 11, fontWeight: 700 }}>
                            {c.hike}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#5ac8fa', marginBottom: 2 }}>
                          {c.prior} → <strong style={{ color: '#fff' }}>{c.landed}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: '#636366', marginBottom: 8 }}>
                          🏢 {c.company}
                        </div>
                        <div style={{ fontSize: 12, color: '#8e8e93', lineHeight: 1.5, marginBottom: 12 }}>
                          {c.key}
                        </div>
                      </div>
                      <button
                        id={`ask-about-${c.name.toLowerCase()}-btn`}
                        className="apple-btn apple-btn-secondary"
                        style={{ width: '100%', fontSize: 11, padding: '6px 12px' }}
                        onClick={() => {
                          setActiveTab('chat');
                          handleSendMessage(`Explain the exact strategy and steps candidate ${c.name} used to land ${c.landed} at ${c.company} with a ${c.hike}. How can I apply their playbook?`);
                        }}
                      >
                        Ask Nova About {c.name}'s Strategy
                        <ChevronRight size={12} />
                      </button>
                    </AppleCard>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 4: VIDEO TRANSCRIPTS & INSIGHTS EXPLORER */}
          {knowledgeSubTab === 'transcripts' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AppleCard glow style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffd60a', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Play size={16} /> 58 Video Transcripts & Research Library
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 4, marginBottom: 8 }}>
                  Direct Video Transcripts & Strategic Takeaways
                </h2>
                <p style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.6, maxWidth: 960 }}>
                  Every success story is backed by a full video interview breakdown. Review how candidates handled salary negotiations, counter-offers, and technical leadership interviews.
                </p>
              </AppleCard>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
                {NXTJOB_CASE_STUDIES.map((c, idx) => (
                  <AppleCard key={idx} style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#f5f5f7' }}>{c.name}'s Success Transcript</span>
                      <span className="apple-badge apple-badge-purple" style={{ fontSize: 10 }}>Video Transcript</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#5ac8fa', marginBottom: 4 }}>
                      Landed: <strong>{c.landed}</strong> at {c.company}
                    </div>
                    <div style={{ fontSize: 11, color: '#ffd60a', fontWeight: 700, marginBottom: 10 }}>
                      Milestone: {c.hike}
                    </div>
                    <p style={{ fontSize: 12, color: '#8e8e93', lineHeight: 1.5, marginBottom: 12 }}>
                      {c.key}
                    </p>
                    <button
                      id={`inspect-transcript-${c.name.toLowerCase()}`}
                      className="apple-btn apple-btn-secondary"
                      style={{ width: '100%', fontSize: 11, padding: '6px 12px' }}
                      onClick={() => {
                        setActiveTab('chat');
                        handleSendMessage(`Summarize the full video transcript and tactical coaching insights from candidate ${c.name}'s interview at ${c.company}. What were their key breakthrough moments?`);
                      }}
                    >
                      <Sparkles size={12} /> Ask Nova to Deconstruct Transcript
                    </button>
                  </AppleCard>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NovaPage;
