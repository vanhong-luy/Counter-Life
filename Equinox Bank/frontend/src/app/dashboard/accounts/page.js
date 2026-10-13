'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './accounts.module.css';
import { api } from '@/lib/api';
import { generateStatement } from '@/utils/generateStatement';

function formatCurrency(val) {
  if (typeof val === 'string') return val;
  return '$' + (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function maskAccountNumber(num) {
  if (!num) return '';
  const str = String(num);
  return '**** ' + str.slice(-4);
}

function getAccountStyle(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('checking')) return { bgColor: '#EAF1FB', iconColor: '#00327D' };
  if (t.includes('savings')) return { bgColor: '#FDECE4', iconColor: '#C44100' };
  return { bgColor: '#E7E7F0', iconColor: '#434653' };
}

const renderIcon = (type, color) => {
  if (type === 'checking' || type === 'Checking') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || "#00327D"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2"></rect>
        <circle cx="12" cy="12" r="2"></circle>
        <path d="M6 12h.01M18 12h.01"></path>
      </svg>
    );
  } else if (type === 'savings' || type === 'Savings') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || "#C44100"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 5h-2V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM8 4h8v1H8V4z"></path>
        <circle cx="12" cy="12" r="2"></circle>
      </svg>
    );
  } else {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || "#434653"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    );
  }
};

export default function MyAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getAccounts();
        setAccounts(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load accounts');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDownload = async (e, acc) => {
    e.preventDefault();
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      const txData = await api.getTransactions();
      const list = Array.isArray(txData) ? txData : (txData.transactions || []);
      const filtered = list
        .filter(t => {
          const srcId = t.sourceAccountId || t.fromAccountId;
          const tgtId = t.targetAccountId || t.toAccountId;
          return srcId == acc.accountId || tgtId == acc.accountId;
        })
        .slice(0, 10);
      generateStatement(
        { name: acc.name || acc.accountTypeName || 'Account', id: acc.accountId },
        filtered.map(t => ({
          date: t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
          merchant: t.description || t.typeName || 'Transaction',
          ref: t.referenceNumber || '-',
          status: t.status || '',
          amount: (t.targetAccountId == acc.accountId ? '+' : '-') + '$' + Math.abs(t.amount != null ? Number(t.amount) : 0).toFixed(2)
        })),
        'Last 30 Days'
      );
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <style>{`@keyframes dash-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #E5E7EB', borderTopColor: '#0047AB', borderRadius: '50%', animation: 'dash-spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px', color: '#C0392B' }}>
          <p>Failed to load accounts: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      
      <div className={styles.headerContainer}>
        <div className={styles.headerText}>
          <h1 className={styles.heading}>My Accounts</h1>
          <p className={styles.subText}>Manage your balances and view account details.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/accounts/new" className={styles.primaryBtn}>
            <svg className={styles.iconSpacing} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Open New Account
          </Link>
        </div>
      </div>

      {accounts.length === 0 ? (
        <p style={{ color: '#6B7280', textAlign: 'center', padding: '40px' }}>No accounts found.</p>
      ) : (
        <div className={styles.accountsGrid}>
          {accounts.map(acc => {
            const style = getAccountStyle(acc.type);
            const mask = acc.mask || maskAccountNumber(acc.accountNumber);
            return (
              <Link href={`/dashboard/accounts/${acc.accountId}`} key={acc.accountId} className={styles.accountCard}>
                <div className={styles.cardTop}>
                  <div className={styles.cardTitleArea}>
                    <div className={styles.cardIconBox} style={{ background: style.bgColor }}>
                      {renderIcon(acc.icon || acc.type, style.iconColor)}
                    </div>
                    <div className={styles.cardTitleText}>
                      <span className={styles.cardTitle}>{acc.name || acc.accountTypeName || 'Account'}</span>
                      {mask && <span className={styles.cardMask}>{mask}</span>}
                    </div>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px'}}>
                    <div className={styles.activeBadge}>
                      <svg className={styles.activeBadgeIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      {acc.status || 'Active'}
                    </div>
                    {acc.isPrimary && (
                      <div className={styles.activeBadge} style={{background: '#DAE2FF', color: '#00327D'}}>
                        Primary
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.cardMiddle}>
                  <span className={styles.balanceLabel}>AVAILABLE BALANCE</span>
                  <div style={{display: 'flex', alignItems: 'baseline'}}>
                    <span className={styles.balanceValue}>{formatCurrency(acc.balance)}</span>
                    <span className={styles.balanceCurrency}>USD</span>
                  </div>
                </div>

                <div className={styles.cardBottom}>
                  <div>
                    {acc.maturity && <span className={styles.maturityText}>| {acc.maturity}</span>}
                  </div>
                    <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.actionIconLink}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}
                      disabled={downloading}
                      onClick={(e) => handleDownload(e, acc)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </button>
                    <div className={styles.actionIconLink}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
