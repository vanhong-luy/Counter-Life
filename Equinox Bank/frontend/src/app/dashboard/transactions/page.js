'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './transactions.module.css';
import { api } from '@/lib/api';

export default function Transactions() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterAccountId, setFilterAccountId] = useState('All Accounts');
  const [filterDate, setFilterDate] = useState('Last 30 Days');
  const [filterType, setFilterType] = useState('All Types');
  const [filterSearch, setFilterSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [accts, trx] = await Promise.all([
          api.getAccounts(),
          api.getTransactions()
        ]);
        setAccounts(accts || []);

        const accountParam = searchParams.get('account');
        if (accountParam) {
          const matched = (accts || []).find(a => String(a.id) === accountParam);
          if (matched) setFilterAccountId(String(matched.id));
        }

        const searchParam = searchParams.get('search');
        setFilterSearch(searchParam || '');

        setTransactions(trx || []);
      } catch (err) {
        setError(err.message || 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [searchParams]);

  // Green vs red is decided by which side of the transaction the customer's own account
  // sits on, not by the transaction type — a "transfer" is incoming or outgoing depending
  // on the account, so a type allow-list gets it wrong. The type check below is only a
  // fallback for rows that carry no account link at all (fees, card-only entries).
  const myAccountIds = new Set(
    (accounts || []).map(a => String(a.accountId ?? a.id)).filter(id => id && id !== 'undefined')
  );

  const isMoneyOut = (trx) => {
    const src = trx.sourceAccountId ?? trx.fromAccountId;
    const tgt = trx.targetAccountId ?? trx.toAccountId;
    const srcMine = src != null && myAccountIds.has(String(src));
    const tgtMine = tgt != null && myAccountIds.has(String(tgt));

    if (srcMine && !tgtMine) return true;   // left my accounts
    if (tgtMine && !srcMine) return false;  // arrived in my accounts
    if (srcMine && tgtMine) return true;    // moved between my own accounts — show from the source side

    if (typeof trx.amount === 'number' && trx.amount < 0) return true;
    const t = (trx.typeName || '').toLowerCase();
    return t === 'withdrawal' || t === 'transfer_out' || t === 'negative'
      || t === 'savings_goal_deposit' || t === 'loan_repayment'
      || t === 'loan_interest' || t === 'late_fee' || t === 'interest_charge'
      || t === 'debit_purchase' || t === 'credit_purchase';
  };

  const getIcon = (type) => {
    if (type === 'fee') return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    );
    if (type === 'interest') return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10"></line>
        <line x1="18" y1="20" x2="18" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="16"></line>
      </svg>
    );
    if (type === 'loan') return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    );
    if (type === 'store') return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      </svg>
    );
    if (type === 'refund') return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10h18M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path>
        <path d="M8 14l2 2 4-4"></path>
      </svg>
    );
    if (type === 'savings') return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
      </svg>
    );
    if (type === 'deposit') return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <polyline points="19 12 12 19 5 12"></polyline>
      </svg>
    );
    if (type === 'withdrawal') return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
    );
    if (type === 'transfer') return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9"></polyline>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
        <polyline points="7 23 3 19 7 15"></polyline>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
      </svg>
    );
    if (type === 'payment') return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="6" width="22" height="12" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
    );
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    );
  };

  const getIconClass = (iconType) => {
    if (iconType === 'store' || iconType === 'dining') return styles.iconBoxRed;
    if (iconType === 'refund' || iconType === 'deposit' || iconType === 'interest') return styles.iconBoxGreen;
    if (iconType === 'fee' || iconType === 'loan') return styles.iconBoxRed;
    return styles.iconBoxBlue;
  };

  const getBadgeClass = (status) => {
    if (status === 'Cleared' || status === 'COMPLETED') return styles.badgeCleared;
    if (status === 'Processing' || status === 'PROCESSING') return styles.badgeProcessing;
    if (status === 'Pending' || status === 'PENDING') return styles.badgePending;
    return styles.badgeCleared;
  };

  const getStatusIcon = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'CLEARED' || s === 'COMPLETED') return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    );
    if (s === 'PROCESSING') return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    );
    if (s === 'PENDING') return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line>
      </svg>
    );
    return null;
  };

  const showBalance = filterAccountId !== 'All Accounts' && filterAccountId !== '';
  const selectedAccountForBalance = showBalance
    ? accounts.find(a => String(a.id || a.accountId) === filterAccountId)
    : null;

  const filteredTransactions = transactions.filter(trx => {
    if (filterSearch && !(trx.description || '').toLowerCase().includes(filterSearch.toLowerCase())) return false;

    if (filterAccountId !== 'All Accounts') {
      const ids = [trx.sourceAccountId, trx.targetAccountId, trx.accountId, trx.fromAccountId, trx.toAccountId].filter(Boolean);
      if (!ids.some(id => String(id) === filterAccountId)) return false;
    }

    if (filterType !== 'All Types') {
      const cat = (trx.categoryName || '').toLowerCase();
      const type = (trx.typeName || '').toLowerCase();
      if (filterType === 'General' && ['refund', 'internal saving', 'internal transfer', 'withdrawal', 'deposit', 'savings goal', 'savings_goal_deposit', 'savings_goal_withdrawal', 'loan_repayment', 'loan_interest', 'late_fee', 'interest_charge', 'debit_purchase', 'credit_purchase'].includes(cat)) return false;
      if (filterType === 'Refund' && cat !== 'refund') return false;
      if (filterType === 'Internal Saving' && cat !== 'internal saving' && cat !== 'internal transfer') return false;
      if (filterType === 'Withdrawal' && cat !== 'withdrawal' && type !== 'savings_goal_withdrawal') return false;
      if (filterType === 'Deposit' && cat !== 'deposit' && type !== 'savings_goal_deposit') return false;
      if (filterType === 'Savings Goal' && type !== 'savings_goal_deposit' && type !== 'savings_goal_withdrawal') return false;
      if (filterType === 'Fees & Interest' && type !== 'loan_interest' && type !== 'late_fee' && type !== 'interest_charge') return false;
      if (filterType === 'Loan Repayment' && type !== 'loan_repayment') return false;
      if (filterType === 'Card Purchase' && type !== 'debit_purchase' && type !== 'credit_purchase') return false;
    }

    const trxDate = new Date(trx.transactionDate || trx.date || trx.createdAt);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now - trxDate) / (1000 * 60 * 60 * 24));

    if (isNaN(diffDays)) return true;
    if (filterDate === 'Today' && diffDays > 1) return false;
    if (filterDate === 'Yesterday' && (diffDays <= 1 || diffDays > 2)) return false;
    if (filterDate === 'Last 5 Days' && diffDays > 5) return false;
    if (filterDate === 'Last 30 Days' && diffDays > 30) return false;

    return true;
  });

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
          <p>Failed to load transactions: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerRow}>
        <div className={styles.titleBox}>
          <h1 className={styles.heading}>Transaction</h1>
          <p className={styles.subText}>Review your past transactions, filter records, and export statements.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/dashboard/transactions/bills" className={styles.transferBtn} style={{ background: '#FFFFFF', color: '#0047AB', border: '1px solid #0047AB' }}>
            Pay Bill
          </Link>
          <Link href="/dashboard/transactions/transfer" className={styles.transferBtn}>
            Transfer
          </Link>
        </div>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Account</span>
          <select className={styles.filterSelect} value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)}>
            <option value="All Accounts">All Accounts</option>
            {accounts.map((acc, i) => (
              <option key={i} value={String(acc.id || acc.accountId)}>{acc.name || acc.accountTypeName}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Date Range</span>
          <select className={styles.filterSelect} value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
            <option>All Time</option>
            <option>Today</option>
            <option>Yesterday</option>
            <option>Last 5 Days</option>
            <option>Last 30 Days</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Type</span>
          <select className={styles.filterSelect} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option>All Types</option>
            <option>General</option>
            <option>Refund</option>
            <option>Internal Saving</option>
            <option>Savings Goal</option>
            <option>Withdrawal</option>
            <option>Deposit</option>
            <option>Fees & Interest</option>
            <option>Loan Repayment</option>
            <option>Card Purchase</option>
          </select>
        </div>
      </div>

      {filterSearch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#EFF6FF', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          <span style={{ fontWeight: 600, color: '#1E40AF' }}>Showing results for: "{filterSearch}"</span>
          <button onClick={() => { setFilterSearch(''); window.history.replaceState(null, '', '/dashboard/transactions'); }} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #93C5FD', borderRadius: 6, padding: '4px 12px', color: '#1E40AF', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Clear
          </button>
        </div>
      )}

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <span className={styles.tableHeaderCellDesc}>DESCRIPTION</span>
          <span className={styles.tableHeaderCell}>DATE & TIME</span>
          <span className={styles.tableHeaderCell}>REFERENCE NUMBER</span>
          <span className={styles.tableHeaderCell}>STATUS</span>
          <span className={styles.tableHeaderCellRight}>AMOUNT</span>
          {showBalance && <span className={styles.tableHeaderCellBalance}>BALANCE</span>}
        </div>

        <div className={styles.tableBody}>
          {filteredTransactions.length === 0 ? (
            <p style={{ color: '#6B7280', padding: '24px', textAlign: 'center' }}>No transactions found.</p>
          ) : (
(() => {
              const balanceMap = {};
              if (showBalance && selectedAccountForBalance) {
                const accountId = filterAccountId;
                const currentBal = parseFloat(selectedAccountForBalance.balance ?? 0);
                const sortedAsc = [...filteredTransactions].sort((a, b) => new Date(a.transactionDate || 0) - new Date(b.transactionDate || 0));
                let runningBal = currentBal;
                for (let i = sortedAsc.length - 1; i >= 0; i--) {
                  const t = sortedAsc[i];
                  const amt = Number(t.amount || 0);
                  if (String(t.targetAccountId || t.toAccountId) === accountId) { runningBal -= amt; }
                  else { runningBal += amt; }
                }
                for (const t of sortedAsc) {
                  const amt = Number(t.amount || 0);
                  if (String(t.targetAccountId || t.toAccountId) === accountId) { runningBal += amt; }
                  else { runningBal -= amt; }
                  balanceMap[t.transactionId || t.id] = runningBal;
                }
              }
              return filteredTransactions.map((trx, idx) => {
                const isNeg = isMoneyOut(trx);
                const dateVal = trx.transactionDate || trx.date || trx.createdAt;
                const d = new Date(dateVal);
                const validDate = !isNaN(d);
                const bal = balanceMap[trx.transactionId || trx.id];
                const displayBalance = bal != null ? '$' + bal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '';
                return (
                  <Link key={trx.transactionId || trx.id || idx} href={`/dashboard/transactions/${trx.transactionId || trx.id}`} className={styles.tableRowLink}>
                    <div className={styles.tableRow}>
                      <div className={styles.cellDesc}>
                        <div className={`${styles.iconBox} ${getIconClass(trx.iconType, trx.typeName)}`}>
                          {getIcon(trx.iconType)}
                        </div>
                        <div className={styles.descText}>
                          <span className={styles.merchantName}>{trx.description || 'Transaction'}</span>
                          <span className={styles.merchantCategory}>{trx.categoryName || 'General'}</span>
                        </div>
                      </div>

                      <div className={styles.cell}>
                        <span className={styles.dateText}>
                          {validDate ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </span>
                        <span className={styles.timeText}>
                          {validDate ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <div className={styles.cell}>
                        <span className={styles.refNumber}>{trx.referenceNumber || ''}</span>
                      </div>

                      <div className={styles.cell}>
                        <div className={`${styles.badge} ${getBadgeClass(trx.status)}`}>
                          {getStatusIcon(trx.status)}
                          {trx.status || 'Cleared'}
                        </div>
                      </div>

                      <div className={styles.cellRight}>
                        <span className={isNeg ? styles.amountNeg : styles.amountPos}>
                          {typeof trx.amount === 'string'
                            ? trx.amount
                            : (trx.amount || 0) < 0
                              ? '-$' + Math.abs(trx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
                              : '$' + (trx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
                          }
                        </span>
                      </div>

                      {showBalance && (
                        <div className={styles.cellBalance}>
                          {displayBalance}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              });
            })()
          )}
        </div>
      </div>
    </div>
  );
}
