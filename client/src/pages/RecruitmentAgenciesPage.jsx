import React, { useState } from 'react';
import { 
  Users2, 
  Search, 
  Sparkles, 
  Plus, 
  Briefcase, 
  Building2, 
  MapPin, 
  MoreVertical, 
  Check, 
  X,
  ChevronDown
} from 'lucide-react';

const INITIAL_AGENCIES = [
  {
    id: 'ag-1',
    name: 'LHH',
    industry: 'Human Resources Services',
    hq: 'Jacksonville, Florida',
    targetLocation: 'Dubai',
    jobsCount: 0,
    networksCount: 0,
    addedAgo: '0 mins ago',
    logoText: 'LHH'
  },
  {
    id: 'ag-2',
    name: 'Aquent',
    industry: 'Staffing and Recruiting',
    hq: 'Boston, MA',
    targetLocation: 'Germany',
    jobsCount: 0,
    networksCount: 0,
    addedAgo: '13 hrs ago',
    logoText: 'A'
  },
  {
    id: 'ag-3',
    name: 'Sundus',
    industry: 'Human Resources Services',
    hq: 'Mohamed Bin Zayed City, Abu Dhabi',
    targetLocation: 'Dubai',
    jobsCount: 0,
    networksCount: 0,
    addedAgo: '2 weeks ago',
    logoText: 'S'
  },
  {
    id: 'ag-4',
    name: 'Cielo Talent',
    industry: 'Human Resources Services',
    hq: 'Wauwatosa, Wisconsin',
    targetLocation: 'Dubai',
    jobsCount: 0,
    networksCount: 0,
    addedAgo: '2 weeks ago',
    logoText: 'CT'
  },
  {
    id: 'ag-5',
    name: 'Hays',
    industry: 'Staffing and Recruiting',
    hq: 'London, England',
    targetLocation: 'Dubai',
    jobsCount: 0,
    networksCount: 0,
    addedAgo: '09/08/2026',
    logoText: 'H'
  },
  {
    id: 'ag-6',
    name: 'TASC Outsourcing',
    industry: 'Human Resources Services',
    hq: 'Dubai',
    targetLocation: 'Dubai',
    jobsCount: 0,
    networksCount: 0,
    addedAgo: '26/07/2026',
    logoText: 'TASC'
  }
];

const DISCOVERY_AGENCIES = [
  { id: 'disc-ag-1', name: 'Hiring Future', industry: 'Human Resources Services', hq: 'London, UK' },
  { id: 'disc-ag-2', name: 'TRS Staffing Solutions', industry: 'Staffing and Recruiting', hq: 'Greenville, SC' },
  { id: 'disc-ag-3', name: 'Airswift', industry: 'Staffing and Recruiting', hq: 'Manchester, UK' },
  { id: 'disc-ag-4', name: 'Michael Page', industry: 'Staffing and Recruiting', hq: 'Weybridge, UK' },
  { id: 'disc-ag-5', name: 'Robert Half', industry: 'Staffing and Recruiting', hq: 'Menlo Park, CA' }
];

export function RecruitmentAgenciesPage({ onNavigate }) {
  const [agencies, setAgencies] = useState(INITIAL_AGENCIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);
  
  // Modal state
  const [discoverLocations, setDiscoverLocations] = useState(['Dubai']);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredList, setDiscoveredList] = useState(DISCOVERY_AGENCIES);
  const [addedIds, setAddedIds] = useState(new Set());

  const handleAskNovaForAgency = (ag) => {
    const prompt = `I want to connect with senior headhunters and executive recruiters at ${ag.name} (${ag.industry}, HQ: ${ag.hq}).
1. Provide the LinkedIn Boolean search query for executive tech recruiters in ${ag.targetLocation}.
2. Give me a tailored cold outreach pitch to get represented by them.`;

    window.dispatchEvent(new CustomEvent('ask-nova', { detail: { prompt } }));
  };

  const handleFindPeople = (ag) => {
    const prompt = `Find executive placement agents and senior recruiters at ${ag.name} focusing on ${ag.targetLocation}. Give me direct search URLs.`;
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
    }, 600);
  };

  const handleAddAgencyToBoard = (disc) => {
    const newAg = {
      id: `ag-${Date.now()}`,
      name: disc.name,
      industry: disc.industry,
      hq: disc.hq,
      targetLocation: discoverLocations[0] || 'Dubai',
      jobsCount: 0,
      networksCount: 0,
      addedAgo: 'Just now',
      logoText: disc.name.slice(0, 2).toUpperCase()
    };

    setAgencies([newAg, ...agencies]);
    setAddedIds(new Set([...addedIds, disc.id]));
    setSuccessBanner(`Added ${disc.name}`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const filteredAgencies = agencies.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Success Notification Banner */}
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
            Recruitment Agencies
          </h1>
          <p style={{ fontSize: 13, color: 'var(--nxt-text-secondary)', margin: 0 }}>
            Track recruitment agencies and explore job opportunities
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: 240 }}>
            <input
              id="search-agencies-input"
              type="text"
              className="nxt-input-field"
              placeholder="Search agencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 32, height: 38 }}
            />
            <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--nxt-text-muted)' }} />
          </div>

          {/* Discover Agencies Button */}
          <button
            id="discover-agencies-btn"
            className="nxt-btn-ask-nova"
            style={{ height: 38, padding: '0 16px', fontSize: 13 }}
            onClick={() => setShowDiscoverModal(true)}
          >
            <Sparkles size={14} />
            Discover agencies
          </button>

          {/* Add Agency Dropdown */}
          <button
            id="add-agency-btn"
            className="nxt-btn-apply"
            style={{ height: 38, padding: '0 16px', fontSize: 13 }}
            onClick={() => setShowDiscoverModal(true)}
          >
            <Plus size={15} />
            Add Agency
            <ChevronDown size={14} style={{ marginLeft: 2 }} />
          </button>
        </div>
      </div>

      {/* Agencies Grid (3 Columns) */}
      <div className="nxt-job-grid">
        {filteredAgencies.map(ag => (
          <div key={ag.id} id={`agency-card-${ag.id}`} className="nxt-job-card">
            <div>
              <div className="nxt-job-card-header">
                <div className="nxt-company-avatar" style={{ backgroundColor: '#f1f5f9', color: '#1e293b', fontWeight: 800 }}>
                  {ag.logoText}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--nxt-text-primary)' }}>
                    {ag.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--nxt-text-secondary)', marginTop: 2 }}>
                    {ag.industry}
                  </div>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--nxt-text-tertiary)', cursor: 'pointer' }}>
                  <MoreVertical size={16} />
                </button>
              </div>

              {/* Agency Info Row */}
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--nxt-text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={13} color="var(--nxt-text-tertiary)" />
                  <span>HQ · {ag.hq}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} color="var(--nxt-text-tertiary)" />
                  <span>Target · <strong style={{ color: 'var(--nxt-text-primary)' }}>{ag.targetLocation}</strong></span>
                </div>
              </div>

              {/* Counters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, fontSize: 12, color: 'var(--nxt-text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Briefcase size={13} /> {ag.jobsCount} Jobs
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Users2 size={13} /> {ag.networksCount} Networks
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--nxt-text-tertiary)' }}>
                  {ag.addedAgo}
                </span>
              </div>
            </div>

            {/* Actions: Ask Nova & Find people */}
            <div className="nxt-card-actions">
              <button
                id={`ask-nova-agency-${ag.id}`}
                className="nxt-btn-ask-nova"
                onClick={() => handleAskNovaForAgency(ag)}
              >
                <Sparkles size={13} />
                Ask Nova
              </button>
              <button
                id={`find-people-agency-${ag.id}`}
                className="nxt-btn-ask-nova"
                style={{ color: 'var(--nxt-text-primary)', borderColor: 'var(--nxt-border-subtle)' }}
                onClick={() => handleFindPeople(ag)}
              >
                <Users2 size={13} />
                Find people
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Discover Agencies Modal (Pixel-matched to Screenshot 2026-09-13 at 1.50.52 PM) ── */}
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
                    Discover agencies
                  </h3>
                  <p style={{ fontSize: 12.5, color: 'var(--nxt-text-secondary)', margin: '2px 0 0 0' }}>
                    Find agencies on LinkedIn and add them to your board
                  </p>
                </div>
              </div>
              <button
                id="close-discover-agency-modal-btn"
                onClick={() => setShowDiscoverModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--nxt-text-tertiary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    id="discover-agency-location-input"
                    type="text"
                    placeholder="Add another..."
                    value={newLocationInput}
                    onChange={(e) => setNewLocationInput(e.target.value)}
                    onKeyDown={handleAddLocationChip}
                    style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, minWidth: 100, background: 'transparent' }}
                  />
                </div>
                <span style={{ fontSize: 11, color: 'var(--nxt-text-tertiary)', marginTop: 4, display: 'block' }}>
                  Press Enter or comma to add more. Finds agencies headquartered in any of these.
                </span>
              </div>

              <button
                id="run-discover-agencies-btn"
                className="nxt-btn-apply"
                style={{ width: '100%', height: 42, fontSize: 14, backgroundColor: '#4f46e5', marginTop: 6 }}
                onClick={handleRunDiscover}
                disabled={isDiscovering}
              >
                {isDiscovering ? (
                  <span>Discovering agencies on LinkedIn...</span>
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
                        id={`add-discovered-agency-${item.id}`}
                        className="nxt-btn-apply"
                        style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                        onClick={() => handleAddAgencyToBoard(item)}
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

export default RecruitmentAgenciesPage;
