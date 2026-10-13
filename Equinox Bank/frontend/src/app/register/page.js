'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import styles from './register.module.css';

const COUNTRY_CODES = [
  { code: '+855', label: '🇰🇭 +855' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+65', label: '🇸🇬 +65' },
  { code: '+81', label: '🇯🇵 +81' },
  { code: '+61', label: '🇦🇺 +61' },
];

export default function Register() {
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+855');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password strength logic
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '#E2E2EB' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: '#EF4444' };
    if (score === 2) return { score: 2, label: 'Fair', color: '#F59E0B' };
    if (score === 3) return { score: 3, label: 'Good', color: '#10B981' };
    return { score: 4, label: 'Strong', color: '#059669' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!firstName || !lastName || !email || !phoneNumber || !password || !confirmPassword || !dateOfBirth || !address) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    const cleanedPhone = phoneNumber.replace(/^[0\s]+/, '');
    const fullPhoneNumber = `${countryCode}${cleanedPhone}`;

    setIsSubmitting(true);
    try {
      await register({
        firstName,
        lastName,
        email,
        phoneNumber: fullPhoneNumber,
        dateOfBirth,
        address,
        password,
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Left elevated Hero Panel */}
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
            <h1 className={styles.heroHeading}>Next-Gen Digital Financial Platform</h1>
            <p className={styles.heroSub}>
              Experience seamless multi-currency management, bank-grade encryption, and real-time smart financial analytics.
            </p>

            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>⚡</div>
                <div>
                  <div className={styles.featureTitle}>Instant Account Opening</div>
                  <div className={styles.featureDesc}>Get verified in minutes with zero paperwork delays.</div>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🛡️</div>
                <div>
                  <div className={styles.featureTitle}>Vault-Grade Security</div>
                  <div className={styles.featureDesc}>Protected by 256-bit SSL encryption & real-time monitoring.</div>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>📈</div>
                <div>
                  <div className={styles.featureTitle}>Smart Asset Management</div>
                  <div className={styles.featureDesc}>Automated interest calculation & instant peer transfers.</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.testimonialCard}>
            <div className={styles.avatarGroup}>
              <div className={styles.avatar}>JD</div>
              <div className={styles.avatar}>AK</div>
              <div className={styles.avatar}>MS</div>
              <span className={styles.trustText}>Joined by 50,000+ happy members</span>
            </div>
            <div className={styles.badgeLine}>
              <span className={styles.liveDot}></span> Trusted FDIC & Compliance Aligned
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          <div className={styles.headerContent}>
            <h1 className={styles.heading}>Create Your Account</h1>
            <p className={styles.subText}>Fill in your details to open your Equinox banking profile.</p>
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
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>First Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Jane"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Last Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Doe"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input
                  type="email"
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  placeholder="jane.doe@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Phone Number</label>
              <div className={styles.phoneInputGroup}>
                <select
                  className={styles.phoneSelect}
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  className={`${styles.input} ${styles.phoneInput}`}
                  placeholder="12 345 678"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Password</label>
                <div className={styles.passwordGroup}>
                  <div className={styles.inputWrapper}>
                    <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`${styles.input} ${styles.inputWithIcon} ${styles.inputWithRightIcon}`}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <svg
                      className={styles.inputIconRight}
                      onClick={() => setShowPassword(!showPassword)}
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {password && (
                    <div className={styles.strengthContainer}>
                      <div className={styles.strengthBars}>
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={styles.strengthBar}
                            style={{
                              backgroundColor: step <= strength.score ? strength.color : '#E2E2EB',
                            }}
                          />
                        ))}
                      </div>
                      <span className={styles.strengthText} style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Confirm Password</label>
                <div className={styles.inputWrapper}>
                  <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`${styles.input} ${styles.inputWithIcon} ${styles.inputWithRightIcon}`}
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <svg
                    className={styles.inputIconRight}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Date of Birth</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <input
                  type="date"
                  className={`${styles.input} ${styles.inputWithIcon} ${styles.datePicker}`}
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Residential Address</label>
              <textarea
                className={styles.textarea}
                placeholder="Enter your street address, city, and postal code"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className={styles.termsContainer}>
              <input type="checkbox" className={styles.checkbox} required id="terms" />
              <label htmlFor="terms" className={styles.termsText}>
                I agree to the <a href="#" className={styles.termsLink}>Terms & Conditions</a> and <a href="#" className={styles.termsLink}>Privacy Policy</a>.
              </label>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? (
                  <span>Registering...</span>
                ) : (
                  <>
                    <span>Create Account</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </>
                )}
              </button>
              
              <Link href="/login" className={styles.secondaryAction}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
