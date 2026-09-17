import React, { useState } from 'react';
import { AppleCard } from '../components/ui/AppleCard';
import { CircularGauge } from '../components/ui/CircularGauge';
import { 
  Sparkles, ArrowRight, ShieldCheck, Zap, TrendingUp, CheckCircle, 
  FileText, Target, Mic, Kanban, DollarSign, Layers, Users, Award 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function LandingPage({ onNavigate }) {
  // Interactive Hero Teaser State
  const [sampleJd, setSampleJd] = useState(
    'Seeking a Senior Engineering Leader / Director to scale distributed payment microservices, lead 30+ engineers, and establish event-driven architecture across multi-region AWS cloud.'
  );
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Salary Hike Calculator State
  const [currentSalary, setCurrentSalary] = useState(40); // Lakhs
  const hikePercentage = 65; // %
  const projectedSalary = Math.round(currentSalary * (1 + hikePercentage / 100));

  const handleQuickScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setScanResult({
        score: 89,
        matched: ['Distributed Systems', 'Cloud (AWS)', 'Team Leadership (35+)', 'Microservices'],
        missing: ['Event-Driven Architecture', 'Fintech SLA Governance'],
      });
      setIsScanning(false);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    }, 700);
  };

  const agents = [
    { name: 'Nova', desc: 'Central Career Strategist & Gap Diagnostics', icon: Sparkles, tag: 'Orchestrator' },
    { name: 'Resume Studio', desc: 'STAR & XYZ Bullet Optimizer with metrics', icon: FileText, tag: 'Builder' },
    { name: 'ATS Tailor', desc: '1-Click JD Keyword Infusion & Match Scorer', icon: Target, tag: 'Audit' },
    { name: 'Job Hunter', desc: 'Hidden Senior Role Discovery Beyond Job Boards', icon: Layers, tag: 'Discovery' },
    { name: 'Networker', desc: 'Executive Recruiter InMail & Peer Intro Writer', icon: Users, tag: 'Outreach' },
    { name: 'Interviewer', desc: 'AI Mock Interview Simulator with STAR Feedback', icon: Mic, tag: 'Prep' },
    { name: 'Pitcher', desc: '30-60-90 Day Executive Win Deck Generator', icon: Award, tag: 'Closing' },
    { name: 'Negotiator', desc: 'Salary Counter-Offer Scripts & Objection Handlers', icon: DollarSign, tag: 'Compensation' },
    { name: 'Job Tracker', desc: 'Cupertino Kanban Pipeline & Offer Manager', icon: Kanban, tag: 'Pipeline' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px 80px' }}>
      {/* Top Launch Pill */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div
          className="apple-badge apple-badge-blue"
          style={{ padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}
          onClick={() => onNavigate('trial')}
        >
          <Sparkles size={14} />
          <span>Hosted on subdomain: <strong>career.myagentfirm.com</strong> · Powered by gpt-5.6-sol</span>
        </div>
      </div>

      {/* Hero Header */}
      <div style={{ textAlign: 'center', maxWidth: '840px', margin: '0 auto 60px' }}>
        <h1 className="headline-display" style={{ marginBottom: '20px' }}>
          Land your next senior role <br />
          <span className="text-gradient-blue">2X faster with private AI.</span>
        </h1>
        <p style={{ fontSize: '19px', color: 'var(--apple-text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
          The multi-agent career accelerator modeled after NxtJob. Built with Cupertino aesthetics, 
          ATS resume tailoring, live STAR interview simulation, and executive salary counter-negotiation.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            id="hero-trial-btn"
            className="apple-btn apple-btn-primary"
            style={{ fontSize: '16px', padding: '12px 28px' }}
            onClick={() => onNavigate('trial')}
          >
            Launch Interactive Trial Simulator
            <ArrowRight size={18} />
          </button>
          <button
            id="hero-launch-btn"
            className="apple-btn apple-btn-secondary"
            style={{ fontSize: '16px', padding: '12px 24px' }}
            onClick={() => onNavigate('dashboard')}
          >
            Enter Cockpit
          </button>
          <button
            id="hero-tailor-btn"
            className="apple-btn apple-btn-secondary"
            style={{ fontSize: '16px', padding: '12px 24px' }}
            onClick={() => onNavigate('ats')}
          >
            Try ATS Resume Tailor
          </button>
        </div>
      </div>

      {/* Interactive Hero Simulator Card */}
      <AppleCard glow style={{ maxWidth: '960px', margin: '0 auto 80px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--apple-emerald)', boxShadow: '0 0 10px var(--apple-emerald)' }}></div>
            <span style={{ fontWeight: 600, fontSize: '16px' }}>Live ATS Match Diagnostics</span>
            <span className="apple-badge apple-badge-blue">gpt-5.6-sol Engine</span>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--apple-text-secondary)' }}>
            Comparing against: <strong>Arjun Mehta (Lead System Architect)</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: scanResult ? '1.4fr 1fr' : '1fr', gap: '24px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--apple-text-secondary)', marginBottom: '8px' }}>
              Paste any Target Job Description below to simulate instant recruiter screening:
            </label>
            <textarea
              className="apple-textarea"
              style={{ minHeight: '90px', fontSize: '13px', marginBottom: '16px' }}
              value={sampleJd}
              onChange={(e) => setSampleJd(e.target.value)}
              placeholder="Paste target job description..."
            />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                id="hero-quick-scan-btn"
                className="apple-btn apple-btn-primary"
                onClick={handleQuickScan}
                disabled={isScanning}
              >
                {isScanning ? 'Auditing with gpt-5.6-sol...' : 'Run Quick Diagnostic'}
                <Zap size={15} />
              </button>
              <button
                className="apple-btn apple-btn-ghost"
                onClick={() => onNavigate('ats')}
              >
                Open Full Tailor Studio →
              </button>
            </div>
          </div>

          {scanResult && (
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: 'var(--radius-md)', padding: '20px', border: '1px solid var(--apple-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
                <CircularGauge score={scanResult.score} size={84} strokeWidth={8} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: '#ffffff' }}>High Selection Probability</div>
                  <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>Top 5% candidate percentile for this requisition</div>
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--apple-emerald)', fontWeight: 700, marginBottom: '4px' }}>
                  ✓ Core Matched Strengths
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {scanResult.matched.map((m) => (
                    <span key={m} className="apple-badge apple-badge-emerald" style={{ fontSize: '11px' }}>{m}</span>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--apple-amber)', fontWeight: 700, marginBottom: '4px' }}>
                  ⚠ Recommended Keywords to Add
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {scanResult.missing.map((m) => (
                    <span key={m} className="apple-badge apple-badge-amber" style={{ fontSize: '11px' }}>+ {m}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </AppleCard>

      {/* Salary Hike Calculator Section */}
      <div style={{ marginBottom: '80px' }}>
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 40px' }}>
          <h2 className="headline-section" style={{ marginBottom: '12px' }}>
            Calculate Your Executive Upside
          </h2>
          <p style={{ color: 'var(--apple-text-secondary)' }}>
            Professionals using structured multi-agent negotiation close 40% - 85% higher total compensation packages.
          </p>
        </div>

        <AppleCard style={{ maxWidth: '800px', margin: '0 auto', padding: '36px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--apple-text-secondary)', fontSize: '14px' }}>Current Annual CTC:</span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#ffffff' }}>₹{currentSalary} Lakhs</span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="5"
                value={currentSalary}
                onChange={(e) => setCurrentSalary(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: 'var(--apple-blue)', cursor: 'pointer', marginBottom: '24px' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--apple-text-secondary)' }}>
                  <CheckCircle size={16} color="var(--apple-emerald)" />
                  <span>Targeting Tier 1 & High-growth Product Firms</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--apple-text-secondary)' }}>
                  <CheckCircle size={16} color="var(--apple-emerald)" />
                  <span>Includes base compensation + sign-on bonus buffer</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--apple-text-secondary)' }}>
                  <CheckCircle size={16} color="var(--apple-emerald)" />
                  <span>Supported by Negotiator objection-handling scripts</span>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 113, 227, 0.08)', borderRadius: 'var(--radius-lg)', padding: '28px', border: '1px solid rgba(0, 113, 227, 0.25)', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#5ac8fa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Projected New Compensation
              </div>
              <div style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff', marginBottom: '6px' }}>
                ₹{projectedSalary}L <span style={{ fontSize: '18px', color: 'var(--apple-emerald)', fontWeight: 600 }}>+{hikePercentage}%</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--apple-text-secondary)', marginBottom: '20px' }}>
                Estimated Net Gain: <strong>+₹{projectedSalary - currentSalary} Lakhs/year</strong>
              </div>
              <button
                className="apple-btn apple-btn-primary"
                style={{ width: '100%' }}
                onClick={() => onNavigate('executive')}
              >
                Build Negotiation Playbook
              </button>
            </div>
          </div>
        </AppleCard>
      </div>

      {/* The 9-Agent System Showcase */}
      <div style={{ marginBottom: '80px' }}>
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 48px' }}>
          <div className="apple-badge apple-badge-purple" style={{ marginBottom: '12px' }}>Complete Career Arsenal</div>
          <h2 className="headline-section" style={{ marginBottom: '12px' }}>
            The 9 Specialized AI Career Agents
          </h2>
          <p style={{ color: 'var(--apple-text-secondary)' }}>
            Each agent handles a specific inflection point in your executive job search pipeline.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {agents.map((agent) => {
            const Icon = agent.icon;
            return (
              <AppleCard key={agent.name} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color="var(--apple-blue)" />
                    </div>
                    <span className="apple-badge apple-badge-blue" style={{ fontSize: '11px' }}>{agent.tag}</span>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                    {agent.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--apple-text-secondary)', lineHeight: 1.5 }}>
                    {agent.desc}
                  </div>
                </div>
              </AppleCard>
            );
          })}
        </div>
      </div>

      {/* Bottom Subdomain & Deploy Banner */}
      <AppleCard style={{ textAlign: 'center', padding: '48px 24px', background: 'linear-gradient(180deg, rgba(20, 22, 28, 0.8) 0%, rgba(10, 11, 15, 0.95) 100%)' }}>
        <h3 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '12px' }}>
          Ready to deploy on <span className="text-gradient-blue">career.myagentfirm.com</span>?
        </h3>
        <p style={{ color: 'var(--apple-text-secondary)', maxWidth: '580px', margin: '0 auto 28px', fontSize: '15px' }}>
          Production containerized stack: Node.js layered backend, isolated PostgreSQL on port 5438, and gpt-5.6-sol AI processing.
        </p>
        <button
          className="apple-btn apple-btn-primary"
          style={{ fontSize: '15px', padding: '12px 32px' }}
          onClick={() => onNavigate('dashboard')}
        >
          Enter Career Copilot Workspace →
        </button>
      </AppleCard>
    </div>
  );
}
