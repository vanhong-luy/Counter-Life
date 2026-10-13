'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Wifi, Zap, MonitorPlay, Dumbbell, AlertCircle, CheckCircle, ArrowRight, Plus, Trash2, CreditCard, Search, User } from 'lucide-react';
import styles from './bills.module.css';
import { api } from '@/lib/api';

const FREQUENCIES = [
  { value: '', label: 'One-time' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'WEEKLY', label: 'Weekly' },
];

function formatAmount(amount) {
  try {
    if (amount == null || isNaN(amount)) return '$0.00';
    if (Math.abs(amount) > 1e15) return '$' + Number(amount).toExponential(2);
    return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return '$0.00';
  }
}

export default function BillsPage() {
  const [bills, setBills] = useState([]);
  const [loans, setLoans] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loanPaidInfo, setLoanPaidInfo] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [billCategories, setBillCategories] = useState([]);
  const [newAcctNumber, setNewAcctNumber] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('Utilities');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newFrequency, setNewFrequency] = useState('');
  const [newAutoPay, setNewAutoPay] = useState(false);
  const [newDefaultAccount, setNewDefaultAccount] = useState('');
  const [newTargetAccountId, setNewTargetAccountId] = useState(null);
  const [lookupResult, setLookupResult] = useState(null);
  const lookupTimer = useRef(null);

  const loadBills = async () => {
    try {
      const data = await api.getBills();
      setBills(Array.isArray(data) ? data : []);
    } catch {}
  };

  const loadLoans = async () => {
    try {
      const loanData = await api.getLoans();
      setLoans(Array.isArray(loanData) ? loanData : []);
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getAccounts();
        const raw = Array.isArray(data) ? data : (data.accounts || []);
        const list = raw.filter(a => a.accountTypeName?.toLowerCase() !== 'fixed deposit');
        setAccounts(list);
        if (list.length > 0) {
          setSelectedAccount(list[0].accountId);
        }
      } catch (err) {
        setError(err.message);
      }
    })();
    loadBills();
    loadLoans();
    api.getCategories().then(cats => {
      setBillCategories((cats || []).map(c => c.categoryName).filter(Boolean));
    }).catch(() => {});
  }, []);

  // Debounced account number lookup
  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (!newAcctNumber.trim()) { setLookupResult(null); setNewTargetAccountId(null); return; }
    lookupTimer.current = setTimeout(async () => {
      try {
        const result = await api.lookupPayee(newAcctNumber.trim());
        if (result && result.found) {
          setLookupResult(result);
          setNewLabel(result.name);
          setNewTargetAccountId(result.accountId);
        } else {
          setLookupResult({ found: false, acct: newAcctNumber.trim() });
          setNewTargetAccountId(null);
        }
      } catch {
        setLookupResult({ found: false, acct: newAcctNumber.trim() });
        setNewTargetAccountId(null);
      }
    }, 500);
    return () => { if (lookupTimer.current) clearTimeout(lookupTimer.current); };
  }, [newAcctNumber]);

  const loanBills = loans
    .filter(l => ['active', 'approved'].includes((l.status || '').toLowerCase()) && l.nextPayment && l.nextPayment.amount > 0)
    .map(l => ({
      id: `LOAN-${l.loanId}`,
      kind: 'loan',
      loanId: l.loanId,
      biller: `${l.loanTypeName} Loan`,
      type: 'Loan Payment',
      amount: l.nextPayment.amount,
      dueDate: l.nextPayment.dueDate,
      icon: 'card',
      status: 'ACTIVE',
      isPaid: false,
    }));

  const allBills = [...loanBills, ...bills];

  const getBillerIcon = (iconName) => {
    switch (iconName) {
      case 'zap': return <Zap size={24} />;
      case 'wifi': return <Wifi size={24} />;
      case 'monitor': return <MonitorPlay size={24} />;
      case 'dumbbell': return <Dumbbell size={24} />;
      case 'user': return <User size={24} />;
      case 'card': return <CreditCard size={24} />;
      default: return <Zap size={24} />;
    }
  };

  const getIconForPayee = (bill) => {
    if (bill.kind === 'loan') return 'card';
    if (bill.targetAccountId) return 'user';
    const t = (bill.billType || '').toLowerCase();
    if (t === 'utilities' || t === 'internet') return 'zap';
    if (t === 'subscription') return 'monitor';
    if (t === 'membership') return 'dumbbell';
    return 'card';
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const getDueDate = (bill) => {
    if (bill.dueDate) return bill.dueDate;
    const d = new Date();
    d.setDate(d.getDate() + Math.floor(Math.random() * 15));
    return d.toISOString().split('T')[0];
  };

  const handleOpenAddModal = () => {
    setShowAddModal(true);
    setNewAcctNumber('');
    setNewLabel('');
    setNewType('Utilities');
    setNewAmount('');
    setNewDueDate('');
    setNewFrequency('');
    setNewAutoPay(false);
    setNewDefaultAccount('');
    setNewTargetAccountId(null);
    setLookupResult(null);
  };

  const handleAddBill = async (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    setLoading(true);
    setError('');
    try {
      const payload = {
        billerName: newLabel.trim(),
        billType: newType,
        amount: newAmount ? parseFloat(newAmount) : null,
        dueDate: newDueDate || null,
        frequency: newFrequency || null,
        autoPay: newAutoPay,
        sourceAccountId: newDefaultAccount ? Number(newDefaultAccount) : null,
        targetAccountId: newTargetAccountId,
      };
      await api.createBill(payload);
      await loadBills();
      setShowAddModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBill = async (billId) => {
    try {
      await api.deleteBill(billId);
      setBills(prev => prev.filter(b => b.billId !== billId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePayNow = (bill) => {
    setSelectedBill(bill);
    if (bill.kind === 'loan') {
      setPayAmount('');
    } else {
      setPayAmount(bill.amount ? String(bill.amount) : '');
    }
    if (bill.sourceAccountId) {
      setSelectedAccount(String(bill.sourceAccountId));
    }
  };

  const handlePayBill = async (e) => {
    e.preventDefault();
    if (!selectedBill || !selectedAccount) return;
    setError('');

    setLoading(true);
    try {
      if (selectedBill.kind === 'loan') {
        await api.repayLoan(selectedBill.loanId, { amountPaid: selectedBill.amount }, Number(selectedAccount));
        const loanData = await api.getLoans();
        setLoans(Array.isArray(loanData) ? loanData : []);
        const updatedLoan = Array.isArray(loanData) ? loanData.find(l => l.loanId === selectedBill.loanId) : null;
        setLoanPaidInfo({
          biller: selectedBill.biller,
          nextPayment: updatedLoan?.nextPayment || null,
          settled: !updatedLoan?.nextPayment || !['active', 'approved'].includes((updatedLoan?.status || '').toLowerCase())
        });
      } else {
        const amount = parseFloat(payAmount);
        if (isNaN(amount) || amount <= 0) {
          setError('Please enter a valid amount');
          setLoading(false);
          return;
        }
        await api.payBill(selectedBill.billId, {
          sourceAccountId: Number(selectedAccount),
          amount: amount,
        });
        await loadBills();
      }
      setSelectedBill(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <Link href="/dashboard/transactions" className={styles.backLink}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Transactions
        </Link>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.heading}>Saved Payees & Bills</h1>
            <p className={styles.subText}>Manage people you pay regularly and your recurring subscriptions.</p>
          </div>
          <button className={styles.addBillBtn} onClick={handleOpenAddModal}>
            <Plus size={16} />
            Add Saved Payee
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className={styles.billsGrid}>
        {allBills.map(bill => {
          const isLoanBill = bill.kind === 'loan';
          const isPaid = bill.isPaid;
          const dueDate = getDueDate(bill);
          const icon = bill.icon || getIconForPayee(bill);
          const payeeName = bill.targetAccountName || null;
          return (
            <div key={bill.id || bill.billId} className={styles.billCard}>
              <div className={styles.cardTop}>
                <div className={styles.billerInfo}>
                  <div className={styles.billerIconBox}>
                    {getBillerIcon(icon)}
                  </div>
                  <div className={styles.billerText}>
                    <span className={styles.billerName}>{bill.billerName || bill.biller}</span>
                    <span className={styles.billerType}>
                      {payeeName ? `Pay to: ${payeeName}` : bill.billType || bill.type}
                    </span>
                  </div>
                </div>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <span className={`${styles.statusBadge} ${isPaid ? styles.statusPaid : styles.statusPending}`}>
                    {isPaid ? 'PAID' : 'UNPAID'}
                  </span>
                  {!isLoanBill && (
                    <button
                      onClick={() => handleDeleteBill(bill.billId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C3C6D5', padding: '4px' }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.cardMiddle}>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <span className={styles.amountLabel}>AMOUNT{bill.amount ? '' : ' (variable)'}</span>
                  <span className={styles.amountValue}>{bill.amount ? formatAmount(bill.amount) : 'Set on pay'}</span>
                </div>
                {!isPaid ? (
                  <div className={`${styles.dueDateInfo} ${isOverdue(dueDate) ? styles.overdue : ''}`}>
                    {isOverdue(dueDate) ? <AlertCircle size={16} /> : null}
                    {isOverdue(dueDate) ? 'Overdue' : 'Due'} {new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                ) : (
                  <div className={styles.dueDateInfo} style={{ color: '#16A34A' }}>
                    <CheckCircle size={16} />
                    Paid
                  </div>
                )}
              </div>

              <div className={styles.cardBottom}>
                {!isPaid ? (
                  <button className={styles.payBtn} onClick={() => handlePayNow(bill)}>
                    {isLoanBill ? 'Pay Installment' : 'Pay Now'} <ArrowRight size={16} />
                  </button>
                ) : (
                  <span className={styles.paidText}>No action required</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <h3 className={styles.modalTitle}>Add Saved Payee</h3>
            <p style={{ fontFamily: 'Inter', fontSize: 13, color: '#737784', marginTop: '-12px', marginBottom: '20px' }}>
              Enter the account number of the person you want to pay. We'll look them up automatically.
            </p>

            <form onSubmit={handleAddBill}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Account Number <span style={{color: '#999', fontWeight: 400}}>(of the person receiving the payment)</span></label>
                <input
                  type="text"
                  className={styles.selectInput}
                  placeholder="e.g., ACC0000000001-1"
                  value={newAcctNumber}
                  onChange={(e) => setNewAcctNumber(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 14 }}
                />
                {lookupResult && lookupResult.found && (
                  <div style={{ marginTop: 6, padding: '8px 12px', background: '#F0FDF4', borderRadius: '6px', border: '1px solid #BBF7D0', color: '#166534', fontFamily: 'Inter', fontSize: 13 }}>
                    <User size={14} style={{display: 'inline', marginRight: 6, verticalAlign: 'middle'}} />
                    {lookupResult.name}
                  </div>
                )}
                {lookupResult && !lookupResult.found && (
                  <div style={{ marginTop: 6, padding: '8px 12px', background: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA', color: '#991B1B', fontFamily: 'Inter', fontSize: 13 }}>
                    No user found under {lookupResult.acct}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Label <span style={{color: '#999', fontWeight: 400}}>(a friendly name to remember this)</span></label>
                <input
                  type="text"
                  className={styles.selectInput}
                  placeholder="e.g., Rent, John's payment, Netflix"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Category <span style={{color: '#999', fontWeight: 400}}>(optional)</span></label>
                <select
                  className={styles.selectInput}
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  {[...new Set([...billCategories, newType].filter(Boolean))].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Amount <span style={{color: '#999', fontWeight: 400}}>(leave blank if variable)</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={styles.selectInput}
                  placeholder="e.g., 49.99"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Frequency</label>
                <select
                  className={styles.selectInput}
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value)}
                >
                  {FREQUENCIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Due Date
                  {newFrequency && <span style={{color: '#DC2626', fontWeight: 400}}> (required for auto-pay)</span>}
                  <span style={{color: '#999', fontWeight: 400}}> {!newFrequency ? '(optional)' : ''}</span>
                </label>
                <input
                  type="date"
                  className={styles.selectInput}
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  required={!!newFrequency}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={newAutoPay}
                    onChange={(e) => setNewAutoPay(e.target.checked)}
                  />
                  <span className={styles.checkboxText}>
                    <span className={styles.checkboxTitle}>Auto-pay this bill when due</span>
                    <span className={styles.checkboxHint}>Requires a fixed amount, a due date, and a default account.</span>
                  </span>
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Pay from <span style={{color: '#999', fontWeight: 400}}>(default account)</span></label>
                <select
                  className={styles.selectInput}
                  value={newDefaultAccount}
                  onChange={(e) => setNewDefaultAccount(e.target.value)}
                >
                  <option value="">No default</option>
                  {accounts.map(acc => (
                    <option key={acc.accountId} value={acc.accountId}>
                      {acc.name || acc.accountTypeName || `Account ${acc.accountId}`} ({formatAmount(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.btnGroup}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Payee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedBill && (() => {
        const selAcct = accounts.find(a => a.accountId == selectedAccount);
        const selBalance = selAcct ? parseFloat(selAcct.balance ?? 0) : 0;
        const parsedAmount = selectedBill.kind === 'loan' ? parseFloat(selectedBill.amount ?? 0) : parseFloat(payAmount || '0');
        const validAmount = !isNaN(parsedAmount) && parsedAmount > 0;
        const newBalance = selBalance - (validAmount ? parsedAmount : 0);
        const isLoan = selectedBill.kind === 'loan';
        const recipientName = isLoan ? selectedBill.biller : (selectedBill.targetAccountName || selectedBill.billerName || selectedBill.biller);
        const billTypeLabel = isLoan ? 'Loan Payment' : (selectedBill.billType || selectedBill.type);
        return (
          <div className={styles.modalOverlay}>
            <div className={styles.modalDialog}>
              <h3 className={styles.modalTitle}>
                {isLoan ? 'Pay Loan Installment' : 'Confirm Payment'}
              </h3>

              <div className={styles.recipientCard}>
                <div className={styles.recipientIcon}>
                  {isLoan ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  ) : selectedBill.targetAccountName ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                  )}
                </div>
                <div className={styles.recipientInfo}>
                  <span className={styles.recipientName}>{recipientName}</span>
                  <span className={styles.recipientMeta}>{billTypeLabel}{selectedBill.frequency ? ` · ${selectedBill.frequency}` : ''}</span>
                </div>
              </div>

              <form onSubmit={handlePayBill}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Amount</label>
                  {isLoan ? (
                    <input
                      type="text"
                      className={styles.selectInput}
                      value={formatAmount(selectedBill.amount)}
                      disabled
                      style={{ background: '#F3F4F6' }}
                    />
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className={styles.selectInput}
                      placeholder="Enter amount"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      required
                    />
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>From Account</label>
                  <select
                    className={styles.selectInput}
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    required
                  >
                    {accounts.map(acc => (
                      <option key={acc.accountId} value={acc.accountId}>
                        {acc.name || acc.accountTypeName || `Account ${acc.accountId}`} ({formatAmount(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                {validAmount && selAcct && (
                  <div className={newBalance >= 0 ? styles.balancePreview : styles.balancePreviewNeg}>
                    <strong>Current balance:</strong> {formatAmount(selBalance)}<br />
                    {newBalance >= 0 ? (
                      <><strong>After payment:</strong> {formatAmount(newBalance)}</>
                    ) : (
                      <><strong>After payment:</strong> {formatAmount(newBalance)} <span style={{color: '#DC2626'}}>(insufficient funds)</span></>
                    )}
                  </div>
                )}

                <div className={styles.btnGroup}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setSelectedBill(null)}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.primaryBtn} disabled={loading || (validAmount && newBalance < 0)}>
                    {loading ? 'Processing...' : isLoan ? 'Pay Installment' : 'Confirm Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {loanPaidInfo && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <h3 className={styles.modalTitle}>Payment Successful</h3>
            <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#434653' }}>
              Your installment for <strong>{loanPaidInfo.biller}</strong> has been paid.
            </p>
            <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#434653', marginTop: 8 }}>
              {loanPaidInfo.settled || !loanPaidInfo.nextPayment ? (
                <>This loan is now fully settled.</>
              ) : (
                <>Your next payment of <strong>{formatAmount(loanPaidInfo.nextPayment.amount)}</strong> is due on{' '}
                  <strong>{new Date(loanPaidInfo.nextPayment.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.</>
              )}
            </p>
            <div className={styles.btnGroup}>
              <button type="button" className={styles.primaryBtn} onClick={() => setLoanPaidInfo(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
