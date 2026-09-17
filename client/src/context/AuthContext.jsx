import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('career_copilot_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('career_copilot_auth_token') || null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      // If we have token, check session with /auth/me
      if (token) {
        try {
          const res = await api.getMe();
          if (res?.user) {
            setUser(res.user);
            localStorage.setItem('career_copilot_user', JSON.stringify(res.user));
          }
        } catch (e) {
          console.warn('[Auth] Session validation failed:', e.message);
        }
      } else {
        // Auto-seed demo user session on fresh open so user is immediately active
        try {
          const res = await api.demoLogin();
          if (res?.token && res?.user) {
            setToken(res.token);
            setUser(res.user);
            localStorage.setItem('career_copilot_auth_token', res.token);
            localStorage.setItem('career_copilot_user', JSON.stringify(res.user));
          }
        } catch (e) {
          console.warn('[Auth] Initial demo auto-login failed:', e.message);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async ({ email, password }) => {
    const res = await api.login({ email, password });
    if (res?.token && res?.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('career_copilot_auth_token', res.token);
      localStorage.setItem('career_copilot_user', JSON.stringify(res.user));
      setShowAuthModal(false);
      return res.user;
    }
    throw new Error(res?.error || 'Login failed');
  };

  const signup = async ({ full_name, email, password, current_role }) => {
    const res = await api.signup({ full_name, email, password, current_role });
    if (res?.token && res?.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('career_copilot_auth_token', res.token);
      localStorage.setItem('career_copilot_user', JSON.stringify(res.user));
      setShowAuthModal(false);
      return res.user;
    }
    throw new Error(res?.error || 'Sign up failed');
  };

  const demoLogin = async () => {
    const res = await api.demoLogin();
    if (res?.token && res?.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('career_copilot_auth_token', res.token);
      localStorage.setItem('career_copilot_user', JSON.stringify(res.user));
      setShowAuthModal(false);
      return res.user;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('career_copilot_auth_token');
    localStorage.removeItem('career_copilot_user');
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res?.user) {
        setUser(res.user);
        localStorage.setItem('career_copilot_user', JSON.stringify(res.user));
      }
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        showAuthModal,
        openAuthModal: () => setShowAuthModal(true),
        closeAuthModal: () => setShowAuthModal(false),
        login,
        signup,
        demoLogin,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
