import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Target, Sparkles, Plus, ExternalLink, Trash2, ArrowUpRight,
  Briefcase, DollarSign, MapPin, CheckCircle2, Zap, Award,
  ChevronRight, Lightbulb, Users, FileText, Check, Copy,
  Loader2, Search, Filter, ShieldCheck, Flame, Compass, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CATEGORIES = [
  'All',
  'Target Dream Role',
  'High Priority',
  'Benchmark',
  'Stealth / Advisory'
];

const CATEGORY_STYLES = {
  'Target Dream Role': { bg: 'rgba(255, 69, 58, 0.12)', border: 'rgba(255, 69, 58, 0.3)', text: '#ff453a' },
  'High Priority':     { bg: 'rgba(255, 214, 10, 0.12)', border: 'rgba(255, 214, 10, 0.3)', text: '#ffd60a' },
  'Benchmark':         { bg: 'rgba(10, 132, 255, 0.12)', border: 'rgba(10, 132, 255, 0.3)', text: '#0a84ff' },
  'Stealth / Advisory':{ bg: 'rgba(191, 90, 242, 0.12)', border: 'rgba(191, 90, 242, 0.3)', text: '#bf5af2' },
};

export function TargetJobsRadar({ onNavigate, onOpenNova, onAddToKanban }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [actionSuccessId, setActionSuccessId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    job_url: '',
    job_title: '',
    company_name: '',
    location: 'London, UK / Remote',
    salary_range: '$140k - $200k + Equity',
    category: 'Target Dream Role',
    why_targeted: '',
    job_description: '',
    notes: ''
  });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await api.getTargetJobs();
      setJobs(res || []);
    } catch (e) {
      console.error('[TargetJobsRadar] Failed to load target jobs:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrefillGranola = () => {
    setForm({
      job_url: 'https://www.granola.ai/jobs/ai-engineer',
      job_title: 'AI Engineer',
      company_name: 'Granola',
      location: 'London, UK / Remote',
      salary_range: '$140k - $200k + Meaningful Equity',
      category: 'Target Dream Role',
      why_targeted: 'Pioneering AI workspace & meeting intelligence product. Elite craft, high autonomy, cutting-edge audio transcription to structured knowledge pipeline.',
      job_description: 'Granola is building the future of meeting intelligence and personal AI cognition. As an AI Engineer, you will design, fine-tune, and deploy state-of-the-art LLM pipelines that transform raw conversation audio into high-density structured knowledge artifacts, action items, and executive summaries with zero latency.',
      notes: 'Top priority dream role. Combines elite product craft with high-scale LLM infrastructure.'
    });
  };

  const handleAnalyzeAndSave = async (e) => {
    e?.preventDefault();
    if (!form.job_title && !form.company_name && !form.job_url) {
      alert('Please enter at least a Job URL or Job Title & Company.');
      return;
    }

    setAnalyzing(true);
    try {
      const analyzedJob = await api.analyzeTargetJob({
        job_url: form.job_url.trim(),
        job_title: form.job_title.trim(),
        company_name: form.company_name.trim(),
        location: form.location.trim(),
        salary_range: form.salary_range.trim(),
        category: form.category,
        job_description: form.job_description.trim(),
        why_targeted: form.why_targeted.trim(),
        notes: form.notes.trim()
      });

      setJobs(prev => {
        const filtered = prev.filter(j => j.id !== analyzedJob.id);
        return [analyzedJob, ...filtered];
      });

      setShowAddModal(false);
      setForm({
        job_url: '',
        job_title: '',
        company_name: '',
        location: 'London, UK / Remote',
        salary_range: '$140k - $200k + Equity',
        category: 'Target Dream Role',
        why_targeted: '',
        job_description: '',
        notes: ''
      });

      confetti({ particleCount: 70, spread: 60 });
    } catch (err) {
      alert('Error analyzing & saving role: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteJob = async (id, title, e) => {
    e?.stopPropagation();
    if (!window.confirm(`Remove "${title}" from your targeted roles vault?`)) return;
    try {
      await api.deleteTargetJob(id);
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      alert('Failed to remove role: ' + err.message);
    }
  };

  // 1-Click Tailor Resume
  const handleTailorResume = (job) => {
    sessionStorage.setItem('prefill_target_job', JSON.stringify({
      company_name: job.company_name,
      job_title: job.job_title,
      job_description: job.job_description || job.why_targeted
    }));
    if (onNavigate) {
      onNavigate('ats');
    }
  };

  // 1-Click WIN Document
  const handleGenerateWinDoc = (job) => {
    sessionStorage.setItem('prefill_win_doc', JSON.stringify({
      company_name: job.company_name,
      job_title: job.job_title,
      target_problem: `Deploying scalable LLM intelligence systems and product craft for ${job.company_name}`
    }));
    if (onNavigate) {
      onNavigate('executive');
    }
  };

  // 1-Click Find Decision Makers on LinkedIn
  const handleFindDecisionMakers = (job) => {
    sessionStorage.setItem('prefill_network_company', JSON.stringify({
      company_name: job.company_name,
      target_role: job.job_title
    }));
    if (onNavigate) {
      onNavigate('networker');
    }
  };

  // 1-Click Add to Application Kanban
  const handleAddToPipeline = async (job) => {
    try {
      await api.createApplication({
        company_name: job.company_name,
        job_title: job.job_title,
        location: job.location || 'Remote',
        salary_range: job.salary_range || 'Competitive',
        status: 'applied',
        notes: `Targeted Dream Role. Strategy: ${job.action_strategy || job.why_targeted}`
      });
      setActionSuccessId(job.id);
      setTimeout(() => setActionSuccessId(null), 3000);
      confetti({ particleCount: 50, spread: 60 });
      if (onAddToKanban) onAddToKanban();
    } catch (err) {
      alert('Error adding to application pipeline: ' + err.message);
    }
  };

  // 1-Click Ask Nova Strategy
  const handleAskNova = (job) => {
    const prompt = `Give me an elite, tailored executive attack plan to land the "${job.job_title}" role at ${job.company_name}. 

Context:
- Job Link: ${job.job_url || 'N/A'}
- Why Targeted: ${job.why_targeted || 'High-tier strategic target'}
- Key Superpowers: ${(job.key_superpowers_needed || []).join(', ')}

Please provide:
1. High-impact cold pitch to the founder/VP of Engineering.
2. 30-60-90 day WIN value hypothesis.
3. 3 standout proof-of-work project ideas I can demo to guarantee an interview.`;

    window.dispatchEvent(new CustomEvent('open-nova-drawer', { detail: { initialPrompt: prompt } }));
  };

  // Filtered list
  const filteredJobs = jobs.filter(j => {
    const matchesCategory = selectedCategory === 'All' || j.category === selectedCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      j.job_title?.toLowerCase().includes(query) ||
      j.company_name?.toLowerCase().includes(query) ||
      (j.required_skills && j.required_skills.some(s => s.toLowerCase().includes(query))) ||
      j.why_targeted?.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Top Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '24px',
        padding: '16px 20px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Category Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Filter size={14} style={{ color: 'var(--apple-text-secondary)', marginRight: '4px' }} />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              id={`filter-cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => setSelectedCategory(cat)}
              className="apple-btn"
              style={{
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: selectedCategory === cat
                  ? 'rgba(10, 132, 255, 0.2)'
                  : 'rgba(255, 255, 255, 0.04)',
                border: selectedCategory === cat
                  ? '1px solid rgba(10, 132, 255, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                color: selectedCategory === cat ? '#0a84ff' : 'var(--apple-text-secondary)',
                fontWeight: selectedCategory === cat ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {cat} {cat === 'All' ? `(${jobs.length})` : `(${jobs.filter(j => j.category === cat).length})`}
            </button>
          ))}
        </div>

        {/* Search and Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--apple-text-secondary)'
            }} />
            <input
              id="search-target-jobs-input"
              className="apple-input"
              style={{ paddingLeft: '34px', fontSize: '12px', height: '36px' }}
              placeholder="Search target roles or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            id="open-add-target-job-modal-btn"
            onClick={() => setShowAddModal(true)}
            className="apple-btn apple-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', height: '36px' }}
          >
            <Plus size={15} />
            Add Target Role
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--apple-text-secondary)' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
          <p>Scanning Target Roles Vault...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 24px',
          background: 'var(--nxt-bg-surface-subtle)',
          borderRadius: '20px',
          border: '1px dashed var(--nxt-border-subtle)'
        }}>
          <Compass size={40} style={{ color: 'var(--nxt-accent-blue)', margin: '0 auto 16px', opacity: 0.8 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--nxt-text-primary)', marginBottom: '8px' }}>
            No Target Roles in this Category Yet
          </h3>
          <p style={{ color: 'var(--nxt-text-secondary)', fontSize: '13px', maxWidth: '420px', margin: '0 auto 20px' }}>
            Pin your high-conviction dream roles (like Granola AI Engineer) to generate instant tailored ATS resumes, 30-60-90 WIN decks, and founder outreach sequences.
          </p>
          <button
            id="empty-state-add-target-job-btn"
            onClick={() => {
              handlePrefillGranola();
              setShowAddModal(true);
            }}
            className="apple-btn apple-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Flame size={16} />
            Load Granola AI Engineer Example
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(620px, 1fr))', gap: '20px' }}>
          {filteredJobs.map((job) => {
            const catStyle = CATEGORY_STYLES[job.category] || CATEGORY_STYLES['Target Dream Role'];
            const matchScore = job.match_score || 92;

            return (
              <div
                key={job.id}
                id={`target-job-card-${job.id}`}
                style={{
                  background: 'var(--nxt-bg-card)',
                  border: '1px solid var(--nxt-border-subtle)',
                  borderRadius: '20px',
                  padding: '24px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: 'var(--nxt-shadow-sm)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(10,132,255,0.2) 0%, rgba(191,90,242,0.2) 100%)',
                      border: '1px solid var(--nxt-border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: 'var(--nxt-accent-blue)',
                      flexShrink: 0
                    }}>
                      {job.company_name?.charAt(0) || 'J'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: catStyle.bg,
                          border: `1px solid ${catStyle.border}`,
                          color: catStyle.text,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {job.category}
                        </span>

                        {job.job_url && (
                          <a
                            id={`view-live-link-${job.id}`}
                            href={job.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              color: 'var(--nxt-accent-blue)',
                              textDecoration: 'none',
                              fontWeight: 600
                            }}
                          >
                            Live Listing <ExternalLink size={11} />
                          </a>
                        )}
                      </div>

                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--nxt-text-primary)', margin: 0 }}>
                        {job.job_title}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--nxt-text-secondary)', margin: '2px 0 0', fontWeight: 500 }}>
                        {job.company_name} • {job.location || 'Remote'} {job.salary_range ? `• ${job.salary_range}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Match Score Badge */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--nxt-badge-emerald-bg, rgba(16,185,129,0.1))',
                    border: '1px solid var(--nxt-badge-emerald-border, rgba(16,185,129,0.25))',
                    borderRadius: '14px',
                    padding: '6px 12px',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--nxt-badge-emerald-text, #10b981)' }}>
                      {matchScore}%
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--nxt-badge-emerald-text, #10b981)', textTransform: 'uppercase' }}>
                      Fit Score
                    </span>
                  </div>
                </div>

                {/* Match Reason Banner */}
                {job.match_reason && (
                  <div style={{
                    background: 'var(--nxt-bg-surface-subtle)',
                    border: '1px solid var(--nxt-border-subtle)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <Zap size={16} style={{ color: 'var(--nxt-accent-blue)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--nxt-accent-blue)', textTransform: 'uppercase', marginBottom: '2px' }}>
                        Why This Is Your Dream Fit
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--nxt-text-primary)', lineHeight: 1.45 }}>
                        {job.match_reason}
                      </div>
                    </div>
                  </div>
                )}

                {/* Required Tech Stack & Superpowers */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--nxt-text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Required Capabilities & Tech Stack
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(job.required_skills || ['AI/LLM Engineering', 'TypeScript/React', 'System Design']).map((skill, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: 'var(--nxt-bg-surface-subtle)',
                          border: '1px solid var(--nxt-border-subtle)',
                          color: 'var(--nxt-text-primary)'
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Superpowers Needed Pill Box */}
                {job.key_superpowers_needed && job.key_superpowers_needed.length > 0 && (
                  <div style={{
                    background: 'var(--nxt-bg-surface-subtle)',
                    border: '1px solid var(--nxt-border-subtle)',
                    borderRadius: '12px',
                    padding: '10px 12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <Award size={13} style={{ color: 'var(--nxt-accent-purple, #a855f7)' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--nxt-accent-purple, #a855f7)', textTransform: 'uppercase' }}>
                        Superpowers to Showcase
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {job.key_superpowers_needed.map((sp, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '11px',
                            color: 'var(--nxt-accent-purple, #a855f7)',
                            background: 'var(--nxt-bg-surface)',
                            border: '1px solid var(--nxt-border-subtle)',
                            borderRadius: '6px',
                            padding: '2px 8px'
                          }}
                        >
                          ⚡ {sp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tactical Attack Strategy */}
                {job.action_strategy && (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--nxt-text-secondary)',
                    lineHeight: 1.4,
                    borderTop: '1px solid var(--nxt-border-subtle)',
                    paddingTop: '10px'
                  }}>
                    <strong style={{ color: 'var(--nxt-text-primary)' }}>Tactical Plan: </strong>
                    {job.action_strategy}
                  </div>
                )}

                {/* 1-Click Action Hub */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px',
                  marginTop: 'auto',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--nxt-border-subtle)'
                }}>
                  {/* Tailor ATS Resume */}
                  <button
                    id={`tailor-ats-btn-${job.id}`}
                    onClick={() => handleTailorResume(job)}
                    className="apple-btn"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '7px 8px',
                      background: 'rgba(10, 132, 255, 0.12)',
                      border: '1px solid rgba(10, 132, 255, 0.3)',
                      color: '#0a84ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      borderRadius: '8px'
                    }}
                    title="Tailor ATS Resume specifically for this role"
                  >
                    <Target size={13} />
                    Tailor ATS
                  </button>

                  {/* 30-60-90 WIN Doc */}
                  <button
                    id={`generate-win-doc-btn-${job.id}`}
                    onClick={() => handleGenerateWinDoc(job)}
                    className="apple-btn"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '7px 8px',
                      background: 'rgba(191, 90, 242, 0.12)',
                      border: '1px solid rgba(191, 90, 242, 0.3)',
                      color: '#bf5af2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      borderRadius: '8px'
                    }}
                    title="Generate 30-60-90 Day Executive WIN Pitch"
                  >
                    <FileText size={13} />
                    WIN Deck
                  </button>

                  {/* Find Decision Makers */}
                  <button
                    id={`find-contacts-btn-${job.id}`}
                    onClick={() => handleFindDecisionMakers(job)}
                    className="apple-btn"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '7px 8px',
                      background: 'rgba(50, 215, 75, 0.12)',
                      border: '1px solid rgba(50, 215, 75, 0.3)',
                      color: '#32d74b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      borderRadius: '8px'
                    }}
                    title="Find Hiring Managers & Engineers at this company"
                  >
                    <Users size={13} />
                    Find Leads
                  </button>

                  {/* Add to Kanban Pipeline */}
                  <button
                    id={`add-pipeline-btn-${job.id}`}
                    onClick={() => handleAddToPipeline(job)}
                    className="apple-btn"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '7px 8px',
                      background: actionSuccessId === job.id ? 'rgba(50,215,75,0.25)' : 'rgba(255, 214, 10, 0.12)',
                      border: actionSuccessId === job.id ? '1px solid #32d74b' : '1px solid rgba(255, 214, 10, 0.3)',
                      color: actionSuccessId === job.id ? '#32d74b' : '#ffd60a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      borderRadius: '8px'
                    }}
                    title="Add this opportunity to active Application Pipeline"
                  >
                    {actionSuccessId === job.id ? <Check size={13} /> : <Briefcase size={13} />}
                    {actionSuccessId === job.id ? 'In Pipeline' : 'Track Kanban'}
                  </button>

                  {/* Ask Nova */}
                  <button
                    id={`ask-nova-btn-${job.id}`}
                    onClick={() => handleAskNova(job)}
                    className="apple-btn"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '7px 8px',
                      background: 'linear-gradient(135deg, rgba(10,132,255,0.15) 0%, rgba(191,90,242,0.15) 100%)',
                      border: '1px solid rgba(191,90,242,0.3)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      borderRadius: '8px'
                    }}
                    title="Get autonomous strategy from Nova Copilot"
                  >
                    <Sparkles size={13} style={{ color: '#bf5af2' }} />
                    Ask Nova
                  </button>

                  {/* Delete / Remove */}
                  <button
                    id={`delete-target-job-btn-${job.id}`}
                    onClick={(e) => handleDeleteJob(job.id, job.job_title, e)}
                    className="apple-btn"
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '7px',
                      background: 'rgba(255, 69, 58, 0.08)',
                      border: '1px solid rgba(255, 69, 58, 0.2)',
                      color: '#ff453a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      maxWidth: '36px'
                    }}
                    title="Delete role"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Analyze Role Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--nxt-bg-card)',
            border: '1px solid var(--nxt-border-subtle)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '560px',
            padding: '30px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--nxt-shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--nxt-text-primary)', margin: 0 }}>
                  Add & Analyze Target Role
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--nxt-text-secondary)', margin: '4px 0 0' }}>
                  Paste a job URL or description to analyze match score and attack vectors
                </p>
              </div>

              <button
                id="prefill-granola-modal-btn"
                type="button"
                onClick={handlePrefillGranola}
                className="apple-btn"
                style={{
                  fontSize: '11px',
                  padding: '5px 10px',
                  background: 'rgba(255, 214, 10, 0.12)',
                  border: '1px solid rgba(255, 214, 10, 0.3)',
                  color: '#ffd60a',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Flame size={12} />
                Fill Granola Example
              </button>
            </div>

            <form onSubmit={handleAnalyzeAndSave}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                  Job Listing URL (e.g. Granola, Stripe, OpenAI)
                </label>
                <input
                  id="target-job-url-input"
                  className="apple-input"
                  placeholder="https://www.granola.ai/jobs/ai-engineer"
                  value={form.job_url}
                  onChange={(e) => setForm({ ...form, job_url: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                    Job Title
                  </label>
                  <input
                    id="target-job-title-input"
                    className="apple-input"
                    placeholder="AI Engineer / Tech Lead"
                    value={form.job_title}
                    onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                    Company Name
                  </label>
                  <input
                    id="target-job-company-input"
                    className="apple-input"
                    placeholder="Granola"
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                    Category Priority
                  </label>
                  <select
                    id="target-job-category-select"
                    className="apple-input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="Target Dream Role">Target Dream Role</option>
                    <option value="High Priority">High Priority</option>
                    <option value="Benchmark">Benchmark</option>
                    <option value="Stealth / Advisory">Stealth / Advisory</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                    Salary Band
                  </label>
                  <input
                    id="target-job-salary-input"
                    className="apple-input"
                    placeholder="$140k - $200k + Equity"
                    value={form.salary_range}
                    onChange={(e) => setForm({ ...form, salary_range: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                  Why do you target this role? (Strategic Conviction)
                </label>
                <input
                  id="target-job-why-input"
                  className="apple-input"
                  placeholder="e.g. Next-gen AI workspace, elite design craft, high engineering autonomy"
                  value={form.why_targeted}
                  onChange={(e) => setForm({ ...form, why_targeted: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                  Job Description / Role Requirements (Optional)
                </label>
                <textarea
                  id="target-job-jd-textarea"
                  className="apple-textarea"
                  style={{ minHeight: '80px', fontSize: '12px' }}
                  placeholder="Paste requirements, mission statement, tech stack, or JD text here..."
                  value={form.job_description}
                  onChange={(e) => setForm({ ...form, job_description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  id="cancel-add-target-job-btn"
                  type="button"
                  className="apple-btn apple-btn-ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  id="submit-analyze-target-job-btn"
                  type="submit"
                  disabled={analyzing}
                  className="apple-btn apple-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {analyzing ? (
                    <>
                      <Loader2 size={15} className="spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Analyze & Save Role
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
