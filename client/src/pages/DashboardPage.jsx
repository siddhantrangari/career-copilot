import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  Sparkles, FileText, Target, Mic, Kanban, DollarSign, 
  ArrowUpRight, Clock, Award, CheckCircle2, ChevronRight 
} from 'lucide-react';

export function DashboardPage({ onNavigate }) {
  const [resume, setResume] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [resData, appsData] = await Promise.all([
          api.getMasterResume(),
          api.getApplications()
        ]);
        setResume(resData);
        setApplications(appsData);
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const offerCount = applications.filter(a => a.status === 'offer' || a.status === 'negotiating').length;
  const interviewCount = applications.filter(a => a.status === 'interview').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 8px 80px' }}>
      {/* Top Banner Profile Summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="nxt-badge nxt-badge-answered" style={{ fontSize: '11px', fontWeight: 700 }}>
              Live Copilot Active
            </span>
            <span style={{ fontSize: '12.5px', color: 'var(--nxt-text-tertiary)' }}>
              Model: gpt-5.6-sol · 58 Stories Injected
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--nxt-text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Executive Career Cockpit
          </h1>
          <p style={{ color: 'var(--nxt-text-secondary)', fontSize: '14px', margin: 0 }}>
            {resume ? `${resume.full_name} · Targeting ${resume.target_role}` : 'Loading executive profile...'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            id="cockpit-edit-resume-btn"
            className="nxt-btn-ask-nova"
            style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
            onClick={() => onNavigate('resume')}
          >
            <FileText size={15} />
            Edit Master Resume
          </button>
          <button
            id="cockpit-scan-job-btn"
            className="nxt-btn-apply"
            style={{ height: '38px', padding: '0 18px', fontSize: '13px' }}
            onClick={() => onNavigate('ats')}
          >
            <Target size={15} />
            Scan New Job
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="nxt-job-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12.5px', color: 'var(--nxt-text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
            Active Pipeline
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--nxt-text-primary)', marginBottom: '4px' }}>
            {applications.length} Roles
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <CheckCircle2 size={13} />
            <span>{interviewCount} in Interview · {offerCount} in Offer</span>
          </div>
        </div>

        <div className="nxt-job-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12.5px', color: 'var(--nxt-text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
            Avg. ATS Match Rate
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--nxt-text-primary)', marginBottom: '4px' }}>
            91%
          </div>
          <div style={{ fontSize: '12px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <Award size={13} />
            <span>Top 5% recruiter parse tier</span>
          </div>
        </div>

        <div className="nxt-job-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12.5px', color: 'var(--nxt-text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
            Mock Interview Score
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--nxt-text-primary)', marginBottom: '4px' }}>
            88 / 100
          </div>
          <div style={{ fontSize: '12px', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <Clock size={13} />
            <span>STAR structure verified by AI</span>
          </div>
        </div>

        <div className="nxt-job-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12.5px', color: 'var(--nxt-text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
            Target Compensation
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--nxt-text-primary)', marginBottom: '4px' }}>
            {resume ? resume.target_ctc.split(' ')[0] : '₹75L - ₹95L'}
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <ArrowUpRight size={13} />
            <span>+65% upside with Negotiator</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Quick Action Hub & Pipeline Spotlight */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left: Quick Action Cards */}
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '14px', color: 'var(--nxt-text-primary)' }}>
            Recommended Career Copilot Actions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Nova AI Copilot Card */}
            <div
              id="action-card-nova"
              className="nxt-job-card"
              onClick={() => onNavigate('nova')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(139,92,246,0.06) 100%)',
                border: '1px solid rgba(139,92,246,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
                  <Sparkles size={20} color="#ffffff" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--nxt-text-primary)' }}>
                      Nova Executive AI Copilot
                    </div>
                    <span className="nxt-badge" style={{ backgroundColor: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontSize: '10px' }}>
                      58 Stories Injected
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--nxt-text-secondary)', marginTop: '2px' }}>
                    Ask anything, generate tailored resumes, build 30-60-90 WIN decks, and execute cold outreach.
                  </div>
                </div>
              </div>
              <ChevronRight size={18} color="#8b5cf6" />
            </div>

            <div
              id="action-card-ats"
              className="nxt-job-card"
              onClick={() => onNavigate('ats')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={20} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--nxt-text-primary)' }}>
                    1-Click ATS Tailor Engine
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--nxt-text-secondary)', marginTop: '2px' }}>
                    Paste target JD to extract keyword gaps and auto-rewrite resume bullets.
                  </div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--nxt-text-tertiary)" />
            </div>

            <div
              id="action-card-resume"
              className="nxt-job-card"
              onClick={() => onNavigate('resume')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} color="#10b981" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--nxt-text-primary)' }}>
                    STAR & XYZ Bullet Optimizer
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--nxt-text-secondary)', marginTop: '2px' }}>
                    Turn passive descriptions into executive metrics: [Action] + [Impact] + [Outcome].
                  </div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--nxt-text-tertiary)" />
            </div>

            <div
              id="action-card-interview"
              className="nxt-job-card"
              onClick={() => onNavigate('interview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mic size={20} color="#8b5cf6" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--nxt-text-primary)' }}>
                    Simulate Live Mock Interview
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--nxt-text-secondary)', marginTop: '2px' }}>
                    Test behavioral and architectural questions with real-time STAR evaluation.
                  </div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--nxt-text-tertiary)" />
            </div>

            <div
              id="action-card-executive"
              className="nxt-job-card"
              onClick={() => onNavigate('executive')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={20} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--nxt-text-primary)' }}>
                    Executive Win Decks & Salary Counter
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--nxt-text-secondary)', marginTop: '2px' }}>
                    Generate 30-60-90 onboarding blueprints & diplomatic CTC pushback scripts.
                  </div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--nxt-text-tertiary)" />
            </div>
          </div>
        </div>

        {/* Right: Active Pipeline Kanban Sneak-Peek */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--nxt-text-primary)', margin: 0 }}>
              Priority Job Applications
            </h2>
            <button
              id="dashboard-full-kanban-btn"
              onClick={() => onNavigate('tracker')}
              style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Full Kanban →
            </button>
          </div>

          <div className="nxt-job-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {applications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--nxt-text-tertiary)' }}>
                  <Kanban size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--nxt-text-secondary)' }}>
                    No applications tracked yet
                  </div>
                  <div style={{ fontSize: '12px', marginTop: 4 }}>
                    Jobs you apply to will appear here in your active pipeline.
                  </div>
                </div>
              ) : (
                applications.slice(0, 4).map((app) => (
                  <div
                    key={app.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--nxt-radius-md)',
                      background: 'var(--nxt-bg-surface-subtle)',
                      border: '1px solid var(--nxt-border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--nxt-text-primary)', fontSize: '14px' }}>{app.company_name}</div>
                      <span
                        className={`nxt-badge ${
                          app.status === 'offer'
                            ? 'nxt-badge-answered'
                            : app.status === 'interview'
                            ? 'nxt-badge-salary'
                            : 'nxt-badge-hybrid'
                        }`}
                        style={{ fontSize: '11px', textTransform: 'capitalize' }}
                      >
                        {app.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--nxt-text-secondary)', marginBottom: '6px' }}>
                      {app.job_title} · {app.salary_range}
                    </div>
                    {app.notes && (
                      <div style={{ fontSize: '11.5px', color: 'var(--nxt-text-tertiary)', fontStyle: 'italic' }}>
                        "{app.notes}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
