'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';
import { api } from '@/lib/api';

function parseAmount(val) {
  if (val == null) return 0;
  if (typeof val === 'number') return Math.abs(val);
  return Math.abs(parseFloat(String(val).replace(/[^0-9.-]/g, ''))) || 0;
}

function formatCurrency(val) {
  return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [recentTrx, setRecentTrx] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [accts, trx] = await Promise.all([
          api.getAccounts(),
          api.getTransactions()
        ]);
        setAccounts(accts || []);

        const balance = (accts || []).reduce((sum, a) => sum + parseAmount(a.balance), 0);
        setTotalBalance(balance);

        const sorted = [...(trx || [])].sort((a, b) =>
          new Date(b.transactionDate || b.date || b.createdAt) - new Date(a.transactionDate || a.date || a.createdAt)
        );
        setRecentTrx(sorted.slice(0, 5));
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Direction, not transaction type, decides green vs red — the same account can be on
  // either side of a "transfer". Type is only a fallback for rows with no account link.
  const myAccountIds = new Set(
    (accounts || []).map(a => String(a.accountId ?? a.id)).filter(id => id && id !== 'undefined')
  );

  const isMoneyOut = (trx) => {
    const src = trx.sourceAccountId ?? trx.fromAccountId;
    const tgt = trx.targetAccountId ?? trx.toAccountId;
    const srcMine = src != null && myAccountIds.has(String(src));
    const tgtMine = tgt != null && myAccountIds.has(String(tgt));

    if (srcMine && !tgtMine) return true;
    if (tgtMine && !srcMine) return false;
    if (srcMine && tgtMine) return true;

    if (typeof trx.amount === 'number' && trx.amount < 0) return true;
    const t = (trx.typeName || '').toLowerCase();
    return t === 'withdrawal' || t === 'transfer_out' || t === 'negative'
      || t === 'savings_goal_deposit' || t === 'loan_repayment'
      || t === 'loan_interest' || t === 'late_fee' || t === 'interest_charge'
      || t === 'debit_purchase' || t === 'credit_purchase';
  };

  const getIcon = (iconType) => {
    if (iconType === 'refund') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    );
    if (iconType === 'dining') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
        <line x1="6" y1="1" x2="6" y2="4"></line>
        <line x1="10" y1="1" x2="10" y2="4"></line>
        <line x1="14" y1="1" x2="14" y2="4"></line>
      </svg>
    );
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
      </svg>
    );
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
          <p>Failed to load dashboard: {error}</p>
        </div>
      </div>
    );
  }

  const defaultAccount = accounts.find(a => a.isPrimary) || accounts[0] || null;

  return (
    <div className={styles.pageContainer}>

      <div className={styles.headerContainer}>
        <h1 className={styles.heading}>Dashboard Overview</h1>
        <p className={styles.subText}>Welcome back. Here is a summary of your financial status.</p>
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.leftColumn}>

          <div className={styles.balanceCard}>
            <div className={styles.balanceTop}>
              <div className={styles.balanceInfo}>
                <span className={styles.defaultAccountLabel}>
                  {defaultAccount ? (defaultAccount.name || defaultAccount.accountTypeName || 'DEFAULT ACCOUNT').toUpperCase() : 'TOTAL BALANCE'}
                </span>
                <span className={styles.balanceAmount}>
                  {formatCurrency(defaultAccount ? parseAmount(defaultAccount.balance) : totalBalance)}
                </span>
              </div>
              <div className={styles.walletIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
                  <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
                  <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>My Accounts</h3>
              <Link href="/dashboard/accounts" className={styles.sectionLink}>View All</Link>
            </div>
            <div className={styles.accountsList}>
              {accounts.slice(0, 3).map(acc => (
                <div key={acc.accountId || acc.id} className={styles.accountRow}>
                  <div className={styles.accountIconBox}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                  <div className={styles.accountInfo}>
                    <span className={styles.accountName}>{acc.name || acc.accountTypeName}</span>
                    <span className={styles.accountType}>{acc.accountTypeName || 'Checking'}</span>
                  </div>
                  <span className={styles.accountBalance}>
                    {typeof acc.balance === 'string' ? acc.balance : formatCurrency(acc.balance || 0)}
                  </span>
                </div>
              ))}
              {accounts.length === 0 && (
                <p style={{ color: '#6B7280', padding: '16px' }}>No accounts found.</p>
              )}
            </div>
          </div>

          <div className={styles.quickActionsContainer}>
            <h3 className={styles.quickActionsHeading}>Quick Actions</h3>
            <div className={styles.actionGrid}>

              <Link href="/dashboard/transactions/transfer" className={styles.actionCard}>
                <div className={styles.actionIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </div>
                <span className={styles.actionText}>Transfer</span>
              </Link>

              <Link href="/dashboard/transactions" className={styles.actionCard}>
                <div className={styles.actionIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <span className={styles.actionText}>Transactions</span>
              </Link>

              <Link href="/dashboard/cards" className={styles.actionCard}>
                <div className={styles.actionIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                </div>
                <span className={styles.actionText}>Cards</span>
              </Link>

              <Link href="/dashboard/analytics" className={styles.actionCard}>
                <div className={styles.actionIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </div>
                <span className={styles.actionText}>Analytics</span>
              </Link>

            </div>
          </div>
        </div>

        <aside className={styles.asideContainer}>
          <div className={styles.asideHeader}>
            <h3 className={styles.asideHeading}>Recent Activity</h3>
            <Link href="/dashboard/transactions" className={styles.asideLink}>View All</Link>
          </div>

          <div className={styles.activityList}>
            {recentTrx.map((t, i) => {
              const isPositive = !isMoneyOut(t);
              return (
                <div key={t.transactionId || t.id || i} className={styles.activityItem}>
                  <div className={styles.activityIconBox}>
                    <span className={styles.activityIcon}>{getIcon(t.iconType)}</span>
                  </div>
                  <div className={styles.activityDetails}>
                    <span className={styles.activityTitle}>{t.merchant || t.description || t.typeName || 'Transaction'}</span>
                    <span className={styles.activityTime}>{formatDate(t.transactionDate || t.date || t.createdAt)}</span>
                  </div>
                  <span className={isPositive ? styles.activityAmountPositive : styles.activityAmountNegative}>
                    {(isPositive ? '+' : '-') + formatCurrency(parseAmount(t.amount))}
                  </span>
                </div>
              );
            })}
            {recentTrx.length === 0 && (
              <p style={{ color: '#6B7280', padding: '16px' }}>No recent transactions.</p>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}
