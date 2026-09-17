import React, { useState, useEffect } from 'react';
import {
  Radar,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  User,
  Phone,
  ShieldCheck,
  Eye,
  TrendingUp,
  FileCheck,
  Award,
  Layers,
  Zap,
  Target
} from 'lucide-react';
import { AppleCard } from '../components/ui/AppleCard';
import { CircularGauge } from '../components/ui/CircularGauge';

export function InteractiveTrialPage({ onNavigate }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSimulatingScouts, setIsSimulatingScouts] = useState(true);
  const [screenedCount, setScreenedCount] = useState(1280);
  const [radarChecklistIndex, setRadarChecklistIndex] = useState(0);

  // Profile State prefilled with user's details observed from trial
  const [profile, setProfile] = useState({
    fullName: 'Siddhant Rangari',
    phone: '+91 86689-88485',
    desiredRole: 'Co-Founder / VP of Engineering',
    experienceLevel: 'Mid-Career Professionals (5-15 years)',
    currentCtc: '₹45 LPA ($160k)',
    targetCtc: '₹75 LPA ($240k)'
  });

  // Step metrics & "Chances of Success" values modeled after NxtJob trial
  const stepMetrics = [
    { step: 1, chance: 2, label: 'Candidate Onboarding' },
    { step: 2, chance: 24, label: 'AI Scouts & Portal Sweeping' },
    { step: 3, chance: 58, label: 'ATS Recruiter Eye-Tracking' },
    { step: 4, chance: 84, label: '1-Click STAR Keyword Infusion' },
    { step: 5, chance: 94, label: 'The 30-60-90 WIN Deck' },
  ];

  const currentMetric = stepMetrics[currentStep - 1] || stepMetrics[0];

  // Animate portal screening counter and checklist in Step 2
  useEffect(() => {
    if (currentStep === 2) {
      setIsSimulatingScouts(true);
      setScreenedCount(1280);
      setRadarChecklistIndex(0);

      const countInterval = setInterval(() => {
        setScreenedCount((prev) => {
          if (prev >= 5032) {
            clearInterval(countInterval);
            return 5032;
          }
          return prev + Math.floor(Math.random() * 240) + 110;
        });
      }, 90);

      const checkInterval = setInterval(() => {
        setRadarChecklistIndex((prev) => {
          if (prev >= 4) {
            clearInterval(checkInterval);
            setIsSimulatingScouts(false);
            return 4;
          }
          return prev + 1;
        });
      }, 750);

      return () => {
        clearInterval(countInterval);
        clearInterval(checkInterval);
      };
    }
  }, [currentStep]);

  // Keyboard navigation support (ArrowLeft / ArrowRight) like NxtJob
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' && currentStep < 5) {
        setCurrentStep((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        setCurrentStep((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  return (
    <div style={{ minHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#000000', color: '#f5f5f7' }}>
      {/* Top HUD: Segmented Progress Bar & "Chances of Success" Meter */}
      <div
        style={{
          position: 'sticky',
          top: '60px',
          zIndex: 90,
          background: 'rgba(5, 7, 10, 0.88)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid var(--apple-border)',
          padding: '14px 24px',
        }}
      >
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(48, 209, 88, 0.2)',
                    color: '#30d158',
                    border: '1px solid rgba(48, 209, 88, 0.4)',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                >
                  {currentMetric.chance}%
                </span>
                Chances of Success
              </span>
              <span style={{ fontSize: '13px', color: 'var(--apple-text-secondary)' }}>
                • Act {currentStep}: {currentMetric.label}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#30d158',
                  background: 'rgba(48, 209, 88, 0.12)',
                  border: '1px solid rgba(48, 209, 88, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  letterSpacing: '0.05em',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30d158' }}></span>
                LIVE
              </span>
              <span style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>
                Step {currentStep} of 5
              </span>
            </div>
          </div>

          {/* Discrete 5-Segment Bar (matching NxtJob screenshot) */}
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`hud-progress-segment ${idx <= currentStep ? 'active' : ''}`}
                style={{
                  cursor: 'pointer',
                  opacity: idx <= currentStep ? 1 : 0.4,
                  height: '6px',
                }}
                onClick={() => setCurrentStep(idx)}
                title={`Jump to Act ${idx}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '36px 20px', flex: 1, width: '100%' }}>
        {/* ========================================================================= */}
        {/* ACT 1: WELCOME & PROFILE PERSONALIZE */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(0, 113, 227, 0.12)',
                  border: '1px solid rgba(0, 113, 227, 0.3)',
                  color: '#5ac8fa',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                <Sparkles size={14} /> Powered by gpt-5.6-sol Engine
              </div>
              <h1 className="headline-display" style={{ marginBottom: '12px', fontSize: '40px' }}>
                Let us show you how to win a <span className="text-gradient-blue">dream leadership role</span> in 2026.
              </h1>
              <p style={{ color: 'var(--apple-text-secondary)', fontSize: '16px', maxWidth: '620px', margin: '0 auto' }}>
                Reverse-engineered executive career accelerator. Bypass ATS gatekeepers, sweep live openings across 6 job portals in parallel, and pitch directly with 30-60-90 strategic proposals.
              </p>
            </div>

            <AppleCard elevated style={{ padding: '32px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(0, 113, 227, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User size={16} color="#2997ff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--nxt-text-primary)' }}>Complete Your Executive Profile</h3>
                  <p style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>Personalize your targeted scouts and radar algorithms</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="apple-input"
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      placeholder="e.g. Siddhant Rangari"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    className="apple-input"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+91 86689-88485"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '18px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                    Desired Role / Executive Title
                  </label>
                  <input
                    type="text"
                    className="apple-input"
                    value={profile.desiredRole}
                    onChange={(e) => setProfile({ ...profile, desiredRole: e.target.value })}
                    placeholder="e.g. Co-Founder, VP of Engineering"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                    Experience Tier
                  </label>
                  <select
                    className="apple-input"
                    value={profile.experienceLevel}
                    onChange={(e) => setProfile({ ...profile, experienceLevel: e.target.value })}
                  >
                    <option>Mid-Career Professionals (5-15 years)</option>
                    <option>Senior Executives & C-Suite (15+ years)</option>
                    <option>Technical Founders & Principals</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  border: '1px solid var(--apple-border)',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="#30d158" />
                  <span style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>
                    All data encrypted & processed securely in isolated memory.
                  </span>
                </div>
                <span className="apple-badge apple-badge-emerald" style={{ fontSize: '11px' }}>
                  Postgres Port 5438
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  id="trial-step1-next"
                  className="apple-btn apple-btn-primary"
                  onClick={() => setCurrentStep(2)}
                  style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: '15px' }}
                >
                  Deploy AI Scouts & Launch Multi-Portal Radar <ArrowRight size={16} />
                </button>
              </div>
            </AppleCard>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ACT 2: AI SCOUTS RADAR SWEEP (Matching Screenshot 12) */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(48, 209, 88, 0.15)',
                  color: '#30d158',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '10px',
                }}
              >
                <Radar size={14} className="radar-spin" /> Live Parallel Portals Active
              </div>
              <h2 className="headline-section" style={{ fontSize: '32px', marginBottom: '8px' }}>
                AI Scouts Deployed
              </h2>
              <p style={{ color: 'var(--apple-text-secondary)', fontSize: '15px' }}>
                Sweeping the live market for <strong>{profile.desiredRole}</strong> roles across 6 enterprise networks...
              </p>
            </div>

            {/* Scanned Portals Pills (Screenshot 12 Exact Match) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '28px',
              }}
            >
              {[
                { name: 'LinkedIn', checked: true },
                { name: 'Naukri', checked: true },
                { name: 'Indeed', checked: true },
                { name: 'HiringCafe', checked: true },
                { name: 'Glassdoor', checked: true },
                { name: 'Monster', checked: true },
              ].map((portal, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-pill)',
                    background: portal.checked ? 'rgba(0, 113, 227, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: portal.checked ? '1px solid rgba(0, 113, 227, 0.4)' : '1px solid var(--apple-border)',
                    color: portal.checked ? '#5ac8fa' : 'var(--apple-text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={13} color="#30d158" /> {portal.name}
                </span>
              ))}
            </div>

            {/* Radar Visualizer & Real-time Checklist Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', alignItems: 'center' }}>
              {/* Radar Circle */}
              <AppleCard
                elevated
                style={{
                  padding: '32px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'radial-gradient(circle at center, rgba(0, 113, 227, 0.15) 0%, rgba(10, 12, 16, 0.95) 75%)',
                }}
              >
                {/* Circular Radar Container */}
                <div
                  style={{
                    width: '210px',
                    height: '210px',
                    borderRadius: '50%',
                    border: '1px solid rgba(0, 113, 227, 0.3)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 40px rgba(0, 113, 227, 0.2)',
                  }}
                >
                  {/* Concentric rings */}
                  <div style={{ position: 'absolute', width: '150px', height: '150px', borderRadius: '50%', border: '1px solid rgba(0, 113, 227, 0.2)' }} />
                  <div style={{ position: 'absolute', width: '90px', height: '90px', borderRadius: '50%', border: '1px solid rgba(0, 113, 227, 0.15)' }} />

                  {/* Sweep beam */}
                  <div className="radar-sweep-beam" />

                  {/* Center Counter */}
                  <div style={{ textAlign: 'center', zIndex: 10, position: 'relative' }}>
                    <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--nxt-text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {screenedCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--nxt-accent-blue)', textTransform: 'uppercase' }}>
                      Openings Screened
                    </div>
                  </div>

                  {/* Twinkling Blips */}
                  <div style={{ position: 'absolute', top: '35%', left: '28%', width: '6px', height: '6px', borderRadius: '50%', background: '#30d158', boxShadow: '0 0 8px #30d158' }} />
                  <div style={{ position: 'absolute', top: '65%', left: '72%', width: '5px', height: '5px', borderRadius: '50%', background: '#2997ff', boxShadow: '0 0 8px #2997ff' }} />
                  <div style={{ position: 'absolute', top: '22%', left: '68%', width: '6px', height: '6px', borderRadius: '50%', background: '#bf5af2', boxShadow: '0 0 8px #bf5af2' }} />
                </div>

                <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--apple-text-secondary)' }}>
                  Filtering high-leverage compensation: {profile.targetCtc}
                </div>
              </AppleCard>

              {/* Dynamic Checklist (Matching Screenshot 12 items) */}
              <AppleCard style={{ padding: '28px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '18px', color: 'var(--nxt-text-primary)' }}>
                  Parallel Screening Pipeline
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    `Reading your niche profile — ${profile.desiredRole}`,
                    `Scanning 6 enterprise job portals in parallel`,
                    `Screening ${screenedCount.toLocaleString()} live openings`,
                    `Filtering for your experience level (${profile.experienceLevel.split(' ')[0]})`,
                    `Ranking your best-fit top 1% leadership roles`,
                  ].map((text, idx) => {
                    const isDone = (checklistProgress >= (idx + 1) * 20);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: isDone ? 'var(--nxt-text-primary)' : 'var(--apple-text-secondary)' }}>
                        {isDone ? (
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#30d158', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check size={11} color="#ffffff" />
                          </div>
                        ) : (
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--apple-border)', flexShrink: 0 }} />
                        )}
                        <span>{text}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--apple-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    className="apple-btn apple-btn-secondary"
                    onClick={() => setCurrentStep(1)}
                    style={{ fontSize: '12px', padding: '8px 14px' }}
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button
                    id="trial-step2-next"
                    className="apple-btn apple-btn-primary"
                    onClick={() => setCurrentStep(3)}
                    style={{ fontSize: '13px', padding: '10px 18px' }}
                  >
                    Examine ATS Recruiter Match <ArrowRight size={14} />
                  </button>
                </div>
              </AppleCard>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ACT 3: LIVE RESUME ATS AUDIT */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(255, 69, 58, 0.15)',
                  color: '#ff453a',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '10px',
                }}
              >
                <AlertTriangle size={14} /> Critical ATS Vulnerabilities Detected
              </div>
              <h2 className="headline-section" style={{ fontSize: '32px', marginBottom: '8px' }}>
                Your Resume Passed Only <span style={{ color: '#ff453a' }}>48%</span> of Enterprise ATS Filters.
              </h2>
              <p style={{ color: 'var(--apple-text-secondary)', fontSize: '15px' }}>
                Senior leadership resumes fail automated screens due to passive phrasing and missing high-impact keywords.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px' }}>
              <AppleCard elevated style={{ padding: '28px', textAlign: 'center' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--apple-text-secondary)', marginBottom: '14px' }}>
                  Current ATS Compatibility Score
                </h4>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <CircularGauge value={48} size={130} strokeWidth={11} color="#ff453a" label="Weak Match" />
                </div>
                <div style={{ fontSize: '13px', color: '#ff453a', fontWeight: 700, marginBottom: '6px' }}>
                  ⚠️ Automated Screen Rejection Likely
                </div>
                <p style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>
                  Recruiters spend an average of 6 seconds per resume. Your current profile lacks required leadership power-verbs.
                </p>
              </AppleCard>

              <AppleCard style={{ padding: '28px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--nxt-text-primary)', marginBottom: '14px' }}>
                  Detected ATS Keyword Gap Matrix
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { kw: 'Distributed Systems P&L', state: 'Missing in experience bullets', impact: '-18%' },
                    { kw: 'High-Availability (99.99%)', state: 'Vaguely implied, not metricized', impact: '-14%' },
                    { kw: 'Cross-Functional Team Scaling', state: 'Lacks headcount scope', impact: '-12%' },
                    { kw: 'Cloud Cost Optimization (FinOps)', state: 'Absent from summary', impact: '-8%' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--nxt-bg-surface-subtle)',
                        border: '1px solid var(--nxt-border-subtle)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--nxt-text-primary)' }}>{item.kw}</div>
                        <div style={{ fontSize: '11px', color: 'var(--apple-text-secondary)' }}>{item.state}</div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#ff375f' }}>{item.impact}</span>
                    </div>
                  ))}
                </div>

                <button
                  id="trial-step3-next"
                  className="apple-btn apple-btn-primary"
                  onClick={() => setCurrentStep(4)}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: '14px' }}
                >
                  <Sparkles size={16} /> Run 1-Click gpt-5.6-sol Keyword Infusion
                </button>
              </AppleCard>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ACT 4: 1-CLICK KEYWORD INFUSION & 9X ODDS BREAKTHROUGH */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(48, 209, 88, 0.15)',
                  color: '#30d158',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '10px',
                }}
              >
                <TrendingUp size={14} /> 9x Round One Odds Breakthrough
              </div>
              <h2 className="headline-section" style={{ fontSize: '32px', marginBottom: '8px' }}>
                ATS Score Boosted: <span className="text-gradient-blue">48% → 94%</span>
              </h2>
              <p style={{ color: 'var(--apple-text-secondary)', fontSize: '15px' }}>
                Your bullets were reconstructed with STAR executive metrics without inflating your actual track record.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px' }}>
              <AppleCard elevated style={{ padding: '28px', textAlign: 'center' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--apple-text-secondary)', marginBottom: '14px' }}>
                  Post-Optimization ATS Match
                </h4>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <CircularGauge value={94} size={130} strokeWidth={11} color="#30d158" label="Elite Match" />
                </div>
                <div style={{ fontSize: '13px', color: '#30d158', fontWeight: 700, marginBottom: '6px' }}>
                  ✓ Top 1% Candidate Pool
                </div>
                <p style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>
                  Your chances of being invited for round-one interviews are now calculated at <strong>9x</strong> your baseline.
                </p>
              </AppleCard>

              <AppleCard style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--nxt-text-primary)', marginBottom: '14px' }}>
                  Before vs. After Executive Transformation
                </h4>

                <div style={{ marginBottom: '14px', padding: '12px', background: 'rgba(255, 55, 95, 0.08)', borderRadius: '10px', border: '1px solid rgba(255, 55, 95, 0.2)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#ff375f', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Generic Weak Bullet (ATS 48%)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>
                    "Managed team of developers, handled microservices, and helped improve cloud uptime for our SaaS platform."
                  </div>
                </div>

                <div style={{ marginBottom: '18px', padding: '14px', background: 'rgba(48, 209, 88, 0.08)', borderRadius: '10px', border: '1px solid rgba(48, 209, 88, 0.25)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#30d158', textTransform: 'uppercase', marginBottom: '4px' }}>
                    gpt-5.6-sol STAR Executive Bullet (ATS 94%)
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--nxt-text-primary)', fontWeight: 500, lineHeight: 1.5 }}>
                    "Spearheaded 16-engineer distributed team architecting cloud-native microservices with 99.99% enterprise SLA, slashing AWS infrastructure spend by 38% and accelerating deployment frequency by 4.2x."
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    className="apple-btn apple-btn-secondary"
                    onClick={() => setCurrentStep(3)}
                    style={{ fontSize: '12px', padding: '8px 14px' }}
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button
                    id="trial-step4-next"
                    className="apple-btn apple-btn-primary"
                    onClick={() => setCurrentStep(5)}
                    style={{ fontSize: '13px', padding: '10px 18px' }}
                  >
                    Unlock The 70% Hidden Market <ArrowRight size={14} />
                  </button>
                </div>
              </AppleCard>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ACT 5: THE "WIN METHOD" & 30-60-90 DAY STRATEGIC PROPOSAL */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(191, 90, 242, 0.15)',
                  color: '#bf5af2',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '10px',
                }}
              >
                <Award size={14} /> Act 5: Executive Breakthrough
              </div>
              <h2 className="headline-section" style={{ fontSize: '32px', marginBottom: '8px' }}>
                70% of Senior Roles Are Never Posted Online.
              </h2>
              <p style={{ color: 'var(--apple-text-secondary)', fontSize: '15px' }}>
                Stop applying as a commodity candidate. High-earning leaders pitch solutions directly to decision makers with a <strong>30-60-90 Day Strategic Action Plan</strong>.
              </p>
            </div>

            <AppleCard elevated style={{ padding: '32px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--nxt-text-primary)' }}>
                    Candidate Win Deck: {profile.desiredRole}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>
                    Generated by Career Copilot gpt-5.6-sol Engine for <strong>{profile.fullName}</strong>
                  </p>
                </div>
                <span className="apple-badge apple-badge-purple" style={{ fontSize: '12px' }}>
                  Target CTC: {profile.targetCtc}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#5ac8fa', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Days 1 — 30: Discovery & Audit
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', lineHeight: 1.5 }}>
                    Audit architecture bottlenecks, map team velocity against DORA metrics, identify top 3 high-cost cloud drain points.
                  </p>
                </div>

                <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#30d158', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Days 31 — 60: Execution & Velocity
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', lineHeight: 1.5 }}>
                    Roll out containerized CI/CD pipelines, institute async RFC review culture, reduce release cycle time by 40%.
                  </p>
                </div>

                <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#ff9f0a', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Days 61 — 90: Scaling & ROI
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', lineHeight: 1.5 }}>
                    Deliver 99.99% enterprise SLA, formalize mentorship programs for senior ICs, scale ARR capacity by 2.5x.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                <button
                  id="trial-finish-cockpit"
                  className="apple-btn apple-btn-primary"
                  onClick={() => onNavigate('dashboard')}
                  style={{ padding: '12px 24px', fontSize: '14px' }}
                >
                  <Zap size={16} /> Open Candidate Cockpit
                </button>
                <button
                  id="trial-finish-resume"
                  className="apple-btn apple-btn-secondary"
                  onClick={() => onNavigate('resume')}
                  style={{ padding: '12px 24px', fontSize: '14px' }}
                >
                  <FileCheck size={16} /> Edit in Resume Studio
                </button>
                <button
                  id="trial-finish-tools"
                  className="apple-btn apple-btn-secondary"
                  onClick={() => onNavigate('executive')}
                  style={{ padding: '12px 24px', fontSize: '14px' }}
                >
                  <Briefcase size={16} /> Executive Pitch & Salary Suite
                </button>
              </div>
            </AppleCard>
          </div>
        )}
      </div>

      {/* Cupertino Bottom Bar with Keyboard Hint */}
      <div
        style={{
          borderTop: '1px solid var(--apple-border)',
          padding: '16px 24px',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          className="apple-btn apple-btn-secondary"
          onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
          disabled={currentStep === 1}
          style={{ opacity: currentStep === 1 ? 0.4 : 1, fontSize: '13px' }}
        >
          <ArrowLeft size={14} /> Previous
        </button>

        <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Use the</span>
          <kbd style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid var(--apple-border)' }}>←</kbd>
          <kbd style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid var(--apple-border)' }}>→</kbd>
          <span>arrow keys to move forward or back</span>
        </div>

        <button
          className="apple-btn apple-btn-primary"
          onClick={() => (currentStep < 5 ? setCurrentStep(currentStep + 1) : onNavigate('dashboard'))}
          style={{ fontSize: '13px' }}
        >
          {currentStep < 5 ? 'Next' : 'Finish Simulator'} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default InteractiveTrialPage;
