import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  User, Mail, Lock, Sparkles, ArrowRight, X,
  ShieldCheck, Loader2, CheckCircle2, Zap, Briefcase
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function AuthModal({ isOpen, onClose }) {
  const { login, signup, demoLogin } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    current_role: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await signup({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          current_role: form.current_role
        });
      }
      confetti({ particleCount: 70, spread: 60 });
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      await demoLogin();
      confetti({ particleCount: 50, spread: 50 });
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.78)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--apple-card-bg)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '460px',
        padding: '32px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        position: 'relative',
        animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Close button */}
        <button
          id="close-auth-modal-btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--apple-text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0a84ff 0%, #bf5af2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 8px 24px rgba(10,132,255,0.3)'
          }}>
            <ShieldCheck size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Career Account'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--apple-text-secondary)', margin: 0 }}>
            {mode === 'login'
              ? 'Access your saved master resume, target roles & pipeline'
              : 'Save your profile, target roles and personalized AI strategies'}
          </p>
        </div>

        {/* Quick Demo Login Option */}
        <button
          id="auth-quick-demo-btn"
          type="button"
          onClick={handleQuickDemo}
          disabled={loading}
          className="apple-btn"
          style={{
            width: '100%',
            marginBottom: '18px',
            padding: '11px 16px',
            background: 'rgba(10, 132, 255, 0.12)',
            border: '1px solid rgba(10, 132, 255, 0.35)',
            color: '#0a84ff',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <Zap size={16} />
          ⚡ 1-Click Demo Candidate Sign In
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '18px',
          color: 'var(--apple-text-secondary)',
          fontSize: '11px',
          textTransform: 'uppercase',
          fontWeight: 700,
          letterSpacing: '0.05em'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span>Or with email</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(255, 69, 58, 0.12)',
            border: '1px solid rgba(255, 69, 58, 0.3)',
            color: '#ff453a',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '12px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
                <input
                  id="auth-signup-name-input"
                  className="apple-input"
                  style={{ paddingLeft: '36px', height: '40px' }}
                  required
                  placeholder="e.g. Siddhant Rangari"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
              <input
                id="auth-email-input"
                type="email"
                className="apple-input"
                style={{ paddingLeft: '36px', height: '40px' }}
                required
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: mode === 'signup' ? '12px' : '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
              <input
                id="auth-password-input"
                type="password"
                className="apple-input"
                style={{ paddingLeft: '36px', height: '40px' }}
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Current Role / Focus
              </label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
                <input
                  id="auth-signup-role-input"
                  className="apple-input"
                  style={{ paddingLeft: '36px', height: '40px' }}
                  placeholder="e.g. Senior Software Engineer / Lead"
                  value={form.current_role}
                  onChange={(e) => setForm({ ...form, current_role: e.target.value })}
                />
              </div>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="apple-btn apple-btn-primary"
            style={{
              width: '100%',
              height: '42px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" />
                {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
              </>
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Mode Toggle Footer */}
        <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: 'var(--apple-text-secondary)' }}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                id="switch-to-signup-btn"
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('signup');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--apple-blue)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                id="switch-to-login-btn"
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('login');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--apple-blue)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
