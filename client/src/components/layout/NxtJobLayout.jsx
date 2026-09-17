import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  Briefcase, 
  Building2, 
  Users2, 
  Globe2, 
  Sparkles, 
  FileText, 
  Mic2, 
  Send, 
  Search, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  Sun, 
  Moon, 
  Bookmark, 
  LogOut, 
  User, 
  SlidersHorizontal,
  Bot,
  ArrowUpRight,
  TrendingUp,
  LayoutDashboard,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export function NxtJobLayout({ 
  children, 
  activePage, 
  onNavigate, 
  activeSubTab, 
  onSubTabChange,
  novaContextJob = null
}) {
  const { user, logout, openAuthModal } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('nxt_theme') || 'light');
  const [isRailExpanded, setIsRailExpanded] = useState(() => localStorage.getItem('nxt_rail_expanded') === 'true');
  const [isNovaCollapsed, setIsNovaCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Toggle rail expand/collapse
  const toggleRailExpanded = () => {
    setIsRailExpanded(prev => {
      const next = !prev;
      localStorage.setItem('nxt_rail_expanded', next);
      return next;
    });
  };

  // Nova AI Chat State
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      text: "👋 Hi! I'm Nova, your AI Career Copilot. I've analyzed your profile and target market. How can I help you accelerate your job search today?",
      actions: [
        { label: 'Check ATS score for target role', prompt: 'Analyze my ATS score and match against top target roles' },
        { label: 'Find recruiters for potential referrals', prompt: 'Generate a LinkedIn Boolean search string for finding tech recruiters hiring right now' },
        { label: 'Customize Resume for this role', prompt: 'How should I tailor my experience bullets for higher interview callback rates?' }
      ]
    }
  ]);
  const [novaInput, setNovaInput] = useState('');
  const [isNovaLoading, setIsNovaLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nxt_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Scroll Nova chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isNovaLoading]);

  // Handle external prompts sent to Nova
  useEffect(() => {
    const handleNovaEvent = (e) => {
      if (e.detail?.prompt) {
        setIsNovaCollapsed(false);
        handleSendNova(e.detail.prompt);
      }
    };
    window.addEventListener('ask-nova', handleNovaEvent);
    return () => window.removeEventListener('ask-nova', handleNovaEvent);
  }, []);

  const handleSendNova = async (textToSend = null) => {
    const query = textToSend || novaInput;
    if (!query.trim() || isNovaLoading) return;

    const userMsg = { id: Date.now(), role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setNovaInput('');
    setIsNovaLoading(true);

    try {
      const res = await api.sendNovaMessage(query, {
        activePage,
        activeSubTab,
        targetJob: novaContextJob
      });

      const aiText = res?.reply || res?.answer || res?.response || res?.message || res?.data?.reply || "I've analyzed your request with 58 candidate success benchmarks.";
      const quickActions = [
        { label: 'Check ATS for this job ↗', prompt: `Check ATS match score for ${novaContextJob?.title || 'target job'}` },
        { label: 'Find Employees for potential referrals ↗', prompt: `Find employees at ${novaContextJob?.company || 'target company'} for referral outreach` },
        { label: 'Find Recruiters for potential referrals ↗', prompt: `Find hiring managers and recruiters at ${novaContextJob?.company || 'target company'}` },
        { label: 'Customize Resume for this job ↗', prompt: `Tailor my resume specifically for ${novaContextJob?.title || 'this job'}` },
        { label: 'Practice Interview for this job ↗', prompt: `Generate top 5 behavioral and situational interview questions for ${novaContextJob?.title || 'this role'}` }
      ];

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'ai',
          text: aiText,
          actions: quickActions
        }
      ]);
    } catch (err) {
      console.error('[Nova chat error]', err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'ai',
          text: `⚠️ Nova Engine: ${err.message || 'Could not connect to Nova. Please check server.'}`,
          actions: [
            { label: 'Try Again ↗', prompt: query },
            { label: 'Run Boolean Search on LinkedIn ↗', prompt: 'Give me the Google/LinkedIn Boolean search query for this role' }
          ]
        }
      ]);
    } finally {
      setIsNovaLoading(false);
    }
  };

  const handleClearNova = () => {
    setMessages([
      {
        id: Date.now(),
        role: 'ai',
        text: "Chat cleared. Ask me anything about job hunting, company intelligence, Boolean search strings, or resume tailoring!",
        actions: []
      }
    ]);
  };

  // Rail navigation items
  const railItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Cockpit' },
    { id: 'navigator', icon: Compass, label: 'Career Navigator' },
    { id: 'resume', icon: FileText, label: 'Resumes & Tailor' },
    { id: 'jobs', icon: Briefcase, label: 'Job Board & Radar' },
    { id: 'companies', icon: Building2, label: 'Target Companies' },
    { id: 'agencies', icon: Users2, label: 'Recruitment Agencies' },
    { id: 'networker', icon: Globe2, label: 'My Network & Radar' },
    { id: 'interview', icon: Mic2, label: 'Mock Interview' },
    { id: 'influencer', icon: GraduationCap, label: 'Influencer & Mentors' },
    { id: 'executive', icon: TrendingUp, label: 'Executive Pitcher' }
  ];

  // Top sub-navigation pill items
  const subNavTabs = [
    { id: 'jobs', label: 'Job Board', icon: Compass },
    { id: 'my-jobs', label: 'My Jobs', icon: Briefcase },
    { id: 'companies', label: 'Target Companies', icon: Building2 },
    { id: 'agencies', label: 'Recruitment Agencies', icon: Users2 },
    { id: 'networker', label: 'My Network', icon: Globe2 },
    { id: 'influencer', label: 'Influencer', icon: Sparkles },
    { id: 'executive', label: 'Pitcher', icon: FileText },
    { id: 'navigator', label: 'Career Navigator', icon: Compass }
  ];

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'SR';

  return (
    <div className="nxt-app-container">
      {/* ── 1. Left Vertical Icon Rail (Expandable / Collapsible: 56px <-> 240px) ── */}
      <aside className={`nxt-icon-rail ${isRailExpanded ? 'expanded' : ''}`}>
        <div className="nxt-rail-top">
          {/* Header Row with Logo + Brand Title + Collapse/Expand Toggle Button */}
          <div className="nxt-rail-header">
            <div 
              className="nxt-rail-logo-group"
              onClick={() => onNavigate('dashboard')}
              title="NxtJob AI Career Copilot"
            >
              <div className="nxt-rail-logo">
                <Sparkles size={18} />
              </div>
              {isRailExpanded && (
                <span className="nxt-rail-brand-name">
                  nxtjob<span style={{ color: 'var(--nxt-primary)' }}>.ai</span>
                </span>
              )}
            </div>

            {isRailExpanded && (
              <button
                id="rail-expand-collapse-btn"
                className="nxt-rail-toggle-btn"
                onClick={toggleRailExpanded}
                title="Collapse Sidebar"
              >
                <ChevronLeft size={15} />
              </button>
            )}
          </div>

          {!isRailExpanded && (
            <button
              id="rail-expand-collapse-btn"
              className="nxt-rail-item nxt-rail-expand-action-btn"
              onClick={toggleRailExpanded}
              title="Expand Sidebar"
              style={{
                marginBottom: '6px',
                background: 'var(--nxt-bg-surface-subtle)',
                border: '1px solid var(--nxt-border-subtle)',
                borderRadius: '8px'
              }}
            >
              <div className="nxt-rail-item-icon">
                <ChevronRight size={16} color="var(--nxt-primary)" />
              </div>
            </button>
          )}

          {/* Navigation Items */}
          {railItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                id={`rail-nav-${item.id}`}
                className={`nxt-rail-item ${isActive ? 'active' : ''}`}
                title={!isRailExpanded ? item.label : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <div className="nxt-rail-item-icon">
                  <Icon size={19} />
                </div>
                {isRailExpanded && (
                  <span className="nxt-rail-item-label">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Rail Controls */}
        <div className="nxt-rail-bottom">
          <button
            id="rail-theme-toggle"
            className="nxt-rail-item"
            title={!isRailExpanded ? `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode` : undefined}
            onClick={toggleTheme}
          >
            <div className="nxt-rail-item-icon">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            {isRailExpanded && (
              <span className="nxt-rail-item-label">
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </span>
            )}
          </button>

          <button
            id="rail-saved-bookmarks"
            className="nxt-rail-item"
            title={!isRailExpanded ? "Saved & Bookmarks" : undefined}
            onClick={() => onNavigate('jobs')}
          >
            <div className="nxt-rail-item-icon">
              <Bookmark size={18} />
            </div>
            {isRailExpanded && (
              <span className="nxt-rail-item-label">
                Saved & Bookmarks
              </span>
            )}
          </button>

          {/* Bottom Sidebar Collapse/Expand Toggle */}
          <button
            id="rail-bottom-toggle-btn"
            className="nxt-rail-item"
            title={isRailExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            onClick={toggleRailExpanded}
          >
            <div className="nxt-rail-item-icon">
              {isRailExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </div>
            {isRailExpanded && (
              <span className="nxt-rail-item-label">
                Collapse Sidebar
              </span>
            )}
          </button>

          {/* User Profile Card / Avatar */}
          <div style={{ position: 'relative', width: '100%' }}>
            {isRailExpanded ? (
              <div
                id="rail-user-card"
                className="nxt-rail-user-card"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="nxt-rail-avatar">
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--nxt-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name || 'Siddhant'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--nxt-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email || 'siddhant@example.com'}
                  </div>
                </div>
              </div>
            ) : (
              <div 
                id="rail-user-avatar"
                className="nxt-rail-avatar"
                onClick={() => setShowUserMenu(!showUserMenu)}
                title={user ? user.email : 'Account'}
              >
                {initials}
              </div>
            )}

            {showUserMenu && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: isRailExpanded ? 0 : 48,
                  width: 210,
                  backgroundColor: 'var(--nxt-bg-card)',
                  border: '1px solid var(--nxt-border-subtle)',
                  borderRadius: 'var(--nxt-radius-lg)',
                  boxShadow: 'var(--nxt-shadow-lg)',
                  padding: '8px 0',
                  zIndex: 1000
                }}
              >
                <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--nxt-border-subtle)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--nxt-text-primary)' }}>
                    {user?.name || 'Siddhant'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--nxt-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.email || 'siddhant@example.com'}
                  </div>
                </div>

                <button
                  id="menu-profile-setup"
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: 'none',
                    background: 'none',
                    fontSize: 12.5,
                    color: 'var(--nxt-text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('profile-setup');
                  }}
                >
                  <User size={14} /> Profile & Resume Setup
                </button>

                <button
                  id="menu-logout"
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: 'none',
                    background: 'none',
                    fontSize: 12.5,
                    color: '#ef4444',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── 2. Workspace Layout ────────────────────────────────────────── */}
      <div className="nxt-workspace">
        {/* Top Horizontal Sub-Navigation Pill Bar */}
        <header className="nxt-subnav-bar">
          {subNavTabs.map(tab => {
            const Icon = tab.icon;
            const isCurrent = (activeSubTab || activePage) === tab.id;
            return (
              <button
                key={tab.id}
                id={`subnav-pill-${tab.id}`}
                className={`nxt-subnav-pill ${isCurrent ? 'active' : ''}`}
                onClick={() => {
                  if (onSubTabChange) onSubTabChange(tab.id);
                  onNavigate(tab.id);
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              id="topbar-toggle-nova-btn"
              onClick={() => setIsNovaCollapsed(!isNovaCollapsed)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 'var(--nxt-radius-pill)',
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid var(--nxt-border-subtle)',
                backgroundColor: isNovaCollapsed ? 'var(--nxt-bg-surface-subtle)' : 'var(--nxt-primary-subtle)',
                color: isNovaCollapsed ? 'var(--nxt-text-secondary)' : 'var(--nxt-primary-text)',
                cursor: 'pointer'
              }}
            >
              <Bot size={14} />
              {isNovaCollapsed ? 'Open Nova' : 'Nova Copilot'}
            </button>
          </div>
        </header>

        {/* Split Main Content Area */}
        <div className="nxt-body-split">
          {/* Main Scrollable Content */}
          <main className="nxt-main-content-scroll">
            {children}
          </main>

          {/* ── 3. Persistent Right Nova AI Copilot Panel (420px) ──────── */}
          <aside className={`nxt-nova-sidebar ${isNovaCollapsed ? 'collapsed' : ''}`}>
            {/* Nova Header */}
            <div className="nxt-nova-header">
              <div className="nxt-nova-title-box">
                <div className="nxt-nova-avatar">
                  <Bot size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--nxt-text-primary)' }}>
                    Nova
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--nxt-text-tertiary)' }}>
                    Your AI Copilot
                  </div>
                </div>
              </div>

              <div className="nxt-nova-actions">
                <button 
                  id="nova-header-search-btn"
                  className="nxt-nova-icon-btn" 
                  title="Search Insights"
                  onClick={() => handleSendNova("Summarize key search recommendations for me")}
                >
                  <Search size={15} />
                </button>
                <button 
                  id="nova-header-clear-btn"
                  className="nxt-nova-icon-btn" 
                  title="Clear Chat"
                  onClick={handleClearNova}
                >
                  <Trash2 size={15} />
                </button>
                <button 
                  id="nova-header-close-btn"
                  className="nxt-nova-icon-btn" 
                  title="Collapse Nova"
                  onClick={() => setIsNovaCollapsed(true)}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Nova Messages Stream */}
            <div className="nxt-nova-messages">
              {messages.map((m) => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className={`nxt-nova-bubble ${m.role}`}>
                    {m.text}
                  </div>

                  {/* Action Pill Chips */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="nxt-nova-quick-actions">
                      {m.actions.map((act, idx) => (
                        <button
                          key={idx}
                          id={`nova-action-${idx}`}
                          className="nxt-nova-action-chip"
                          onClick={() => handleSendNova(act.prompt)}
                        >
                          <span>{act.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isNovaLoading && (
                <div className="nxt-nova-bubble ai" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={14} className="animate-spin" />
                  <span>Nova is analyzing candidate benchmarks...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Nova Chat Footer */}
            <div className="nxt-nova-footer">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendNova();
                }}
              >
                <div className="nxt-nova-input-box">
                  <input
                    id="nova-panel-input"
                    type="text"
                    className="nxt-nova-input"
                    placeholder="Ask me anything..."
                    value={novaInput}
                    onChange={(e) => setNovaInput(e.target.value)}
                  />
                  <button 
                    id="nova-panel-send-btn"
                    type="submit" 
                    className="nxt-nova-send-btn" 
                    disabled={!novaInput.trim() || isNovaLoading}
                  >
                    <Send size={15} />
                  </button>
                </div>
                <div className="nxt-nova-subhint">
                  PRESS ↵ TO SEND
                </div>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default NxtJobLayout;
