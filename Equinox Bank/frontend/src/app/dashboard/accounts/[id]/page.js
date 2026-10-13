'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import styles from './details.module.css';
import { api } from '@/lib/api';
import { generateStatement } from '@/utils/generateStatement';

export default function AccountDetails() {
  const router = useRouter();
  const params = useParams();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [allAccountTransactions, setAllAccountTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalError, setModalError] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editName, setEditName] = useState('');
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const downloadMenuRef = useRef(null);

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      setLoading(true);
      try {
        const accData = await api.getAccount(params.id);
        setAccount(accData);
        setEditName(accData.name || accData.accountName || '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  useEffect(() => {
    (async () => {
      try {
        const txData = await api.getTransactions();
        const list = Array.isArray(txData) ? txData : (txData.transactions || []);
        const filtered = list
          .filter(t => {
            const srcId = t.sourceAccountId || t.fromAccountId;
            const tgtId = t.targetAccountId || t.toAccountId;
            return srcId == params.id || tgtId == params.id;
          })
          .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
        setAllAccountTransactions(filtered);
        setTransactions(filtered.slice(0, 20));
      } catch {}
    })();
  }, [params.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setDownloadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteClick = () => {
    setMenuOpen(false);
    setModalError('');
    setModalType('delete-confirm');
  };

  const handleSetPrimary = async () => {
    setMenuOpen(false);
    try {
      const updated = await api.setPrimaryAccount(params.id);
      setAccount(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmDelete = async () => {
    setModalError('');
    setModalSubmitting(true);
    try {
      await api.deleteAccount(params.id);
      router.push('/dashboard/accounts');
    } catch (err) {
      setModalError(err.message);
      setModalSubmitting(false);
    }
  };

  const handleEditClick = () => {
    setMenuOpen(false);
    setModalError('');
    setEditName(account ? (account.name || account.accountName || '') : '');
    setModalType('edit-name');
  };

  const confirmEdit = async () => {
    setModalError('');
    setModalSubmitting(true);
    try {
      const updated = await api.updateAccountName(params.id, editName.trim());
      setAccount(updated);
      setModalType(null);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  const getDisplayName = () => account ? (account.name || account.accountName || 'Account') : 'Account';
  const getDisplayBalance = () => {
    if (!account) return '$0.00';
    const bal = account.balance || account.currentBalance;
    if (bal === undefined || bal === null) return '$0.00';
    return '$' + Number(bal).toLocaleString('en-US', {minimumFractionDigits: 2});
  };
  const getDisplayType = () => account ? (account.accountTypeName || account.type || account.accountType || 'N/A') : 'N/A';
  const getDisplayNumber = () => account ? (account.accountNumber || account.id || 'N/A') : 'N/A';
  const formatMoney = (val) => val == null ? 'N/A' : '$' + Number(val).toLocaleString('en-US', {minimumFractionDigits: 2});
  const getDispositionLabel = (val) => {
    if (val === 'TRANSFER_TO_PRIMARY') return 'Transfer to Primary Account at maturity';
    if (val === 'REINVEST') return 'Keep in this Fixed Deposit account';
    return 'N/A';
  };

  const handleDownloadCsv = () => {
    setDownloadMenuOpen(false);
    const header = ['Date', 'Description', 'Amount', 'Status'];
    const rows = allAccountTransactions.map(t => {
      const amount = t.amount != null ? Number(t.amount) : 0;
      const isCredit = t.targetAccountId == params.id;
      const dateStr = t.transactionDate ? new Date(t.transactionDate).toISOString().slice(0, 10) : '';
      const desc = (t.description || t.typeName || 'Transaction').replace(/"/g, '""');
      const amountStr = (isCredit ? '' : '-') + Math.abs(amount).toFixed(2);
      return [dateStr, `"${desc}"`, amountStr, t.status || ''].join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `statement_${getDisplayNumber()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    setDownloadMenuOpen(false);
    const formatted = allAccountTransactions.map(t => {
      const amount = t.amount != null ? Number(t.amount) : 0;
      const isCredit = t.targetAccountId == params.id;
      const dateStr = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      return {
        date: dateStr,
        merchant: t.description || t.typeName || 'Transaction',
        ref: t.referenceNumber || '-',
        status: t.status || '',
        amount: (isCredit ? '+' : '-') + '$' + Math.abs(amount).toFixed(2)
      };
    });
    generateStatement(
      { name: getDisplayName(), accountNumber: account.accountNumber, id: account.accountId },
      formatted,
      'All Transactions'
    );
  };

  if (loading) return <div style={{padding: '48px', textAlign: 'center'}}>Loading account details...</div>;
  if (error) return <div style={{padding: '48px', color: '#DC2626'}}>Error: {error}</div>;
  if (!account) return <div style={{padding: '48px'}}>Account not found.</div>;

  const isLoan = getDisplayType().toLowerCase().includes('loan');
  const isFixed = getDisplayType().toLowerCase().includes('fixed');

  return (
    <div className={styles.pageContainer}>
      <Link href="/dashboard/accounts" className={styles.backLink}>
        <svg className={styles.backIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Accounts
      </Link>

      <div className={styles.topCard}>
        <div className={styles.topCardHeader}>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <h1 className={styles.accountTitle}>{getDisplayName()}</h1>
            <div className={styles.activeBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              {account.status || 'Active'}
            </div>
            {account.isPrimary && (
              <div className={styles.activeBadge} style={{background: '#DAE2FF', color: '#00327D'}}>
                Primary
              </div>
            )}
          </div>

          <div className={styles.menuContainer} ref={menuRef}>
            <button className={styles.dotsBtn} onClick={() => setMenuOpen(!menuOpen)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>

            {menuOpen && (
              <div className={styles.dropdownMenu}>
                {!isLoan && (
                  <button className={styles.dropdownItem} onClick={handleEditClick}>
                    Edit Account Name
                  </button>
                )}
                {!isLoan && !isFixed && !account.isPrimary && (
                  <button className={styles.dropdownItem} onClick={handleSetPrimary}>
                    Set as Primary Account
                  </button>
                )}
                <button className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={handleDeleteClick}>
                  Delete Account
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.balanceSection}>
          <span className={styles.balanceLabel}>Available Balance</span>
          <div className={styles.balanceValueArea}>
            <span className={styles.mainBalance}>{getDisplayBalance()}</span>
          </div>
        </div>
      </div>

      {!isFixed && (
        <div className={styles.actionsGrid}>
          <Link href="/dashboard/transactions/transfer" className={styles.actionBtn}>
            <div className={styles.actionIconBox}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
            </div>
            <span className={styles.actionText}>Transfer</span>
          </Link>
          <div style={{ position: 'relative', width: '100%' }} ref={downloadMenuRef}>
            <button
              type="button"
              className={`${styles.actionBtn} ${allAccountTransactions.length === 0 ? styles.actionBtnDisabled : ''}`}
              onClick={() => setDownloadMenuOpen(o => !o)}
              disabled={allAccountTransactions.length === 0}
              style={{ width: '100%' }}
            >
              <div className={styles.actionIconBox}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </div>
              <span className={styles.actionText}>Download Statement</span>
            </button>
            {downloadMenuOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: '#FFFFFF',
                border: '1px solid #E5E7EB', borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 20, overflow: 'hidden'
              }}>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter', color: '#191B22' }}
                >
                  Download as CSV
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderTop: '1px solid #F3F4F6', background: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter', color: '#191B22' }}
                >
                  Download as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.mainLayout}>
        <div className={styles.leftColumn}>
          <div className={styles.transactionsCard}>
            <div className={styles.transactionsHeader}>
              <h2 className={styles.transactionsTitle}>Recent Transactions</h2>
            </div>

            {transactions.length === 0 ? (
              <div className={styles.emptyTransactions}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C3C6D5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <p className={styles.emptyTransactionsText}>No transactions yet</p>
                <p className={styles.emptyTransactionsSub}>Transactions will appear here once activity begins on this account.</p>
              </div>
            ) : (
              <>
                <div className={styles.tableHeader}>
                  <span className={styles.tableHeaderCell}>DATE</span>
                  <span className={styles.tableHeaderCell}>DESCRIPTION</span>
                  <span className={styles.tableHeaderCell}>AMOUNT</span>
                  <span className={styles.tableHeaderCellRight}>BALANCE</span>
                  <span className={styles.tableHeaderCell} style={{textAlign: 'right'}}>STATUS</span>
                </div>

                {(() => {
                  const currentBal = parseFloat(account.balance ?? account.currentBalance ?? 0);
                  let runningBal = currentBal;
                  const allAsc = [...allAccountTransactions].sort((a, b) => new Date(a.transactionDate || 0) - new Date(b.transactionDate || 0));
                  for (let i = allAsc.length - 1; i >= 0; i--) {
                    const t = allAsc[i];
                    const amt = Number(t.amount || 0);
                    if (t.targetAccountId == params.id) { runningBal -= amt; }
                    else { runningBal += amt; }
                  }
                  const balanceMap = {};
                  for (const t of allAsc) {
                    const amt = Number(t.amount || 0);
                    if (t.targetAccountId == params.id) { runningBal += amt; }
                    else { runningBal -= amt; }
                    balanceMap[t.transactionId || t.id] = runningBal;
                  }
                  return transactions.map((t, i) => {
                    const amount = t.amount != null ? Number(t.amount) : 0;
                    const isCredit = t.targetAccountId == params.id;
                    const displayAmount = (isCredit ? '+$' : '-$') + Math.abs(amount).toLocaleString('en-US', {minimumFractionDigits: 2});
                    const bal = balanceMap[t.transactionId || t.id];
                    const displayBalance = bal != null ? '$' + bal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '';
                    const dateStr = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : '';
                    const typeName = (t.typeName || '').toLowerCase();
                    const desc = (t.description || '').toLowerCase();
                    const isInterestTx = typeName === 'interest' || typeName === 'loan_interest' || typeName === 'interest_charge' || desc.includes('interest');
                    const isFeeTx = typeName === 'late_fee' || typeName === 'fee' || desc.includes('fee');
                    const isBillTx = (t.referenceNumber || '').startsWith('BILL-') || (t.referenceNumber || '').startsWith('AUTO-') || desc.includes('bill payment');
                    const isTransferTx = typeName === 'transfer';
                    return (
                      <div key={t.id || t.transactionId || i} className={styles.transactionRow}>
                        <span className={styles.cellDate}>{dateStr}</span>
                        <div className={styles.cellDesc}>
                          <div className={styles.descIconBox} style={isInterestTx ? {background: '#E6F4EA', color: '#137333'} : isFeeTx ? {background: '#FFDAD6', color: '#93000A'} : isBillTx ? {background: '#DAE2FF', color: '#00327D'} : {}}>
                            {isInterestTx ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="20" x2="12" y2="10"></line>
                                <line x1="18" y1="20" x2="18" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="16"></line>
                              </svg>
                            ) : isFeeTx ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                              </svg>
                            ) : isBillTx ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="6" width="22" height="12" rx="2" ry="2"></rect>
                                <line x1="1" y1="10" x2="23" y2="10"></line>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                              </svg>
                            )}
                          </div>
                          {t.description || t.narration || t.type || 'Transaction'}
                        </div>
                        <span className={isCredit ? styles.cellAmountPos : styles.cellAmountNeg}>{displayAmount}</span>
                        <span className={styles.cellBalance}>{displayBalance}</span>
                        <div className={styles.cellStatus}>
                          <span className={(t.status || '').toLowerCase() === 'completed' || (t.status || '').toLowerCase() === 'cleared' ? styles.statusCompleted : (t.status || '').toLowerCase() === 'pending' ? styles.statusPending : styles.statusProcessing}>
                            {t.status || 'N/A'}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}

                <Link href={`/dashboard/transactions?account=${params.id}`} className={styles.viewAllLink}>
                  View All Transactions
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '4px'}}>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.detailsCard}>
            <h3 className={styles.detailsTitle}>Account Details</h3>

            {isFixed ? (
              <>
                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>ACCOUNT NAME</span>
                  <div className={styles.detailValue}>{getDisplayName()}</div>
                </div>

                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>ACCOUNT NUMBER</span>
                  <div className={styles.detailValue}>
                    {getDisplayNumber()}
                    <svg className={styles.copyIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <div className={styles.detailGroup} style={{marginBottom: 0}}>
                    <span className={styles.detailLabel}>ACCOUNT TYPE</span>
                    <div className={styles.detailValue}>{getDisplayType()}</div>
                  </div>
                  <div className={styles.detailGroup} style={{marginBottom: 0}}>
                    <span className={styles.detailLabel}>CURRENCY</span>
                    <div className={styles.detailValue}>{account.currency || 'USD'}</div>
                  </div>
                </div>

                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>AMOUNT DEPOSITED</span>
                  <div className={styles.detailValue}>{getDisplayBalance()}</div>
                </div>

                <div className={styles.detailRow}>
                  <div className={styles.detailGroup} style={{marginBottom: 0}}>
                    <span className={styles.detailLabel}>TERM LENGTH</span>
                    <div className={styles.detailValue}>{account.termMonths ? `${account.termMonths} months` : 'N/A'}</div>
                  </div>
                  <div className={styles.detailGroup} style={{marginBottom: 0}}>
                    <span className={styles.detailLabel}>OPENING DATE</span>
                    <div className={styles.detailValue}>
                      {account.createdAt ? new Date(account.createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>MATURITY DATE</span>
                  <div className={styles.detailValue}>
                    {account.maturityDate ? new Date(account.maturityDate).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}) : 'N/A'}
                  </div>
                </div>

                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>INTEREST OPTION</span>
                  <div className={styles.detailValue}>{getDispositionLabel(account.principalDisposition)}</div>
                </div>

                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>INTEREST RATE</span>
                  <div className={styles.detailValue}>
                    {account.interestRate != null ? (Number(account.interestRate) * 100).toFixed(2) + '% APY' : 'N/A'}
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <div className={styles.detailGroup} style={{marginBottom: 0}}>
                    <span className={styles.detailLabel}>INTEREST AMOUNT</span>
                    <div className={styles.detailValue}>{formatMoney(account.interestAmount)}</div>
                  </div>
                  <div className={styles.detailGroup} style={{marginBottom: 0}}>
                    <span className={styles.detailLabel}>TOTAL TO RECEIVE</span>
                    <div className={styles.detailValue}>{formatMoney(account.totalToReceive)}</div>
                  </div>
                </div>

                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>SOURCE ACCOUNT</span>
                  <div className={styles.detailValue}>
                    {account.sourceAccountName || 'N/A'}{account.sourceAccountNumber ? ` (${account.sourceAccountNumber})` : ''}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>ACCOUNT NUMBER</span>
                  <div className={styles.detailValue}>
                    {getDisplayNumber()}
                    <svg className={styles.copyIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </div>
                </div>

                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>ROUTING NUMBER</span>
                  <div className={styles.detailValue}>{isLoan ? 'N/A' : '122000661'}</div>
                </div>

                <div className={styles.detailRow}>
                  <div className={styles.detailGroup} style={{marginBottom: 0}}>
                    <span className={styles.detailLabel}>TYPE</span>
                    <div className={styles.detailValue}>{getDisplayType()}</div>
                  </div>
                  <div className={styles.detailGroup} style={{marginBottom: 0}}>
                    <span className={styles.detailLabel}>CURRENCY</span>
                    <div className={styles.detailValue}>{account.currency || 'USD'}</div>
                  </div>
                </div>

                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>INTEREST RATE</span>
                  <div className={styles.detailValue}>
                    {isLoan ? 'N/A' : account.interestRate != null ? (Number(account.interestRate) * 100).toFixed(2) + '% APY' : 'N/A'}
                  </div>
                </div>

                {!isLoan && account.interestRate != null && Number(account.interestRate) > 0 && (() => {
                  const rate = Number(account.interestRate);
                  const bal = parseFloat(account.balance ?? account.currentBalance ?? 0);
                  const monthlyEst = bal * (rate / 12);
                  return (
                    <div className={styles.interestInfoBox}>
                      <strong>How interest works:</strong><br />
                      Monthly = balance × (APY ÷ 12)<br />
                      Estimated next: <strong>{'$' + monthlyEst.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                      <div className={styles.interestInfoBadge}>Credited on the 1st</div>
                    </div>
                  );
                })()}

                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>DATE OPENED</span>
                  <div className={styles.detailValue}>
                    {account.createdAt ? new Date(account.createdAt).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}) : 'Recently Opened'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {modalType && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            {modalType === 'edit-name' && (
              <>
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>Edit Account Name</h3>
                  <button className={styles.closeBtn} onClick={() => setModalType(null)}>×</button>
                </div>
                <div className={styles.modalBody}>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <label style={{fontFamily: 'Inter', fontWeight: 500, fontSize: '14px', color: '#191B22'}}>Account Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        fontFamily: 'Inter',
                        fontSize: '16px',
                        color: '#191B22',
                        background: '#FFFFFF',
                        border: '1px solid #C3C6D5',
                        borderRadius: '4px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  {modalError && <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginTop: '12px' }}>{modalError}</div>}
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.cancelBtn} onClick={() => setModalType(null)}>Cancel</button>
                  <button className={styles.primaryBtn} onClick={confirmEdit} disabled={!editName.trim() || modalSubmitting}>
                    {modalSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}

            {modalType === 'delete-confirm' && (
              <>
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>Delete Account?</h3>
                  <button className={styles.closeBtn} onClick={() => setModalType(null)}>×</button>
                </div>
                <div className={styles.modalBody}>
                  <p>Are you sure you want to delete this account? <strong>This action cannot be undone.</strong></p>
                  <div className={styles.warningBox}>
                    Any remaining balance will be automatically transferred to your primary account before closure.
                  </div>
                  {modalError && <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginTop: '12px' }}>{modalError}</div>}
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.cancelBtn} onClick={() => setModalType(null)}>Cancel</button>
                  <button className={styles.dangerBtn} onClick={confirmDelete} disabled={modalSubmitting}>
                    {modalSubmitting ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
