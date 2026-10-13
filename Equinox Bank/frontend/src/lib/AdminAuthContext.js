'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken, clearToken, hasToken } from './api';

// NOTE: The backend issues one JWT type for both customers and staff, and the
// token itself carries no role claim (see JwtService — subject is just the
// email). The only reliable way to know "is this an admin?" from the frontend
// is to try an admin-only endpoint and see if the server (which resolves the
// role from the DB on every request) accepts it. That's what this context does.

const AdminAuthContext = createContext(null);

function decodeEmail(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null); // { email }
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const verifyAdmin = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      if (!token) return false;

      let profileRes = await fetch('/auth/admin/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // If token expired, try refresh
      if (!profileRes.ok && profileRes.status === 401) {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('admin_refresh_token') : null;
        if (refreshToken) {
          const refreshRes = await fetch('/auth/admin/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (typeof window !== 'undefined') {
              localStorage.setItem('admin_token', refreshData.token);
              if (refreshData.refreshToken) localStorage.setItem('admin_refresh_token', refreshData.refreshToken);
            }
            // Retry profile fetch with the new token
            profileRes = await fetch('/auth/admin/me', {
              headers: { 'Authorization': `Bearer ${refreshData.token}` }
            });
          } else if (refreshRes.status >= 400 && refreshRes.status < 500) {
            // Explicit auth failure — refresh token is invalid or expired, clear and bail
            if (typeof window !== 'undefined') {
              localStorage.removeItem('admin_token');
              localStorage.removeItem('admin_refresh_token');
            }
            setAdmin(null);
            return false;
          }
          // Network/5xx error on refresh → fall through, let profileRes.ok check decide
        }
      }

      if (!profileRes.ok) throw new Error('Not admin');
      const profile = await profileRes.json();

      setAdmin({
        email: profile.email || decodeEmail(token) || 'Staff User',
        roleName: profile.roleName || '',
        permissions: profile.permissions || [],
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
      });
      return true;
    } catch (err) {
      // Don't wipe tokens on network errors — server may be temporarily unreachable.
      // Only null out the in-memory admin state so the UI reflects logged-out.
      setAdmin(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (token) {
      verifyAdmin().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [verifyAdmin]);

  const login = async (email, password) => {
    const res = await fetch('/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed. Check your credentials and staff access.');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', data.token);
      if (data.refreshToken) localStorage.setItem('admin_refresh_token', data.refreshToken);
    }

    setAdmin({
      email: data.roleName ? decodeEmail(data.token) || 'Staff User' : decodeEmail(data.token) || 'Staff User',
      roleName: data.roleName || '',
      permissions: data.permissions || [],
    });

    router.push('/admin/dashboard');
  };

  const logout = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('admin_refresh_token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (refreshToken) headers['X-Refresh-Token'] = refreshToken;
      await fetch('/auth/admin/logout', { method: 'POST', headers });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
    }
    setAdmin(null);
    router.push('/admin/login');
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
