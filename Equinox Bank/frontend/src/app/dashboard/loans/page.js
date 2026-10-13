"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Car, User, Store, Plus, CheckCircle, Clock, Edit3, ArrowRight } from 'lucide-react';
import styles from './loans.module.css';
import { api } from '@/lib/api';
import { generateStatement } from '@/utils/generateStatement';

function getDueLabel(dueDateStr) {
  if (!dueDateStr) return { text: 'N/A', isOverdue: false, isDueSoon: false };
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = due - today;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`, isOverdue: true, isDueSoon: true };
  if (diffDays === 0) return { text: 'Due today', isOverdue: false, isDueSoon: true };
  if (diffDays <= 9) return { text: `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`, isOverdue: false, isDueSoon: true };
  return { text: `Due in ${diffDays} days`, isOverdue: false, isDueSoon: false };
}

function LoanIcon({ type }) {
  if (type === 'home') return <Home size={22} />;
  if (type === 'car') return <Car size={22} />;
  if (type === 'user') return <User size={22} />;
  return <Store size={22} />;
}

function monthsElapsedOf(loan) {
  const ref = loan?.lastInterestDate || loan?.approvedAt;
  if (!ref) return 0;
  const start = new Date(ref);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
}

function monthlyRateOf(loan) {
  return (Number(loan?.interestRate || 0) / 100) / 12;
}

// True amount owed today = outstanding balance (principal + unpaid late fees)
// + interest accrued on the principal portion since the last charge.
function payoffAmountOf(loan) {
  const outstanding = Number(loan?.outstandingBalance || 0);
  const lateFees = Number(loan?.lateFeesOwed || 0);
  const principalBase = Math.max(0, outstanding - lateFees);
  return outstanding + principalBase * monthlyRateOf(loan) * monthsElapsedOf(loan);
}

export default function LoansPage() {
  const [loans, setLoans] = useState([]);
  const [showSettled, setShowSettled] = useState(false);
  const [manageModal, setManageModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dedicated Loan Repayment View / Modal state
  const [repaymentViewOpen, setRepaymentViewOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [payAmount, setPayAmount] = useState('');
  const [payFromId, setPayFromId] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [paySuccessMsg, setPaySuccessMsg] = useState('');
  const [lastPaymentSplit, setLastPaymentSplit] = useState(null);

  // Loan history modal state
  const [historyModal, setHistoryModal] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async (loan) => {
    setHistoryLoading(true);
    setHistoryModal(loan);
    try {
      const data = await api.getLoanRepayments(loan.loanId);
      setHistoryData(data || []);
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadLoans = async () => {
    try {
      const data = await api.getLoans();
      setLoans(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load loans');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadLoans();
      try {
        const accts = await api.getAccounts();
        const eligible = Array.isArray(accts) ? accts : (accts.accounts || []);
        setAccounts(eligible.filter(a => a.accountTypeName !== 'Fixed Deposit'));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const activeLoans = loans.filter(l => ['active', 'approved'].includes(l.status?.toLowerCase()));

  const openRepaymentModal = (loan = null, suggestedAmount = null) => {
    setError('');
    setPaySuccessMsg('');
    setLastPaymentSplit(null);
    const targetLoan = loan || activeLoans[0] || loans[0];
    if (targetLoan) {
      setSelectedLoanId(String(targetLoan.loanId));
      const nextAmt = suggestedAmount !== null ? suggestedAmount : (targetLoan.nextPayment?.amount || (targetLoan.outstandingBalance ? (targetLoan.outstandingBalance / 12).toFixed(2) : 0));
      setPayAmount(String(nextAmt));
    }
    if (accounts.length > 0 && !payFromId) {
      setPayFromId(String(accounts[0].accountId));
    }
    setRepaymentViewOpen(true);
  };

  const handleLoanSelectChange = (e) => {
    const lId = e.target.value;
    setSelectedLoanId(lId);
    const found = loans.find(l => String(l.loanId) === String(lId));
    if (found) {
      const nextAmt = found.nextPayment?.amount || (found.outstandingBalance ? (found.outstandingBalance / 12).toFixed(2) : 0);
      setPayAmount(String(nextAmt));
    }
  };

  const handlePayLoanSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedLoanId || !payFromId || !payAmount) return;
    const parsedPay = parseFloat(payAmount);
    if (isNaN(parsedPay) || parsedPay <= 0) return;
    const loan = loans.find(l => String(l.loanId) === String(selectedLoanId));
    setPaySubmitting(true);
    setError('');
    setPaySuccessMsg('');
    try {
      const res = await api.repayLoan(Number(selectedLoanId), { amountPaid: parsedPay }, Number(payFromId));
      setLastPaymentSplit({
        interest: Number(res?.interestPaid || 0),
        principal: Number(res?.principalPaid || 0),
        lateFee: Number(res?.lateFeePaid || 0),
        total: Number(res?.amountPaid ?? parsedPay),
        returned: Number(res?.overpaymentReturned || 0),
        loanName: loan?.loanTypeName || 'Loan',
      });
      setPaySuccessMsg('Payment submitted successfully!');
      setTimeout(async () => {
        setRepaymentViewOpen(false);
        setPaySuccessMsg('');
        setLastPaymentSplit(null);
        await loadLoans();
      }, 3000);
    } catch (err) {
      setError(err.message || 'Payment failed');
    } finally {
      setPaySubmitting(false);
    }
  };

  const formatCurrency = (val) =>
    '$' + (Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleDownloadStatement = (loan) => {
    const tx = [{
      date: loan.settledDate || new Date().toLocaleDateString(),
      merchant: 'Loan Payoff',
      ref: `REF-${Math.floor(1000000 + Math.random() * 9000000)}`,
      status: 'Completed',
      amount: formatCurrency(loan.principalAmount || 0)
    }];
    generateStatement({ name: `${loan.loanTypeName} Loan`, id: loan.loanId }, tx, 'Loan Lifecycle');
  };

  const filteredLoans = loans.filter(loan =>
    showSettled ? loan.status?.toLowerCase() === 'settled' : loan.status?.toLowerCase() !== 'settled'
  );

  const currentSelectedLoan = loans.find(l => String(l.loanId) === String(selectedLoanId)) || activeLoans[0] || loans[0];
  const minPaymentAmt = Number(currentSelectedLoan?.nextPayment?.amount || (currentSelectedLoan?.outstandingBalance ? (currentSelectedLoan.outstandingBalance / 12).toFixed(2) : 0));
  const payoffAmt = Number(payoffAmountOf(currentSelectedLoan).toFixed(2));

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

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <div className={styles.headerText}>
          <h1 className={styles.heading}>{showSettled ? 'Settled Loans' : 'My Loans'}</h1>
          <p className={styles.subText}>
            {showSettled ? 'Review your past and fully paid-off loans.' : 'Manage your active loans and review repayment schedules.'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryBtn} onClick={() => setShowSettled(!showSettled)}>
            {showSettled ? 'View Active Loans' : 'View Settled Loans'}
          </button>
          <button className={styles.secondaryBtn} onClick={() => openRepaymentModal()}>
            Make a Payment
          </button>
          <Link href="/dashboard/loans/apply" className={styles.primaryBtn}>
            <Plus size={18} />
            Apply for a Loan
          </Link>
        </div>
      </div>

      {error && !repaymentViewOpen && (
        <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div className={styles.loansGrid}>
        {filteredLoans.length === 0 && <p style={{ color: '#6B7280', gridColumn: '1/-1' }}>No loans found in this category.</p>}
        {filteredLoans.map((loan) => {
          const dueInfo = loan.nextPayment ? getDueLabel(loan.nextPayment.dueDate) : null;
          const iconType = loan.iconType || (loan.loanTypeName || '').toLowerCase().includes('home') ? 'home' :
            (loan.loanTypeName || '').toLowerCase().includes('auto') || (loan.loanTypeName || '').toLowerCase().includes('car') ? 'car' :
            (loan.loanTypeName || '').toLowerCase().includes('personal') ? 'user' : 'store';

          const isSettled = loan.status?.toLowerCase() === 'settled';
          const isActive = ['active', 'approved'].includes(loan.status?.toLowerCase());
          const isPending = loan.status?.toLowerCase() === 'pending';
          const isRevision = loan.status?.toLowerCase() === 'revision';
          const isRejected = loan.status?.toLowerCase() === 'rejected';

          return (
            <div key={loan.loanId} className={styles.loanCard}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitleArea}>
                  <div className={`${styles.cardIconBox} ${isSettled ? styles.cardIconBoxSettled : ''}`}>
                    <LoanIcon type={iconType} />
                  </div>
                  <div className={styles.cardTitleText}>
                    <span className={styles.cardTitle}>{loan.loanTypeName}</span>
                    <span className={styles.cardRef}>{loan.loanNumber || `LN-${loan.loanId}`}</span>
                  </div>
                </div>
                <div className={`${styles.badge} ${
                  isActive ? styles.badgeActive :
                  isPending ? styles.badgePending :
                  isRevision ? styles.badgePending :
                  isRejected ? styles.badgeRejected :
                  styles.badgeSettled
                }`}>
                  {isActive && <CheckCircle size={14} />}
                  {isPending && <Clock size={14} />}
                  {isSettled && <CheckCircle size={14} />}
                  {isRevision ? 'Modification Requested' : isRejected ? 'Declined' : loan.status}
                </div>
              </div>

              {(isActive || isSettled) && (
                <>
                  <div className={styles.balancesRow}>
                    <div className={styles.balanceCol}>
                      <span className={styles.balanceLabel}>{isSettled ? 'FINAL BALANCE' : 'OUTSTANDING BALANCE'}</span>
                      <span className={styles.balanceValueMain}>{formatCurrency(loan.outstandingBalance)}</span>
                    </div>
                    <div className={`${styles.balanceCol} ${styles.balanceColRight}`}>
                      <span className={styles.balanceLabel}>PRINCIPAL AMOUNT</span>
                      <span className={styles.balanceValueSub}>{formatCurrency(loan.principalAmount)}</span>
                    </div>
                  </div>

                  <div className={styles.progressContainer}>
                    <div className={styles.progressTop}>
                      <span className={styles.progressLabel}>Repayment Progress</span>
                      <span className={styles.progressPercent}>{loan.repaymentProgress || 0}%</span>
                    </div>
                    <div className={styles.progressBarTrack}>
                      <div className={`${styles.progressBarFill} ${isSettled ? styles.progressBarFillSettled : ''}`} style={{ width: `${loan.repaymentProgress || 0}%` }} />
                    </div>
                    {isActive && (
                      <span className={styles.progressBottom}>{formatCurrency(loan.repaidAmount || (loan.principalAmount - loan.outstandingBalance))} Repaid</span>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    {isActive ? (
                      <>
                        <div className={styles.paymentInfo}>
                          <span className={styles.paymentLabel}>NEXT PAYMENT</span>
                          <div className={styles.paymentValue}>
                            {formatCurrency(loan.nextPayment?.amount || (loan.outstandingBalance ? (loan.outstandingBalance / 12).toFixed(2) : 0))}
                            {dueInfo && (
                              <span className={`${styles.paymentDue} ${dueInfo.isOverdue ? styles.paymentOverdue : dueInfo.isDueSoon ? styles.paymentDueSoon : ''}`}>
                                {dueInfo.text}
                              </span>
                            )}
                          </div>
                          <span className={styles.paymentSub}>
                            {loan.nextPayment?.dueDate || 'Upcoming'} &bull; {loan.interestRate ? `${loan.interestRate}% Fixed APR` : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className={styles.secondaryBtn} onClick={() => openRepaymentModal(loan, payoffAmountOf(loan).toFixed(2))}>Manage</button>
                          <button className={styles.secondaryBtn} onClick={() => loadHistory(loan)}>History</button>
                          <button className={styles.primaryBtnSmall} onClick={() => openRepaymentModal(loan)}>
                            Pay Now
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className={styles.paymentSub}>Settled on {loan.settledDate || new Date(loan.appliedAt).toLocaleDateString()}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className={styles.secondaryBtn} onClick={() => loadHistory(loan)}>History</button>
                          <button className={styles.secondaryBtn} onClick={() => handleDownloadStatement(loan)}>Statement</button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {isPending && (
                <>
                  <div className={styles.balancesRow}>
                    <div className={styles.balanceCol}>
                      <span className={styles.balanceLabel}>REQUESTED AMOUNT</span>
                      <span className={styles.balanceValueMain}>{formatCurrency(loan.principalAmount || 0)}</span>
                    </div>
                    <div className={`${styles.balanceCol} ${styles.balanceColRight}`}>
                      <span className={styles.balanceLabel}>EST. RATE</span>
                      <span className={styles.balanceValueSub}>{loan.interestRate ? (loan.interestRate + '%') : '-'}</span>
                    </div>
                  </div>
                  {loan.purpose && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 10, fontStyle: 'italic' }}>"{loan.purpose}"</div>}
                  <p className={styles.pendingNotice}>Your application is currently under review by our underwriting team. We will notify you once a decision has been made.</p>
                  {loan.remarks && (
                    <div style={{ marginTop: 10, padding: 10, background: 'rgba(212,169,74,0.1)', borderLeft: '3px solid #d4a94a', borderRadius: 6, fontSize: 13, color: '#856404' }}>
                      <strong>Bank Feedback:</strong> {loan.remarks}
                    </div>
                  )}
                  <button className={styles.secondaryBtn} style={{ marginTop: 12 }} onClick={() => setManageModal(loan)}>
                    View Application
                  </button>
                </>
              )}

              {isRevision && (
                <>
                  <div className={styles.balancesRow}>
                    <div className={styles.balanceCol}>
                      <span className={styles.balanceLabel}>REQUESTED AMOUNT</span>
                      <span className={styles.balanceValueMain}>{formatCurrency(loan.principalAmount || 0)}</span>
                    </div>
                    <div className={`${styles.balanceCol} ${styles.balanceColRight}`}>
                      <span className={styles.balanceLabel}>EST. RATE</span>
                      <span className={styles.balanceValueSub}>{loan.interestRate ? (loan.interestRate + '%') : '-'}</span>
                    </div>
                  </div>
                  {loan.purpose && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 10, fontStyle: 'italic' }}>"{loan.purpose}"</div>}
                  <p style={{ fontSize: 14, color: '#d4a94a', marginBottom: 10 }}>The reviewer has requested modifications to your application. Please review their feedback and resubmit.</p>
                  {loan.remarks && (
                    <div style={{ marginBottom: 16, padding: 10, background: 'rgba(212,169,74,0.12)', borderLeft: '3px solid #d4a94a', borderRadius: 6, fontSize: 13, color: '#856404' }}>
                      <strong>Reviewer Feedback:</strong> {loan.remarks}
                    </div>
                  )}
                  <Link
                    href={`/dashboard/loans/apply?edit=${loan.loanId}`}
                    className={styles.primaryBtn}
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
                  >
                    <Edit3 size={16} />
                    Edit &amp; Resubmit
                  </Link>
                </>
              )}

              {isRejected && (
                <>
                  <div className={styles.balancesRow}>
                    <div className={styles.balanceCol}>
                      <span className={styles.balanceLabel}>REQUESTED AMOUNT</span>
                      <span className={styles.balanceValueMain}>{formatCurrency(loan.principalAmount || 0)}</span>
                    </div>
                    <div className={`${styles.balanceCol} ${styles.balanceColRight}`}>
                      <span className={styles.balanceLabel}>EST. RATE</span>
                      <span className={styles.balanceValueSub}>{loan.interestRate ? (loan.interestRate + '%') : '-'}</span>
                    </div>
                  </div>
                  {loan.purpose && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 10, fontStyle: 'italic' }}>"{loan.purpose}"</div>}
                  <p style={{ fontSize: 14, color: '#DC2626', marginBottom: 10 }}>Your application has been declined. This decision is final and cannot be resubmitted.</p>
                  {loan.remarks && (
                    <div style={{ marginBottom: 16, padding: 10, background: '#F8D7DA', borderLeft: '3px solid #DC2626', borderRadius: 6, fontSize: 13, color: '#721C24' }}>
                      <strong>Reason for Decline:</strong> {loan.remarks}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Loan Details / Application Modal */}
      {manageModal && (
        <div className={styles.modalOverlay} onClick={() => setManageModal(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Loan Details — {manageModal.loanTypeName}</h3>
              <button className={styles.closeBtn} onClick={() => setManageModal(null)}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.manageRow}><span>Loan ID</span><strong>#{manageModal.loanId}</strong></div>
              <div className={styles.manageRow}><span>Status</span><strong style={{ textTransform: 'capitalize' }}>{manageModal.status}</strong></div>
              <div className={styles.manageRow}><span>Principal Amount</span><strong>{formatCurrency(manageModal.principalAmount)}</strong></div>
              <div className={styles.manageRow}><span>Outstanding Balance</span><strong>{formatCurrency(manageModal.outstandingBalance)}</strong></div>
              <div className={styles.manageRow}><span>Interest Rate (APR)</span><strong>{manageModal.interestRate ? `${manageModal.interestRate}%` : 'Standard'}</strong></div>
              <div className={styles.manageRow}><span>Term Length</span><strong>{manageModal.loanTermMonths ? `${manageModal.loanTermMonths} Months` : '12 Months'}</strong></div>
              <div className={styles.manageRow}><span>Application Date</span><strong>{new Date(manageModal.appliedAt).toLocaleDateString()}</strong></div>
              {manageModal.purpose && <div className={styles.manageRow}><span>Purpose</span><strong style={{fontWeight: 400, fontStyle: 'italic'}}>{manageModal.purpose}</strong></div>}

              {manageModal.remarks && (
                <div style={{ marginTop: 12, padding: 12, background: '#F3F4F6', borderRadius: 6, fontSize: 13 }}>
                  <strong>Remarks:</strong> {manageModal.remarks}
                </div>
              )}

              <div className={styles.manageActions}>
                {['active', 'approved'].includes(manageModal.status?.toLowerCase()) && (
                  <button className={styles.primaryBtnSmall} onClick={() => {
                    const m = manageModal;
                    setManageModal(null);
                    openRepaymentModal(m);
                  }}>
                    Proceed to Repayment
                  </button>
                )}
                <button className={styles.cancelBtn} onClick={() => setManageModal(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOAN HISTORY MODAL */}
      {historyModal && (
        <div className={styles.modalOverlay} onClick={() => setHistoryModal(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle} style={{ fontSize: 22 }}>Repayment History</h2>
                <span style={{ fontSize: 13, color: '#6B7280' }}>
                  {historyModal.loanTypeName} — #{historyModal.loanId}
                </span>
              </div>
              <button className={styles.closeBtn} onClick={() => setHistoryModal(null)}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              {historyLoading ? (
                <p style={{ color: '#6B7280', textAlign: 'center', padding: 24 }}>Loading history…</p>
              ) : historyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <p style={{ color: '#6B7280', marginBottom: 8 }}>No repayments made yet.</p>
                  <p style={{ fontSize: 13, color: '#9CA3AF' }}>
                    Outstanding balance: {formatCurrency(historyModal.outstandingBalance)}
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                      <th style={{ textAlign: 'left', padding: '10px 8px', color: '#6B7280', fontWeight: 600, fontSize: 12 }}>DATE</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px', color: '#6B7280', fontWeight: 600, fontSize: 12 }}>TOTAL PAID</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px', color: '#6B7280', fontWeight: 600, fontSize: 12 }}>INTEREST</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px', color: '#6B7280', fontWeight: 600, fontSize: 12 }}>LATE FEE</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px', color: '#6B7280', fontWeight: 600, fontSize: 12 }}>PRINCIPAL</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px', color: '#6B7280', fontWeight: 600, fontSize: 12 }}>BALANCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '10px 8px', color: '#6B7280', fontSize: 13 }}>
                        {new Date(historyModal.approvedAt || historyModal.appliedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                        +{formatCurrency(historyModal.principalAmount)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#6B7280' }}>—</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#6B7280' }}>—</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                        +{formatCurrency(historyModal.principalAmount)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(historyModal.principalAmount)}
                      </td>
                    </tr>
                    {historyData.map((r) => (
                      <tr key={r.repaymentId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '10px 8px', color: '#6B7280', fontSize: 13 }}>
                          {new Date(r.paymentDate).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#DC2626', fontWeight: 600 }}>
                          -{formatCurrency(r.amountPaid)}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#DC2626', fontWeight: 600 }}>
                          {r.interestPaid > 0 ? '-' + formatCurrency(r.interestPaid) : '$0.00'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#92400E', fontWeight: 600 }}>
                          {r.lateFeePaid > 0 ? '-' + formatCurrency(r.lateFeePaid) : '$0.00'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#166534', fontWeight: 600 }}>
                          {r.principalPaid > 0 ? '-' + formatCurrency(r.principalPaid) : '$0.00'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(r.outstandingAfter)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button className={styles.cancelBtn} onClick={() => setHistoryModal(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOAN REPAYMENT MODAL */}
      {repaymentViewOpen && (
        <div className={styles.modalOverlay} onClick={() => setRepaymentViewOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle} style={{ fontSize: 22 }}>Loan Repayment</h2>
                <span style={{ fontSize: 13, color: '#6B7280' }}>Manage your upcoming installments and extra payments.</span>
              </div>
              <button className={styles.closeBtn} onClick={() => setRepaymentViewOpen(false)}>&times;</button>
            </div>

            <div className={styles.modalBody}>
              {/* Outstanding Balance Header Container */}
              <div className={styles.repaymentHeaderBanner}>
                <div>
                  <div className={styles.repaymentHeaderLabel}>OUTSTANDING BALANCE</div>
                  <div className={styles.repaymentHeaderAmount}>
                    {formatCurrency(currentSelectedLoan?.outstandingBalance || 0)}
                  </div>
                </div>
                {currentSelectedLoan?.nextPayment?.dueDate && (
                  <div className={styles.repaymentHeaderBadge}>
                    Next Due: {currentSelectedLoan.nextPayment.dueDate}
                  </div>
                )}
              </div>

              {paySuccessMsg && (
                <div style={{ color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '14px 16px', borderRadius: '8px', fontSize: 14, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>✅ Payment Successful</div>
                  <div style={{ color: '#15803D', fontSize: 13 }}>
                    {lastPaymentSplit ? (
                      <>
                        {formatCurrency(lastPaymentSplit.total)} paid — <span style={{ color: '#DC2626' }}>{formatCurrency(lastPaymentSplit.interest)} interest</span> + <span style={{ color: '#166534' }}>{formatCurrency(lastPaymentSplit.principal)} principal</span>
                        {lastPaymentSplit.lateFee > 0 && (
                          <> + <span style={{ color: '#92400E' }}>{formatCurrency(lastPaymentSplit.lateFee)} late fee</span></>
                        )}
                        {lastPaymentSplit.returned > 0 && (
                          <div style={{ marginTop: 4, color: '#92400E' }}>
                            {formatCurrency(lastPaymentSplit.returned)} exceeded the payoff amount and was not charged.
                          </div>
                        )}
                      </>
                    ) : (
                      paySuccessMsg
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '12px 16px', borderRadius: '6px', fontSize: 14 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handlePayLoanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Select Loan */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className={styles.formLabel}>Select Loan</label>
                  <select
                    className={styles.formSelect}
                    value={selectedLoanId}
                    onChange={handleLoanSelectChange}
                  >
                    {loans.filter(l => ['active', 'approved'].includes(l.status?.toLowerCase())).map(l => (
                      <option key={l.loanId} value={l.loanId}>
                        {l.loanTypeName} - **** {String(l.loanId).slice(-4)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount to Pay */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className={styles.formLabel}>Amount to Pay</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="$ 0.00"
                    required
                  />
                  <div className={styles.quickAmountRow}>
                    <button type="button" className={`${styles.quickAmountBtn} ${payAmount === String(minPaymentAmt) ? styles.quickAmountBtnActive : ''}`} onClick={() => {
                      setPayAmount(String(minPaymentAmt));
                    }}>
                      Min Payment ({formatCurrency(minPaymentAmt)})
                    </button>
                    <button type="button" className={`${styles.quickAmountBtn} ${payAmount === String(payoffAmt) ? styles.quickAmountBtnActive : ''}`} onClick={() => {
                      setPayAmount(String(payoffAmt));
                    }}>
                      Pay Off ({formatCurrency(payoffAmt)})
                    </button>
                    <button type="button" className={`${styles.quickAmountBtn} ${payAmount !== String(minPaymentAmt) && payAmount !== String(payoffAmt) ? styles.quickAmountBtnActive : ''}`} onClick={() => setPayAmount('')}>
                      Custom
                    </button>
                  </div>
                </div>

                {/* Pay From Account */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className={styles.formLabel}>Pay From</label>
                  <select
                    className={styles.formSelect}
                    value={payFromId}
                    onChange={e => setPayFromId(e.target.value)}
                    required
                  >
                    <option value="">Select source account</option>
                    {accounts.map(acc => (
                      <option key={acc.accountId} value={acc.accountId}>
                        {acc.name || acc.accountTypeName} Account - **** {acc.accountNumber.slice(-4)} (Available: {formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interest Breakdown */}
                {currentSelectedLoan && currentSelectedLoan.interestRate > 0 && (() => {
                  const outstanding = currentSelectedLoan.outstandingBalance || 0;
                  const lateFeesOwed = Number(currentSelectedLoan.lateFeesOwed || 0);
                  const principalBase = Math.max(0, outstanding - lateFeesOwed);
                  const annualRate = parseFloat(currentSelectedLoan.interestRate) / 100;
                  const monthlyRate = annualRate / 12;
                  const months = monthsElapsedOf(currentSelectedLoan);
                  const accruedInterest = principalBase * monthlyRate * months;
                  const payoff = outstanding + accruedInterest;
                  const parsedPay = parseFloat(payAmount || '0');
                  const validPay = !isNaN(parsedPay) && parsedPay > 0;
                  const effectivePaid = validPay ? Math.min(parsedPay, payoff) : 0;
                  const lateFeePortion = Math.min(effectivePaid, lateFeesOwed);
                  const rest = effectivePaid - lateFeePortion;
                  const interestPortion = Math.min(rest, accruedInterest);
                  const principalPortion = rest - interestPortion;
                  const returned = validPay ? parsedPay - effectivePaid : 0;
                  return (
                    <div className={styles.interestBreakdown}>
                      <div className={styles.interestBreakdownLabel}>How this payment breaks down</div>
                      <div className={styles.interestBreakdownRow}>
                        <span>Interest accrued so far ({currentSelectedLoan.interestRate}% ÷ 12 × {months} mo)</span>
                        <span className={styles.interestBreakdownValue}>{formatCurrency(accruedInterest)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        Charged monthly on the outstanding principal since your last payment. Late fees never earn interest.
                      </div>
                      {lateFeesOwed > 0 && (
                        <div className={styles.interestBreakdownRow} style={{ color: '#92400E' }}>
                          <span>Unpaid late fees owed</span>
                          <span className={styles.interestBreakdownValue}>{formatCurrency(lateFeesOwed)}</span>
                        </div>
                      )}
                      {validPay && (
                        <>
                          <div className={styles.interestBreakdownDivider} />
                          {lateFeePortion > 0 && (
                            <div className={styles.interestBreakdownRow} style={{ color: '#92400E' }}>
                              <span>→ Goes to late fees</span>
                              <span className={styles.interestBreakdownValue}>-{formatCurrency(lateFeePortion)}</span>
                            </div>
                          )}
                          <div className={styles.interestBreakdownRow} style={{ color: '#DC2626' }}>
                            <span>← Goes to interest</span>
                            <span className={styles.interestBreakdownValue}>-{formatCurrency(interestPortion)}</span>
                          </div>
                          <div className={styles.interestBreakdownRow} style={{ color: '#166534' }}>
                            <span>→ Goes to principal</span>
                            <span className={styles.interestBreakdownValue}>-{formatCurrency(principalPortion)}</span>
                          </div>
                          {returned > 0 && (
                            <div className={styles.interestBreakdownRow} style={{ color: '#92400E' }}>
                              <span>→ Over payoff, not charged</span>
                              <span className={styles.interestBreakdownValue}>+{formatCurrency(returned)}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className={styles.interestBreakdownDivider} />
                      <div className={styles.interestBreakdownRow} style={{ fontWeight: 600 }}>
                        <span>To clear this loan now</span>
                        <span className={styles.interestBreakdownValue}>{formatCurrency(payoff)}</span>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setRepaymentViewOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.primaryBtnSmall} disabled={paySubmitting || !payFromId || !payAmount}>
                    {paySubmitting ? 'Processing...' : 'Pay'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function handleLoanSubmit(e) {
  e.preventDefault();
}
