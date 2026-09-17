import React, { useState, useEffect } from 'react';
import { AppleCard } from '../components/ui/AppleCard';
import { api } from '../services/api';
import { 
  FileText, Sparkles, Copy, Check, ArrowRight, RefreshCw, 
  Layers, Plus, Trash2, Award 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function ResumeStudioPage() {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // STAR Bullet Optimizer State
  const [rawBullet, setRawBullet] = useState(
    'Led a project to improve database performance and helped team deploy features faster.'
  );
  const [roleContext, setRoleContext] = useState('Director of Engineering / Tech Lead');
  const [optimizedResult, setOptimizedResult] = useState(null);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    async function loadResume() {
      try {
        const data = await api.getMasterResume();
        setResume(data);
      } catch (err) {
        console.error('Failed to load resume:', err);
      } finally {
        setLoading(false);
      }
    }
    loadResume();
  }, []);

  const handleOptimizeBullet = async () => {
    if (!rawBullet) return;
    setOptimizing(true);
    try {
      const res = await api.optimizeBullet(rawBullet, roleContext);
      setOptimizedResult(res);
      confetti({ particleCount: 40, spread: 50 });
    } catch (err) {
      alert('Failed to optimize bullet: ' + err.message);
    } finally {
      setOptimizing(false);
    }
  };

  const handleSaveResume = async () => {
    setSaving(true);
    try {
      await api.updateMasterResume(resume);
      alert('Master Resume updated successfully!');
    } catch (err) {
      alert('Failed to save resume: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !resume) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--apple-text-secondary)' }}>
        Loading Master Resume Studio...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '36px 24px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="apple-badge apple-badge-blue">Master Executive Profile</span>
            <span style={{ fontSize: '13px', color: 'var(--apple-text-secondary)' }}>Single source of truth for all tailored applications</span>
          </div>
          <h1 className="headline-section" style={{ color: 'var(--nxt-text-primary)' }}>
            Resume Studio & STAR Enhancer
          </h1>
        </div>

        <button
          className="apple-btn apple-btn-primary"
          onClick={handleSaveResume}
          disabled={saving}
        >
          {saving ? 'Saving changes...' : 'Save Master Profile'}
        </button>
      </div>

      {/* Main Grid: Resume Editor on Left, STAR Optimizer & Preview on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Left: Master Profile Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <AppleCard style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: '16px' }}>
              Candidate Identity & Goals
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Full Name</label>
                <input
                  className="apple-input"
                  value={resume.full_name || ''}
                  onChange={(e) => setResume({ ...resume, full_name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Email</label>
                <input
                  className="apple-input"
                  value={resume.email || ''}
                  onChange={(e) => setResume({ ...resume, email: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Current Role</label>
                <input
                  className="apple-input"
                  value={resume.current_role || ''}
                  onChange={(e) => setResume({ ...resume, current_role: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Target Executive Role</label>
                <input
                  className="apple-input"
                  value={resume.target_role || ''}
                  onChange={(e) => setResume({ ...resume, target_role: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Target CTC Range</label>
                <input
                  className="apple-input"
                  value={resume.target_ctc || ''}
                  onChange={(e) => setResume({ ...resume, target_ctc: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Preferred Location</label>
                <input
                  className="apple-input"
                  value={resume.location || ''}
                  onChange={(e) => setResume({ ...resume, location: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Executive Summary</label>
              <textarea
                className="apple-textarea"
                style={{ minHeight: '100px' }}
                value={resume.summary || ''}
                onChange={(e) => setResume({ ...resume, summary: e.target.value })}
              />
            </div>
          </AppleCard>

          {/* Experience Section Bullets */}
          <AppleCard style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--nxt-text-primary)' }}>
                Experience Bullets (STAR Formatted)
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>
                Use optimizer on right to elevate metrics
              </span>
            </div>

            {(resume.experiences || []).map((exp, expIdx) => (
              <div key={expIdx} style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--apple-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--nxt-text-primary)' }}>{exp.role}</span>
                  <span style={{ fontSize: '13px', color: 'var(--apple-text-secondary)' }}>{exp.company} ({exp.duration})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(exp.bullets || []).map((bullet, bIdx) => (
                    <div key={bIdx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--apple-blue)', marginTop: '3px' }}>•</span>
                      <textarea
                        className="apple-textarea"
                        style={{ minHeight: '60px', padding: '8px 12px', fontSize: '13px' }}
                        value={bullet}
                        onChange={(e) => {
                          const newExp = [...resume.experiences];
                          newExp[expIdx].bullets[bIdx] = e.target.value;
                          setResume({ ...resume, experiences: newExp });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </AppleCard>
        </div>

        {/* Right: AI STAR Bullet Optimizer Tool */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <AppleCard glow style={{ padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--apple-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={16} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--nxt-text-primary)' }}>
                  AI STAR & XYZ Bullet Optimizer
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>
                  Accomplished [X], measured by [Y], by doing [Z]
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>
                Target Seniority Context:
              </label>
              <select
                className="apple-input"
                value={roleContext}
                onChange={(e) => setRoleContext(e.target.value)}
              >
                <option value="Senior Staff Software Engineer">Senior Staff Software Engineer</option>
                <option value="Director of Engineering / Tech Lead">Director of Engineering / Tech Lead</option>
                <option value="VP of Technology / Head of Engineering">VP of Technology / Head of Engineering</option>
                <option value="Product Engineering Manager">Product Engineering Manager</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>
                Paste or draft a raw bullet point:
              </label>
              <textarea
                className="apple-textarea"
                style={{ minHeight: '80px', fontSize: '13px' }}
                value={rawBullet}
                onChange={(e) => setRawBullet(e.target.value)}
                placeholder="e.g. Worked with teams to speed up CI/CD and fixed cloud bills..."
              />
            </div>

            <button
              id="optimize-bullet-btn"
              className="apple-btn apple-btn-primary"
              style={{ width: '100%', marginBottom: '20px' }}
              onClick={handleOptimizeBullet}
              disabled={optimizing}
            >
              {optimizing ? 'Rewriting with gpt-5.6-sol...' : 'Transform into Executive STAR Bullet'}
              <Sparkles size={15} />
            </button>

            {optimizedResult && (
              <div style={{ background: 'var(--nxt-bg-surface-subtle)', borderRadius: 'var(--radius-md)', padding: '18px', border: '1px solid var(--nxt-border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="apple-badge apple-badge-emerald">Polished Executive Output</span>
                  <button
                    className="apple-btn apple-btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => copyToClipboard(optimizedResult.optimized_bullet)}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <p style={{ fontSize: '14px', color: 'var(--nxt-text-primary)', lineHeight: 1.6, marginBottom: '12px', fontWeight: 500 }}>
                  "{optimizedResult.optimized_bullet}"
                </p>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <span className="apple-badge apple-badge-blue">
                    Verb: {optimizedResult.action_verb}
                  </span>
                  <span className="apple-badge apple-badge-purple">
                    Metric: {optimizedResult.metric_impact}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', fontStyle: 'italic', borderTop: '1px solid var(--apple-border)', paddingTop: '8px' }}>
                  💡 <strong>Recruiter Impact:</strong> {optimizedResult.why_it_works}
                </div>
              </div>
            )}
          </AppleCard>

          {/* Quick Resume Preview Snippet */}
          <AppleCard style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--nxt-text-primary)' }}>
                Preview Formatted Markdown
              </h4>
              <button
                className="apple-btn apple-btn-ghost"
                style={{ fontSize: '12px', padding: '4px 8px' }}
                onClick={() => copyToClipboard(`${resume.full_name}\n${resume.current_role}\n\n${resume.summary}`)}
              >
                Copy Markdown
              </button>
            </div>
            <pre style={{ fontSize: '11px', color: 'var(--apple-text-secondary)', fontFamily: 'var(--font-mono)', background: 'var(--nxt-bg-surface-subtle)', border: '1px solid var(--nxt-border-subtle)', padding: '12px', borderRadius: '8px', overflowX: 'auto' }}>
{`# ${resume.full_name}
**${resume.current_role}** | ${resume.location}
${resume.email} | ${resume.phone}

## SUMMARY
${resume.summary?.slice(0, 160)}...

## CORE COMPETENCIES
${(resume.skills || []).slice(0, 6).join(' • ')}`}
            </pre>
          </AppleCard>
        </div>
      </div>
    </div>
  );
}
