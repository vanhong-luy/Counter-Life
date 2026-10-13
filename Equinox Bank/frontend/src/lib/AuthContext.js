'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken, setRefreshToken, clearToken, hasToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.getProfile();
      setUser(data);
    } catch (err) {
      // api.js already handles token clearing + redirect for expired/invalid sessions.
      // Only wipe local user state here so the UI reflects the logged-out state.
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (hasToken()) {
      fetchProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    setToken(res.token);
    if (res.refreshToken) setRefreshToken(res.refreshToken);
    await fetchProfile();
    router.push('/dashboard');
  };

  const register = async (data) => {
    const regRes = await api.register(data);
    setToken(regRes.token);
    if (regRes.refreshToken) setRefreshToken(regRes.refreshToken);
    await fetchProfile();
    router.push('/dashboard');
  };

  const logout = async () => {
    try { await api.logout(); } catch {}
    clearToken();
    setUser(null);
    router.push('/login');
  };

  const updateUser = (data) => {
    setUser(prev => prev ? { ...prev, ...data } : data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
