'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import styles from './forgot-password.module.css';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.forgotPassword(email);
      setMessage('A reset token has been sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.resetPassword({ token, newPassword });
      setMessage('Password reset successfully. You can now log in with your new password.');
      setStep(3);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        
        {/* Brand Anchor */}
        <div className={styles.brandAnchor}>
          <div className={styles.brandIconWrapper}>
            <svg className={styles.brandIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className={styles.brandTextBold}>Equinox</span>
          <span className={styles.brandTextLight}>Banking</span>
        </div>

        {/* Main Card */}
        <div className={styles.card}>
          
          {/* Progress Indicator */}
          <div className={styles.progressContainer}>
            <div className={styles.progressLineBg}></div>
            <div className={styles.progressLineActive} style={{ width: step >= 2 ? step === 3 ? '100%' : '50%' : '0%' }}></div>
            
            <div className={styles.step}>
              <div className={step >= 1 ? styles.stepCircleActive : styles.stepCircleInactive}>1</div>
              <span className={step >= 1 ? styles.stepTextActive : styles.stepTextInactive}>Email</span>
            </div>
            
            <div className={styles.step}>
              <div className={step >= 2 ? styles.stepCircleActive : styles.stepCircleInactive}>2</div>
              <span className={step >= 2 ? styles.stepTextActive : styles.stepTextInactive}>Verify</span>
            </div>
            
            <div className={styles.step}>
              <div className={step >= 3 ? styles.stepCircleActive : styles.stepCircleInactive}>3</div>
              <span className={step >= 3 ? styles.stepTextActive : styles.stepTextInactive}>Reset</span>
            </div>
          </div>

          {/* Header Content */}
          <div className={styles.headerContent}>
            <h1 className={styles.heading}>Forgot Password</h1>
            <p className={styles.subText}>
              {step === 1 && "Enter the email address associated with your account and we'll send you a secure link to reset your password."}
              {step === 2 && "Enter the reset token sent to your email and your new password."}
              {step === 3 && "Your password has been reset successfully."}
            </p>
          </div>

          {error && <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>{error}</div>}
          {message && <div style={{ color: '#16a34a', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>{message}</div>}

          {step === 1 && (
            <form className={styles.form} onSubmit={handleEmailSubmit}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email Address</label>
                <div className={styles.inputWrapper}>
                  <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input 
                    type="email" 
                    className={styles.input} 
                    placeholder="name@company.com" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className={styles.submitBtn}>
                Send Reset Link
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          )}

          {step === 2 && (
            <form className={styles.form} onSubmit={handleResetSubmit}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Reset Token</label>
                <div className={styles.inputWrapper}>
                  <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="Enter reset token" 
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>New Password</label>
                <div className={styles.inputWrapper}>
                  <input 
                    type="password" 
                    className={styles.input} 
                    placeholder="Enter new password" 
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className={styles.submitBtn}>
                Reset Password
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Link href="/login" className={styles.submitBtn} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                Go to Login
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          )}

          {/* Secondary Action */}
          <Link href="/login" className={styles.secondaryAction}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Login
          </Link>
          
        </div>

        {/* Footer Meta */}
        <div className={styles.footerMeta}>
          Secure 256-bit Encryption • Institutional Grade
        </div>
        
      </div>
    </div>
  );
}
