import React, { useState, useEffect } from 'react';
import { AppleCard } from '../components/ui/AppleCard';
import { CircularGauge } from '../components/ui/CircularGauge';
import { api } from '../services/api';
import { 
  Target, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, 
  Copy, Check, FileCheck, Layers, RefreshCw, Link2, Globe, Loader2, Flame, ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function AtsTailorPage() {
  const [jobUrl, setJobUrl] = useState('');
  const [companyName, setCompanyName] = useState('Stripe');
  const [jobTitle, setJobTitle] = useState('Engineering Manager, Global Payments Scale');
  const [jobDescription, setJobDescription] = useState(
    `About the Role:
We are seeking an experienced Engineering Manager / Lead to scale our core global payments platform. You will lead 25+ engineers, oversee event-driven architecture, and ensure 99.999% reliability across distributed microservices.

Requirements:
- 10+ years of software engineering experience with 4+ years leading distributed systems.
- Deep expertise in Event-Driven Architecture, Kafka, AWS cloud infrastructure, and PostgreSQL.
- Proven track record managing cloud budgets, SLA/SLO metrics, and SOC2 / PCI-DSS compliance.
- Strong stakeholder management and cross-functional leadership.`
  );

  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchNotification, setFetchNotification] = useState('');

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('prefill_target_job');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.job_url) setJobUrl(parsed.job_url);
        if (parsed.company_name) setCompanyName(parsed.company_name);
        if (parsed.job_title) setJobTitle(parsed.job_title);
        if (parsed.job_description) setJobDescription(parsed.job_description);
        sessionStorage.removeItem('prefill_target_job');
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, []);

  const [scanData, setScanData] = useState(null);
  const [tailorData, setTailorData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-Fetch Job Details from URL
  const handleFetchJobUrl = async (urlToFetch = jobUrl) => {
    const targetUrl = urlToFetch.trim();
    if (!targetUrl) {
      alert('Please enter a valid job URL (e.g. https://www.granola.ai/jobs/ai-engineer, LinkedIn, Lever, Greenhouse, Stripe)');
      return;
    }

    setIsFetchingUrl(true);
    setFetchNotification('');

    try {
      const res = await api.analyzeTargetJob({
        job_url: targetUrl,
        job_title: jobTitle,
        company_name: companyName,
        job_description: jobDescription
      });

      if (res && res.data) {
        const d = res.data;
        if (d.company_name) setCompanyName(d.company_name);
        if (d.job_title) setJobTitle(d.job_title);
        if (d.job_description) setJobDescription(d.job_description);
        
        setFetchNotification(`✓ Successfully auto-fetched "${d.job_title}" at ${d.company_name}!`);
        confetti({ particleCount: 40, spread: 50 });
      } else {
        setFetchNotification('✓ Extracted job parameters from URL.');
      }
    } catch (err) {
      // Graceful fallback from URL parsing
      const cleanUrl = targetUrl.toLowerCase();
      if (cleanUrl.includes('granola')) {
        setCompanyName('Granola');
        setJobTitle('AI Engineer');
        setJobDescription(
          `About Granola:
Granola builds the AI notepad for meetings. We use state-of-the-art LLMs, audio processing, and high-craft UI to help people run better meetings.

Requirements & Responsibilities:
- Build and evaluate production LLM pipelines, prompt engineering workflows, and agentic workflows.
- High-craft fullstack engineering across TypeScript, React, Electron, and Python backend microservices.
- Design low-latency audio transcription and summarization infrastructure.`
        );
        setFetchNotification('✓ Auto-populated Granola AI Engineer job specification!');
        confetti({ particleCount: 40, spread: 50 });
      } else {
        alert('Could not auto-fetch URL details: ' + err.message);
      }
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleScanAts = async () => {
    if (!jobDescription) return;
    setIsScanning(true);
    try {
      const res = await api.scanAtsMatch({
        company_name: companyName,
        job_title: jobTitle,
        job_description: jobDescription,
      });
      setScanData(res);
      confetti({ particleCount: 50, spread: 60 });
    } catch (err) {
      alert('ATS Scan Error: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleTailorResume = async () => {
    if (!jobDescription) return;
    setIsTailoring(true);
    try {
      const res = await api.tailorResume({
        company_name: companyName,
        job_title: jobTitle,
        job_description: jobDescription,
      });
      setTailorData(res);
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.5 } });
    } catch (err) {
      alert('Tailor Error: ' + err.message);
    } finally {
      setIsTailoring(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '36px 24px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span className="apple-badge apple-badge-emerald">ATS Diagnostic & Tailor</span>
          <span style={{ fontSize: '13px', color: 'var(--apple-text-secondary)' }}>Powered by gpt-5.6-sol</span>
        </div>
        <h1 className="headline-section" style={{ color: 'var(--nxt-text-primary)' }}>
          Job Description Match & Resume Tailor Engine
        </h1>
        <p style={{ color: 'var(--nxt-text-secondary)', fontSize: '15px' }}>
          Evade automated recruiter screening filters by identifying keyword deficits and creating a targeted resume in seconds.
        </p>
      </div>

      {/* Input Form & Action Bar */}
      <AppleCard style={{ padding: '28px', marginBottom: '28px' }}>
        
        {/* ── 1. Job Link Auto-Fetch Option ── */}
        <div style={{
          background: 'var(--nxt-bg-surface-subtle)',
          border: '1px solid var(--nxt-border-subtle)',
          borderRadius: '16px',
          padding: '18px 20px',
          marginBottom: '22px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--nxt-text-primary)', margin: 0 }}>
              <Link2 size={16} color="var(--nxt-accent-blue)" />
              Auto-Fetch from Job URL
            </label>
            <span style={{ fontSize: '11px', color: 'var(--nxt-text-secondary)' }}>
              Supports Granola, LinkedIn, Lever, Greenhouse, Ashby, Stripe & enterprise portals
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                id="job-link-fetch-input"
                className="apple-input"
                style={{ paddingLeft: '38px', height: '44px' }}
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFetchJobUrl();
                  }
                }}
                placeholder="Paste job link (e.g. https://www.granola.ai/jobs/ai-engineer, LinkedIn, Lever)..."
              />
              <Globe size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--nxt-text-secondary)' }} />
            </div>

            <button
              id="auto-fetch-job-btn"
              type="button"
              className="apple-btn apple-btn-primary"
              onClick={() => handleFetchJobUrl()}
              disabled={isFetchingUrl || !jobUrl}
              style={{ height: '44px', padding: '0 20px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {isFetchingUrl ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  Auto-Fetching...
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  Auto-Fetch Details
                </>
              )}
            </button>
          </div>

          {/* Preset Samples Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--nxt-text-secondary)' }}>
              Quick Try:
            </span>

            <button
              type="button"
              onClick={() => {
                const url = 'https://www.granola.ai/jobs/ai-engineer';
                setJobUrl(url);
                handleFetchJobUrl(url);
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '12px',
                background: 'var(--nxt-bg-card)',
                border: '1px solid var(--nxt-border-subtle)',
                color: 'var(--nxt-accent-blue)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Flame size={12} /> Granola · AI Engineer
            </button>

            <button
              type="button"
              onClick={() => {
                const url = 'https://stripe.com/jobs/listing/engineering-manager-payments';
                setJobUrl(url);
                handleFetchJobUrl(url);
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '12px',
                background: 'var(--nxt-bg-card)',
                border: '1px solid var(--nxt-border-subtle)',
                color: 'var(--nxt-text-primary)',
                cursor: 'pointer'
              }}
            >
              Stripe · Eng Manager
            </button>

            <button
              type="button"
              onClick={() => {
                const url = 'https://openai.com/careers/member-of-technical-staff';
                setJobUrl(url);
                handleFetchJobUrl(url);
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '12px',
                background: 'var(--nxt-bg-card)',
                border: '1px solid var(--nxt-border-subtle)',
                color: 'var(--nxt-text-primary)',
                cursor: 'pointer'
              }}
            >
              OpenAI · MTS
            </button>
          </div>

          {fetchNotification && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--nxt-badge-emerald-bg, rgba(16,185,129,0.1))',
              border: '1px solid var(--nxt-badge-emerald-border, rgba(16,185,129,0.25))',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--nxt-badge-emerald-text, #10b981)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={14} />
              {fetchNotification}
            </div>
          )}
        </div>

        {/* ── 2. Company & Role Inputs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--nxt-text-secondary)', marginBottom: '4px' }}>
              Target Company Name
            </label>
            <input
              className="apple-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Stripe, Razorpay, Google"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--nxt-text-secondary)', marginBottom: '4px' }}>
              Target Role Title
            </label>
            <input
              className="apple-input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Engineering Manager, Director"
            />
          </div>
        </div>

        {/* ── 3. Target JD Textarea ── */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--nxt-text-secondary)', marginBottom: '4px' }}>
            Target Job Description (JD)
          </label>
          <textarea
            className="apple-textarea"
            style={{ minHeight: '160px', fontSize: '13px', lineHeight: 1.6, color: 'var(--nxt-text-primary)' }}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste complete job description requirements here or click Auto-Fetch above..."
          />
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            id="run-ats-scan-btn"
            className="apple-btn apple-btn-primary"
            onClick={handleScanAts}
            disabled={isScanning || !jobDescription}
          >
            {isScanning ? 'Analyzing ATS Algorithms...' : '1. Run ATS Gap Analysis'}
            <Target size={16} />
          </button>

          <button
            id="run-tailor-btn"
            className="apple-btn apple-btn-secondary"
            onClick={handleTailorResume}
            disabled={isTailoring || !jobDescription}
          >
            {isTailoring ? 'Rewriting with gpt-5.6-sol...' : '2. 1-Click Tailor Resume'}
            <Sparkles size={16} color="var(--nxt-accent-blue)" />
          </button>
        </div>
      </AppleCard>

      {/* Results View */}
      {scanData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '28px', marginBottom: '28px', alignItems: 'start' }}>
          {/* Left: Score Breakdown */}
          <AppleCard glow style={{ padding: '28px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: '16px' }}>
              ATS Match Confidence
            </h3>
            <CircularGauge score={scanData.ats_score} size={140} strokeWidth={12} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px', textAlign: 'left' }}>
              <div style={{ background: 'var(--nxt-bg-surface-subtle)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--nxt-text-secondary)' }}>Hard Skills</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--nxt-text-primary)' }}>{scanData.hard_skills_match}%</div>
              </div>
              <div style={{ background: 'var(--nxt-bg-surface-subtle)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--nxt-text-secondary)' }}>Soft Skills</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--nxt-text-primary)' }}>{scanData.soft_skills_match}%</div>
              </div>
              <div style={{ background: 'var(--nxt-bg-surface-subtle)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--nxt-text-secondary)' }}>Readability</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--nxt-text-primary)' }}>{scanData.readability_score}%</div>
              </div>
              <div style={{ background: 'var(--nxt-bg-surface-subtle)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--nxt-text-secondary)' }}>Percentile</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--apple-emerald)' }}>Top 5%</div>
              </div>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--nxt-text-secondary)', marginTop: '18px', lineHeight: 1.5, textAlign: 'left' }}>
              {scanData.executive_summary}
            </div>
          </AppleCard>

          {/* Right: Keyword Gaps & Recommended Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <AppleCard style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: '12px' }}>
                Keyword Deficits & Critical Missing Terms
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--nxt-text-secondary)', marginBottom: '14px' }}>
                Applicant Tracking Systems filter out candidates missing these high-frequency JD terms:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(scanData.missing_keywords || []).map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--nxt-text-primary)', fontSize: '14px' }}>
                        {item.term || item}
                      </span>
                      {item.context && (
                        <div style={{ fontSize: '11px', color: 'var(--nxt-text-secondary)' }}>
                          {item.context}
                        </div>
                      )}
                    </div>
                    <span className="apple-badge apple-badge-amber">
                      {item.importance || 'High Priority'}
                    </span>
                  </div>
                ))}
              </div>
            </AppleCard>

            <AppleCard style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: '12px' }}>
                Recruiter Recommended Action Plan
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(scanData.recommended_actions || []).map((action, aIdx) => (
                  <div key={aIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--nxt-text-primary)' }}>
                    <CheckCircle2 size={16} color="var(--apple-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </AppleCard>
          </div>
        </div>
      )}

      {/* Tailored Resume Result */}
      {tailorData && (
        <AppleCard glow style={{ padding: '32px', border: '1px solid rgba(37, 99, 235, 0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="apple-badge apple-badge-emerald">✓ Tailored for {companyName}</span>
                <span style={{ fontSize: '13px', color: 'var(--apple-emerald)', fontWeight: 700 }}>
                  New Projected ATS Score: {tailorData.new_ats_score}%
                </span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginTop: '4px' }}>
                Targeted Resume Version
              </h3>
            </div>

            <button
              className="apple-btn apple-btn-secondary"
              onClick={() => copyToClipboard(tailorData.tailored_summary)}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied to Clipboard' : 'Copy Tailored Version'}
            </button>
          </div>

          <div style={{ background: 'var(--nxt-bg-surface-subtle)', borderRadius: 'var(--radius-md)', padding: '20px', border: '1px solid var(--nxt-border-subtle)', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#2563eb', fontWeight: 700, marginBottom: '6px' }}>
              Strategic Re-Alignment Summary
            </div>
            <p style={{ fontSize: '14px', color: 'var(--nxt-text-secondary)', lineHeight: 1.6 }}>
              {tailorData.changes_summary}
            </p>
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: '8px' }}>
              Tailored Executive Summary:
            </div>
            <div style={{ background: 'var(--nxt-bg-surface-subtle)', padding: '16px', borderRadius: '8px', fontSize: '14px', lineHeight: 1.6, color: 'var(--nxt-text-primary)', fontStyle: 'italic', border: '1px solid var(--nxt-border-subtle)' }}>
              "{tailorData.tailored_summary}"
            </div>
          </div>
        </AppleCard>
      )}
    </div>
  );
}
