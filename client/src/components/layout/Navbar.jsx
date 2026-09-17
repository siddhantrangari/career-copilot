import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles, FileText, Target, Mic, Kanban, DollarSign,
  Globe, Users, LayoutDashboard, User, LogOut, ChevronDown, LogIn
} from 'lucide-react';

export function Navbar({ activePage, onNavigate }) {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const navItems = [
    { id: 'landing',   label: 'Overview',       icon: Globe },
    { id: 'nova',      label: 'Nova AI',        icon: Sparkles, badge: 'Copilot' },
    { id: 'dashboard', label: 'Cockpit',         icon: LayoutDashboard },
    { id: 'resume',    label: 'Resume Studio',   icon: FileText },
    { id: 'ats',       label: 'ATS Tailor',      icon: Target },
    { id: 'networker', label: 'Networker',        icon: Users,    badge: 'Radar' },
    { id: 'interview', label: 'Interview',        icon: Mic },
    { id: 'tracker',   label: 'Job Tracker',     icon: Kanban },
    { id: 'executive', label: 'Executive Suite', icon: DollarSign },
  ];

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SR';

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.78)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '0 24px',
    }}>
      <div style={{
        maxWidth: '1440px', margin: '0 auto',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 16,
        height: 56,
      }}>
        {/* Brand */}
        <div onClick={() => onNavigate('landing')} style={{
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(10,132,255,0.4)',
          }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: '#f5f5f7', lineHeight: 1 }}>
              Career Copilot
            </div>
            <div style={{ fontSize: 10, color: '#636366', letterSpacing: '0.02em' }}>
              myagentfirm.com
            </div>
          </div>
        </div>

        {/* Center Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', flexShrink: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onNavigate(item.id)}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 20,
                  fontSize: 13, fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap',
                  color: isActive ? '#f5f5f7' : '#8e8e93',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                <Icon size={13} color={isActive ? '#0a84ff' : 'currentColor'} />
                {item.label}
                {item.badge && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2,
                    background: '#0a84ff', color: '#fff',
                    fontSize: 8, fontWeight: 800, letterSpacing: '0.04em',
                    padding: '1px 5px', borderRadius: 6,
                  }}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Area: AI Model Badge + User Account */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.2)',
            borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#5ac8fa',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#32d74b' }} />
            gpt-5.6-sol
          </div>

          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button
                id="user-account-menu-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="apple-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px 4px 4px',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0a84ff 0%, #bf5af2 100%)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {initials}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.full_name?.split(' ')[0] || 'User'}
                </span>
                <ChevronDown size={12} style={{ color: 'var(--apple-text-secondary)' }} />
              </button>

              {/* Account Dropdown Menu */}
              {showUserDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '38px',
                    right: 0,
                    width: '220px',
                    background: 'var(--apple-card-bg)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '16px',
                    padding: '12px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                    zIndex: 200
                  }}
                >
                  <div style={{ paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {user?.full_name || 'Executive Candidate'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--apple-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.email}
                    </div>
                    {user?.current_role && (
                      <div style={{ fontSize: '10px', color: 'var(--apple-blue)', marginTop: '2px', fontWeight: 600 }}>
                        {user.current_role}
                      </div>
                    )}
                  </div>

                  <button
                    id="switch-account-btn"
                    onClick={() => {
                      setShowUserDropdown(false);
                      openAuthModal();
                    }}
                    className="apple-btn"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '12px',
                      color: 'var(--apple-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <User size={13} />
                    Switch Account / Sign Up
                  </button>

                  <button
                    id="logout-btn"
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                      openAuthModal();
                    }}
                    className="apple-btn"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '12px',
                      color: '#ff453a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(255, 69, 58, 0.08)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginTop: '4px'
                    }}
                  >
                    <LogOut size={13} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              id="navbar-signin-btn"
              onClick={openAuthModal}
              className="apple-btn apple-btn-primary"
              style={{
                fontSize: '12px',
                padding: '5px 12px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <LogIn size={13} />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
