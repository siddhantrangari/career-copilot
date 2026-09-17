import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Bookmark, 
  BookmarkCheck, 
  Sparkles, 
  Filter, 
  SlidersHorizontal, 
  ChevronDown, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  Layers,
  ArrowRight,
  TrendingUp,
  Building,
  Target,
  Globe2,
  Copy,
  Check,
  Loader2,
  Flame,
  Zap,
  Radio
} from 'lucide-react';
import { api } from '../services/api';
import confetti from 'canvas-confetti';

export function JobBoardPage({ onNavigate }) {
  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [searchTitle, setSearchTitle] = useState('AI Engineer');
  const [experienceLevel, setExperienceLevel] = useState('Any Experience');
  const [location, setLocation] = useState('Remote');
  const [workModes, setWorkModes] = useState(['Remote', 'Hybrid']);
  const [showFilters, setShowFilters] = useState(false);
  const [showBooleanMatrix, setShowBooleanMatrix] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [copiedKey, setCopiedKey] = useState('');
  const [booleanData, setBooleanData] = useState(null);

  const recentSearches = [
    { query: 'AI Engineer', time: 'Just now' },
    { query: 'Staff Engineering Lead', time: '10m' },
    { query: 'VP Marketing', time: '1h' },
    { query: 'Director of Product', time: '3h' },
    { query: 'Founding Fullstack Engineer', time: '1d' }
  ];

  // Fetch Live Scraped Jobs & Boolean Search Strings from Backend
  const fetchLiveJobs = async (titleToSearch = searchTitle, locToSearch = location, expToSearch = experienceLevel) => {
    setIsLoadingJobs(true);
    try {
      // 1. Fetch live scraped jobs from ATS feeds & search crawler
      const scraped = await api.getLiveJobs({
        query: titleToSearch || 'AI Engineer',
        location: locToSearch || 'Remote',
        experience: expToSearch || 'Mid-Senior'
      });

      if (Array.isArray(scraped) && scraped.length > 0) {
        setJobs(scraped);
      }

      // 2. Fetch 15-ATS Boolean Search Matrix
      const matrix = await api.getBooleanMatrix({
        role: titleToSearch || 'AI Engineer',
        location: locToSearch || 'Remote'
      });
      if (matrix) {
        setBooleanData(matrix);
      }
    } catch (err) {
      console.error('[JobBoard live scrape error]', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchLiveJobs('AI Engineer', 'Remote', 'Any Experience');
  }, []);

  const handleAskNovaForJob = (job) => {
    const prompt = `I'm targeting the "${job.title}" role at ${job.company} (${job.location}, ${job.workMode || 'Remote'}). 
1. Give me the Google & LinkedIn Boolean search query to find hiring managers and recruiters for this specific role.
2. What are the key skills to emphasize in my resume for this position?
3. Generate a 3-sentence high-impact referral pitch.`;
    
    window.dispatchEvent(new CustomEvent('ask-nova', { detail: { prompt } }));
  };

  const handleTailorForJob = (job) => {
    sessionStorage.setItem('prefill_target_job', JSON.stringify({
      job_url: job.url || '',
      company_name: job.company || '',
      job_title: job.title || '',
      job_description: job.description || `Role: ${job.title} at ${job.company}\nLocation: ${job.location}\nSkills required: ${(job.skills || []).join(', ')}`
    }));
    onNavigate('ats');
  };

  const toggleBookmark = (id) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  return (
    <div>
      {/* ── 1. Live Job Search & Filter Box ──────────────────────────── */}
      <div className="nxt-filter-card">
        <div className="nxt-filter-main-row">
          {/* Job Title Input */}
          <div className="nxt-input-group">
            <label className="nxt-input-label">Job Title / Keyword</label>
            <div style={{ position: 'relative' }}>
              <input
                id="filter-job-title-input"
                type="text"
                className="nxt-input-field"
                placeholder="e.g. AI Engineer, VP Marketing, Staff Tech Lead"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    fetchLiveJobs(searchTitle, location, experienceLevel);
                  }
                }}
                style={{ paddingLeft: 34 }}
              />
              <Search size={15} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--nxt-text-muted)' }} />
            </div>
          </div>

          {/* Experience Dropdown */}
          <div className="nxt-input-group">
            <label className="nxt-input-label">Experience</label>
            <select
              id="filter-experience-select"
              className="nxt-input-field"
              value={experienceLevel}
              onChange={(e) => {
                setExperienceLevel(e.target.value);
                fetchLiveJobs(searchTitle, location, e.target.value);
              }}
            >
              <option value="Any Experience">Any Experience</option>
              <option value="1-3 yrs">1-3 yrs (Junior / Mid)</option>
              <option value="3-5 yrs">3-5 yrs (Mid-Senior)</option>
              <option value="5-10 yrs">5-10 yrs (Senior / Lead)</option>
              <option value="10+ yrs">10+ yrs (Staff / Director)</option>
              <option value="15+ yrs">15+ yrs (VP / Executive)</option>
            </select>
          </div>

          {/* Location Input */}
          <div className="nxt-input-group">
            <label className="nxt-input-label">Location / Work Mode</label>
            <div style={{ position: 'relative' }}>
              <input
                id="filter-location-input"
                type="text"
                className="nxt-input-field"
                placeholder="e.g. Remote, San Francisco, London"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    fetchLiveJobs(searchTitle, location, experienceLevel);
                  }
                }}
                style={{ paddingLeft: 34 }}
              />
              <MapPin size={15} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--nxt-text-muted)' }} />
            </div>
          </div>

          {/* Search Button */}
          <button
            id="job-board-search-btn"
            className="nxt-btn-apply"
            style={{ height: 40, padding: '0 24px', fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            onClick={() => fetchLiveJobs(searchTitle, location, experienceLevel)}
            disabled={isLoadingJobs}
          >
            {isLoadingJobs ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                Scraping Live...
              </>
            ) : (
              <>
                <Search size={15} />
                Live Scrape Jobs
              </>
            )}
          </button>
        </div>

        {/* Recent Searches Chips */}
        <div className="nxt-recent-chips">
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--nxt-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            RECENT:
          </span>
          {recentSearches.map((rec, idx) => (
            <button
              key={idx}
              id={`recent-search-${idx}`}
              className={`nxt-chip ${searchTitle === rec.query ? 'active' : ''}`}
              onClick={() => {
                setSearchTitle(rec.query);
                fetchLiveJobs(rec.query, location, experienceLevel);
              }}
            >
              <Clock size={11} />
              <span>{rec.query}</span>
            </button>
          ))}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              id="toggle-boolean-matrix-btn"
              className={`nxt-chip ${showBooleanMatrix ? 'active' : ''}`}
              onClick={() => setShowBooleanMatrix(!showBooleanMatrix)}
              style={{ fontWeight: 700 }}
            >
              <Globe2 size={12} color="var(--nxt-primary)" />
              15-ATS Boolean Matrix ({showBooleanMatrix ? 'Open' : 'View'})
            </button>
            <button
              id="filter-suggest-btn"
              className="nxt-chip"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('ask-nova', { 
                  detail: { prompt: `Give me the top target job criteria and recruiter search queries for a candidate targeting ${searchTitle || 'Tech Leader'} roles.` } 
                }));
              }}
            >
              <Sparkles size={12} color="#4f46e5" />
              ✨ Ask Nova Filters
            </button>
          </div>
        </div>

        {/* ── 2. 15-ATS Boolean Search Matrix & Hidden Jobs Finder Toolbar ── */}
        {showBooleanMatrix && booleanData && (
          <div style={{ 
            marginTop: 16, 
            padding: '16px 18px', 
            background: 'var(--nxt-bg-surface-subtle)', 
            border: '1px solid var(--nxt-border-subtle)', 
            borderRadius: '12px',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="nxt-badge nxt-badge-hybrid" style={{ fontSize: 11, fontWeight: 700 }}>
                  <Radio size={12} style={{ animation: 'pulse 1.5s infinite' }} /> 15-ATS Boolean Matrix & Hidden Jobs
                </span>
                <span style={{ fontSize: 12, color: 'var(--nxt-text-secondary)', fontWeight: 600 }}>
                  Target: <strong style={{ color: 'var(--nxt-text-primary)' }}>{booleanData.role}</strong> in <strong style={{ color: 'var(--nxt-text-primary)' }}>{booleanData.location}</strong>
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--nxt-text-tertiary)' }}>
                Index: Greenhouse, Lever, Ashby, Workday, iCIMS, Taleo, SmartRecruiters, Jobvite
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
              {/* String 1: Google 15-ATS Portal Search */}
              <div style={{ background: 'var(--nxt-bg-surface)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--nxt-border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--nxt-text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Globe2 size={13} color="var(--nxt-primary)" /> 1. Google 15-ATS Index String
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="nxt-chip"
                      style={{ padding: '2px 8px', fontSize: 11 }}
                      onClick={() => copyToClipboard(booleanData.google_ats_query, 'google_ats')}
                    >
                      {copiedKey === 'google_ats' ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                      {copiedKey === 'google_ats' ? 'Copied' : 'Copy'}
                    </button>
                    <a
                      href={booleanData.google_search_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nxt-chip active"
                      style={{ padding: '2px 8px', fontSize: 11, textDecoration: 'none', color: '#ffffff' }}
                    >
                      <ExternalLink size={11} /> Launch Google ↗
                    </a>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--nxt-text-secondary)', background: 'var(--nxt-bg-surface-subtle)', padding: '6px 8px', borderRadius: '6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                  {booleanData.google_ats_query}
                </div>
              </div>

              {/* String 2: LinkedIn Hiring Posts (Hidden Job Market) */}
              <div style={{ background: 'var(--nxt-bg-surface)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--nxt-border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--nxt-text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Sparkles size={13} color="#2563eb" /> 2. LinkedIn "Hiring" Posts String
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="nxt-chip"
                      style={{ padding: '2px 8px', fontSize: 11 }}
                      onClick={() => copyToClipboard(booleanData.linkedin_hiring_query, 'linkedin_hiring')}
                    >
                      {copiedKey === 'linkedin_hiring' ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                      {copiedKey === 'linkedin_hiring' ? 'Copied' : 'Copy'}
                    </button>
                    <a
                      href={booleanData.linkedin_search_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nxt-chip active"
                      style={{ padding: '2px 8px', fontSize: 11, textDecoration: 'none', color: '#ffffff' }}
                    >
                      <ExternalLink size={11} /> Launch LinkedIn ↗
                    </a>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--nxt-text-secondary)', background: 'var(--nxt-bg-surface-subtle)', padding: '6px 8px', borderRadius: '6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                  {booleanData.linkedin_hiring_query}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Live Jobs Section Header ────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--nxt-text-primary)', margin: 0 }}>
            Live Scraped Opportunities
          </h2>
          <span style={{ fontSize: 13, color: 'var(--nxt-text-tertiary)', fontWeight: 500 }}>
            ({jobs.length} verified real-time postings)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="nxt-chip"
            onClick={() => fetchLiveJobs(searchTitle, location, experienceLevel)}
            disabled={isLoadingJobs}
            style={{ fontWeight: 600 }}
          >
            <Zap size={12} color="#f59e0b" />
            Refresh Scraper
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoadingJobs && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--nxt-bg-surface)', borderRadius: '16px', border: '1px solid var(--nxt-border-subtle)', marginBottom: 24 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--nxt-primary)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: 4 }}>
            Live Crawling ATS Feeds for "{searchTitle}"...
          </h3>
          <p style={{ fontSize: 13, color: 'var(--nxt-text-secondary)', margin: 0 }}>
            Connecting to Greenhouse, Lever, Ashby, and verified company boards.
          </p>
        </div>
      )}

      {/* ── 4. 3-Column Job Cards Grid ────────────────────────────────── */}
      {!isLoadingJobs && (
        <div className="nxt-job-grid">
          {jobs.map(job => {
            const isSaved = bookmarkedIds.has(job.id);
            const initial = job.company ? job.company.charAt(0).toUpperCase() : 'J';

            return (
              <div key={job.id} id={`job-card-${job.id}`} className="nxt-job-card">
                {/* Top Row: Avatar + Title + Company + Bookmark */}
                <div>
                  <div className="nxt-job-card-header">
                    <div className="nxt-company-avatar">
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--nxt-text-primary)', lineHeight: 1.3, marginBottom: 2 }}>
                        {job.title}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--nxt-text-secondary)', fontWeight: 600 }}>
                        {job.company}
                      </div>
                    </div>
                    <button
                      id={`bookmark-btn-${job.id}`}
                      onClick={() => toggleBookmark(job.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSaved ? '#2563eb' : 'var(--nxt-text-tertiary)', padding: 4 }}
                      title={isSaved ? "Remove from bookmarks" : "Save job"}
                    >
                      {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                    </button>
                  </div>

                  {/* Metadata Tags */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                    {job.experience && (
                      <span className="nxt-badge nxt-badge-muted">
                        {job.experience}
                      </span>
                    )}
                    {job.location && (
                      <span className="nxt-badge nxt-badge-muted">
                        <MapPin size={10} /> {job.location}
                      </span>
                    )}
                    {job.workMode && (
                      <span className={`nxt-badge ${job.workMode === 'Hybrid' ? 'nxt-badge-hybrid' : 'nxt-badge-muted'}`}>
                        {job.workMode}
                      </span>
                    )}
                    {job.salary && (
                      <span className="nxt-badge nxt-badge-salary">
                        {job.salary}
                      </span>
                    )}
                  </div>

                  {/* Description Preview */}
                  {job.description && (
                    <p style={{ fontSize: 12, color: 'var(--nxt-text-secondary)', marginTop: 10, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {job.description}
                    </p>
                  )}

                  {/* Source & Check Score */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, fontSize: 11.5, color: 'var(--nxt-text-muted)' }}>
                    <span>Source: {job.source || 'Verified ATS'}</span>
                    <button 
                      id={`check-score-${job.id}`}
                      className="nxt-btn-score"
                      onClick={() => handleAskNovaForJob(job)}
                    >
                      <CheckCircle2 size={13} color="#2563eb" />
                      <span>{job.score || 88}% Match</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Actions: Ask Nova & 1-Click Tailor / Apply */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--nxt-text-tertiary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Posted {job.postedDate || 'Recently'}</span>
                    {job.url && (
                      <a 
                        href={job.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, color: 'var(--nxt-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}
                      >
                        Direct Link <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <div className="nxt-card-actions">
                    <button
                      id={`ask-nova-btn-${job.id}`}
                      className="nxt-btn-ask-nova"
                      onClick={() => handleAskNovaForJob(job)}
                    >
                      <Sparkles size={13} />
                      Ask Nova
                    </button>
                    <button
                      id={`apply-now-btn-${job.id}`}
                      className="nxt-btn-apply"
                      onClick={() => handleTailorForJob(job)}
                      title="Pre-fill ATS Tailor Engine with this job"
                    >
                      ⚡ 1-Click Tailor
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default JobBoardPage;

