import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import { 
  Upload, Link2, User, Sparkles, ArrowRight, 
  CheckCircle2, AlertCircle, FileText, Linkedin,
  ChevronRight, Loader2, X, Zap, ArrowLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';

const STEPS = ['Choose Method', 'LinkedIn Input', 'Review Profile', 'Your Goals', 'Done'];

export function ProfileSetupPage({ onComplete, onClose }) {
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState(null); // 'pdf' | 'linkedin' | 'manual'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const fileInputRef = useRef(null);

  // Step 2 form fields (pre-filled from parse or manual)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', location: '',
    linkedin_url: '', portfolio_url: '',
    current_role: '', summary: '',
    skills: '',
    exp_company: '', exp_role: '', exp_duration: '', exp_bullets: '',
    linkedin_text: '',
  });

  // Step 3 goal fields
  const [goals, setGoals] = useState({
    target_role: 'AI Engineer / Tech Lead',
    target_ctc: '$140k - $200k / ₹75L - ₹95L',
    target_companies: 'Granola, Stripe, OpenAI, Anthropic',
    job_search_status: 'actively_looking',
  });

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const g = (k) => (e) => setGoals(p => ({ ...p, [k]: e.target.value }));

  // ── PDF Upload with Immediate Auto-Save ──────────────────────────────
  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.uploadResumePdf(file);
      populateForm(data);
      setParsedData(data);
      
      // Immediately persist to database so resume is never lost
      await api.updateMasterResume({
        ...data,
        is_profile_setup: true
      });

      confetti({ particleCount: 40, spread: 50 });
      setStep(2); // Move to review step
    } catch (e) {
      setError(e.message || 'Failed to parse PDF. Try manual entry or paste your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedInUrl = async () => {
    if (!form.linkedin_url && !form.linkedin_text) {
      setError('Please enter your LinkedIn profile URL or paste your bio/about text.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.parseLinkedInProfile({
        linkedin_url: form.linkedin_url,
        linkedin_text: form.linkedin_text
      });
      populateForm(data);
      setParsedData(data);

      // Auto-save immediately
      await api.updateMasterResume({
        ...data,
        is_profile_setup: true
      });

      confetti({ particleCount: 40, spread: 50 });
      setStep(2);
    } catch (e) {
      setError('Could not parse LinkedIn profile. Please fill manually.');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    const sample = {
      full_name: 'Siddhant Rangari',
      email: 'siddhant@example.com',
      phone: '+91 98765 43210',
      location: 'Bengaluru, India / Remote',
      linkedin_url: 'https://linkedin.com/in/siddhantrangari',
      portfolio_url: 'https://github.com/siddhantrangari',
      current_role: 'AI Engineer & Full-Stack Architect',
      summary: 'High-craft software engineer and AI builder specializing in LLM systems, full-stack architecture, low-latency streaming applications, and distributed backend infrastructure.',
      skills: 'Python, TypeScript, React, Next.js, Node.js, PyTorch, LLMs, LangChain, PostgreSQL, Docker, AWS',
      exp_company: 'Tech Scale Innovations',
      exp_role: 'Lead AI Engineer',
      exp_duration: '2023 - Present',
      exp_bullets: 'Architected streaming LLM pipelines processing 2M+ tokens daily with <120ms latency.\nLed cross-functional team of 8 engineers building generative AI tools and executive workflows.'
    };

    setForm(sample);
    setParsedData(sample);
    setLoading(true);
    try {
      await api.updateMasterResume({
        ...sample,
        skills: sample.skills.split(',').map(s => s.trim()),
        experiences: [{
          company: sample.exp_company,
          role: sample.exp_role,
          duration: sample.exp_duration,
          bullets: sample.exp_bullets.split('\n')
        }],
        is_profile_setup: true
      });
      confetti({ particleCount: 50, spread: 60 });
      setStep(2);
    } catch (e) {
      setError('Error loading sample: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data) => {
    setForm({
      full_name: data.full_name || '',
      email: data.email || '',
      phone: data.phone || '',
      location: data.location || '',
      linkedin_url: data.linkedin_url || '',
      portfolio_url: data.portfolio_url || '',
      current_role: data.current_role || '',
      summary: data.summary || '',
      skills: Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || ''),
      exp_company: data.experiences?.[0]?.company || '',
      exp_role: data.experiences?.[0]?.role || '',
      exp_duration: data.experiences?.[0]?.duration || '',
      exp_bullets: data.experiences?.[0]?.bullets?.join('\n') || '',
    });
    if (data.target_role) setGoals(p => ({ ...p, target_role: data.target_role }));
  };

  // ── Final Save ───────────────────────────────────────────────────────
  const handleFinish = async () => {
    if (!form.full_name.trim()) { setError('Your name is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const skillsArr = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      const experiences = form.exp_company ? [{
        company: form.exp_company,
        role: form.exp_role,
        duration: form.exp_duration,
        location: form.location,
        bullets: form.exp_bullets.split('\n').map(b => b.trim()).filter(Boolean)
      }] : (parsedData?.experiences || []);

      await api.updateMasterResume({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        location: form.location,
        linkedin_url: form.linkedin_url,
        portfolio_url: form.portfolio_url,
        current_role: form.current_role,
        target_role: goals.target_role,
        target_ctc: goals.target_ctc,
        summary: form.summary,
        skills: skillsArr,
        experiences,
        education: parsedData?.education || [],
        is_profile_setup: true,
      });
      setStep(4);
      confetti({ particleCount: 70, spread: 70 });
      setTimeout(() => onComplete?.(), 1500);
    } catch (e) {
      setError(e.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (onClose) onClose();
    else if (onComplete) onComplete();
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal} className="animate-scale-in">
        {/* Header with Close / Dismiss Button */}
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={s.logoMark}>
              <Sparkles size={18} color="#0a84ff" />
            </div>
            <div>
              <div style={s.title}>Career Copilot Setup</div>
              <div style={s.subtitle}>Powered by gpt-5.6-sol · career.myagentfirm.com</div>
            </div>
          </div>

          <button
            id="close-setup-wizard-btn"
            onClick={handleSkip}
            style={s.closeBtn}
            title="Skip & Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step Dots */}
        <div style={s.dotsRow}>
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div style={{ ...s.dot, ...(i <= step ? s.dotActive : {}) }}>
                {i < step ? <CheckCircle2 size={13} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ ...s.dotLine, ...(i < step ? s.dotLineDone : {}) }} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={s.stepLabel}>{STEPS[Math.min(step, STEPS.length - 1)]}</div>

        {error && (
          <div style={s.errorBox}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* ── STEP 0: Choose method ─────────────────────────── */}
        {step === 0 && (
          <div style={s.body}>
            <p style={s.leadText}>
              Let's set up your master profile so every AI agent and career tool works for <em>you</em>.
              <br />How would you like to import your background?
            </p>
            <div style={s.methodGrid}>
              <button id="setup-pdf-btn" style={s.methodCard} onClick={() => { setMethod('pdf'); fileInputRef.current?.click(); }}>
                <FileText size={28} color="#0a84ff" />
                <div style={s.methodTitle}>Upload Resume PDF</div>
                <div style={s.methodDesc}>AI extracts your details automatically</div>
                <div style={s.methodBadge}>Recommended</div>
              </button>
              <button id="setup-linkedin-btn" style={s.methodCard} onClick={() => { setMethod('linkedin'); setStep(1); }}>
                <Linkedin size={28} color="#5ac8fa" />
                <div style={s.methodTitle}>LinkedIn URL</div>
                <div style={s.methodDesc}>Paste your profile link</div>
              </button>
              <button id="setup-manual-btn" style={s.methodCard} onClick={() => { setMethod('manual'); setStep(2); }}>
                <User size={28} color="#bf5af2" />
                <div style={s.methodTitle}>Fill Manually</div>
                <div style={s.methodDesc}>Type in your details</div>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />

            {loading && (
              <div style={s.loadingState}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} color="#0a84ff" />
                <span>Parsing and permanently saving your resume with AI…</span>
              </div>
            )}

            {/* Quick Demo Fill & Skip Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                id="load-sample-profile-btn"
                type="button"
                onClick={handleLoadSample}
                className="apple-btn"
                style={{
                  fontSize: '12px',
                  padding: '7px 12px',
                  background: 'rgba(255,214,10,0.12)',
                  border: '1px solid rgba(255,214,10,0.3)',
                  color: '#ffd60a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '10px'
                }}
              >
                <Zap size={14} />
                ⚡ Load Sample Profile
              </button>

              <button
                id="skip-setup-btn"
                type="button"
                onClick={handleSkip}
                className="apple-btn apple-btn-ghost"
                style={{ fontSize: '13px', color: 'var(--apple-text-secondary)' }}
              >
                Skip for Now & Explore Cockpit →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 1: LinkedIn URL & Bio input ────────────────────── */}
        {step === 1 && (
          <div style={s.body}>
            <p style={s.leadText}>Enter your LinkedIn Profile URL and/or paste your profile bio:</p>
            <div className="apple-field" style={{ marginBottom: 14 }}>
              <label className="apple-label">LinkedIn Profile URL</label>
              <input
                id="li-url-input"
                className="apple-input"
                placeholder="https://linkedin.com/in/your-name"
                value={form.linkedin_url}
                onChange={f('linkedin_url')}
              />
            </div>
            <div className="apple-field" style={{ marginBottom: 16 }}>
              <label className="apple-label">About / Experience Bio Snippet (Optional - for instant AI auto-fill)</label>
              <textarea
                id="li-bio-input"
                className="apple-textarea"
                rows={4}
                placeholder="Paste your LinkedIn About section, current headline, or key highlights here to let AI extract all skills & experiences automatically..."
                value={form.linkedin_text}
                onChange={f('linkedin_text')}
              />
            </div>
            <p style={s.noteText}>
              ✨ AI will synthesize your role, domain skills, and background to automatically populate your career profile.
            </p>
            <div style={s.btnRow}>
              <button id="back-btn-step1" className="apple-btn apple-btn-secondary" onClick={() => setStep(0)}>
                <ArrowLeft size={14} /> Back
              </button>
              <button id="li-continue-btn" className="apple-btn apple-btn-primary" onClick={handleLinkedInUrl} disabled={loading}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
                Extract Profile with AI
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Review & Fill ─────────────────────────── */}
        {step === 2 && (
          <div style={s.body}>
            {parsedData && (
              <div style={s.successNote}>
                <CheckCircle2 size={14} color="#32d74b" />
                AI extracted and permanently saved your profile to the database. Review or edit below.
              </div>
            )}
            <div style={s.twoCol}>
              <div className="apple-field">
                <label className="apple-label">Full Name *</label>
                <input id="name-input" className="apple-input" placeholder="Your full name" value={form.full_name} onChange={f('full_name')} />
              </div>
              <div className="apple-field">
                <label className="apple-label">Current Role</label>
                <input id="role-input" className="apple-input" placeholder="e.g. Senior Software Engineer" value={form.current_role} onChange={f('current_role')} />
              </div>
              <div className="apple-field">
                <label className="apple-label">Email</label>
                <input id="email-input" className="apple-input" type="email" placeholder="you@email.com" value={form.email} onChange={f('email')} />
              </div>
              <div className="apple-field">
                <label className="apple-label">Location</label>
                <input id="location-input" className="apple-input" placeholder="e.g. Bengaluru, India" value={form.location} onChange={f('location')} />
              </div>
            </div>
            <div className="apple-field" style={{ marginTop: 12 }}>
              <label className="apple-label">Professional Summary (2-3 sentences)</label>
              <textarea id="summary-input" className="apple-textarea" rows={3} placeholder="Describe your background and expertise…" value={form.summary} onChange={f('summary')} />
            </div>
            <div className="apple-field" style={{ marginTop: 12 }}>
              <label className="apple-label">Top Skills (comma-separated)</label>
              <input id="skills-input" className="apple-input" placeholder="React, Node.js, System Design, AWS, Leadership…" value={form.skills} onChange={f('skills')} />
            </div>
            <div style={s.expSection}>
              <div style={s.expTitle}>Most Recent Experience</div>
              <div style={s.twoCol}>
                <div className="apple-field">
                  <label className="apple-label">Company</label>
                  <input id="exp-company-input" className="apple-input" placeholder="Company name" value={form.exp_company} onChange={f('exp_company')} />
                </div>
                <div className="apple-field">
                  <label className="apple-label">Job Title / Role</label>
                  <input id="exp-role-input" className="apple-input" placeholder="e.g. Lead Engineer" value={form.exp_role} onChange={f('exp_role')} />
                </div>
              </div>
              <div className="apple-field" style={{ marginTop: 10 }}>
                <label className="apple-label">Key Bullets / Achievements (one per line)</label>
                <textarea
                  id="exp-bullets-input"
                  className="apple-textarea"
                  rows={3}
                  placeholder="• Scaled backend throughput by 4x using Redis caching&#10;• Led migration from monolith to microservices"
                  value={form.exp_bullets}
                  onChange={f('exp_bullets')}
                />
              </div>
            </div>

            <div style={s.btnRow}>
              <button id="back-btn-step2" className="apple-btn apple-btn-secondary" onClick={() => setStep(0)}>
                <ArrowLeft size={14} /> Back
              </button>
              <button id="step2-continue-btn" className="apple-btn apple-btn-primary" onClick={() => setStep(3)}>
                Next: Your Goals <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Goals ─────────────────────────────────── */}
        {step === 3 && (
          <div style={s.body}>
            <p style={s.leadText}>Set your target role and salary expectations so Nova Copilot tailors all recommendations:</p>
            <div className="apple-field" style={{ marginBottom: 14 }}>
              <label className="apple-label">Target Dream Role</label>
              <input id="target-role-input" className="apple-input" placeholder="e.g. Director of Engineering / Staff AI Engineer" value={goals.target_role} onChange={g('target_role')} />
            </div>
            <div className="apple-field" style={{ marginBottom: 14 }}>
              <label className="apple-label">Target Compensation Band</label>
              <input id="target-ctc-input" className="apple-input" placeholder="e.g. $140k - $200k + Equity / ₹75L - ₹95L" value={goals.target_ctc} onChange={g('target_ctc')} />
            </div>
            <div className="apple-field" style={{ marginBottom: 20 }}>
              <label className="apple-label">Target Companies (comma-separated)</label>
              <input id="target-companies-input" className="apple-input" placeholder="e.g. Granola, Stripe, Razorpay, OpenAI" value={goals.target_companies} onChange={g('target_companies')} />
            </div>

            <div style={s.btnRow}>
              <button id="back-btn-step3" className="apple-btn apple-btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={14} /> Back
              </button>
              <button id="finish-btn" className="apple-btn apple-btn-primary" onClick={handleFinish} disabled={loading}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
                Save Profile & Launch Cockpit
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Success ───────────────────────────────── */}
        {step === 4 && (
          <div style={s.successScreen}>
            <div style={s.successIcon}>🎯</div>
            <div style={s.successTitle}>You're all set, {form.full_name.split(' ')[0]}!</div>
            <div style={s.successSub}>
              Your profile is permanently saved in the database. All AI agents and target roles are now personalized for you.
            </div>
            <div style={s.successBadge}>
              <div className="live-dot" />
              Launching Career Cockpit…
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    zIndex: 2000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modal: {
    background: 'rgba(12,14,22,0.96)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 28,
    width: '100%', maxWidth: 620,
    maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)',
    padding: '32px 36px',
    position: 'relative'
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  closeBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '50%',
    width: 32, height: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#8e8e93', cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  logoMark: {
    width: 40, height: 40, borderRadius: 12,
    background: 'rgba(10,132,255,0.12)',
    border: '1px solid rgba(10,132,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#f5f5f7' },
  subtitle: { fontSize: 12, color: '#636366', marginTop: 2 },
  dotsRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 },
  dot: {
    width: 26, height: 26, borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, color: '#636366',
    transition: 'all 0.3s',
  },
  dotActive: { background: 'rgba(10,132,255,0.2)', borderColor: '#0a84ff', color: '#0a84ff' },
  dotLine: { flex: 1, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1 },
  dotLineDone: { background: '#0a84ff' },
  stepLabel: { fontSize: 12, color: '#636366', marginBottom: 24, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(255,55,95,0.1)', border: '1px solid rgba(255,55,95,0.25)',
    borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ff375f',
    marginBottom: 16,
  },
  body: {},
  leadText: { fontSize: 14, color: '#8e8e93', lineHeight: 1.6, marginBottom: 24 },
  methodGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
  methodCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '20px 14px',
    textAlign: 'center', cursor: 'pointer',
    transition: 'all 0.2s', position: 'relative',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    fontFamily: 'inherit',
  },
  methodTitle: { fontSize: 14, fontWeight: 700, color: '#f5f5f7' },
  methodDesc: { fontSize: 12, color: '#636366', lineHeight: 1.4 },
  methodBadge: {
    position: 'absolute', top: 10, right: 10,
    background: 'rgba(10,132,255,0.15)',
    border: '1px solid rgba(10,132,255,0.3)',
    borderRadius: 6, padding: '2px 7px',
    fontSize: 10, fontWeight: 700, color: '#5ac8fa',
  },
  loadingState: {
    display: 'flex', alignItems: 'center', gap: 10,
    color: '#8e8e93', fontSize: 13, justifyContent: 'center', padding: '16px 0',
  },
  noteText: { fontSize: 12, color: '#636366', marginBottom: 20, lineHeight: 1.6 },
  btnRow: { display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  successNote: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(50,215,75,0.08)', border: '1px solid rgba(50,215,75,0.2)',
    borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#32d74b',
    marginBottom: 20,
  },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  expSection: {
    marginTop: 20, padding: '16px', borderRadius: 12,
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
  },
  expTitle: { fontSize: 12, fontWeight: 700, color: '#636366', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12 },
  successScreen: { textAlign: 'center', padding: '20px 0 10px' },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: '#f5f5f7', marginBottom: 10 },
  successSub: { fontSize: 14, color: '#8e8e93', marginBottom: 24 },
  successBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(50,215,75,0.1)', border: '1px solid rgba(50,215,75,0.25)',
    borderRadius: 20, padding: '8px 18px', fontSize: 13, color: '#32d74b', fontWeight: 600,
  },
};
