'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/lib/AdminAuthContext';
import styles from './login.module.css';

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials and staff access.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.brand}>
        <h1>Equinox<br />Banking</h1>
        <div className={styles.subtitle}>STAFF AUTHENTICATION GATEWAY</div>
      </div>

      <form className={styles.card} onSubmit={handleSubmit}>
        <h2>Secure Access</h2>

        {error && <div className={styles.errorBox}>{error}</div>}

        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabelRow}>
            <div className={styles.fieldLabel}>STAFF EMAIL</div>
          </div>
          <div className={styles.inputBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            <input
              type="email"
              placeholder="you@equinoxbanking.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabelRow}>
            <div className={styles.fieldLabel}>SECURE PASSWORD</div>
          </div>
          <div className={styles.inputBox} style={{ position: 'relative' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="•••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: '36px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </div>

        <button className={styles.loginBtn} type="submit" disabled={submitting}>
          {submitting ? 'VERIFYING…' : 'SECURE LOGIN'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><polyline points="9 12 11 14 15 10"/></svg>
        </button>

        <div className={styles.footerStatus}>
          <span className={styles.statusDot}></span>
          SYSTEM STATUS: OPERATIONAL
        </div>
      </form>

      <div className={styles.pageFooter}>
        <div className={styles.secureNote}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg>
          Secure End-to-End Encrypted Session
        </div>
        <div>STAFF PORTAL &middot; EQUINOX BANKING</div>
      </div>
    </div>
  );
}
