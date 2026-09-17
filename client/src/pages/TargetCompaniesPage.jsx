import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Sparkles, 
  Plus, 
  Users, 
  Briefcase, 
  MapPin, 
  MoreVertical, 
  Check, 
  X, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';

const INITIAL_TARGET_COMPANIES = [
  {
    id: 'comp-1',
    name: 'Skyroot Aerospace',
    industry: 'Space Research and Technology',
    hq: 'Hyderabad, Telangana',
    targetLocation: 'India',
    jobsCount: 0,
    networksCount: 0,
    addedAgo: '0 mins ago',
    logoText: 'SR'
  },
  {
    id: 'comp-2',
    name: 'Arkoz',
    industry: 'Computer Software',
    hq: 'San Francisco, US',
    targetLocation: 'United States',
    jobsCount: 0,
    networksCount: 0,
    addedAgo: '4 days ago',
    logoText: 'AK'
  },
  {
    id: 'comp-3',
    name: 'Dhruva Space',
    industry: 'Defense and Space Manufacturing',
    hq: 'Hyderabad, Telangana',
    targetLocation: 'India',
    jobsCount: 0,
    networksCount: 1,
    addedAgo: '4 days ago',
    logoText: 'DS'
  },
  {
    id: 'comp-4',
    name: 'Ford Foundation',
    industry: 'Philanthropic Fundraising Services',
    hq: 'New York, New York',
    targetLocation: 'India',
    jobsCount: 0,
    networksCount: 2,
    addedAgo: '2 weeks ago',
    logoText: 'F'
  },
  {
    id: 'comp-5',
    name: 'TARGET',
    industry: 'Retail',
    hq: 'Bengaluru',
    targetLocation: 'India',
    jobsCount: 0,
    networksCount: 5,
    addedAgo: '27/11/2025',
    logoText: 'T'
  },
  {
    id: 'comp-6',
    name: 'Silicon Labs',
    industry: 'Semiconductor Manufacturing',
    hq: 'Austin, TX',
    targetLocation: 'India',
    jobsCount: 0,
    networksCount: 1,
    addedAgo: '10/09/2026',
    logoText: 'SL'
  }
];

const DISCOVERY_SUGGESTIONS = [
  { id: 'disc-1', name: 'Anthropic', industry: 'Artificial Intelligence', hq: 'San Francisco, CA' },
  { id: 'disc-2', name: 'OpenAI', industry: 'Artificial Intelligence & Research', hq: 'San Francisco, CA' },
  { id: 'disc-3', name: 'Scale AI', industry: 'Machine Learning Infrastructure', hq: 'San Francisco, CA' },
  { id: 'disc-4', name: 'Perplexity AI', industry: 'Search & AI Intelligence', hq: 'San Francisco, CA' },
  { id: 'disc-5', name: 'Granola AI', industry: 'AI Productivity Software', hq: 'London / SF' }
];

export function TargetCompaniesPage({ onNavigate }) {
  const [companies, setCompanies] = useState(INITIAL_TARGET_COMPANIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);
  
  // Modal state
  const [discoverIndustry, setDiscoverIndustry] = useState('');
  const [discoverLocations, setDiscoverLocations] = useState(['India']);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredList, setDiscoveredList] = useState(DISCOVERY_SUGGESTIONS);
  const [addedIds, setAddedIds] = useState(new Set());

  const handleAskNovaForCompany = (comp) => {
    const prompt = `I want to break into ${comp.name} (${comp.industry}, HQ: ${comp.hq}). 
1. Who are the key executives, engineering/marketing directors, and recruiters?
2. Generate the exact Google & LinkedIn Boolean search query to find these decision makers.
3. What is the proven outreach sequence to get a referral at ${comp.name}?`;

    window.dispatchEvent(new CustomEvent('ask-nova', { detail: { prompt } }));
  };

  const handleFindPeople = (comp) => {
    const prompt = `Find 1st and 2nd degree employees and recruiters at ${comp.name} in ${comp.targetLocation || comp.hq}. Give me the LinkedIn search URL and message template.`;
    window.dispatchEvent(new CustomEvent('ask-nova', { detail: { prompt } }));
  };

  const handleAddLocationChip = (e) => {
    if (e.key === 'Enter' && newLocationInput.trim()) {
      e.preventDefault();
      if (!discoverLocations.includes(newLocationInput.trim())) {
        setDiscoverLocations([...discoverLocations, newLocationInput.trim()]);
      }
      setNewLocationInput('');
    }
  };

  const handleRemoveLocationChip = (loc) => {
    setDiscoverLocations(discoverLocations.filter(l => l !== loc));
  };

  const handleRunDiscover = () => {
    setIsDiscovering(true);
    setTimeout(() => {
      setIsDiscovering(false);
      // Filter list
      if (discoverIndustry) {
        setDiscoveredList(DISCOVERY_SUGGESTIONS.filter(d => d.industry.toLowerCase().includes(discoverIndustry.toLowerCase())));
      } else {
        setDiscoveredList(DISCOVERY_SUGGESTIONS);
      }
    }, 600);
  };

  const handleAddCompanyToBoard = (disc) => {
    const newComp = {
      id: `comp-${Date.now()}`,
      name: disc.name,
      industry: disc.industry,
      hq: disc.hq,
      targetLocation: discoverLocations[0] || 'United States',
      jobsCount: 0,
      networksCount: 0,
      addedAgo: 'Just now',
      logoText: disc.name.slice(0, 2).toUpperCase()
    };

    setCompanies([newComp, ...companies]);
    setAddedIds(new Set([...addedIds, disc.id]));
    setSuccessBanner(`Added ${disc.name}`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Success Notification Banner (matching screenshot) */}
      {successBanner && (
        <div style={{
          position: 'fixed',
          top: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ecfdf5',
          color: '#065f46',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '8px 20px',
          borderRadius: 20,
          fontWeight: 600,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 999
        }}>
          <Check size={16} />
          {successBanner}
        </div>
      )}

      {/* Header & Action Bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--nxt-text-primary)', margin: '0 0 4px 0' }}>
            Target Companies
          </h1>
          <p style={{ fontSize: 13, color: 'var(--nxt-text-secondary)', margin: 0 }}>
            Track your target companies and explore opportunities
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: 240 }}>
            <input
              id="search-companies-input"
              type="text"
              className="nxt-input-field"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 32, height: 38 }}
            />
            <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--nxt-text-muted)' }} />
          </div>

          {/* Discover Companies Button */}
          <button
            id="discover-companies-btn"
            className="nxt-btn-ask-nova"
            style={{ height: 38, padding: '0 16px', fontSize: 13 }}
            onClick={() => setShowDiscoverModal(true)}
          >
            <Sparkles size={14} />
            Discover companies
          </button>

          {/* Add Company Dropdown */}
          <button
            id="add-company-btn"
            className="nxt-btn-apply"
            style={{ height: 38, padding: '0 16px', fontSize: 13 }}
            onClick={() => setShowDiscoverModal(true)}
          >
            <Plus size={15} />
            Add Company
            <ChevronDown size={14} style={{ marginLeft: 2 }} />
          </button>
        </div>
      </div>

      {/* Companies Grid (3 Columns) */}
      <div className="nxt-job-grid">
        {filteredCompanies.map(comp => (
          <div key={comp.id} id={`company-card-${comp.id}`} className="nxt-job-card">
            <div>
              <div className="nxt-job-card-header">
                <div className="nxt-company-avatar" style={{ backgroundColor: '#f1f5f9', color: '#1e293b', fontWeight: 800 }}>
                  {comp.logoText}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--nxt-text-primary)' }}>
                    {comp.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--nxt-text-secondary)', marginTop: 2 }}>
                    {comp.industry}
                  </div>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--nxt-text-tertiary)', cursor: 'pointer' }}>
                  <MoreVertical size={16} />
                </button>
              </div>

              {/* Company Info Row */}
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--nxt-text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={13} color="var(--nxt-text-tertiary)" />
                  <span>HQ · {comp.hq}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} color="var(--nxt-text-tertiary)" />
                  <span>Target · <strong style={{ color: 'var(--nxt-text-primary)' }}>{comp.targetLocation}</strong></span>
                </div>
              </div>

              {/* Counters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, fontSize: 12, color: 'var(--nxt-text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Briefcase size={13} /> {comp.jobsCount} Jobs
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Users size={13} /> {comp.networksCount} Networks
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--nxt-text-tertiary)' }}>
                  {comp.addedAgo}
                </span>
              </div>
            </div>

            {/* Actions: Ask Nova & Find people */}
            <div className="nxt-card-actions">
              <button
                id={`ask-nova-comp-${comp.id}`}
                className="nxt-btn-ask-nova"
                onClick={() => handleAskNovaForCompany(comp)}
              >
                <Sparkles size={13} />
                Ask Nova
              </button>
              <button
                id={`find-people-comp-${comp.id}`}
                className="nxt-btn-ask-nova"
                style={{ color: 'var(--nxt-text-primary)', borderColor: 'var(--nxt-border-subtle)' }}
                onClick={() => handleFindPeople(comp)}
              >
                <Users size={13} />
                Find people
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Discover Companies Modal (Pixel-matched to Screenshot 2026-09-13 at 1.50.31 PM) ── */}
      {showDiscoverModal && (
        <div className="nxt-modal-overlay" onClick={() => setShowDiscoverModal(false)}>
          <div className="nxt-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--nxt-text-primary)' }}>
                    Discover companies
                  </h3>
                  <p style={{ fontSize: 12.5, color: 'var(--nxt-text-secondary)', margin: '2px 0 0 0' }}>
                    Find companies on LinkedIn and add them to your board
                  </p>
                </div>
              </div>
              <button
                id="close-discover-modal-btn"
                onClick={() => setShowDiscoverModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--nxt-text-tertiary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="nxt-input-label">Industry</label>
                <div style={{ position: 'relative', marginTop: 6 }}>
                  <input
                    id="discover-industry-input"
                    type="text"
                    className="nxt-input-field"
                    placeholder="Select an industry or type keyword..."
                    value={discoverIndustry}
                    onChange={(e) => setDiscoverIndustry(e.target.value)}
                  />
                  <Search size={14} style={{ position: 'absolute', right: 12, top: 13, color: 'var(--nxt-text-muted)' }} />
                </div>
              </div>

              <div>
                <label className="nxt-input-label">Headquartered in</label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 6,
                  border: '1px solid var(--nxt-border-subtle)',
                  borderRadius: 'var(--nxt-radius-md)',
                  padding: '6px 10px',
                  backgroundColor: 'var(--nxt-bg-surface)',
                  marginTop: 6
                }}>
                  {discoverLocations.map(loc => (
                    <span key={loc} className="nxt-chip active" style={{ fontSize: 12 }}>
                      <MapPin size={10} />
                      {loc}
                      <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveLocationChip(loc)} />
                    </span>
                  ))}
                  <input
                    id="discover-location-chip-input"
                    type="text"
                    placeholder="Add another..."
                    value={newLocationInput}
                    onChange={(e) => setNewLocationInput(e.target.value)}
                    onKeyDown={handleAddLocationChip}
                    style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, minWidth: 100, background: 'transparent' }}
                  />
                </div>
                <span style={{ fontSize: 11, color: 'var(--nxt-text-tertiary)', marginTop: 4, display: 'block' }}>
                  Press Enter or comma to add more. Finds companies headquartered in any of these.
                </span>
              </div>

              <button
                id="run-discover-companies-btn"
                className="nxt-btn-apply"
                style={{ width: '100%', height: 42, fontSize: 14, backgroundColor: '#4f46e5', marginTop: 6 }}
                onClick={handleRunDiscover}
                disabled={isDiscovering}
              >
                {isDiscovering ? (
                  <span>Discovering companies on LinkedIn...</span>
                ) : (
                  <>
                    <Search size={15} />
                    Discover
                  </>
                )}
              </button>
            </div>

            {/* Results List */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {discoveredList.map(item => {
                const isAdded = addedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      border: '1px solid var(--nxt-border-subtle)',
                      borderRadius: 'var(--nxt-radius-md)',
                      backgroundColor: 'var(--nxt-bg-surface-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="nxt-company-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--nxt-text-primary)' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--nxt-text-secondary)' }}>
                          {item.industry} · {item.hq}
                        </div>
                      </div>
                    </div>

                    {isAdded ? (
                      <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check size={14} /> Saved
                      </span>
                    ) : (
                      <button
                        id={`add-discovered-comp-${item.id}`}
                        className="nxt-btn-apply"
                        style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                        onClick={() => handleAddCompanyToBoard(item)}
                      >
                        <Plus size={13} /> Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TargetCompaniesPage;
