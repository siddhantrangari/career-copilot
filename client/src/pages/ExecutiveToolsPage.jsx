import React, { useState } from 'react';
import { AppleCard } from '../components/ui/AppleCard';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { api } from '../services/api';
import { 
  DollarSign, Award, Users, Copy, Check, Sparkles, 
  Send, ShieldAlert, PhoneCall, Mail, Download, ChevronLeft, ChevronRight, FileText 
} from 'lucide-react';
import confetti from 'canvas-confetti';


export function ExecutiveToolsPage() {
  const [activeTab, setActiveTab] = useState('negotiator');
  const [copiedKey, setCopiedKey] = useState(null);

  // 1. Salary Negotiator State
  const [company, setCompany] = useState('Razorpay');
  const [role, setRole] = useState('Director of Engineering');
  const [currentCtc, setCurrentCtc] = useState('₹60L');
  const [offeredCtc, setOfferedCtc] = useState('₹82L');
  const [targetCtc, setTargetCtc] = useState('₹95L + Sign-on Bonus');
  const [objections, setObjections] = useState('HR states the ₹82L is at the top of their band grid.');
  const [negotiationResult, setNegotiationResult] = useState(null);
  const [loadingNegotiation, setLoadingNegotiation] = useState(false);

  // 2. 30-60-90 Pitcher State
  const [pitchCompany, setPitchCompany] = useState('Stripe');
  const [pitchRole, setPitchRole] = useState('Engineering Manager, Global Payments');
  const [targetProblem, setTargetProblem] = useState('Scaling payment gateway latency while complying with new central bank cross-border rules');
  const [pitchResult, setPitchResult] = useState(null);
  const [activePitchSlide, setActivePitchSlide] = useState(0);
  const [loadingPitch, setLoadingPitch] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('prefill_win_doc');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.company_name) setPitchCompany(parsed.company_name);
        if (parsed.job_title) setPitchRole(parsed.job_title);
        if (parsed.target_problem) setTargetProblem(parsed.target_problem);
        setActiveTab('pitcher');
        sessionStorage.removeItem('prefill_win_doc');
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, []);


  // 3. LinkedIn Networker State
  const [contactType, setContactType] = useState('Hiring Manager (VP/Director)');
  const [targetPerson, setTargetPerson] = useState('Vikram Sen');
  const [targetCompany, setTargetCompany] = useState('Atlassian');
  const [targetRole, setTargetRole] = useState('Principal System Architect');
  const [sharedContext, setSharedContext] = useState('Saw his recent keynote on micro-frontend resilience');
  const [networkResult, setNetworkResult] = useState(null);
  const [loadingNetwork, setLoadingNetwork] = useState(false);

  // 4. LinkedIn Influencer State
  const [postArchetype, setPostArchetype] = useState('Technical Architecture Teardown');
  const [postTopic, setPostTopic] = useState('How we reduced payment gateway P99 latency by 64% while scaling to 50k RPS');
  const [nicheDomain, setNicheDomain] = useState('Fintech & Distributed Systems');
  const [targetAudience, setTargetAudience] = useState('Engineering Directors & VP of Tech');
  const [influencerResult, setInfluencerResult] = useState(null);
  const [loadingInfluencer, setLoadingInfluencer] = useState(false);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateNegotiation = async () => {
    setLoadingNegotiation(true);
    try {
      const res = await api.generateSalaryStrategy({
        company,
        role,
        currentCtc,
        offeredCtc,
        targetCtc,
        objections,
      });
      setNegotiationResult(res);
      confetti({ particleCount: 50, spread: 60 });
    } catch (e) {
      alert('Negotiation Error: ' + e.message);
    } finally {
      setLoadingNegotiation(false);
    }
  };

  const handleGeneratePitch = async () => {
    setLoadingPitch(true);
    try {
      const res = await api.generatePitchDeck({
        company: pitchCompany,
        role: pitchRole,
        targetProblem,
      });
      setPitchResult(res);
      confetti({ particleCount: 50, spread: 60 });
    } catch (e) {
      alert('Pitch Error: ' + e.message);
    } finally {
      setLoadingPitch(false);
    }
  };

  const handleGenerateNetwork = async () => {
    setLoadingNetwork(true);
    try {
      const res = await api.generateLinkedInOutreach({
        contactType,
        targetPerson,
        targetCompany,
        targetRole,
        sharedContext,
      });
      setNetworkResult(res);
      confetti({ particleCount: 50, spread: 60 });
    } catch (e) {
      alert('Networker Error: ' + e.message);
    } finally {
      setLoadingNetwork(false);
    }
  };

  const handleGenerateInfluencer = async () => {
    setLoadingInfluencer(true);
    try {
      const res = await api.generateInfluencerPost({
        archetype: postArchetype,
        topic: postTopic,
        niche: nicheDomain,
        targetAudience,
      });
      setInfluencerResult(res);
      confetti({ particleCount: 50, spread: 60 });
    } catch (e) {
      alert('Influencer Error: ' + e.message);
    } finally {
      setLoadingInfluencer(false);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '36px 24px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="apple-badge apple-badge-amber">Closing Arsenal</span>
            <span style={{ fontSize: '13px', color: 'var(--apple-text-secondary)' }}>Powered by gpt-5.6-sol</span>
          </div>
          <h1 className="headline-section" style={{ color: 'var(--nxt-text-primary)' }}>
            Executive Career Suite
          </h1>
        </div>

        {/* Tab Segmented Control */}
        <SegmentedControl
          options={[
            { value: 'negotiator', label: '💰 Salary Negotiator' },
            { value: 'pitcher', label: '🎯 30-60-90 Pitcher' },
            { value: 'networker', label: '🤝 LinkedIn Networker' },
            { value: 'influencer', label: '🚀 LinkedIn Influencer' },
          ]}
          activeValue={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* TAB 1: SALARY NEGOTIATOR */}
      {activeTab === 'negotiator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '28px', alignItems: 'start' }}>
          <AppleCard style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: '16px' }}>
              Compensation Counter-Offer Parameters
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Target Company</label>
                <input className="apple-input" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Offered Role</label>
                <input className="apple-input" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Current CTC</label>
                <input className="apple-input" value={currentCtc} onChange={(e) => setCurrentCtc(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Offered CTC</label>
                <input className="apple-input" value={offeredCtc} onChange={(e) => setOfferedCtc(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Counter Target</label>
                <input className="apple-input" value={targetCtc} onChange={(e) => setTargetCtc(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>
                HR Pushback / Constraint:
              </label>
              <textarea
                className="apple-textarea"
                style={{ minHeight: '80px' }}
                value={objections}
                onChange={(e) => setObjections(e.target.value)}
              />
            </div>

            <button
              id="generate-negotiation-btn"
              className="apple-btn apple-btn-primary"
              style={{ width: '100%' }}
              onClick={handleGenerateNegotiation}
              disabled={loadingNegotiation}
            >
              {loadingNegotiation ? 'Formulating Strategy...' : 'Generate Negotiation Playbook'}
              <Sparkles size={16} />
            </button>
          </AppleCard>

          {/* Negotiation Output */}
          <div>
            {negotiationResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Email Script */}
                <AppleCard glow style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={16} color="var(--apple-blue)" />
                      <span style={{ fontWeight: 700, color: 'var(--nxt-text-primary)' }}>Formal Counter-Offer Email</span>
                    </div>
                    <button
                      className="apple-btn apple-btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => copyToClipboard(negotiationResult.email_script, 'email')}
                    >
                      {copiedKey === 'email' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'email' ? 'Copied' : 'Copy Email'}
                    </button>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.6, color: 'var(--nxt-text-primary)', background: 'var(--nxt-bg-surface-subtle)', padding: '16px', borderRadius: '8px', border: '1px solid var(--nxt-border-subtle)', fontFamily: 'inherit' }}>
                    {negotiationResult.email_script}
                  </pre>
                </AppleCard>

                {/* Phone Call Script */}
                <AppleCard style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PhoneCall size={16} color="var(--apple-emerald)" />
                      <span style={{ fontWeight: 700, color: 'var(--nxt-text-primary)' }}>Verbal Recruiter Call Script</span>
                    </div>
                    <button
                      className="apple-btn apple-btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => copyToClipboard(negotiationResult.phone_script, 'phone')}
                    >
                      {copiedKey === 'phone' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'phone' ? 'Copied' : 'Copy Points'}
                    </button>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.6, color: 'var(--nxt-text-primary)', background: 'var(--nxt-bg-surface-subtle)', padding: '16px', borderRadius: '8px', border: '1px solid var(--nxt-border-subtle)', fontFamily: 'inherit' }}>
                    {negotiationResult.phone_script}
                  </pre>
                </AppleCard>

                {/* Objection Handlers */}
                <AppleCard style={{ padding: '24px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: '12px' }}>
                    HR Objection Handling Tactics
                  </div>
                  {(negotiationResult.pushback_handlers || []).map((handler, hIdx) => (
                    <div key={hIdx} style={{ marginBottom: '12px', padding: '12px', borderRadius: '8px', background: 'var(--nxt-bg-surface-subtle)', border: '1px solid var(--nxt-border-subtle)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--nxt-badge-amber-text, #f59e0b)', marginBottom: '4px' }}>
                        If {handler.objection}:
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--nxt-text-primary)' }}>
                        "{handler.response}"
                      </div>
                    </div>
                  ))}
                </AppleCard>
              </div>
            ) : (
              <AppleCard style={{ padding: '48px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>
                <DollarSign size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--nxt-text-primary)', marginBottom: '6px' }}>
                  Negotiation Playbook Ready
                </div>
                <div style={{ fontSize: '13px', maxWidth: '320px', margin: '0 auto' }}>
                  Click "Generate Negotiation Playbook" to produce diplomatic counter-offer email scripts, verbal phone scripts, and objection handlers.
                </div>
              </AppleCard>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: 30-60-90 PITCHER */}
      {activeTab === 'pitcher' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '28px', alignItems: 'start' }}>
          <AppleCard style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: '16px' }}>
              30-60-90 Executive Win Deck Parameters
            </h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Target Company</label>
              <input className="apple-input" value={pitchCompany} onChange={(e) => setPitchCompany(e.target.value)} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Target Executive Role</label>
              <input className="apple-input" value={pitchRole} onChange={(e) => setPitchRole(e.target.value)} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>
                Primary 90-Day Mandate:
              </label>
              <textarea
                className="apple-textarea"
                style={{ minHeight: '90px' }}
                value={pitchChallenge}
                onChange={(e) => setPitchChallenge(e.target.value)}
              />
            </div>

            <button
              id="generate-pitch-btn"
              className="apple-btn apple-btn-primary"
              style={{ width: '100%' }}
              onClick={handleGeneratePitch}
              disabled={loadingPitch}
            >
              {loadingPitch ? 'Formulating 90-Day Strategy...' : 'Generate 30-60-90 Win Deck'}
              <Award size={16} />
            </button>
          </AppleCard>

          {/* Pitch Output */}
          <div>
            {pitchResult ? (
              <AppleCard glow style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span className="apple-badge apple-badge-purple">5-Slide WIN Document</span>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginTop: '4px' }}>
                      {pitchResult.deck_title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      id="copy-win-deck-md-btn"
                      className="apple-btn apple-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => {
                        const slides = pitchResult.slides || [];
                        const fullMd = `# ${pitchResult.deck_title}\n\n` +
                          `**Company:** ${pitchCompany} | **Role:** ${pitchRole}\n\n` +
                          `### Executive Summary\n${pitchResult.executive_summary || ''}\n\n` +
                          (slides.length > 0 ? slides.map(s => `## Slide ${s.slide_number}: ${s.title}\n*${s.subtitle || ''}*\n\n` +
                            (s.key_points || []).map(p => `- ${p}`).join('\n') + '\n\n' +
                            (s.deliverables ? `**Deliverables:**\n` + s.deliverables.map(d => `- ${d}`).join('\n') + '\n\n' : '') +
                            (s.milestone ? `**Milestone:** ${s.milestone}\n\n` : '') +
                            (s.business_roi ? `**Expected ROI:** ${s.business_roi}\n\n` : '')
                          ).join('\n---\n\n') : JSON.stringify(pitchResult, null, 2));

                        copyToClipboard(fullMd, 'pitch_deck');
                      }}
                    >
                      {copiedKey === 'pitch_deck' ? <Check size={12} color="#32d74b" /> : <Copy size={12} />}
                      {copiedKey === 'pitch_deck' ? 'Copied Deck' : 'Copy Full Deck'}
                    </button>

                    <button
                      id="download-win-deck-btn"
                      className="apple-btn apple-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => {
                        const slides = pitchResult.slides || [];
                        const fullMd = `# ${pitchResult.deck_title}\n\n` +
                          `**Company:** ${pitchCompany} | **Role:** ${pitchRole}\n\n` +
                          `### Executive Summary\n${pitchResult.executive_summary || ''}\n\n` +
                          (slides.length > 0 ? slides.map(s => `## Slide ${s.slide_number}: ${s.title}\n*${s.subtitle || ''}*\n\n` +
                            (s.key_points || []).map(p => `- ${p}`).join('\n') + '\n\n' +
                            (s.deliverables ? `**Deliverables:**\n` + s.deliverables.map(d => `- ${d}`).join('\n') + '\n\n' : '') +
                            (s.milestone ? `**Milestone:** ${s.milestone}\n\n` : '') +
                            (s.business_roi ? `**Expected ROI:** ${s.business_roi}\n\n` : '')
                          ).join('\n---\n\n') : JSON.stringify(pitchResult, null, 2));

                        const el = document.createElement('a');
                        const file = new Blob([fullMd], { type: 'text/markdown;charset=utf-8' });
                        el.href = URL.createObjectURL(file);
                        el.download = `Executive_WIN_Deck_${pitchCompany || 'Strategy'}.md`;
                        document.body.appendChild(el);
                        el.click();
                        document.body.removeChild(el);
                      }}
                    >
                      <Download size={12} />
                      Download .md
                    </button>
                  </div>
                </div>

                {/* Slide Selection Pills */}
                {pitchResult.slides && pitchResult.slides.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {pitchResult.slides.map((s, idx) => (
                      <button
                        key={idx}
                        id={`slide-tab-${idx}`}
                        className="apple-btn"
                        style={{
                          padding: '5px 12px',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: activePitchSlide === idx ? 'var(--nxt-accent-blue)' : 'var(--nxt-bg-surface-subtle)',
                          border: activePitchSlide === idx ? '1px solid var(--nxt-accent-blue)' : '1px solid var(--nxt-border-subtle)',
                          color: activePitchSlide === idx ? '#ffffff' : 'var(--nxt-text-secondary)',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => setActivePitchSlide(idx)}
                      >
                        Slide {s.slide_number}: {s.title.split(':')[0]}
                      </button>
                    ))}
                  </div>
                )}

                {/* Active Slide Presentation Canvas */}
                {pitchResult.slides && pitchResult.slides[activePitchSlide] ? (
                  (() => {
                    const currentSlide = pitchResult.slides[activePitchSlide];
                    return (
                      <div style={{
                        background: 'var(--nxt-bg-surface-subtle)',
                        border: '1px solid var(--nxt-border-subtle)',
                        borderRadius: '16px',
                        padding: '24px',
                        marginBottom: '18px',
                        boxShadow: 'var(--nxt-shadow-sm)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span className="apple-badge apple-badge-purple" style={{ fontSize: '11px' }}>
                            Slide {currentSlide.slide_number} of {pitchResult.slides.length}
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              id="prev-slide-btn"
                              className="apple-btn apple-btn-secondary"
                              style={{ padding: '4px 8px' }}
                              disabled={activePitchSlide === 0}
                              onClick={() => setActivePitchSlide(prev => Math.max(0, prev - 1))}
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button
                              id="next-slide-btn"
                              className="apple-btn apple-btn-secondary"
                              style={{ padding: '4px 8px' }}
                              disabled={activePitchSlide === pitchResult.slides.length - 1}
                              onClick={() => setActivePitchSlide(prev => Math.min(pitchResult.slides.length - 1, prev + 1))}
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>

                        <h4 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--nxt-text-primary)', marginBottom: '4px' }}>
                          {currentSlide.title}
                        </h4>
                        {currentSlide.subtitle && (
                          <div style={{ fontSize: '12px', color: 'var(--nxt-text-secondary)', fontStyle: 'italic', marginBottom: '14px' }}>
                            {currentSlide.subtitle}
                          </div>
                        )}

                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--nxt-accent-blue)', marginBottom: '6px' }}>
                          Core Strategic Initiatives & Action Plan:
                        </div>
                        <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--nxt-text-primary)', lineHeight: 1.6, marginBottom: '12px' }}>
                          {(currentSlide.key_points || []).map((pt, pIdx) => (
                            <li key={pIdx} style={{ marginBottom: '6px' }}>{pt}</li>
                          ))}
                        </ul>

                        {currentSlide.deliverables && currentSlide.deliverables.length > 0 && (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--nxt-border-subtle)' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--nxt-badge-emerald-text, #10b981)', marginBottom: '6px' }}>
                              Tangible Phase Deliverables:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {currentSlide.deliverables.map((del, dIdx) => (
                                <span key={dIdx} className="apple-badge apple-badge-emerald" style={{ fontSize: '11px' }}>
                                  ✓ {del}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {currentSlide.okrs && (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--nxt-border-subtle)' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--nxt-badge-amber-text, #f59e0b)', marginBottom: '6px' }}>
                              Measurable 90-Day OKRs:
                            </div>
                            {currentSlide.okrs.map((okr, oIdx) => (
                              <div key={oIdx} style={{ fontSize: '12px', color: 'var(--nxt-text-primary)', marginBottom: '4px' }}>
                                <strong>{okr.objective}:</strong> {(okr.key_results || []).join(' · ')}
                              </div>
                            ))}
                          </div>
                        )}

                        {currentSlide.milestone && (
                          <div style={{ fontSize: '12px', color: 'var(--nxt-badge-emerald-text, #10b981)', marginTop: '12px', background: 'var(--nxt-badge-emerald-bg, rgba(16,185,129,0.1))', padding: '8px 12px', borderRadius: '8px' }}>
                            🎯 <strong>Milestone Target:</strong> {currentSlide.milestone}
                          </div>
                        )}

                        {currentSlide.business_roi && (
                          <div style={{ fontSize: '12px', color: 'var(--nxt-badge-amber-text, #f59e0b)', marginTop: '8px', background: 'var(--nxt-badge-amber-bg, rgba(245,158,11,0.1))', padding: '8px 12px', borderRadius: '8px' }}>
                            💰 <strong>Expected Financial/Technical ROI:</strong> {currentSlide.business_roi}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  /* Fallback if slides array is not present */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ background: 'var(--nxt-bg-surface-subtle)', padding: '16px', borderRadius: '10px', border: '1px solid var(--nxt-border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span className="apple-badge apple-badge-blue">Days 1 - 30</span>
                        <span style={{ fontWeight: 700, color: 'var(--nxt-text-primary)' }}>{pitchResult.first_30_days?.theme}</span>
                      </div>
                      <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--nxt-text-primary)', lineHeight: 1.5 }}>
                        {(pitchResult.first_30_days?.initiatives || []).map((init, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>{init}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '12px', color: 'var(--nxt-text-secondary)', fontStyle: 'italic', borderTop: '1px solid var(--nxt-border-subtle)', paddingTop: '10px' }}>
                  🎯 <strong>Interview Moat:</strong> {pitchResult.competitive_moat}
                </div>
              </AppleCard>
            ) : (
              <AppleCard style={{ padding: '48px', textAlign: 'center', color: 'var(--nxt-text-secondary)' }}>
                <Award size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--nxt-text-primary)', marginBottom: '6px' }}>
                  Executive WIN Document Generator
                </div>
                <div style={{ fontSize: '13px', maxWidth: '340px', margin: '0 auto' }}>
                  Click "Generate 30-60-90 Win Deck" to create an executive 5-slide onboarding blueprint proving Day-1 leadership readiness.
                </div>
              </AppleCard>
            )}
          </div>
        </div>
      )}


      {/* TAB 3: LINKEDIN NETWORKER */}
      {activeTab === 'networker' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '28px', alignItems: 'start' }}>
          <AppleCard style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: '16px' }}>
              Executive Outreach Generator
            </h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Recipient Persona</label>
              <select className="apple-input" value={contactType} onChange={(e) => setContactType(e.target.value)}>
                <option value="Hiring Manager (VP/Director)">Hiring Manager (VP/Director)</option>
                <option value="Executive Recruiter / Talent Lead">Executive Recruiter / Talent Lead</option>
                <option value="Alumni / Peer Engineering Lead">Alumni / Peer Engineering Lead</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Target Person Name</label>
                <input className="apple-input" value={targetPerson} onChange={(e) => setTargetPerson(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Company</label>
                <input className="apple-input" value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Role of Interest</label>
              <input className="apple-input" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Shared Context / Hook</label>
              <textarea
                className="apple-textarea"
                style={{ minHeight: '70px' }}
                value={sharedContext}
                onChange={(e) => setSharedContext(e.target.value)}
              />
            </div>

            <button
              id="generate-network-btn"
              className="apple-btn apple-btn-primary"
              style={{ width: '100%' }}
              onClick={handleGenerateNetwork}
              disabled={loadingNetwork}
            >
              {loadingNetwork ? 'Drafting High-Reply Messages...' : 'Generate InMail & Connection Notes'}
              <Users size={16} />
            </button>
          </AppleCard>

          {/* Networker Output */}
          <div>
            {networkResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Connection Note */}
                <AppleCard glow style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--nxt-text-primary)', fontSize: '14px' }}>
                      Connection Note (&lt;300 Characters)
                    </div>
                    <button
                      className="apple-btn apple-btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => copyToClipboard(networkResult.connection_note, 'conn')}
                    >
                      {copiedKey === 'conn' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'conn' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ background: 'var(--nxt-bg-surface-subtle)', padding: '14px', borderRadius: '8px', fontSize: '13px', color: 'var(--nxt-text-primary)', border: '1px solid var(--nxt-border-subtle)' }}>
                    "{networkResult.connection_note}"
                  </div>
                </AppleCard>

                {/* InMail Message */}
                <AppleCard style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--nxt-text-primary)', fontSize: '14px' }}>
                      Full InMail / Direct Outreach Message
                    </div>
                    <button
                      className="apple-btn apple-btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => copyToClipboard(networkResult.inmail_message, 'inmail')}
                    >
                      {copiedKey === 'inmail' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'inmail' ? 'Copied' : 'Copy InMail'}
                    </button>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.6, color: 'var(--nxt-text-primary)', background: 'var(--nxt-bg-surface-subtle)', padding: '16px', borderRadius: '8px', border: '1px solid var(--nxt-border-subtle)', fontFamily: 'inherit' }}>
                    {networkResult.inmail_message}
                  </pre>
                </AppleCard>

                {/* Follow Up */}
                <AppleCard style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--nxt-text-primary)', fontSize: '14px' }}>
                      5-Day Gentle Follow-Up Message
                    </div>
                    <button
                      className="apple-btn apple-btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => copyToClipboard(networkResult.follow_up_message, 'follow')}
                    >
                      {copiedKey === 'follow' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'follow' ? 'Copied' : 'Copy Bump'}
                    </button>
                  </div>
                  <div style={{ background: 'var(--nxt-bg-surface-subtle)', padding: '14px', borderRadius: '8px', fontSize: '13px', color: 'var(--nxt-text-primary)', border: '1px solid var(--nxt-border-subtle)' }}>
                    "{networkResult.follow_up_message}"
                  </div>
                </AppleCard>
              </div>
            ) : (
              <AppleCard style={{ padding: '48px', textAlign: 'center', color: 'var(--nxt-text-secondary)' }}>
                <Users size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--nxt-text-primary)', marginBottom: '6px' }}>
                  Executive InMail Generator Ready
                </div>
                <div style={{ fontSize: '13px', maxWidth: '320px', margin: '0 auto' }}>
                  Draft peer-to-peer connection requests and recruiter outreach messages with an average 65% response rate.
                </div>
              </AppleCard>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: LINKEDIN INFLUENCER */}
      {activeTab === 'influencer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '28px', alignItems: 'start' }}>
          <AppleCard style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: '16px' }}>
              LinkedIn Thought Leadership Parameters
            </h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>
                Content Archetype
              </label>
              <select
                className="apple-input"
                value={postArchetype}
                onChange={(e) => setPostArchetype(e.target.value)}
              >
                <option value="Architectural Breakdown">Architectural Breakdown (Teardown deep-dive)</option>
                <option value="Zero-to-One Scalability Lesson">Zero-to-One Scalability Lesson (War story)</option>
                <option value="Contrarian Engineering Opinion">Contrarian Engineering Opinion (Hook + Proof)</option>
                <option value="Executive Career Playbook">Executive Career Playbook (Hiring / Leadership framework)</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>
                Core Engineering Topic / Breakthrough
              </label>
              <input
                className="apple-input"
                value={coreTopic}
                onChange={(e) => setCoreTopic(e.target.value)}
                placeholder="e.g., Scaling Postgres to 100k QPS without sharding"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>
                Personal Anecdote or Technical Nuance (Optional)
              </label>
              <textarea
                className="apple-textarea"
                style={{ minHeight: '80px' }}
                value={keyTakeaway}
                onChange={(e) => setKeyTakeaway(e.target.value)}
                placeholder="e.g., We shaved latency by 60% by switching from JSON payload to Protocol Buffers..."
              />
            </div>

            <button
              id="generate-influencer-btn"
              className="apple-btn apple-btn-primary"
              style={{ width: '100%' }}
              onClick={handleGenerateInfluencer}
              disabled={loadingInfluencer}
            >
              {loadingInfluencer ? 'Drafting Viral Thought Leadership...' : 'Generate Authority Post & Carousel'}
              <Sparkles size={16} />
            </button>
          </AppleCard>

          {/* Influencer Output */}
          <div>
            {influencerResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Main Post Body */}
                <AppleCard glow style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Award size={16} color="var(--apple-teal)" />
                      <span style={{ fontWeight: 700, color: 'var(--nxt-text-primary)' }}>LinkedIn Authority Post (Copy-Ready)</span>
                    </div>
                    <button
                      className="apple-btn apple-btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => copyToClipboard(influencerResult.full_post, 'influencer_post')}
                    >
                      {copiedKey === 'influencer_post' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'influencer_post' ? 'Copied' : 'Copy Full Post'}
                    </button>
                  </div>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontSize: '13px',
                      lineHeight: 1.6,
                      color: 'var(--nxt-text-primary)',
                      background: 'var(--nxt-bg-surface-subtle)',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid var(--nxt-border-subtle)',
                      fontFamily: 'inherit',
                    }}
                  >
                    {influencerResult.full_post}
                  </pre>
                </AppleCard>

                {/* Carousel Slides Outline if present */}
                {influencerResult.carousel_slides && (
                  <AppleCard style={{ padding: '24px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--nxt-text-primary)', fontSize: '14px', marginBottom: '12px' }}>
                      📑 5-Slide Visual Carousel Deck
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      {influencerResult.carousel_slides.map((slide, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--nxt-bg-surface-subtle)',
                            padding: '14px',
                            borderRadius: '8px',
                            border: '1px solid var(--nxt-border-subtle)',
                          }}
                        >
                          <div style={{ fontSize: '11px', color: 'var(--nxt-accent-blue)', fontWeight: 700, marginBottom: '4px' }}>
                            SLIDE {idx + 1}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--nxt-text-primary)', marginBottom: '4px' }}>
                            {slide.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--nxt-text-secondary)', lineHeight: 1.4 }}>
                            {slide.body}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AppleCard>
                )}
              </div>
            ) : (
              <AppleCard style={{ padding: '48px', textAlign: 'center', color: 'var(--nxt-text-secondary)' }}>
                <Award size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--nxt-text-primary)', marginBottom: '6px' }}>
                  LinkedIn Inbound Magnet Ready
                </div>
                <div style={{ fontSize: '13px', maxWidth: '340px', margin: '0 auto' }}>
                  Generate viral architectural teardowns, leadership lessons, and visual carousels to attract inbound recruiter DMs.
                </div>
              </AppleCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
