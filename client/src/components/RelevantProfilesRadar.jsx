import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Sparkles, Plus, ExternalLink, Trash2, Linkedin, Copy, Check,
  Send, Users, MessageSquare, ChevronRight, CheckCircle2,
  Zap, Compass, Target, Award, ArrowUpRight, Lightbulb,
  Loader2, RefreshCw, X, HelpCircle, ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CATEGORY_TAGS = [
  'All',
  'Tech Influencer & Mentor',
  'Role Model',
  'Hiring Leader',
  'Peer Referral',
  'Domain Specialist'
];

const CATEGORY_COLORS = {
  'Tech Influencer & Mentor': { bg: 'rgba(191,90,242,0.12)', border: 'rgba(191,90,242,0.3)', text: '#bf5af2' },
  'Role Model':               { bg: 'rgba(10,132,255,0.12)', border: 'rgba(10,132,255,0.3)', text: '#0a84ff' },
  'Hiring Leader':            { bg: 'rgba(50,215,75,0.12)',  border: 'rgba(50,215,75,0.3)',  text: '#32d74b' },
  'Peer Referral':            { bg: 'rgba(255,214,10,0.12)', border: 'rgba(255,214,10,0.3)', text: '#ffd60a' },
  'Domain Specialist':        { bg: 'rgba(90,200,250,0.12)', border: 'rgba(90,200,250,0.3)', text: '#5ac8fa' },
};

export function RelevantProfilesRadar({
  onDraftSequence,
  onAddToKanban,
  onAskNova,
  onSwitchTab
}) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Active sequence modal state
  const [activeSequenceProfile, setActiveSequenceProfile] = useState(null);
  const [sequenceData, setSequenceData] = useState(null);
  const [generatingSequenceId, setGeneratingSequenceId] = useState(null);

  // Add form state
  const [form, setForm] = useState({
    linkedin_url: '',
    name: '',
    title: '',
    company: '',
    category_tag: 'Tech Influencer & Mentor',
    notes: '',
    raw_text: ''
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await api.getRelevantProfiles();
      setProfiles(data || []);
    } catch (e) {
      console.error('[RelevantProfiles] Failed to load:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfile = async (e) => {
    e?.preventDefault();
    if (!form.linkedin_url.trim() && !form.name.trim()) {
      alert('Please enter a LinkedIn profile URL or name.');
      return;
    }

    setAnalyzing(true);
    try {
      const newProf = await api.addRelevantProfile({
        linkedin_url: form.linkedin_url.trim(),
        name: form.name.trim(),
        title: form.title.trim(),
        company: form.company.trim(),
        category_tag: form.category_tag,
        notes: form.notes.trim(),
        raw_text: form.raw_text.trim()
      });

      setProfiles(prev => {
        const filtered = prev.filter(p => p.id !== newProf.id);
        return [newProf, ...filtered];
      });

      setShowAddModal(false);
      setForm({
        linkedin_url: '',
        name: '',
        title: '',
        company: '',
        category_tag: 'Tech Influencer & Mentor',
        notes: '',
        raw_text: ''
      });
      confetti({ particleCount: 40, spread: 60 });
    } catch (err) {
      alert('Failed to analyze and save profile: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteProfile = async (id, name) => {
    if (!window.confirm(`Remove ${name || 'this profile'} from your talent radar?`)) return;
    try {
      await api.deleteRelevantProfile(id);
      setProfiles(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleGenerateSequenceForProfile = async (prof) => {
    setGeneratingSequenceId(prof.id);
    setActiveSequenceProfile(prof);
    setSequenceData(null);
    try {
      if (prof.suggested_outreach_sequence) {
        setSequenceData({
          level_1: { message: prof.suggested_outreach_sequence.level_1, label: 'Initial Connection Request', send_timing: 'Send Day 0', char_count: prof.suggested_outreach_sequence.level_1.length },
          level_2: { message: prof.suggested_outreach_sequence.level_2, label: 'High-Signal Follow-Up', send_timing: 'Send Day 3 (after accepted)' },
          level_3: { message: prof.suggested_outreach_sequence.level_3, label: 'Mentorship / Referral Alignment', send_timing: 'Send Day 7' },
        });
      } else {
        const seq = await api.generateNetworkingSequence({
          target_name: prof.name,
          target_title: prof.title || 'Tech Leader',
          target_company: prof.company || 'Tech Industry',
          shared_context: prof.outreach_hook || prof.why_relevant || 'Admirer of their engineering leadership and technical insights',
          contact_type: prof.category_tag?.includes('Hiring') ? 'Hiring Manager' : 'Peer / Mentor'
        });
        setSequenceData(seq);
      }
    } catch (e) {
      alert('Failed to generate sequence: ' + e.message);
      setActiveSequenceProfile(null);
    } finally {
      setGeneratingSequenceId(null);
    }
  };

  const handlePushToKanban = async (prof) => {
    try {
      await onAddToKanban?.({
        suggested_name_placeholder: prof.name,
        persona_title: prof.title || 'Tech Leader',
        linkedin_search_url: prof.linkedin_url || '',
        ideal_hook: prof.outreach_hook || prof.why_relevant || ''
      }, prof.company || 'Tech Leader');
    } catch (e) {
      alert('Failed to add to Kanban: ' + e.message);
    }
  };

  const filteredProfiles = selectedTag === 'All'
    ? profiles
    : profiles.filter(p => p.category_tag === selectedTag);

  // Quick prefill helper
  const prefillAnubhav = () => {
    setForm({
      linkedin_url: 'https://www.linkedin.com/in/anubhavintech/',
      name: 'Anubhav Sharma (Anubhav in Tech)',
      title: 'Tech Career Mentor & Engineering Creator',
      company: 'Anubhav in Tech',
      category_tag: 'Tech Influencer & Mentor',
      notes: 'Key engineering role model for personal branding, career mindset, and high-leverage networking.',
      raw_text: ''
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Top Hero Card ── */}
      <div style={s.panel} className="apple-glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={s.panelTitle}>
              <Sparkles size={18} color="#bf5af2" />
              Relevant LinkedIn Profiles & Talent Radar
            </div>
            <p style={{ fontSize: 13, color: '#8e8e93', marginTop: -4, maxWidth: 680, lineHeight: 1.5 }}>
              Track key mentors, engineering role models, hiring leaders, and referral peers. Our AI extracts their superpowers, learning takeaways, and generates tailored 3-level cold outreach sequences.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              id="open-add-profile-modal-btn"
              className="apple-btn apple-btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={15} /> Add LinkedIn Profile
            </button>
          </div>
        </div>

        {/* ── Filter Tags & Quick Preset ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORY_TAGS.map(tag => (
              <button
                key={tag}
                id={`filter-tag-${tag.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => setSelectedTag(tag)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  background: selectedTag === tag ? 'rgba(191,90,242,0.22)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedTag === tag ? 'rgba(191,90,242,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  color: selectedTag === tag ? '#bf5af2' : '#8e8e93',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tag} {tag === 'All' && `(${profiles.length})`}
              </button>
            ))}
          </div>

          {/* Quick Add Suggestion Pill */}
          {!profiles.some(p => (p.linkedin_url || '').toLowerCase().includes('anubhavintech')) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#636366' }}>Suggested Profile:</span>
              <button
                id="quick-add-anubhav-chip"
                onClick={() => {
                  prefillAnubhav();
                  setShowAddModal(true);
                }}
                style={s.suggestedChip}
              >
                <Plus size={12} /> Add Anubhav in Tech (anubhavintech)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Profiles Grid ── */}
      {loading ? (
        <div style={s.loadingState}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Scanning Talent Radar & Profiles...</span>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div style={s.emptyState} className="apple-glass-panel">
          <Target size={36} color="#636366" />
          <div style={s.emptyTitle}>No Profiles Added to this Category</div>
          <div style={s.emptySub}>
            Add LinkedIn profiles of mentors, creators, engineering leaders, or recruiters you want to track, benchmark, and reach out to.
          </div>
          <button
            id="empty-add-prof-btn"
            className="apple-btn apple-btn-primary"
            style={{ marginTop: 14 }}
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={15} /> Add First LinkedIn Profile
          </button>
        </div>
      ) : (
        <div style={s.profilesGrid}>
          {filteredProfiles.map(prof => {
            const tagStyle = CATEGORY_COLORS[prof.category_tag] || CATEGORY_COLORS['Role Model'];
            const isGeneratingThis = generatingSequenceId === prof.id;

            return (
              <div key={prof.id} style={s.profileCard} className="apple-glass-panel">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={s.avatarCircle}>
                      {prof.avatar_initials || 'LI'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h4 style={s.profName}>{prof.name}</h4>
                        {prof.linkedin_url && (
                          <a
                            id={`ext-link-${prof.id}`}
                            href={prof.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#0a84ff', display: 'inline-flex' }}
                            title="Open on LinkedIn"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                      <div style={s.profRole}>{prof.title}</div>
                      <div style={s.profCompany}>{prof.company}</div>
                    </div>
                  </div>

                  {/* Category Pill */}
                  <span style={{
                    ...s.categoryBadge,
                    background: tagStyle.bg,
                    borderColor: tagStyle.border,
                    color: tagStyle.text
                  }}>
                    {prof.category_tag}
                  </span>
                </div>

                {/* ── Why Relevant Callout ── */}
                {prof.why_relevant && (
                  <div style={s.whyBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#bf5af2', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                      <Lightbulb size={13} /> Why Relevant To You
                    </div>
                    <p style={s.whyText}>{prof.why_relevant}</p>
                  </div>
                )}

                {/* ── Superpowers & Skills ── */}
                {prof.superpowers && prof.superpowers.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={s.subHeading}>Key Superpowers & Focus Areas:</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                      {prof.superpowers.map((sp, idx) => (
                        <span key={idx} style={s.superpowerPill}>
                          ⚡ {sp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Suggested Outreach Hook ── */}
                {prof.outreach_hook && (
                  <div style={s.hookBox}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#0a84ff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Suggested Icebreaker Hook:
                    </div>
                    <div style={s.hookText}>"{prof.outreach_hook}"</div>
                  </div>
                )}

                {/* ── User Notes / Goals ── */}
                {prof.notes && (
                  <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 8, fontStyle: 'italic' }}>
                    📝 Note: {prof.notes}
                  </div>
                )}

                {/* ── Bottom Actions ── */}
                <div style={s.cardActions}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      id={`btn-gen-outreach-${prof.id}`}
                      className="apple-btn apple-btn-primary"
                      style={{ fontSize: 11, padding: '5px 11px' }}
                      onClick={() => handleGenerateSequenceForProfile(prof)}
                      disabled={isGeneratingThis}
                    >
                      {isGeneratingThis ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={12} />}
                      Outreach Sequence
                    </button>

                    <button
                      id={`btn-add-kanban-${prof.id}`}
                      className="apple-btn apple-btn-secondary"
                      style={{ fontSize: 11, padding: '5px 11px' }}
                      onClick={() => handlePushToKanban(prof)}
                    >
                      <Plus size={12} /> Add to Kanban
                    </button>

                    <button
                      id={`btn-ask-nova-${prof.id}`}
                      className="apple-btn apple-btn-secondary"
                      style={{ fontSize: 11, padding: '5px 11px', color: '#bf5af2' }}
                      onClick={() => onAskNova?.(`How can I benchmark my career against ${prof.name} (${prof.linkedin_url || prof.title}) and what are the best strategies to network with them?`)}
                    >
                      <Sparkles size={12} /> Ask Nova
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {prof.linkedin_url && (
                      <a
                        id={`btn-view-li-${prof.id}`}
                        href={prof.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={s.iconBtn}
                        title="View on LinkedIn"
                      >
                        <Linkedin size={13} />
                      </a>
                    )}
                    <button
                      id={`btn-delete-prof-${prof.id}`}
                      onClick={() => handleDeleteProfile(prof.id, prof.name)}
                      style={s.iconBtnDanger}
                      title="Remove from radar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: ADD RELEVANT LINKEDIN PROFILE (WITH AI AUTO-ENRICH)
      ══════════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="apple-modal-overlay" onClick={() => !analyzing && setShowAddModal(false)}>
          <div className="apple-modal animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={s.panelTitle}>
                <Sparkles size={18} color="#bf5af2" />
                Add Relevant Profile to Radar
              </div>
              <button
                onClick={() => !analyzing && setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#636366', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Quick Template Chip */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(191,90,242,0.08)', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(191,90,242,0.2)' }}>
                <span style={{ fontSize: 12, color: '#bf5af2', fontWeight: 600 }}>🌟 Try Example:</span>
                <button
                  type="button"
                  id="prefill-anubhav-btn"
                  onClick={prefillAnubhav}
                  style={{
                    background: 'rgba(191,90,242,0.18)', border: '1px solid rgba(191,90,242,0.4)',
                    color: '#f5f5f7', padding: '4px 10px', borderRadius: 14, fontSize: 11, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Anubhav in Tech (anubhavintech)
                </button>
              </div>

              <div className="apple-field">
                <label className="apple-label">LinkedIn Profile URL *</label>
                <input
                  id="add-profile-url-input"
                  className="apple-input"
                  placeholder="https://www.linkedin.com/in/anubhavintech/"
                  value={form.linkedin_url}
                  onChange={e => setForm(p => ({ ...p, linkedin_url: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="apple-field">
                  <label className="apple-label">Category Tag</label>
                  <select
                    id="add-profile-category-select"
                    className="apple-input"
                    value={form.category_tag}
                    onChange={e => setForm(p => ({ ...p, category_tag: e.target.value }))}
                  >
                    <option value="Tech Influencer & Mentor">Tech Influencer & Mentor</option>
                    <option value="Role Model">Role Model & Leader</option>
                    <option value="Hiring Leader">Hiring Leader / Manager</option>
                    <option value="Peer Referral">Peer Referral / Alumni</option>
                    <option value="Domain Specialist">Domain Specialist</option>
                  </select>
                </div>

                <div className="apple-field">
                  <label className="apple-label">Full Name (Optional)</label>
                  <input
                    id="add-profile-name-input"
                    className="apple-input"
                    placeholder="Auto-inferred if empty"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="apple-field">
                <label className="apple-label">Why is this person relevant to your career? (Optional)</label>
                <textarea
                  id="add-profile-notes-input"
                  className="apple-input"
                  rows={2}
                  placeholder="e.g., Follow them for system design breakdowns and senior engineer interview guidance..."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div style={{ padding: '10px 14px', background: 'rgba(10,132,255,0.06)', borderRadius: 10, border: '1px solid rgba(10,132,255,0.15)', fontSize: 12, color: '#8e8e93' }}>
                ⚡ <strong>AI Auto-Enrichment:</strong> Career Copilot will automatically analyze their background, extract key superpowers, and draft a 3-level personalized outreach strategy.
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  id="cancel-add-prof-modal-btn"
                  className="apple-btn apple-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={analyzing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-add-profile-btn"
                  className="apple-btn apple-btn-primary"
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <>
                      <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} /> Analyze & Save to Radar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: 3-LEVEL OUTREACH SEQUENCE VIEWER
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSequenceProfile && sequenceData && (
        <div className="apple-modal-overlay" onClick={() => setActiveSequenceProfile(null)}>
          <div className="apple-modal animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={s.panelTitle}>
                  <Zap size={18} color="#0a84ff" />
                  3-Level Outreach for {activeSequenceProfile.name}
                </div>
                <div style={{ fontSize: 12, color: '#8e8e93' }}>
                  {activeSequenceProfile.title} · {activeSequenceProfile.company}
                </div>
              </div>
              <button
                onClick={() => setActiveSequenceProfile(null)}
                style={{ background: 'none', border: 'none', color: '#636366', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Level 1 */}
              <div style={{ ...s.seqCard, borderLeftColor: '#0a84ff' }}>
                <div style={s.seqHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...s.levelPill, background: 'rgba(10,132,255,0.15)', color: '#0a84ff' }}>Level 1</span>
                    <strong style={{ fontSize: 13, color: '#f5f5f7' }}>Initial Connection Note</strong>
                    <span style={{ fontSize: 11, color: '#8e8e93' }}>· Under 280 chars</span>
                  </div>
                </div>
                <pre style={s.seqText}>{sequenceData.level_1?.message || sequenceData.level_1 || '—'}</pre>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="apple-btn apple-btn-secondary"
                    style={{ fontSize: 11, padding: '5px 10px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(sequenceData.level_1?.message || sequenceData.level_1 || '');
                      confetti({ particleCount: 20, spread: 40 });
                    }}
                  >
                    <Copy size={12} /> Copy Note
                  </button>
                  {activeSequenceProfile.linkedin_url && (
                    <a
                      href={activeSequenceProfile.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apple-btn apple-btn-primary"
                      style={{ fontSize: 11, padding: '5px 10px' }}
                      onClick={() => {
                        navigator.clipboard.writeText(sequenceData.level_1?.message || sequenceData.level_1 || '');
                      }}
                    >
                      <Linkedin size={12} /> Copy & Open Profile
                    </a>
                  )}
                </div>
              </div>

              {/* Level 2 */}
              <div style={{ ...s.seqCard, borderLeftColor: '#bf5af2' }}>
                <div style={s.seqHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...s.levelPill, background: 'rgba(191,90,242,0.15)', color: '#bf5af2' }}>Level 2</span>
                    <strong style={{ fontSize: 13, color: '#f5f5f7' }}>Value-First Follow Up</strong>
                    <span style={{ fontSize: 11, color: '#8e8e93' }}>· Send Day 3</span>
                  </div>
                </div>
                <pre style={s.seqText}>{sequenceData.level_2?.message || sequenceData.level_2 || '—'}</pre>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="apple-btn apple-btn-secondary"
                    style={{ fontSize: 11, padding: '5px 10px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(sequenceData.level_2?.message || sequenceData.level_2 || '');
                      confetti({ particleCount: 20, spread: 40 });
                    }}
                  >
                    <Copy size={12} /> Copy Follow Up
                  </button>
                </div>
              </div>

              {/* Level 3 */}
              <div style={{ ...s.seqCard, borderLeftColor: '#5ac8fa' }}>
                <div style={s.seqHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...s.levelPill, background: 'rgba(90,200,250,0.15)', color: '#5ac8fa' }}>Level 3</span>
                    <strong style={{ fontSize: 13, color: '#f5f5f7' }}>Mentorship / Alignment Touchpoint</strong>
                    <span style={{ fontSize: 11, color: '#8e8e93' }}>· Send Day 7</span>
                  </div>
                </div>
                <pre style={s.seqText}>{sequenceData.level_3?.message || sequenceData.level_3 || '—'}</pre>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="apple-btn apple-btn-secondary"
                    style={{ fontSize: 11, padding: '5px 10px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(sequenceData.level_3?.message || sequenceData.level_3 || '');
                      confetti({ particleCount: 20, spread: 40 });
                    }}
                  >
                    <Copy size={12} /> Copy Touchpoint
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                className="apple-btn apple-btn-primary"
                onClick={() => setActiveSequenceProfile(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  panel: { padding: 22 },
  panelTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: 6 },
  suggestedChip: {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
    borderRadius: 14, fontSize: 11, fontWeight: 700, background: 'var(--nxt-bg-surface-subtle)',
    border: '1px solid var(--nxt-border-subtle)', color: 'var(--nxt-accent-blue)', cursor: 'pointer'
  },
  loadingState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--nxt-text-secondary)', fontSize: 13, padding: '50px 0' },
  emptyState: { textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: 700, color: 'var(--nxt-text-primary)' },
  emptySub: { fontSize: 13, color: 'var(--nxt-text-secondary)', maxWidth: 400, lineHeight: 1.6 },
  profilesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 },
  profileCard: {
    padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    border: '1px solid var(--nxt-border-subtle)', borderRadius: 16, transition: 'all 0.2s ease',
    minHeight: 280, background: 'var(--nxt-bg-card)'
  },
  avatarCircle: {
    width: 42, height: 42, borderRadius: '50%', background: 'var(--nxt-bg-surface-subtle)',
    border: '1.5px solid var(--nxt-border-subtle)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--nxt-accent-blue)', flexShrink: 0
  },
  profName: { fontSize: 14, fontWeight: 800, color: 'var(--nxt-text-primary)', letterSpacing: '-0.02em', margin: 0 },
  profRole: { fontSize: 12, color: 'var(--nxt-text-secondary)', marginTop: 2, lineHeight: 1.3 },
  profCompany: { fontSize: 11, color: 'var(--nxt-text-secondary)', marginTop: 1 },
  categoryBadge: {
    fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 12, border: '1px solid',
    whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em'
  },
  whyBox: {
    background: 'var(--nxt-bg-surface-subtle)', border: '1px solid var(--nxt-border-subtle)',
    borderRadius: 10, padding: '10px 12px', marginTop: 12
  },
  whyText: { fontSize: 12, color: 'var(--nxt-text-primary)', lineHeight: 1.5, margin: 0 },
  subHeading: { fontSize: 11, fontWeight: 700, color: 'var(--nxt-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  superpowerPill: {
    fontSize: 11, fontWeight: 600, color: 'var(--nxt-text-primary)', background: 'var(--nxt-bg-surface-subtle)',
    border: '1px solid var(--nxt-border-subtle)', padding: '2px 8px', borderRadius: 12
  },
  hookBox: {
    background: 'var(--nxt-bg-surface-subtle)', border: '1px solid var(--nxt-border-subtle)',
    borderRadius: 8, padding: '8px 10px', marginTop: 10
  },
  hookText: { fontSize: 11, color: 'var(--nxt-accent-blue)', fontStyle: 'italic', marginTop: 2, lineHeight: 1.4 },
  cardActions: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14,
    paddingTop: 12, borderTop: '1px solid var(--nxt-border-subtle)', flexWrap: 'wrap', gap: 8
  },
  iconBtn: {
    background: 'var(--nxt-bg-surface-subtle)', border: '1px solid var(--nxt-border-subtle)',
    color: 'var(--nxt-accent-blue)', padding: 6, borderRadius: 8, display: 'inline-flex', cursor: 'pointer'
  },
  iconBtnDanger: {
    background: 'var(--nxt-badge-rose-bg, rgba(239,68,68,0.1))', border: '1px solid var(--nxt-badge-rose-border, rgba(239,68,68,0.2))',
    color: 'var(--nxt-badge-rose-text, #ef4444)', padding: 6, borderRadius: 8, display: 'inline-flex', cursor: 'pointer'
  },
  seqCard: {
    borderLeft: '3px solid', background: 'var(--nxt-bg-surface-subtle)', borderRadius: 10,
    padding: '12px 14px', border: '1px solid var(--nxt-border-subtle)'
  },
  seqHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  levelPill: { fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase' },
  seqText: {
    fontFamily: 'inherit', fontSize: 12, color: 'var(--nxt-text-primary)', whiteSpace: 'pre-wrap',
    lineHeight: 1.6, background: 'var(--nxt-bg-surface)', borderRadius: 8, padding: '10px 12px',
    border: '1px solid var(--nxt-border-subtle)', margin: 0
  }
};
