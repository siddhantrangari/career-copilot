import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { RelevantProfilesRadar } from '../components/RelevantProfilesRadar';
import {
  Users, Plus, Search, Copy, Check, ExternalLink, Trash2,
  Linkedin, Sparkles, ChevronDown, ChevronUp, ArrowRight,
  Loader2, RefreshCw, Target, MessageSquare, Building2,
  CheckCircle2, DollarSign, Award, Send, SlidersHorizontal,
  Lightbulb, Briefcase, Zap, Compass, Info, X
} from 'lucide-react';
import confetti from 'canvas-confetti';

const POPULAR_COMPANIES = [
  'Google', 'Stripe', 'Microsoft', 'Razorpay', 'OpenAI',
  'Amazon', 'Uber', 'Netflix', 'Swiggy', 'Zomato', 'Cred', 'Atlassian'
];

const COLUMNS = [
  { id: 'queued',   label: 'Queue',      color: '#636366',  emoji: '📋' },
  { id: 'sent',     label: 'Sent',       color: '#0a84ff',  emoji: '📤' },
  { id: 'accepted', label: 'Accepted',   color: '#32d74b',  emoji: '✅' },
  { id: 'engaged',  label: 'Engaged',    color: '#bf5af2',  emoji: '💬' },
  { id: 'converted',label: 'Converted',  color: '#ffd60a',  emoji: '🎯' },
];

function Avatar({ initials, color }) {
  const colors = ['#0a84ff','#32d74b','#bf5af2','#ff375f','#ffd60a','#5ac8fa'];
  const bg = color || colors[(initials?.charCodeAt(0) || 0) % colors.length] || '#0a84ff';
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', background: `${bg}22`,
      border: `1.5px solid ${bg}55`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 800, color: bg, flexShrink: 0
    }}>
      {initials || '??'}
    </div>
  );
}

function CopyBtn({ text, label, onAfterCopy }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onAfterCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className={`copy-btn ${copied ? 'copied' : ''}`} style={{ fontSize: 12, padding: '6px 12px' }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied!' : (label || 'Copy')}
    </button>
  );
}

function MessageLevel({ level, data, onOpenLinkedIn }) {
  const [expanded, setExpanded] = useState(level === 1);
  const colors = { 1: '#0a84ff', 2: '#bf5af2', 3: '#5ac8fa' };
  const color = colors[level];

  return (
    <div style={{ ...ls.levelCard, borderLeftColor: color }}>
      <div style={ls.levelHeader} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...ls.levelBadge, background: `${color}18`, color, border: `1px solid ${color}35` }}>
            Level {level}
          </div>
          <span style={ls.levelLabel}>{data?.label || `Message ${level}`}</span>
          {data?.send_timing && (
            <span style={ls.timing}>· {data.send_timing}</span>
          )}
          {level === 1 && (
            <span style={{ ...ls.charCount, color: (data?.char_count || data?.message?.length || 0) > 280 ? '#ff375f' : '#32d74b' }}>
              {data?.char_count || data?.message?.length || 0}/280 chars
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} color="#636366" /> : <ChevronDown size={14} color="#636366" />}
      </div>
      {expanded && (
        <div style={ls.levelBody}>
          <pre style={ls.msgText}>{data?.message || '—'}</pre>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <CopyBtn text={data?.message || ''} label={`Copy L${level} Note`} />
            <button
              id={`open-li-l${level}-btn`}
              onClick={() => {
                navigator.clipboard.writeText(data?.message || '');
                window.open('https://www.linkedin.com/messaging/', '_blank');
              }}
              style={ls.openLiBtn}
            >
              <Linkedin size={13} />
              Copy & Open LinkedIn
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function NetworkerPage() {
  const [contacts, setContacts] = useState([]);
  const [sequence, setSequence] = useState(null);
  const [searchQuery, setSearchQuery] = useState(null);
  const [companyIntel, setCompanyIntel] = useState(null);
  const [liStatus, setLiStatus] = useState({ connected: false });
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingSequence, setLoadingSequence] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [activeTab, setActiveTab] = useState('relevant_profiles'); // 'relevant_profiles' | 'company_search' | 'generator' | 'kanban' | 'search_query'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [selectedContactMessages, setSelectedContactMessages] = useState(null);
  const [kanbanFilter, setKanbanFilter] = useState('');
  const dragContact = useRef(null);

  // LinkedIn Modal Form
  const [liModalUrl, setLiModalUrl] = useState('');
  const [savingLi, setSavingLi] = useState(false);

  // Company Search Form
  const [companyInput, setCompanyInput] = useState('');
  const [companyRoleFilter, setCompanyRoleFilter] = useState('');

  // Generator form
  const [form, setForm] = useState({
    target_name: '', target_title: '', target_company: '',
    shared_context: '', contact_type: 'Hiring Manager',
    tone: 'Executive Peer'
  });

  // Search query form
  const [searchForm, setSearchForm] = useState({
    target_role: '', target_company: '', seniority: 'Senior', location: '',
  });

  // Add contact form
  const [addForm, setAddForm] = useState({ name: '', title: '', company: '', linkedin_url: '', notes: '' });

  const ff = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const sf = (k) => (e) => setSearchForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    loadContacts();
    loadLinkedInStatus();

    try {
      const stored = sessionStorage.getItem('prefill_network_company');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.company_name) {
          setCompanyInput(parsed.company_name);
          setActiveTab('company-search');
          setTimeout(() => {
            handleSearchCompany(parsed.company_name, parsed.target_role || '');
          }, 100);
        }
        sessionStorage.removeItem('prefill_network_company');
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, []);

  const loadContacts = async () => {
    try {
      const data = await api.getNetworkingContacts();
      setContacts(data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingContacts(false); }
  };

  const loadLinkedInStatus = async () => {
    try {
      const data = await api.getLinkedInStatus();
      setLiStatus(data || { connected: false });
      if (data?.linkedin_url) setLiModalUrl(data.linkedin_url);
    } catch (e) {}
  };

  const handleConnectLinkedInProfile = async () => {
    if (!liModalUrl.trim()) { alert('Please enter your LinkedIn profile URL'); return; }
    setSavingLi(true);
    try {
      const res = await api.connectLinkedInProfile({ linkedin_url: liModalUrl.trim() });
      setLiStatus({ connected: true, linkedin_url: res.linkedin_url, full_name: res.full_name });
      setShowLinkedInModal(false);
      confetti({ particleCount: 30, spread: 40 });
    } catch (e) {
      alert('Failed to connect LinkedIn: ' + e.message);
    } finally {
      setSavingLi(false);
    }
  };

  const handleDisconnectLinkedIn = async () => {
    try {
      await api.disconnectLinkedIn();
      setLiStatus({ connected: false });
      setShowLinkedInModal(false);
    } catch (e) {
      alert('Failed to disconnect: ' + e.message);
    }
  };

  const handleSearchCompany = async (companyToSearch, roleOverride) => {
    const targetComp = companyToSearch || companyInput;
    if (!targetComp.trim()) {
      alert('Please enter a company name to research.');
      return;
    }
    setLoadingCompany(true);
    setCompanyIntel(null);
    try {
      const data = await api.searchCompany({
        company_name: targetComp.trim(),
        target_role: roleOverride || companyRoleFilter || 'Senior Software Engineer'
      });
      setCompanyIntel(data);
    } catch (e) {
      alert('Company intelligence search failed: ' + e.message);
    } finally {
      setLoadingCompany(false);
    }
  };

  const handleDraftForPersona = (persona, compName) => {
    setForm(p => ({
      ...p,
      target_name: persona.suggested_name_placeholder || persona.persona_title,
      target_title: persona.persona_title,
      target_company: compName || companyIntel?.company_name || '',
      shared_context: persona.ideal_hook || `Admirer of ${compName || 'their team'}'s technology milestones`,
      contact_type: persona.persona_title.includes('Recruiter') ? 'Recruiter / TA' : 'Hiring Manager'
    }));
    setActiveTab('generator');
  };

  const handleAddPersonaToKanban = async (persona, compName) => {
    try {
      const contact = await api.addNetworkingContact({
        name: persona.suggested_name_placeholder || persona.persona_title,
        title: persona.persona_title,
        company: compName || companyIntel?.company_name || 'Target Company',
        kanban_status: 'queued',
        linkedin_url: persona.linkedin_search_url || '',
        notes: `Target Hook: ${persona.ideal_hook || ''}`
      });
      setContacts(prev => [contact, ...prev]);
      confetti({ particleCount: 30, spread: 50 });
      alert(`Added ${persona.persona_title} at ${compName || 'Target Company'} to Kanban!`);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleGenerateSequence = async () => {
    if (!form.target_name || !form.target_company) {
      alert('Enter target name and company.');
      return;
    }
    setLoadingSequence(true);
    setSequence(null);
    try {
      const data = await api.generateNetworkingSequence(form);
      setSequence(data);
    } catch (e) { alert('Generation failed: ' + e.message); }
    finally { setLoadingSequence(false); }
  };

  const handleGenerateSearchQuery = async () => {
    if (!searchForm.target_role) { alert('Enter target role.'); return; }
    setLoadingSearch(true);
    setSearchQuery(null);
    try {
      const data = await api.generateLinkedInSearchQuery(searchForm);
      setSearchQuery(data);
    } catch (e) { alert('Search query failed: ' + e.message); }
    finally { setLoadingSearch(false); }
  };

  const handleAddToKanban = async () => {
    if (!addForm.name) return;
    try {
      const contact = await api.addNetworkingContact({ ...addForm, kanban_status: 'queued' });
      setContacts(prev => [contact, ...prev]);
      setAddForm({ name: '', title: '', company: '', linkedin_url: '', notes: '' });
      setShowAddModal(false);
      confetti({ particleCount: 30, spread: 45 });
    } catch (e) { alert(e.message); }
  };

  const handleSaveAndAddContact = async () => {
    if (!sequence || !form.target_name) return;
    const contact = await api.addNetworkingContact({
      name: form.target_name,
      title: form.target_title,
      company: form.target_company,
      kanban_status: 'queued',
      message_sequence: [sequence.level_1, sequence.level_2, sequence.level_3].filter(Boolean),
    });
    setContacts(prev => [contact, ...prev]);
    confetti({ particleCount: 40, spread: 50 });
    setActiveTab('kanban');
  };

  const handleAdvanceStage = async (contact) => {
    const stageOrder = ['queued', 'sent', 'accepted', 'engaged', 'converted'];
    const curIdx = stageOrder.indexOf(contact.kanban_status);
    if (curIdx < stageOrder.length - 1) {
      const nextStage = stageOrder[curIdx + 1];
      await api.updateContactStatus(contact.id, nextStage);
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, kanban_status: nextStage } : c));
      if (nextStage === 'converted') confetti({ particleCount: 80, spread: 70 });
    }
  };

  const handleDragStart = (contact) => { dragContact.current = contact; };
  const handleDrop = async (targetStatus) => {
    const c = dragContact.current;
    if (!c || c.kanban_status === targetStatus) return;
    try {
      await api.updateContactStatus(c.id, targetStatus);
      setContacts(prev => prev.map(x => x.id === c.id ? { ...x, kanban_status: targetStatus } : x));
      if (targetStatus === 'converted') confetti({ particleCount: 80, spread: 70 });
    } catch (e) { console.error(e); }
  };

  const handleDeleteContact = async (id) => {
    await api.deleteNetworkingContact(id);
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  // Stats
  const sent = contacts.filter(c => ['sent','accepted','engaged','converted'].includes(c.kanban_status)).length;
  const accepted = contacts.filter(c => ['accepted','engaged','converted'].includes(c.kanban_status)).length;
  const engaged = contacts.filter(c => ['engaged','converted'].includes(c.kanban_status)).length;
  const converted = contacts.filter(c => c.kanban_status === 'converted').length;
  const total = contacts.length;
  const acceptRate = sent > 0 ? Math.round(accepted / sent * 100) : 0;
  const engageRate = accepted > 0 ? Math.round(engaged / accepted * 100) : 0;

  const filteredContacts = contacts.filter(c => {
    if (!kanbanFilter.trim()) return true;
    const term = kanbanFilter.toLowerCase();
    return c.name?.toLowerCase().includes(term) || c.company?.toLowerCase().includes(term) || c.title?.toLowerCase().includes(term);
  });

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div style={s.pageHeader} className="animate-slide-up">
        <div>
          <h1 style={s.pageTitle}>
            <Users size={24} style={{ verticalAlign: 'middle', marginRight: 10, color: '#0a84ff' }} />
            Networker & Company Intelligence Hub
          </h1>
          <p style={s.pageSub}>
            Autonomous LinkedIn Decision Maker Radar, 3-Level Sequence Generator & Contact Kanban
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {liStatus.connected ? (
            <button
              id="manage-li-btn"
              onClick={() => setShowLinkedInModal(true)}
              style={s.liConnectedBtn}
            >
              <div className="live-dot" />
              <span>LinkedIn Connected</span>
              <ExternalLink size={12} style={{ opacity: 0.7 }} />
            </button>
          ) : (
            <button
              id="connect-li-btn"
              className="apple-btn apple-btn-secondary"
              onClick={() => setShowLinkedInModal(true)}
            >
              <Linkedin size={15} color="#0a84ff" />
              Connect LinkedIn
            </button>
          )}
          <button id="add-contact-btn" className="apple-btn apple-btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={15} />
            Add Contact
          </button>
        </div>
      </div>

      {/* Top Stats Bar */}
      <div style={s.statsBar} className="animate-slide-up delay-100">
        {[
          { label: 'Total Contacts', value: total, color: '#0a84ff', icon: '👥' },
          { label: 'Outreach Sent', value: sent, color: '#5ac8fa', icon: '📤' },
          { label: 'Accepted', value: accepted, sub: `${acceptRate}% rate`, color: '#32d74b', icon: '✅' },
          { label: 'Engaged / In Talks', value: engaged, sub: `${engageRate}% response`, color: '#bf5af2', icon: '💬' },
          { label: 'Referrals Converted', value: converted, color: '#ffd60a', icon: '🎯' },
        ].map(stat => (
          <div key={stat.label} style={s.statCard} className="apple-glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>{stat.icon}</span>
              {stat.sub && <span style={{ fontSize: 11, fontWeight: 700, color: stat.color, background: `${stat.color}15`, padding: '2px 7px', borderRadius: 10 }}>{stat.sub}</span>}
            </div>
            <div style={{ ...s.statValue, color: stat.color, marginTop: 6 }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div style={s.tabRow} className="animate-slide-up delay-200">
        {[
          { id: 'relevant_profiles', label: 'Relevant Profiles Radar', icon: <Sparkles size={15} /> },
          { id: 'company_search',    label: 'Company & People Radar', icon: <Building2 size={15} /> },
          { id: 'generator',         label: 'Message Generator',      icon: <MessageSquare size={15} /> },
          { id: 'kanban',            label: `Contact Pipeline (${contacts.length})`, icon: <Users size={15} /> },
          { id: 'search_query',      label: 'Boolean Query Builder',  icon: <Search size={15} /> },
        ].map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className={`apple-segment-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 0: RELEVANT LINKEDIN PROFILES & TALENT RADAR
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'relevant_profiles' && (
        <RelevantProfilesRadar
          onDraftSequence={(persona, comp) => handleDraftForPersona(persona, comp)}
          onAddToKanban={(persona, comp) => handleAddPersonaToKanban(persona, comp)}
          onAskNova={(prompt) => {
            window.dispatchEvent(new CustomEvent('open-nova-drawer', { detail: { initialPrompt: prompt } }));
          }}
          onSwitchTab={(tab) => setActiveTab(tab)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: COMPANY INTELLIGENCE & PEOPLE RADAR
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'company_search' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Company Search Bar Card */}
          <div style={s.panel} className="apple-glass-panel">
            <div style={s.panelTitle}>
              <Compass size={17} color="#0a84ff" />
              Company Intelligence & Decision Maker Discovery
            </div>
            <p style={{ fontSize: 13, color: '#8e8e93', marginTop: -8, marginBottom: 16, lineHeight: 1.5 }}>
              Research any target company in seconds to discover tech stacks, salary compensation tiers, hiring personas, and tailored outreach hooks.
            </p>

            {/* Quick Chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: '#636366', alignSelf: 'center', fontWeight: 600 }}>Popular:</span>
              {POPULAR_COMPANIES.map(comp => (
                <button
                  key={comp}
                  onClick={() => { setCompanyInput(comp); handleSearchCompany(comp); }}
                  style={{
                    padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                    background: companyInput === comp ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${companyInput === comp ? 'rgba(10,132,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: companyInput === comp ? '#5ac8fa' : '#f5f5f7',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  {comp}
                </button>
              ))}
            </div>

            {/* Search Input Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
              <div className="apple-field">
                <label className="apple-label">Company Name *</label>
                <input
                  id="comp-search-input"
                  className="apple-input"
                  placeholder="e.g. Google, Stripe, Razorpay, Swiggy, Netflix..."
                  value={companyInput}
                  onChange={e => setCompanyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchCompany()}
                />
              </div>
              <div className="apple-field">
                <label className="apple-label">Target Role Filter</label>
                <input
                  id="comp-role-filter"
                  className="apple-input"
                  placeholder="e.g. Senior Backend Engineer / Tech Lead"
                  value={companyRoleFilter}
                  onChange={e => setCompanyRoleFilter(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchCompany()}
                />
              </div>
              <button
                id="search-comp-btn"
                className="apple-btn apple-btn-primary"
                onClick={() => handleSearchCompany()}
                disabled={loadingCompany}
                style={{ height: 42, padding: '0 20px', justifyContent: 'center' }}
              >
                {loadingCompany ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
                {loadingCompany ? 'Analyzing...' : 'Scan Company'}
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loadingCompany && (
            <div style={s.panel} className="apple-glass-panel">
              <div style={s.loadingState}>
                <Loader2 size={32} color="#0a84ff" style={{ animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f5f5f7' }}>Scanning corporate intelligence & hiring radar for {companyInput}…</div>
                <div style={{ fontSize: 13, color: '#8e8e93' }}>Synthesizing compensation data, tech stack, and decision maker personas</div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!companyIntel && !loadingCompany && (
            <div style={s.panel} className="apple-glass-panel">
              <div style={s.emptyState}>
                <div style={{ fontSize: 44, marginBottom: 8 }}>🏢</div>
                <div style={s.emptyTitle}>Enter a company or click a popular chip above</div>
                <div style={s.emptySub}>
                  Career Copilot will map out hiring managers, interview focus areas, compensation brackets, and 1-click LinkedIn outreach links.
                </div>
              </div>
            </div>
          )}

          {/* Intelligence Results View */}
          {companyIntel && !loadingCompany && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr', gap: 20 }}>
              {/* Left Column: Company Snapshot & Compensation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Overview Card */}
                <div style={s.panel} className="apple-glass-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.02em' }}>
                        {companyIntel.company_name}
                      </h2>
                      <p style={{ fontSize: 13, color: '#8e8e93', marginTop: 2 }}>{companyIntel.tagline}</p>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: 'rgba(50,215,75,0.12)', color: '#32d74b', border: '1px solid rgba(50,215,75,0.3)'
                    }}>
                      ⚡ {companyIntel.hiring_velocity}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                    <div style={s.metaItem}>
                      <span style={s.metaLabel}>Industry</span>
                      <span style={s.metaVal}>{companyIntel.industry || 'Tech'}</span>
                    </div>
                    <div style={s.metaItem}>
                      <span style={s.metaLabel}>Headquarters</span>
                      <span style={s.metaVal}>{companyIntel.headquarters || 'Global / Remote'}</span>
                    </div>
                  </div>

                  {/* Tech Stack */}
                  <div style={{ marginTop: 16 }}>
                    <div style={s.metaLabel}>Core Tech Stack</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {companyIntel.tech_stack?.map((t, idx) => (
                        <span key={idx} className="apple-badge apple-badge-blue" style={{ fontSize: 11 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Culture Summary */}
                  <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f5f5f7', marginBottom: 4 }}>🎯 Engineering Culture & Hiring Bar</div>
                    <p style={{ fontSize: 12, color: '#8e8e93', lineHeight: 1.55 }}>{companyIntel.culture_summary}</p>
                  </div>
                </div>

                {/* Compensation & Negotiation Insights */}
                <div style={s.panel} className="apple-glass-panel">
                  <div style={s.panelTitle}>
                    <DollarSign size={16} color="#ffd60a" />
                    Estimated Compensation & Negotiation Radar
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                    <div style={{ padding: '12px 14px', background: 'rgba(255,214,10,0.05)', border: '1px solid rgba(255,214,10,0.18)', borderRadius: 10 }}>
                      <div style={{ fontSize: 11, color: '#ffd60a', fontWeight: 700 }}>Senior Level</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#f5f5f7', marginTop: 4 }}>
                        {companyIntel.compensation_insights?.senior_level || 'Top Tier Market'}
                      </div>
                    </div>
                    <div style={{ padding: '12px 14px', background: 'rgba(191,90,242,0.05)', border: '1px solid rgba(191,90,242,0.18)', borderRadius: 10 }}>
                      <div style={{ fontSize: 11, color: '#bf5af2', fontWeight: 700 }}>Staff / Director Level</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#f5f5f7', marginTop: 4 }}>
                        {companyIntel.compensation_insights?.staff_director_level || 'Executive Tier'}
                      </div>
                    </div>
                  </div>

                  {companyIntel.compensation_insights?.negotiation_tip && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: '#8e8e93', lineHeight: 1.5 }}>
                      💡 <strong style={{ color: '#f5f5f7' }}>Negotiation Tip:</strong> {companyIntel.compensation_insights.negotiation_tip}
                    </div>
                  )}
                </div>

                {/* Interview Radar */}
                {companyIntel.interview_radar && (
                  <div style={s.panel} className="apple-glass-panel">
                    <div style={s.panelTitle}>
                      <Award size={16} color="#32d74b" />
                      Interview Focus Radar
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                      {companyIntel.interview_radar.focus_areas?.map((fa, i) => (
                        <span key={i} className="apple-badge apple-badge-emerald" style={{ fontSize: 11 }}>
                          ✓ {fa}
                        </span>
                      ))}
                    </div>
                    {companyIntel.interview_radar.insider_tip && (
                      <p style={{ fontSize: 12, color: '#8e8e93', marginTop: 10, lineHeight: 1.5 }}>
                        🔥 <strong style={{ color: '#f5f5f7' }}>Insider Tip:</strong> {companyIntel.interview_radar.insider_tip}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Key Hiring Personas & Direct Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={s.panel} className="apple-glass-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={s.panelTitle}>
                      <Users size={16} color="#0a84ff" />
                      Target Decision Makers at {companyIntel.company_name}
                    </div>
                    <span style={{ fontSize: 12, color: '#636366' }}>{companyIntel.key_hiring_personas?.length || 0} personas mapped</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {companyIntel.key_hiring_personas?.map((persona, pIdx) => (
                      <div key={pIdx} style={s.personaCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7' }}>
                              {persona.persona_title}
                            </div>
                            <div style={{ fontSize: 12, color: '#5ac8fa', marginTop: 2, fontWeight: 600 }}>
                              {persona.department}
                            </div>
                          </div>
                          <span style={{ padding: '3px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', fontSize: 11, color: '#8e8e93' }}>
                            Decision Maker
                          </span>
                        </div>

                        <p style={{ fontSize: 12, color: '#8e8e93', marginTop: 8, lineHeight: 1.5 }}>
                          <strong style={{ color: '#f5f5f7' }}>Why reach out:</strong> {persona.why_reach_out}
                        </p>

                        {persona.ideal_hook && (
                          <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(10,132,255,0.06)', borderRadius: 6, border: '1px solid rgba(10,132,255,0.15)', fontSize: 11, color: '#8e8e93' }}>
                            🎯 <strong style={{ color: '#5ac8fa' }}>Recommended Hook:</strong> {persona.ideal_hook}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                          <button
                            id={`draft-seq-${pIdx}-btn`}
                            className="apple-btn apple-btn-primary"
                            style={{ fontSize: 12, padding: '5px 12px' }}
                            onClick={() => handleDraftForPersona(persona, companyIntel.company_name)}
                          >
                            <Sparkles size={12} />
                            Draft 3-Level Sequence
                          </button>

                          <button
                            id={`add-kanban-${pIdx}-btn`}
                            className="apple-btn apple-btn-secondary"
                            style={{ fontSize: 12, padding: '5px 12px' }}
                            onClick={() => handleAddPersonaToKanban(persona, companyIntel.company_name)}
                          >
                            <Plus size={12} />
                            Add to Pipeline
                          </button>

                          {persona.linkedin_search_url && (
                            <a
                              href={persona.linkedin_search_url}
                              target="_blank"
                              rel="noreferrer"
                              className="apple-btn apple-btn-secondary"
                              style={{ fontSize: 12, padding: '5px 12px', textDecoration: 'none', display: 'inline-flex' }}
                            >
                              <Linkedin size={12} color="#0a84ff" />
                              Search on LinkedIn <ExternalLink size={11} style={{ marginLeft: 2 }} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: MESSAGE GENERATOR
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'generator' && (
        <div style={s.twoPanel} className="animate-fade-in">
          {/* Left: Input Form */}
          <div style={s.panel} className="apple-glass-panel">
            <div style={s.panelTitle}>
              <Target size={16} color="#0a84ff" />
              Target Prospect Details
            </div>
            <div style={s.formGrid}>
              <div className="apple-field">
                <label className="apple-label">Target Name *</label>
                <input id="target-name" className="apple-input" placeholder="e.g. Priya Sharma" value={form.target_name} onChange={ff('target_name')} />
              </div>
              <div className="apple-field">
                <label className="apple-label">Their Title</label>
                <input id="target-title" className="apple-input" placeholder="e.g. Engineering Director / VP" value={form.target_title} onChange={ff('target_title')} />
              </div>
              <div className="apple-field" style={{ gridColumn: '1/-1' }}>
                <label className="apple-label">Company *</label>
                <input id="target-company" className="apple-input" placeholder="e.g. Stripe, Google, Razorpay, Netflix" value={form.target_company} onChange={ff('target_company')} />
              </div>
              <div className="apple-field">
                <label className="apple-label">Contact Type</label>
                <select id="contact-type" className="apple-select" value={form.contact_type} onChange={ff('contact_type')}>
                  <option>Hiring Manager</option>
                  <option>Potential Referrer (Peer / Same Level)</option>
                  <option>Recruiter / Talent Lead</option>
                  <option>Executive / C-Suite</option>
                  <option>Alumni / Ex-Colleague</option>
                </select>
              </div>
              <div className="apple-field">
                <label className="apple-label">Outreach Tone</label>
                <select id="outreach-tone" className="apple-select" value={form.tone} onChange={ff('tone')}>
                  <option>Executive Peer (High Authority)</option>
                  <option>Curious Admirer (Low Friction)</option>
                  <option>Value-Add / Problem Solver</option>
                  <option>Direct Referral Request</option>
                </select>
              </div>
              <div className="apple-field" style={{ gridColumn: '1/-1' }}>
                <label className="apple-label">Shared Hook / Context (Optional)</label>
                <textarea
                  id="shared-context"
                  className="apple-textarea"
                  rows={3}
                  placeholder="e.g. Loved their post on distributed queues, saw their recent product launch, mutual friend Rahul, alumni from same university..."
                  value={form.shared_context}
                  onChange={ff('shared_context')}
                />
              </div>
            </div>
            <button
              id="generate-seq-btn"
              className="apple-btn apple-btn-primary"
              style={{ width: '100%', marginTop: 16, justifyContent: 'center', height: 42 }}
              onClick={handleGenerateSequence}
              disabled={loadingSequence}
            >
              {loadingSequence
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Crafting 3-Level Sequence…</>
                : <><Sparkles size={16} /> Generate 3-Level Outreach Sequence</>}
            </button>
          </div>

          {/* Right: Output */}
          <div style={s.panel} className="apple-glass-panel">
            <div style={s.panelTitle}>
              <MessageSquare size={16} color="#bf5af2" />
              Tailored Outreach Sequence
              {sequence?.success_probability && (
                <span style={{
                  ...ls.probBadge,
                  background: sequence.success_probability === 'High' ? 'rgba(50,215,75,0.1)' : 'rgba(255,214,10,0.1)',
                  color: sequence.success_probability === 'High' ? '#32d74b' : '#ffd60a',
                  border: `1px solid ${sequence.success_probability === 'High' ? 'rgba(50,215,75,0.25)' : 'rgba(255,214,10,0.25)'}`,
                }}>
                  {sequence.success_probability} Reply Probability
                </span>
              )}
            </div>

            {!sequence && !loadingSequence && (
              <div style={s.emptyState}>
                <div style={{ fontSize: 38 }}>✉️</div>
                <div style={s.emptyTitle}>Enter target details or pick a persona</div>
                <div style={s.emptySub}>
                  AI generates a 3-step sequence: Connection Note (under 280 chars), Post-Accept DM, and Follow-Up Bump.
                </div>
              </div>
            )}

            {loadingSequence && (
              <div style={s.loadingState}>
                <Loader2 size={28} color="#0a84ff" style={{ animation: 'spin 1s linear infinite' }} />
                <div>Synthesizing high-converting networking sequence…</div>
              </div>
            )}

            {sequence && (
              <>
                {[1, 2, 3].map(lvl => (
                  <MessageLevel
                    key={lvl}
                    level={lvl}
                    data={sequence[`level_${lvl}`]}
                  />
                ))}
                {sequence.linkedin_search_tip && (
                  <div style={ls.searchTip}>
                    💡 <strong>Pro Tip:</strong> {sequence.linkedin_search_tip}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                  <CopyBtn
                    text={[sequence.level_1, sequence.level_2, sequence.level_3]
                      .filter(Boolean).map((l, i) => `=== Level ${i+1}: ${l.label} ===\n${l.message}`).join('\n\n')}
                    label="Copy All 3 Messages"
                  />
                  <button id="save-to-kanban-btn" className="apple-btn apple-btn-emerald" onClick={handleSaveAndAddContact}>
                    <Plus size={14} /> Save to Contact Pipeline
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3: CONTACT KANBAN PIPELINE
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'kanban' && (
        <div style={s.kanbanWrapper} className="animate-fade-in">
          {/* Kanban Top Action / Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 400 }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: '#636366' }} />
                <input
                  id="kanban-filter"
                  className="apple-input"
                  style={{ paddingLeft: 34, height: 38 }}
                  placeholder="Filter by contact name or company..."
                  value={kanbanFilter}
                  onChange={e => setKanbanFilter(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button id="add-kanban-top-btn" className="apple-btn apple-btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={14} /> Add Contact
              </button>
            </div>
          </div>

          {loadingContacts ? (
            <div style={s.loadingState}><Loader2 size={28} color="#0a84ff" style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : contacts.length === 0 ? (
            <div style={s.panel} className="apple-glass-panel">
              <div style={s.emptyState}>
                <div style={{ fontSize: 44 }}>📋</div>
                <div style={s.emptyTitle}>No networking contacts in pipeline yet</div>
                <div style={s.emptySub}>
                  Use the <strong>Company & People Radar</strong> or <strong>Message Generator</strong> to add decision makers, or add one manually.
                </div>
                <button id="empty-add-btn" className="apple-btn apple-btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAddModal(true)}>
                  <Plus size={14} /> Add First Contact
                </button>
              </div>
            </div>
          ) : (
            <div style={s.kanbanBoard}>
              {COLUMNS.map(col => {
                const colContacts = filteredContacts.filter(c => c.kanban_status === col.id);
                return (
                  <div
                    key={col.id}
                    className="kanban-col"
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(col.id)}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      minWidth: 220,
                      borderRadius: 14,
                      padding: 12
                    }}
                  >
                    <div style={s.colHeader}>
                      <span style={{ color: col.color, fontWeight: 700, fontSize: 13 }}>
                        {col.emoji} {col.label}
                      </span>
                      <span style={{ ...s.colCount, borderColor: col.color, color: col.color }}>
                        {colContacts.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 120 }}>
                      {colContacts.map(contact => (
                        <div
                          key={contact.id}
                          className="kanban-card"
                          draggable
                          onDragStart={() => handleDragStart(contact)}
                          style={{ cursor: 'grab', position: 'relative' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <Avatar initials={contact.avatar_initials} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={s.contactName}>{contact.name}</div>
                              <div style={s.contactRole}>{contact.title}</div>
                              <div style={s.contactCompany}>🏢 {contact.company}</div>
                            </div>
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#636366' }}
                              title="Delete contact"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Quick Action Footer on Card */}
                          <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                            {contact.linkedin_url ? (
                              <a
                                href={contact.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#5ac8fa', textDecoration: 'none' }}
                              >
                                <Linkedin size={11} /> Profile
                              </a>
                            ) : <div />}

                            {col.id !== 'converted' && (
                              <button
                                onClick={() => handleAdvanceStage(contact)}
                                style={{
                                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#f5f5f7', cursor: 'pointer'
                                }}
                                title="Advance to next pipeline stage"
                              >
                                Advance ➔
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {colContacts.length === 0 && (
                        <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: '#636366' }}>
                          Drop here
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 4: BOOLEAN QUERY BUILDER
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'search_query' && (
        <div style={s.twoPanel} className="animate-fade-in">
          <div style={s.panel} className="apple-glass-panel">
            <div style={s.panelTitle}><Search size={16} color="#0a84ff" />Target Profile Search Parameters</div>
            <div style={s.formGrid}>
              <div className="apple-field" style={{ gridColumn: '1/-1' }}>
                <label className="apple-label">Target Role *</label>
                <input id="sq-role" className="apple-input" placeholder="e.g. Engineering Manager, Product Director" value={searchForm.target_role} onChange={sf('target_role')} />
              </div>
              <div className="apple-field">
                <label className="apple-label">At Company (optional)</label>
                <input id="sq-company" className="apple-input" placeholder="e.g. Google, Stripe, Razorpay" value={searchForm.target_company} onChange={sf('target_company')} />
              </div>
              <div className="apple-field">
                <label className="apple-label">Seniority Level</label>
                <select id="sq-seniority" className="apple-select" value={searchForm.seniority} onChange={sf('seniority')}>
                  <option>Senior</option>
                  <option>Lead</option>
                  <option>Staff</option>
                  <option>Principal</option>
                  <option>Director</option>
                  <option>VP</option>
                </select>
              </div>
              <div className="apple-field" style={{ gridColumn: '1/-1' }}>
                <label className="apple-label">Location</label>
                <input id="sq-location" className="apple-input" placeholder="e.g. Bengaluru, Remote India" value={searchForm.location} onChange={sf('location')} />
              </div>
            </div>
            <button
              id="gen-search-btn"
              className="apple-btn apple-btn-primary"
              style={{ width: '100%', marginTop: 16, justifyContent: 'center', height: 42 }}
              onClick={handleGenerateSearchQuery}
              disabled={loadingSearch}
            >
              {loadingSearch ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
              Generate LinkedIn Boolean Search Query
            </button>
          </div>

          <div style={s.panel} className="apple-glass-panel">
            <div style={s.panelTitle}><Zap size={16} color="#bf5af2" />LinkedIn Boolean Query Output</div>
            {!searchQuery && !loadingSearch && (
              <div style={s.emptyState}>
                <div style={{ fontSize: 36 }}>🔍</div>
                <div style={s.emptyTitle}>Configure your search parameters</div>
                <div style={s.emptySub}>AI will generate an optimized Boolean search query and 1-click LinkedIn URL to find the exact hiring decision makers.</div>
              </div>
            )}
            {loadingSearch && (
              <div style={s.loadingState}>
                <Loader2 size={24} color="#0a84ff" style={{ animation: 'spin 1s linear infinite' }} />
                <div>Generating precision search strategy…</div>
              </div>
            )}
            {searchQuery && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={ls.sqLabel}>Precision Boolean Search String</div>
                  <div className="apple-code-block" style={{ fontSize: 12, lineHeight: 1.5 }}>{searchQuery.boolean_query}</div>
                  <div style={{ marginTop: 8 }}>
                    <CopyBtn text={searchQuery.boolean_query} label="Copy Query" />
                  </div>
                </div>
                <div>
                  <div style={ls.sqLabel}>Direct LinkedIn Link</div>
                  <a
                    href={searchQuery.linkedin_search_url}
                    target="_blank"
                    rel="noreferrer"
                    className="apple-btn apple-btn-secondary"
                    style={{ display: 'inline-flex', textDecoration: 'none' }}
                  >
                    <Linkedin size={14} color="#0a84ff" /> Open Filtered Search on LinkedIn <ExternalLink size={12} />
                  </a>
                </div>
                <div>
                  <div style={ls.sqLabel}>Recommended Filters</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {searchQuery.filters_to_apply?.map((f, i) => (
                      <span key={i} className="apple-badge apple-badge-blue">{f}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={ls.sqLabel}>Target Personas</div>
                  {searchQuery.target_personas?.map((p, i) => (
                    <div key={i} style={ls.personaCard}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#f5f5f7' }}>{p.persona}</div>
                      <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 3 }}>{p.why}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {p.typical_titles?.map((t, j) => (
                          <span key={j} className="apple-badge apple-badge-gray">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LINKEDIN CONNECTION MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showLinkedInModal && (
        <div className="apple-modal-overlay" onClick={() => setShowLinkedInModal(false)}>
          <div className="apple-modal animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={s.panelTitle}>
                <Linkedin size={18} color="#0a84ff" />
                LinkedIn Integration Hub
              </div>
              <button
                onClick={() => setShowLinkedInModal(false)}
                style={{ background: 'none', border: 'none', color: '#636366', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {liStatus.connected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '14px 16px', background: 'rgba(50,215,75,0.1)', border: '1px solid rgba(50,215,75,0.25)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#32d74b', fontWeight: 700, fontSize: 14 }}>
                    <CheckCircle2 size={16} /> LinkedIn Connected
                  </div>
                  <p style={{ fontSize: 13, color: '#8e8e93', marginTop: 6 }}>
                    Connected profile: <strong style={{ color: '#f5f5f7' }}>{liStatus.full_name || 'LinkedIn User'}</strong> ({liStatus.linkedin_url})
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="apple-btn apple-btn-secondary" onClick={handleDisconnectLinkedIn}>
                    Disconnect
                  </button>
                  <button className="apple-btn apple-btn-primary" onClick={() => setShowLinkedInModal(false)}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.5 }}>
                  Connect your LinkedIn Profile to enable 1-click deep launch to recipient messaging windows, automated boolean searches, and outreach tracking.
                </p>

                <div className="apple-field">
                  <label className="apple-label">Your LinkedIn Profile URL</label>
                  <input
                    id="modal-li-url"
                    className="apple-input"
                    placeholder="https://www.linkedin.com/in/your-profile-name"
                    value={liModalUrl}
                    onChange={e => setLiModalUrl(e.target.value)}
                  />
                </div>

                <div style={{ padding: '12px 14px', background: 'rgba(10,132,255,0.06)', borderRadius: 10, border: '1px solid rgba(10,132,255,0.15)', fontSize: 12, color: '#8e8e93' }}>
                  ⚡ <strong>Smart Integration:</strong> Links your profile instantly so all message sequences and Boolean searches are personalized to your industry.
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="apple-btn apple-btn-secondary" onClick={() => setShowLinkedInModal(false)}>
                    Cancel
                  </button>
                  <button
                    id="save-li-connect-btn"
                    className="apple-btn apple-btn-primary"
                    onClick={handleConnectLinkedInProfile}
                    disabled={savingLi}
                  >
                    {savingLi ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={15} />}
                    Connect & Activate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ADD CONTACT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="apple-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="apple-modal animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={s.panelTitle}>
                <Plus size={16} color="#0a84ff" /> Add Contact to Pipeline
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#636366', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="apple-field">
                <label className="apple-label">Full Name *</label>
                <input
                  id="add-name"
                  className="apple-input"
                  placeholder="Contact's full name"
                  value={addForm.name}
                  onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="apple-field">
                <label className="apple-label">Title / Role</label>
                <input
                  id="add-title"
                  className="apple-input"
                  placeholder="e.g. Engineering Director / VP"
                  value={addForm.title}
                  onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="apple-field">
                <label className="apple-label">Company</label>
                <input
                  id="add-company"
                  className="apple-input"
                  placeholder="e.g. Stripe, Google, Razorpay"
                  value={addForm.company}
                  onChange={e => setAddForm(p => ({ ...p, company: e.target.value }))}
                />
              </div>
              <div className="apple-field">
                <label className="apple-label">LinkedIn URL</label>
                <input
                  id="add-li-url"
                  className="apple-input"
                  placeholder="https://linkedin.com/in/..."
                  value={addForm.linkedin_url}
                  onChange={e => setAddForm(p => ({ ...p, linkedin_url: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button id="cancel-add-btn" className="apple-btn apple-btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button id="confirm-add-btn" className="apple-btn apple-btn-primary" onClick={handleAddToKanban}>Add Contact</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Visual Layout Styles
const s = {
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 },
  pageTitle: { fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: '#f5f5f7', display: 'flex', alignItems: 'center' },
  pageSub: { fontSize: 13, color: '#8e8e93', marginTop: 4 },
  liConnectedBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px',
    background: 'rgba(50,215,75,0.1)', border: '1px solid rgba(50,215,75,0.25)',
    borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#32d74b', cursor: 'pointer',
    fontFamily: 'inherit'
  },
  statsBar: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 },
  statCard: { padding: '14px 16px' },
  statValue: { fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em' },
  statLabel: { fontSize: 11, color: '#8e8e93', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 },
  tabRow: {
    display: 'inline-flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    padding: 3, borderRadius: 30, gap: 2, marginBottom: 20
  },
  twoPanel: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  panel: { padding: 22 },
  panelTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#f5f5f7', marginBottom: 14 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  emptyState: { textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: 700, color: '#f5f5f7' },
  emptySub: { fontSize: 13, color: '#8e8e93', maxWidth: 360, lineHeight: 1.6 },
  loadingState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#8e8e93', fontSize: 13, padding: '40px 0' },
  kanbanWrapper: { overflowX: 'auto' },
  kanbanBoard: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))', gap: 12 },
  colHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  colCount: { fontSize: 11, fontWeight: 800, border: '1.5px solid', borderRadius: 20, padding: '2px 8px', minWidth: 24, textAlign: 'center' },
  contactName: { fontSize: 13, fontWeight: 700, color: '#f5f5f7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  contactRole: { fontSize: 11, color: '#8e8e93', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  contactCompany: { fontSize: 11, color: '#636366', marginTop: 2 },
  metaItem: { padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' },
  metaLabel: { fontSize: 11, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block' },
  metaVal: { fontSize: 13, fontWeight: 700, color: '#f5f5f7', marginTop: 2, display: 'block' },
  personaCard: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '14px 16px', transition: 'all 0.15s ease'
  }
};

const ls = {
  levelCard: { borderLeft: '3px solid', background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  levelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer' },
  levelBadge: { padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, letterSpacing: '0.03em' },
  levelLabel: { fontSize: 13, fontWeight: 600, color: '#f5f5f7' },
  timing: { fontSize: 11, color: '#8e8e93' },
  charCount: { fontSize: 11, fontWeight: 700 },
  levelBody: { padding: '0 14px 14px' },
  msgText: {
    fontFamily: 'inherit', fontSize: 13, color: '#e5e5ea', whiteSpace: 'pre-wrap',
    lineHeight: 1.65, background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '12px 14px',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  openLiBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
    fontSize: 12, fontWeight: 600, borderRadius: 20, background: 'rgba(10,132,255,0.15)',
    border: '1px solid rgba(10,132,255,0.3)', color: '#5ac8fa', cursor: 'pointer', fontFamily: 'inherit'
  },
  probBadge: { padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginLeft: 'auto' },
  searchTip: {
    background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.2)',
    borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#ffd60a', marginTop: 10
  },
  sqLabel: { fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 },
  personaCard: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10, padding: '12px 14px', marginBottom: 8
  },
};
