'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import styles from './login.module.css';

export default function Login() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Left Elevated Hero Panel */}
      <div className={styles.leftPanel}>
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <div className={styles.brandHeader}>
            <div className={styles.logoBadge}>
              <svg className={styles.brandLogo} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className={styles.brandTitle}>EQUINOX BANKING</span>
          </div>

          <div className={styles.heroBody}>
            <h1 className={styles.heroHeading}>Welcome Back to Equinox</h1>
            <p className={styles.heroSub}>
              Access your multi-currency accounts, transfer funds instantly, and manage smart savings with end-to-end security.
            </p>

            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🔐</div>
                <div>
                  <div className={styles.featureTitle}>Multi-Factor Authentication</div>
                  <div className={styles.featureDesc}>Enhanced device verification & token encryption.</div>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>⚡</div>
                <div>
                  <div className={styles.featureTitle}>Real-Time Transfers</div>
                  <div className={styles.featureDesc}>Instant zero-fee internal & peer-to-peer transfers.</div>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>📊</div>
                <div>
                  <div className={styles.featureTitle}>Smart Wealth Dashboard</div>
                  <div className={styles.featureDesc}>Comprehensive card management & live analytics.</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.securityBadgeCard}>
            <div className={styles.securityHeader}>
              <span className={styles.shieldIcon}>🛡️</span>
              <span className={styles.securityTitle}>256-Bit Encrypted Portal</span>
            </div>
            <p className={styles.securityText}>
              Your session is protected with automated audit logging and token revocation security.
            </p>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          <div className={styles.headerContent}>
            <h1 className={styles.heading}>Sign In</h1>
            <p className={styles.subText}>Enter your credentials to access your financial account.</p>
          </div>

          {error && (
            <div className={styles.errorAlert}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIconLeft} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="jane.doe@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Password</label>
                <Link href="/forgot-password" className={styles.forgotLink}>
                  Forgot password?
                </Link>
              </div>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIconLeft} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`${styles.input} ${styles.inputWithRightIcon}`}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <svg
                  className={styles.inputIconRight}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <div className={styles.rememberMeContainer}>
              <input type="checkbox" className={styles.checkbox} id="remember" />
              <label htmlFor="remember" className={styles.rememberText}>
                Remember me on this device
              </label>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </>
              )}
            </button>

            <div className={styles.registerContainer}>
              <span className={styles.registerText}>Don't have an account yet?</span>
              <Link href="/register" className={styles.registerLink}>
                Create an Account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
