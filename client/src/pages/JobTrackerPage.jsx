import React, { useState, useEffect } from 'react';
import { AppleCard } from '../components/ui/AppleCard';
import { TargetJobsRadar } from '../components/TargetJobsRadar';
import { api } from '../services/api';
import { 
  Kanban, Plus, CheckCircle2, Clock, DollarSign, 
  MapPin, Calendar, ArrowRight, ExternalLink, Sparkles,
  Target, Layers, Compass
} from 'lucide-react';
import confetti from 'canvas-confetti';

const COLUMNS = [
  { id: 'applied', label: 'Applied', color: 'var(--apple-blue)' },
  { id: 'screening', label: 'Screening', color: 'var(--apple-amber)' },
  { id: 'interview', label: 'Interviewing', color: 'var(--apple-purple)' },
  { id: 'offer', label: 'Offer Extended', color: 'var(--apple-emerald)' },
  { id: 'negotiating', label: 'Negotiating', color: '#5ac8fa' },
];

export function JobTrackerPage({ onNavigate }) {
  const [activeView, setActiveView] = useState('target-roles'); // 'target-roles' | 'kanban'
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Application Form State
  const [newCompany, setNewCompany] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('Remote / Hybrid');
  const [newSalary, setNewSalary] = useState('₹75L - ₹95L');
  const [newStatus, setNewStatus] = useState('applied');
  const [newNotes, setNewNotes] = useState('');

  const loadApps = async () => {
    try {
      const data = await api.getApplications();
      setApplications(data || []);
    } catch (e) {
      console.error('Failed to load applications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, []);

  const handleAddApplication = async (e) => {
    e.preventDefault();
    if (!newCompany || !newTitle) return;

    try {
      const created = await api.createApplication({
        company_name: newCompany,
        job_title: newTitle,
        location: newLocation,
        salary_range: newSalary,
        status: newStatus,
        notes: newNotes,
      });
      setApplications([created, ...applications]);
      setShowAddModal(false);
      setNewCompany('');
      setNewTitle('');
      setNewNotes('');
      confetti({ particleCount: 40, spread: 50 });
    } catch (err) {
      alert('Error adding application: ' + err.message);
    }
  };

  const handleStatusChange = async (appId, nextStatus) => {
    try {
      await api.updateApplicationStatus(appId, nextStatus);
      setApplications(
        applications.map((a) => (a.id === appId ? { ...a, status: nextStatus } : a))
      );
      if (nextStatus === 'offer' || nextStatus === 'negotiating') {
        confetti({ particleCount: 80, spread: 70 });
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1340px', margin: '0 auto', padding: '36px 24px 80px' }}>
      {/* Header & View Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="apple-badge apple-badge-blue">Opportunity Control Center</span>
            <span style={{ fontSize: '13px', color: 'var(--apple-text-secondary)' }}>
              {activeView === 'target-roles' ? 'High-conviction target roles, fit scores & attack plans' : 'Track and advance active job applications'}
            </span>
          </div>
          <h1 className="headline-section" style={{ color: 'var(--nxt-text-primary)', margin: 0 }}>
            {activeView === 'target-roles' ? 'Targeted Job Roles & Dream Vault' : 'Application Pipeline Kanban'}
          </h1>
        </div>

        {/* View Switcher Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--nxt-bg-surface-subtle)',
          padding: '4px',
          borderRadius: '14px',
          border: '1px solid var(--nxt-border-subtle)',
          gap: '4px'
        }}>
          <button
            id="view-target-roles-tab-btn"
            className="apple-btn"
            onClick={() => setActiveView('target-roles')}
            style={{
              fontSize: '13px',
              padding: '8px 16px',
              borderRadius: '10px',
              background: activeView === 'target-roles' ? 'var(--nxt-accent-blue)' : 'transparent',
              border: 'none',
              color: activeView === 'target-roles' ? '#ffffff' : 'var(--nxt-text-secondary)',
              fontWeight: activeView === 'target-roles' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Target size={15} />
            Targeted Roles Vault
          </button>

          <button
            id="view-kanban-pipeline-tab-btn"
            className="apple-btn"
            onClick={() => setActiveView('kanban')}
            style={{
              fontSize: '13px',
              padding: '8px 16px',
              borderRadius: '10px',
              background: activeView === 'kanban' ? 'var(--nxt-accent-blue)' : 'transparent',
              border: 'none',
              color: activeView === 'kanban' ? '#ffffff' : 'var(--nxt-text-secondary)',
              fontWeight: activeView === 'kanban' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Kanban size={15} />
            Kanban Pipeline ({applications.length})
          </button>
        </div>
      </div>

      {/* View 1: Targeted Roles Vault */}
      {activeView === 'target-roles' && (
        <TargetJobsRadar
          onNavigate={onNavigate}
          onAddToKanban={() => {
            loadApps();
            setActiveView('kanban');
          }}
        />
      )}

      {/* View 2: Application Pipeline Kanban */}
      {activeView === 'kanban' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              id="add-application-btn"
              className="apple-btn apple-btn-primary"
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              Add Job Application
            </button>
          </div>

          {/* Kanban Board Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            {COLUMNS.map((col) => {
              const colApps = applications.filter((a) => a.status === col.id);

              return (
                <div
                  key={col.id}
                  style={{
                    background: 'var(--nxt-bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--nxt-border-subtle)',
                    padding: '16px',
                    minHeight: '480px',
                    boxShadow: 'var(--nxt-shadow-sm)',
                  }}
                >
              {/* Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--nxt-border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--nxt-text-primary)' }}>{col.label}</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--nxt-text-secondary)', background: 'var(--nxt-bg-surface-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                  {colApps.length}
                </span>
              </div>

              {/* Cards list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {colApps.map((app) => (
                  <AppleCard key={app.id} style={{ padding: '16px', background: 'var(--nxt-bg-surface)' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--nxt-text-primary)', marginBottom: '4px' }}>
                      {app.company_name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--nxt-text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                      {app.job_title}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--nxt-text-secondary)', marginBottom: '6px' }}>
                      <MapPin size={12} /> {app.location}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--nxt-badge-emerald-text, #10b981)', fontWeight: 600, marginBottom: '10px' }}>
                      <DollarSign size={12} /> {app.salary_range}
                    </div>

                    {app.notes && (
                      <div style={{ fontSize: '11px', color: 'var(--nxt-text-secondary)', background: 'var(--nxt-bg-surface-subtle)', padding: '6px 8px', borderRadius: '6px', marginBottom: '10px', fontStyle: 'italic', border: '1px solid var(--nxt-border-subtle)' }}>
                        "{app.notes}"
                      </div>
                    )}

                    {/* Status Forward Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--nxt-border-subtle)', paddingTop: '10px' }}>
                      <select
                        className="apple-input"
                        style={{ padding: '4px 8px', fontSize: '11px', width: 'auto' }}
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.id} value={c.id}>
                            Move: {c.label}
                          </option>
                        ))}
                      </select>

                      <button
                        className="apple-btn apple-btn-ghost"
                        style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--nxt-accent-blue)' }}
                        onClick={() => onNavigate('ats')}
                        title="Tailor Resume for this job"
                      >
                        Tailor →
                      </button>
                    </div>
                  </AppleCard>
                ))}

                {colApps.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--nxt-text-secondary)', fontSize: '12px', border: '1px dashed var(--nxt-border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    No roles in {col.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}

      {/* Add Application Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <AppleCard style={{ width: '480px', padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginBottom: '16px' }}>
              Add New Job Application
            </h3>
            <form onSubmit={handleAddApplication}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Company</label>
                <input
                  className="apple-input"
                  required
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="e.g. Stripe, Razorpay, Google"
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Role Title</label>
                <input
                  className="apple-input"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Engineering Lead, Director of Tech"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Location</label>
                  <input
                    className="apple-input"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Salary Band</label>
                  <input
                    className="apple-input"
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Notes / Context</label>
                <textarea
                  className="apple-textarea"
                  style={{ minHeight: '70px' }}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Referral from Priya; interview scheduled next Tuesday"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="apple-btn apple-btn-ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn apple-btn-primary"
                >
                  Save to Pipeline
                </button>
              </div>
            </form>
          </AppleCard>
        </div>
      )}
    </div>
  );
}
