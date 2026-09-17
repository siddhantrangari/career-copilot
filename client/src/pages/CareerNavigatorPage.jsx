import React, { useState } from 'react';
import { 
  Check, 
  ChevronRight, 
  Sparkles, 
  MessageSquare, 
  Mic, 
  SkipForward, 
  CheckCircle2, 
  Building2, 
  Award, 
  Target, 
  Compass, 
  FileText, 
  TrendingUp, 
  Lightbulb,
  X,
  Send
} from 'lucide-react';

const NAVIGATOR_STEPS = [
  { id: 'kickoff', label: 'Kickoff', num: 1, completed: true },
  { id: 'market-scan', label: 'Market scan', num: 2, completed: true },
  { id: 'stories', label: 'Your stories', num: 3, completed: false, active: true },
  { id: 'achievements', label: 'Achievements', num: 4, completed: true },
  { id: 'where-stand', label: 'Where you st...', num: 5, completed: true },
  { id: 'interview', label: 'AI interview', num: 6, completed: true },
  { id: 'game-plan', label: 'Game plan', num: 7, completed: true },
  { id: 'resume', label: 'Resume', num: 8, completed: true }
];

const EXPERIENCE_COMPANIES = [
  {
    id: 'aa',
    name: 'American Airlines',
    title: 'Engineering Manager',
    dates: 'Dec 2024 - Present',
    progress: '3 of 3',
    isComplete: true,
    questions: [
      {
        id: 'aa-q1',
        prompt: "American Airlines was undergoing significant restructuring and leadership changes during your tenure. How did you ensure your team's AI applications, like Generative customer workflows, maintained high availability and compliance?",
        tags: ['AI/GenAI Development', 'Stakeholder Collaboration', 'Technical Leadership'],
        status: 'Answered',
        answerText: "I established redundant LLM provider routing and zero-data retention pipelines with fallback to deterministic heuristics, ensuring 99.98% uptime during cloud migrations."
      },
      {
        id: 'aa-q2',
        prompt: "The Snowball Express program in December 2025 involved significant logistical coordination for American Airlines. Can you tell me about a time during this period when legacy services failed under peak load?",
        tags: ['API Gateways', 'OpenTelemetry', 'Reliability Engineering'],
        status: 'Skipped',
        answerText: null
      },
      {
        id: 'aa-q3',
        prompt: "You led a 10-month legacy-to-modern platform migration for the internal employee portal at American Airlines. Given operational pressures, how did you keep engineering velocity high while reducing tech debt?",
        tags: ['System Design & Architecture', 'Delivery Management', 'Technical Leadership'],
        status: 'Answered',
        answerText: "Implemented a strangler-fig migration pattern with canary releases, reducing ticket resolution latency by 45% with zero unplanned downtime."
      },
      {
        id: 'aa-q4',
        prompt: "You delivered $1.8M in annual cost savings at American Airlines. How much of that was directly attributable to your technology modernization and automation efforts versus organizational restructuring?",
        tags: ['Metrics & KPIs', 'Leadership & Strategy', 'Delivery Management'],
        status: 'Answered',
        answerText: "Approximately $1.2M came directly from infrastructure consolidation and automated CI/CD build caches, while $600K came from vendor contract renegotiations."
      }
    ]
  },
  {
    id: 'icims',
    name: 'iCIMS',
    title: 'Engineering Manager',
    dates: 'Feb 2024 - Dec 2024',
    progress: '1 of 2',
    isComplete: false,
    questions: [
      {
        id: 'ic-q1',
        prompt: "At iCIMS, candidate matching algorithms were a critical revenue driver. How did you align the engineering team's output with enterprise ATS compliance requirements?",
        tags: ['Enterprise ATS', 'Data Governance', 'Product Engineering'],
        status: 'Answered',
        answerText: "Audited feature vectors with our legal team to eliminate biased demographic variables, improving enterprise compliance score to 100%."
      },
      {
        id: 'ic-q2',
        prompt: "What was the most challenging cross-functional disagreement you resolved between sales and engineering on feature delivery dates?",
        tags: ['Cross-functional Leadership', 'Stakeholder Management'],
        status: 'Pending',
        answerText: null
      }
    ]
  },
  {
    id: 'collins',
    name: 'Collins Aerospace',
    title: 'Associate Engineering Manager',
    dates: 'Jun 2016 - Feb 2024',
    progress: '4 of 11',
    isComplete: false,
    questions: [
      {
        id: 'col-q1',
        prompt: "Aviation software demands safety-critical DO-178C certifications. How did you mentor junior engineers to adhere to strict validation protocols without burning them out?",
        tags: ['Safety-Critical Systems', 'People Mentorship', 'Quality Assurance'],
        status: 'Answered',
        answerText: "Automated test artifact generation and implemented peer review pairing sessions, reducing manual audit prep time by 60%."
      }
    ]
  },
  {
    id: 'zensar',
    name: 'Zensar Technologies',
    title: 'Senior Software Engineer',
    dates: 'Nov 2015 - Mar 2016',
    progress: '0 of 1',
    isComplete: false,
    questions: [
      {
        id: 'zen-q1',
        prompt: "Describe the architecture of the distributed microservices you engineered at Zensar for high-throughput transactional clients.",
        tags: ['Microservices', 'Distributed Systems', 'Java/Spring'],
        status: 'Pending',
        answerText: null
      }
    ]
  },
  {
    id: 'wipro',
    name: 'Wipro Technologies',
    title: 'Software Engineer',
    dates: 'May 2011 - Sep 2015',
    progress: '0 of 2',
    isComplete: false,
    questions: [
      {
        id: 'wip-q1',
        prompt: "What foundational engineering principles did you develop at Wipro that shaped your leadership approach today?",
        tags: ['Foundations', 'Early Career Growth'],
        status: 'Pending',
        answerText: null
      }
    ]
  },
  {
    id: 'across',
    name: 'Across your career',
    title: 'Executive Reflection',
    dates: '2011 - Present',
    progress: '4 of 6',
    isComplete: false,
    questions: [
      {
        id: 'ac-q1',
        prompt: "Looking at your 14-year career arc, what is the single engineering initiative you are most proud of that produced the highest commercial return?",
        tags: ['Executive Impact', 'Career Highpoint'],
        status: 'Answered',
        answerText: "Scaling the cloud modernization platform from 0 to 500,000 daily active users while mentoring 18 engineers into senior and lead positions."
      }
    ]
  }
];

export function CareerNavigatorPage({ onNavigate }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState('aa');
  const [activeQuestionModal, setActiveQuestionModal] = useState(null);
  const [modalAnswerText, setModalAnswerText] = useState('');
  const [companiesState, setCompaniesState] = useState(EXPERIENCE_COMPANIES);

  const currentCompany = companiesState.find(c => c.id === selectedCompanyId) || companiesState[0];

  const handleOpenAnswer = (q) => {
    setActiveQuestionModal(q);
    setModalAnswerText(q.answerText || '');
  };

  const handleSaveAnswer = () => {
    if (!activeQuestionModal) return;
    setCompaniesState(prev => prev.map(comp => {
      if (comp.id !== selectedCompanyId) return comp;
      return {
        ...comp,
        questions: comp.questions.map(q => {
          if (q.id === activeQuestionModal.id) {
            return { ...q, status: 'Answered', answerText: modalAnswerText };
          }
          return q;
        })
      };
    }));
    setActiveQuestionModal(null);
  };

  const handleSkipQuestion = (qId) => {
    setCompaniesState(prev => prev.map(comp => {
      if (comp.id !== selectedCompanyId) return comp;
      return {
        ...comp,
        questions: comp.questions.map(q => {
          if (q.id === qId) {
            return { ...q, status: 'Skipped' };
          }
          return q;
        })
      };
    }));
    if (activeQuestionModal?.id === qId) {
      setActiveQuestionModal(null);
    }
  };

  return (
    <div>
      {/* ── 1. Top 8-Step Career Navigator Stepper (Pixel-matched to Screenshot 2026-09-13 at 1.49.35 PM) ── */}
      <div className="nxt-stepper-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--nxt-text-primary)', margin: 0 }}>
            Your Career Navigator Journey
          </h3>
          <span style={{ fontSize: 12, color: 'var(--nxt-text-tertiary)', fontWeight: 600 }}>
            Step 3 of 8
          </span>
        </div>

        <div className="nxt-stepper-track">
          <div className="nxt-stepper-line" />
          {NAVIGATOR_STEPS.map((step) => {
            const isCompleted = step.completed;
            const isActive = step.active;

            return (
              <div 
                key={step.id} 
                id={`step-item-${step.id}`}
                className={`nxt-step-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (step.id === 'resume') onNavigate('resume');
                  else if (step.id === 'interview') onNavigate('interview');
                  else if (step.id === 'market-scan') onNavigate('jobs');
                  else if (step.id === 'game-plan') onNavigate('executive');
                }}
              >
                <div className={`nxt-step-circle ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                  {isCompleted ? <Check size={14} /> : step.num}
                </div>
                <span className="nxt-step-label">
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. Section Header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--nxt-text-primary)', letterSpacing: '-0.02em', margin: '0 0 6px 0' }}>
          Your career, in your own words
        </h1>
        <p style={{ fontSize: 14, color: 'var(--nxt-text-secondary)', margin: 0, maxWidth: 800 }}>
          Pick a company and answer in plain words — what happened, what you did, how it turned out. No story for one? Skip it; knowing that helps too.
        </p>
      </div>

      {/* ── 3. Split Layout: Experience Sidebar (Left) + Question Stream (Right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'flex-start' }}>
        {/* Left Experience Companies List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {companiesState.map(comp => {
            const isSelected = comp.id === selectedCompanyId;
            return (
              <div
                key={comp.id}
                id={`company-tab-${comp.id}`}
                onClick={() => setSelectedCompanyId(comp.id)}
                style={{
                  backgroundColor: isSelected ? 'var(--nxt-primary-subtle)' : 'var(--nxt-bg-card)',
                  border: isSelected ? '1.5px solid var(--nxt-primary)' : '1px solid var(--nxt-border-subtle)',
                  borderRadius: 'var(--nxt-radius-lg)',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? 'var(--nxt-shadow-sm)' : 'var(--nxt-shadow-xs)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: isSelected ? 'var(--nxt-primary)' : 'var(--nxt-text-primary)' }}>
                      {comp.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--nxt-text-secondary)', marginTop: 2 }}>
                      {comp.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--nxt-text-tertiary)', marginTop: 2 }}>
                      {comp.dates}
                    </div>
                  </div>

                  <span 
                    className={`nxt-badge ${comp.isComplete ? 'nxt-badge-answered' : 'nxt-badge-muted'}`}
                    style={{ fontSize: 11 }}
                  >
                    {comp.isComplete && <Check size={11} />}
                    {comp.progress}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Questions Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {currentCompany.questions.map((q, idx) => {
            const isAnswered = q.status === 'Answered';
            const isSkipped = q.status === 'Skipped';

            return (
              <div
                key={q.id}
                id={`question-card-${q.id}`}
                className="nxt-job-card"
                style={{ padding: '18px 20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ fontSize: 14.5, color: 'var(--nxt-text-primary)', lineHeight: 1.5, fontWeight: 500 }}>
                    {q.prompt}
                  </div>

                  {/* Status Badge */}
                  {isAnswered && (
                    <span className="nxt-badge nxt-badge-answered" style={{ flexShrink: 0 }}>
                      <Check size={12} /> Answered
                    </span>
                  )}
                  {isSkipped && (
                    <span className="nxt-badge nxt-badge-skipped" style={{ flexShrink: 0 }}>
                      <SkipForward size={12} /> Skipped
                    </span>
                  )}
                  {!isAnswered && !isSkipped && (
                    <button
                      id={`answer-btn-${q.id}`}
                      className="nxt-btn-apply"
                      style={{ height: 28, padding: '0 12px', fontSize: 12, flexShrink: 0 }}
                      onClick={() => handleOpenAnswer(q)}
                    >
                      Answer
                    </button>
                  )}
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                  {q.tags.map(tag => (
                    <span key={tag} className="nxt-badge nxt-badge-muted" style={{ fontSize: 11 }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Answer Snippet if answered */}
                {isAnswered && q.answerText && (
                  <div style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    backgroundColor: 'var(--nxt-bg-surface-subtle)',
                    borderRadius: 'var(--nxt-radius-md)',
                    border: '1px solid var(--nxt-border-subtle)',
                    fontSize: 13,
                    color: 'var(--nxt-text-secondary)',
                    fontStyle: 'italic'
                  }}>
                    "{q.answerText}"
                  </div>
                )}

                {/* Card footer actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 12, borderTop: '1px solid var(--nxt-border-subtle)', paddingTop: 10 }}>
                  <button
                    id={`edit-answer-${q.id}`}
                    className="nxt-btn-score"
                    style={{ fontSize: 12 }}
                    onClick={() => handleOpenAnswer(q)}
                  >
                    <MessageSquare size={12} />
                    {isAnswered ? 'Edit Answer' : 'Add Details'}
                  </button>
                  {!isSkipped && (
                    <button
                      id={`skip-btn-${q.id}`}
                      className="nxt-btn-score"
                      style={{ color: 'var(--nxt-text-tertiary)', fontSize: 12 }}
                      onClick={() => handleSkipQuestion(q.id)}
                    >
                      <SkipForward size={12} />
                      Skip
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Answer Modal ── */}
      {activeQuestionModal && (
        <div className="nxt-modal-overlay" onClick={() => setActiveQuestionModal(null)}>
          <div className="nxt-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--nxt-text-primary)' }}>
                    Share your story
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--nxt-text-secondary)', margin: '2px 0 0 0' }}>
                    {currentCompany.name} · {currentCompany.title}
                  </p>
                </div>
              </div>
              <button
                id="close-answer-modal-btn"
                onClick={() => setActiveQuestionModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--nxt-text-tertiary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--nxt-text-primary)', lineHeight: 1.5, marginBottom: 14 }}>
              {activeQuestionModal.prompt}
            </p>

            <textarea
              id="story-answer-textarea"
              rows={5}
              className="nxt-input-field"
              placeholder="What happened? What specific actions did you take? What were the quantifiable results?"
              value={modalAnswerText}
              onChange={(e) => setModalAnswerText(e.target.value)}
              style={{ height: 'auto', padding: '10px 12px', lineHeight: 1.4, resize: 'vertical' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <button
                id="modal-ask-nova-assist"
                className="nxt-btn-ask-nova"
                style={{ height: 36, padding: '0 14px' }}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('ask-nova', {
                    detail: { prompt: `Help me structure a STAR story answer for: "${activeQuestionModal.prompt}" at ${currentCompany.name}` }
                  }));
                }}
              >
                <Sparkles size={13} />
                Ask Nova to Polish
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  id="modal-skip-question-btn"
                  className="nxt-btn-score"
                  style={{ color: 'var(--nxt-text-tertiary)' }}
                  onClick={() => handleSkipQuestion(activeQuestionModal.id)}
                >
                  Skip Story
                </button>
                <button
                  id="modal-save-story-btn"
                  className="nxt-btn-apply"
                  style={{ height: 36, padding: '0 18px' }}
                  onClick={handleSaveAnswer}
                >
                  Save Story
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CareerNavigatorPage;
