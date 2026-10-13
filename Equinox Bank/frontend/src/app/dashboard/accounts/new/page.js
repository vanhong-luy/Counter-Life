'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './new.module.css';
import { api } from '@/lib/api';

function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `acct-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const ACCOUNT_TYPES = [
  { id: 1, key: 'savings', title: 'Savings', desc: 'Earn competitive interest on your everyday balances with flexible access.', rate: '4.25%' },
  { id: 2, key: 'checking', title: 'Checking', desc: 'Ideal for daily transactions, bill payments, and direct deposits.', rate: '0.00%' },
  { id: 3, key: 'fixed', title: 'Fixed Deposit', desc: 'Lock in a guaranteed high yield for a predetermined term length.', rate: '4.50%' }
];

const FIXED_DEPOSIT_TERM_MONTHS = 12;

function formatMoney(val) {
  return '$' + (Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OpenNewAccount() {
  const router = useRouter();
  const [accountType, setAccountType] = useState('savings');
  const [accountName, setAccountName] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [existingAccounts, setExistingAccounts] = useState([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [principalDisposition, setPrincipalDisposition] = useState('REINVEST');
  const [termMonths, setTermMonths] = useState(12);
  const [fdRatesList, setFdRatesList] = useState([]);

  // Blocks a double-click: React state updates are async, so `loading` (and the
  // button's disabled prop) may not have applied yet when the second click lands.
  const submittingRef = useRef(false);
  // Stable across retries of the same intent so the server can dedupe them; only
  // rotated once an account has actually been opened.
  const idempotencyKeyRef = useRef(newIdempotencyKey());

  useEffect(() => {
    (async () => {
      try {
        const [accts, rates] = await Promise.all([
          api.getAccounts().catch(() => []),
          api.getFdRates().catch(() => [])
        ]);
        const eligible = (accts || []).filter(a => a.accountTypeName !== 'Fixed Deposit');
        setExistingAccounts(eligible);
        if (eligible.length > 0) setSourceAccountId(String(eligible[0].accountId));
        if (rates && rates.length > 0) setFdRatesList(rates);
      } catch {
        setExistingAccounts([]);
      }
    })();
  }, []);

  const getAccountTypeId = () => {
    const found = ACCOUNT_TYPES.find(t => t.key === accountType);
    return found ? found.id : 1;
  };

  const isFixed = accountType === 'fixed';
  const selectedSourceAccount = existingAccounts.find(a => String(a.accountId) === String(sourceAccountId));
  const depositAmountNum = parseFloat(depositAmount) || 0;
  const amountExceedsSource = isFixed && selectedSourceAccount && depositAmountNum > Number(selectedSourceAccount.balance);
  const selectedTermMonths = Number(termMonths) || 12;

  // Lookup dynamic APY from backend configured rates for selected termMonths
  const matchedRateObj = fdRatesList.find(r => r.termMonths === selectedTermMonths);
  const activeRateNum = matchedRateObj ? Number(matchedRateObj.interestRate) : (selectedTermMonths >= 36 ? 0.060 : selectedTermMonths >= 24 ? 0.0525 : selectedTermMonths >= 12 ? 0.045 : selectedTermMonths >= 6 ? 0.040 : 0.035);
  const activeRatePercentStr = (activeRateNum * 100).toFixed(2) + '%';

  const estimatedInterest = depositAmountNum * activeRateNum * (selectedTermMonths / 12);
  const estimatedMaturityDate = new Date();
  estimatedMaturityDate.setMonth(estimatedMaturityDate.getMonth() + selectedTermMonths);

  const canSubmitFixed = isFixed
    ? (sourceAccountId && depositAmountNum > 0 && !amountExceedsSource && principalDisposition)
    : true;

  const handleOpenAccount = async (e) => {
    e.preventDefault();
    if (!termsAgreed || !canSubmitFixed) return;
    if (submittingRef.current || success) return;
    submittingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const payload = {
        accountTypeId: getAccountTypeId(),
        name: accountName || selectedTypeInfo.title,
        idempotencyKey: idempotencyKeyRef.current
      };
      if (isFixed) {
        payload.amount = depositAmountNum;
        payload.sourceAccountId = Number(sourceAccountId);
        payload.principalDisposition = principalDisposition;
        payload.termMonths = selectedTermMonths;
      }
      await api.createAccount(payload);
      idempotencyKeyRef.current = newIdempotencyKey();
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/accounts'), 2000);
    } catch (err) {
      setError(err.message);
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeInfo = ACCOUNT_TYPES.find(t => t.key === accountType);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.breadcrumbs}>
        <Link href="/dashboard/accounts" className={styles.breadcrumbLink}>My Accounts</Link>
        <span className={styles.breadcrumbSeparator}>&rsaquo;</span>
        <span className={styles.breadcrumbCurrent}>Open New Account</span>
      </div>

      <h1 className={styles.heading}>Open New Account</h1>
      <p className={styles.subHeading}>Select an account type to begin configuring your new portfolio addition.</p>

      {error && (
        <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: '#16A34A', background: '#DCFCE7', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          Account created successfully! Redirecting...
        </div>
      )}

      <h2 className={styles.sectionTitle}>Select Account Type</h2>

      <div className={styles.typeSelectors}>
        {ACCOUNT_TYPES.map(type => (
          <div
            key={type.key}
            className={`${styles.typeCard} ${accountType === type.key ? styles.typeCardSelected : ''}`}
            onClick={() => setAccountType(type.key)}
          >
            <div className={styles.typeCardHeader}>
              <div className={`${styles.typeIconBox} ${accountType === type.key ? styles.typeIconBoxSelected : ''}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {type.key === 'savings' && <path d="M19 5h-2V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM8 4h8v1H8V4z" />}
                  {type.key === 'checking' && <rect x="2" y="6" width="20" height="12" rx="2" />}
                  {type.key === 'fixed' && <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />}
                </svg>
              </div>
              {accountType === type.key && (
                <svg className={styles.checkIcon} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              )}
            </div>
            <h3 className={styles.typeTitle}>{type.title}</h3>
            <p className={styles.typeDesc}>{type.desc}</p>
          </div>
        ))}
      </div>

      <h2 className={styles.sectionTitle}>Configuration</h2>

      <div className={styles.configContainer}>
        <div className={styles.configForm}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Account Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. School Account, Business Account"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontFamily: 'Inter',
                fontSize: '14px',
                border: '1px solid #C3C6D5',
                borderRadius: '4px',
                outline: 'none',
                color: '#191B22',
                background: '#FFFFFF'
              }}
            />
          </div>

          {isFixed && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Source Account</label>
                <select
                  className={styles.input}
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', fontFamily: 'Inter', fontSize: '14px',
                    border: '1px solid #C3C6D5', borderRadius: '4px', outline: 'none',
                    color: '#191B22', background: '#FFFFFF'
                  }}
                >
                  {existingAccounts.length === 0 && <option value="">No eligible account</option>}
                  {existingAccounts.map(a => (
                    <option key={a.accountId} value={a.accountId}>
                      {a.name || a.accountTypeName} — {formatMoney(a.balance)} available
                    </option>
                  ))}
                </select>
                <p style={{fontSize: '12px', color: '#6B7280', marginTop: '4px'}}>
                  Funds will be moved out of this account immediately when the Fixed Deposit is opened.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Deposit Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={styles.input}
                  placeholder="e.g. 5000.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', fontFamily: 'Inter', fontSize: '14px',
                    border: `1px solid ${amountExceedsSource ? '#DC2626' : '#C3C6D5'}`, borderRadius: '4px', outline: 'none',
                    color: '#191B22', background: '#FFFFFF'
                  }}
                />
                {amountExceedsSource && (
                  <p style={{fontSize: '12px', color: '#DC2626', marginTop: '4px'}}>
                    Amount exceeds the selected source account's available balance.
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Term Length</label>
                <select
                  className={styles.input}
                  value={termMonths}
                  onChange={(e) => setTermMonths(Number(e.target.value))}
                  style={{
                    width: '100%', padding: '12px 16px', fontFamily: 'Inter', fontSize: '14px',
                    border: '1px solid #C3C6D5', borderRadius: '4px', outline: 'none',
                    color: '#191B22', background: '#FFFFFF'
                  }}
                >
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months (1 Year)</option>
                  <option value={24}>24 Months (2 Years)</option>
                  <option value={36}>36 Months (3 Years)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>After Maturity</label>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <label style={{display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#191B22', cursor: 'pointer'}}>
                    <input
                      type="radio"
                      name="disposition"
                      checked={principalDisposition === 'REINVEST'}
                      onChange={() => setPrincipalDisposition('REINVEST')}
                      style={{marginTop: '3px'}}
                    />
                    Keep the principal and interest in this Fixed Deposit account
                  </label>
                  <label style={{display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#191B22', cursor: 'pointer'}}>
                    <input
                      type="radio"
                      name="disposition"
                      checked={principalDisposition === 'TRANSFER_TO_PRIMARY'}
                      onChange={() => setPrincipalDisposition('TRANSFER_TO_PRIMARY')}
                      style={{marginTop: '3px'}}
                    />
                    Transfer the principal and interest to my primary account
                  </label>
                </div>
                <p style={{fontSize: '12px', color: '#C44100', marginTop: '8px'}}>
                  This choice cannot be changed once the account is opened.
                </p>
              </div>
            </>
          )}
        </div>

        <div className={styles.summaryPanel}>
          <span className={styles.summaryLabel} style={{marginBottom: '16px'}}>ACCOUNT SUMMARY</span>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>Account Type</span>
            <span className={styles.summaryRowValue}>{selectedTypeInfo?.title || 'Savings'}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>Interest Rate (APY)</span>
            <span className={styles.summaryRowValue}>{isFixed ? activeRatePercentStr : (selectedTypeInfo?.rate || '4.25%')}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>Currency</span>
            <span className={styles.summaryRowValue}>USD</span>
          </div>
          {isFixed && (
            <>
              <div className={styles.summaryRow}>
                <span className={styles.summaryRowLabel}>Term Length</span>
                <span className={styles.summaryRowValue}>{selectedTermMonths} months</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryRowLabel}>Maturity Date</span>
                <span className={styles.summaryRowValue}>{estimatedMaturityDate.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryRowLabel}>Deposit Amount</span>
                <span className={styles.summaryRowValue}>{formatMoney(depositAmountNum)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryRowLabel}>Estimated Interest</span>
                <span className={styles.summaryRowValue}>{formatMoney(estimatedInterest)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryRowLabel}>Estimated Total at Maturity</span>
                <span className={styles.summaryRowValue}>{formatMoney(depositAmountNum + estimatedInterest)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.actionsFooter}>
        <div className={styles.termsContainer}>
          <input
            type="checkbox"
            className={styles.checkbox}
            id="terms"
            checked={termsAgreed}
            onChange={(e) => setTermsAgreed(e.target.checked)}
          />
          <label htmlFor="terms" className={styles.termsText}>
            I agree to the <Link href="#" className={styles.termsLink}>Account Terms & Conditions</Link> and acknowledge the <Link href="#" className={styles.termsLink}>Fee Schedule</Link>.
          </label>
        </div>
        <div className={styles.buttonsContainer}>
          <button
            className={`${styles.submitBtn} ${(!termsAgreed || !canSubmitFixed || loading || success) ? styles.disabledBtn : ''}`}
            onClick={handleOpenAccount}
            disabled={!termsAgreed || !canSubmitFixed || loading || success}
          >
            {loading ? 'Opening...' : success ? 'Account Opened' : 'Open Account'}
          </button>
          <button className={styles.cancelBtn} onClick={() => router.back()}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
