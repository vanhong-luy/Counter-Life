'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Sliders, FileText, XCircle, Eye, EyeOff, DollarSign, CreditCard, TrendingUp } from 'lucide-react';
import styles from './details.module.css';
import { api } from '@/lib/api';

function CardDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cardId = searchParams.get('id');

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [freezeCard, setFreezeCard] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [showFullNumber, setShowFullNumber] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [dailyLimit, setDailyLimit] = useState('1000');
  const [monthlyLimit, setMonthlyLimit] = useState('10000');
  const [allowInternational, setAllowInternational] = useState(false);
  const [allowOnline, setAllowOnline] = useState(true);
  const [limitsLoaded, setLimitsLoaded] = useState(false);
  const [creditInfo, setCreditInfo] = useState(null);
  const [statements, setStatements] = useState([]);
  const [paymentModal, setPaymentModal] = useState(false);
  const [userAccounts, setUserAccounts] = useState([]);
  const [payAmount, setPayAmount] = useState('');
  const [fromAccount, setFromAccount] = useState('');
  const [limitRequestModal, setLimitRequestModal] = useState(false);
  const [requestedLimit, setRequestedLimit] = useState('');
  const [limitReason, setLimitReason] = useState('');
  const [limitRequestMsg, setLimitRequestMsg] = useState('');
  const [limitRequestSent, setLimitRequestSent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const accts = await api.getAccounts();
        const list = Array.isArray(accts) ? accts : (accts.accounts || []);
        setUserAccounts(list.filter(a => a.accountTypeName !== 'Fixed Deposit'));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!cardId) return;
    (async () => {
      setLoading(true);
      try {
        const found = await api.getCard(cardId);
        if (found) {
          setCard(found);
          setFreezeCard(found.isFrozen);
          const isCredit = (found.cardTypeName || '').toLowerCase().includes('credit') || found.creditLimit !== null;
          if (isCredit) {
            const limit = Number(found.creditLimit || 0);
            const balance = Number(found.outstandingBalance || 0);
            setCreditInfo({
              creditLimit: limit,
              outstandingBalance: balance,
              availableCredit: Math.max(0, limit - balance),
              apr: found.apr || 0.2299,
              statementDate: found.statementDate || new Date().toISOString().split('T')[0],
              dueDate: found.dueDate || new Date(Date.now() + 21 * 84600000).toISOString().split('T')[0]
            });
            try {
              const ci = await api.getCreditInfo(cardId);
              if (ci) setCreditInfo(ci);
              const st = await api.getCreditStatements(cardId).catch(() => []);
              if (st) setStatements(st);
            } catch {}
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [cardId]);

  useEffect(() => {
    if (!cardId || !card) return;
    (async () => {
      try {
        const limits = await api.getCardLimits(cardId);
        if (limits) {
          setDailyLimit(String(limits.dailyLimit || 1000));
          setMonthlyLimit(String(limits.monthlyLimit || 10000));
          setAllowInternational(limits.allowInternational || false);
          setAllowOnline(limits.allowOnline !== undefined ? limits.allowOnline : true);
        }
        setLimitsLoaded(true);
      } catch { setLimitsLoaded(true); }
    })();
  }, [cardId, card]);

  const handleFreezeChange = async (e) => {
    const freeze = e.target.checked;
    setFreezeCard(freeze);
    try {
      if (freeze) await api.freezeCard(cardId);
      else await api.unfreezeCard(cardId);
    } catch (err) {
      setError(err.message);
      setFreezeCard(!freeze);
    }
  };

  const handleCancelCard = async () => {
    try {
      await api.deactivateCard(cardId);
      setModalType(null);
      router.push('/dashboard/cards');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveLimits = async () => {
    try {
      await api.updateCardLimits(cardId, {
        dailyLimit: parseFloat(dailyLimit),
        monthlyLimit: parseFloat(monthlyLimit),
        allowInternational: allowInternational,
        allowOnline: allowOnline
      });
      setModalType(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const [expandedStatementId, setExpandedStatementId] = useState(null);

  const handlePayment = async () => {
    if (!payAmount || !fromAccount) return;
    try {
      const result = await api.creditPay(cardId, {
        fromAccountId: Number(fromAccount),
        amount: parseFloat(payAmount)
      });
      setPaymentModal(false);
      setPayAmount('');
      const ci = await api.getCreditInfo(cardId);
      setCreditInfo(ci);
      const st = await api.getCreditStatements(cardId).catch(() => []);
      if (st) setStatements(st);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleExpandStatement = (id) => {
    setExpandedStatementId(prev => prev === id ? null : id);
  };

  if (loading) return <div style={{padding: '48px', textAlign: 'center'}}>Loading card details...</div>;
  if (error) return <div style={{padding: '48px', color: '#DC2626'}}>Error: {error}</div>;
  if (!card) return <div style={{padding: '48px'}}>Card not found.</div>;

  const network = card.cardTypeNetwork || 'VISA';
  const cardType = card.cardTypeName || 'Debit';
  const label = `${network} ${cardType}`;
  const expiry = card.expiryDate ? String(card.expiryDate).substring(0, 7) : 'N/A';
  const maskedNumber = card.cardNumber || '************0000';
  const last4 = maskedNumber.slice(-4);
  const fullNumber = card.fullCardNumber || maskedNumber;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <div style={{ display: 'flex' }}>
          <Link href="/dashboard/cards" className={styles.backLink}>
            <ArrowLeft size={16} />
            Back to Cards
          </Link>
        </div>
        <h1 className={styles.heading}>Card Details</h1>
        <p className={styles.subText}>Manage settings and limits for your {label} Card.</p>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.column}>

          {/* Physical card visual */}
          <div className={`${styles.cardVisual} ${styles.cardBlue}`}>
            <div className={styles.cardTop}>
              <span className={styles.cardTypeName}>{label}</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.8}}>
                <path d="M8.5 16.5a7 7 0 0 1 0-9"></path>
                <path d="M11.5 18a9 9 0 0 1 0-12"></path>
                <path d="M14.5 19.5a11 11 0 0 1 0-15"></path>
                <path d="M17.5 21a13 13 0 0 1 0-18"></path>
              </svg>
            </div>

            <div className={styles.cardNumberInfo}>
              <span className={styles.cardLabel}>CARD NUMBER</span>
              <div className={styles.cardNumber} style={{fontSize: '20px', letterSpacing: '2px'}}>
                {showFullNumber
                  ? fullNumber.replace(/(.{4})/g, '$1 ').trim()
                  : `**** **** **** ${last4}`
                }
              </div>
            </div>

            <div className={styles.cardBottom}>
              <div className={styles.cardHolderInfo}>
                <span className={styles.cardLabel}>CARDHOLDER</span>
                <span className={styles.cardValue}>{card.cardholderName || card.cardholder || 'Cardholder'}</span>
              </div>
              <div className={styles.cardExpiresInfo}>
                <span className={styles.cardLabel}>EXPIRES</span>
                <span className={styles.cardValue}>{expiry}</span>
              </div>
              <div className={styles.networkLogo}>
                {network === 'Mastercard' ? (
                  <div style={{display: 'flex'}}>
                    <div style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#EB001B', zIndex: 2}}></div>
                    <div style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#F79E1B', marginLeft: -10, zIndex: 1}}></div>
                  </div>
                ) : (
                  <span style={{fontWeight: 700, fontSize: '16px', letterSpacing: '2px'}}>{network}</span>
                )}
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div style={{display: 'flex', gap: '8px', marginBottom: '16px'}}>
            <button
              className={styles.actionBtn}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #C3C6D5',
                background: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, color: '#191B22'
              }}
              onClick={() => setShowFullNumber(!showFullNumber)}
            >
              {showFullNumber ? <EyeOff size={16} /> : <Eye size={16} />}
              {showFullNumber ? 'Hide Card Number' : 'Show Card Number'}
            </button>
            <button
              className={styles.actionBtn}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #C3C6D5',
                background: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, color: '#191B22'
              }}
              onClick={() => setShowCvv(!showCvv)}
            >
              {showCvv ? <EyeOff size={16} /> : <Eye size={16} />}
              {showCvv ? 'Hide CVV' : 'Show CVV'}
            </button>
          </div>

          {/* CVV Display */}
          {showCvv && (
            <div className={styles.panel} style={{marginBottom: '16px'}}>
              <h3 className={styles.panelTitle}>Security Code (CVV)</h3>
              <div style={{fontSize: '32px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '8px', textAlign: 'center', padding: '12px', background: '#F8F9FC', borderRadius: '8px', color: '#191B22'}}>
                {card.cvv || '***'}
              </div>
              <p style={{fontSize: '12px', color: '#737784', textAlign: 'center', marginTop: '8px'}}>
                This is the 3-digit code on the back of your card.
              </p>
            </div>
          )}

          {/* Card Information */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Information</h3>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Card Type</span>
              <span className={styles.infoValue}>{cardType}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Network</span>
              <span className={styles.infoValue}>{network}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Card Number</span>
              <span className={styles.infoValue} style={{fontFamily: 'monospace'}}>
                {showFullNumber
                  ? fullNumber.replace(/(.{4})/g, '$1 ').trim()
                  : `**** **** **** ${last4}`
                }
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Cardholder</span>
              <span className={styles.infoValue}>{card.cardholderName || 'N/A'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Expiry Date</span>
              <span className={styles.infoValue}>{expiry}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Linked Account</span>
              <span className={styles.infoValue}>{card.accountName || 'Account #' + card.accountId}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Issued Date</span>
              <span className={styles.infoValue}>{card.issuedAt ? String(card.issuedAt).substring(0, 10) : 'N/A'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status</span>
              <div className={styles.statusBadge}>
                <CheckCircle size={14} />
                {card.isFrozen ? 'Frozen' : 'Active'}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.column}>
          {creditInfo && (
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>Credit Details</h3>
              <div className={styles.actionRow} style={{marginBottom: 12}}>
                <button className={`${styles.actionBtn} ${styles.primary}`} style={{flex: 1}} onClick={() => {
                  setRequestedLimit(String(creditInfo.creditLimit));
                  setLimitReason('');
                  setLimitRequestSent(false);
                  setLimitRequestMsg('');
                  setLimitRequestModal(true);
                }}>
                  <TrendingUp size={16} />
                  Request Limit Increase
                </button>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Credit Limit</span>
                <span className={styles.infoValue}>${Number(creditInfo.creditLimit).toLocaleString()}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Outstanding</span>
                <span className={styles.infoValue}>${Number(creditInfo.outstandingBalance).toLocaleString()}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Available Credit</span>
                <span className={styles.infoValue} style={{color: '#155724'}}>${Number(creditInfo.availableCredit).toLocaleString()}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>APR</span>
                <span className={styles.infoValue}>{Number(creditInfo.apr * 100).toFixed(2)}%</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Statement Date</span>
                <span className={styles.infoValue}>{creditInfo.statementDate}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Due Date</span>
                <span className={styles.infoValue} style={{color: '#dc3545'}}>{creditInfo.dueDate}</span>
              </div>
            </div>
          )}

          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Card Controls</h3>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>Freeze Card</span>
                <span className={styles.toggleDesc}>Temporarily block all new transactions.</span>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={freezeCard} onChange={handleFreezeChange} />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>

          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Quick Actions</h3>
            <div className={styles.actionRow}>
              <button className={`${styles.actionBtn} ${styles.primary}`} onClick={() => setModalType('limits')}>
                <Sliders size={16} />
                Manage Limits
              </button>

              <Link href={`/dashboard/cards/transactions?id=${cardId}`} className={styles.actionBtn}>
                <FileText size={16} />
                View Transactions
              </Link>
            </div>
            <Link href={`/dashboard/cards/simulate?id=${cardId}`} className={styles.actionBtn} style={{marginBottom: 8, justifyContent: 'center'}}>
              <CreditCard size={16} />
              Simulate Purchase
            </Link>
            <button className={styles.dangerBtn} onClick={() => setModalType('cancel')}>
              <XCircle size={16} />
              Cancel Card
            </button>
          </div>

          {statements.length > 0 && (
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>Statements</h3>
              {statements.map((s, i) => {
                const isExpanded = expandedStatementId === (s.statementId || i);
                const hasTxns = Array.isArray(s.transactions) && s.transactions.length > 0;
                return (
                  <div key={s.statementId || i} style={{
                    padding: '12px 0', borderBottom: i < statements.length - 1 ? '1px solid var(--border)' : 'none'
                  }}>
                    <div
                      onClick={() => toggleExpandStatement(s.statementId || i)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: 13
                      }}
                    >
                      <div>
                        <div style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                          <span>{s.periodStart} → {s.periodEnd}</span>
                          <span style={{fontSize: 11, color: '#4F46E5', background: '#EEF2FF', padding: '1px 6px', borderRadius: 4}}>
                            {isExpanded ? '▲ Hide Details' : '▼ View Purchases (' + (s.transactions ? s.transactions.length : 0) + ')'}
                          </span>
                        </div>
                        <div style={{color: 'var(--text-faint)', fontSize: 12, marginTop: 4}}>
                          Due: {s.dueDate} · Min: ${Number(s.minimumPayment).toLocaleString('en-US', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <div style={{fontWeight: 700, fontSize: 14}}>${Number(s.endingBalance).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                        <span className={`pill ${s.paid ? 'pillApproved' : 'pillPending'}`} style={{fontSize: 10, padding: '2px 8px', marginTop: 4, display: 'inline-block'}}>
                          {s.paid ? 'Paid' : 'Open'}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{
                        marginTop: 10, padding: 12, background: 'var(--surface-subtle, #F8F9FC)', borderRadius: 8, border: '1px solid var(--border)'
                      }}>
                        <div style={{fontWeight: 600, fontSize: 12, marginBottom: 8, color: 'var(--text-secondary)'}}>
                          Itemized Statement Activity:
                        </div>
                        {hasTxns ? (
                          <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                            {s.transactions.map((tx, txIdx) => (
                              <div key={tx.cxnId || txIdx} style={{
                                display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: txIdx < s.transactions.length - 1 ? '1px dashed var(--border)' : 'none'
                              }}>
                                <div>
                                  <div style={{fontWeight: 500}}>{tx.merchant || tx.description || 'Card Purchase'}</div>
                                  <div style={{fontSize: 11, color: 'var(--text-faint)'}}>{tx.transactionDate ? String(tx.transactionDate).replace('T', ' ').substring(0, 16) : ''}</div>
                                </div>
                                <div style={{fontWeight: 600, color: '#191B22'}}>
                                  -${Number(tx.amount).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic'}}>
                            No individual purchases recorded for this billing cycle.
                          </div>
                        )}
                        
                        {!s.paid && (
                          <div style={{marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 8}}>
                            <button
                              className={`${styles.actionBtn} ${styles.primary}`}
                              style={{fontSize: 12, padding: '4px 10px'}}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPayAmount(String(s.minimumPayment));
                                setFromAccount(String(card.accountId));
                                setPaymentModal(true);
                              }}
                            >
                              Pay Minimum (${Number(s.minimumPayment).toFixed(2)})
                            </button>
                            <button
                              className={`${styles.actionBtn} ${styles.primary}`}
                              style={{fontSize: 12, padding: '4px 10px'}}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPayAmount(String(s.endingBalance));
                                setFromAccount(String(card.accountId));
                                setPaymentModal(true);
                              }}
                            >
                              Pay Full (${Number(s.endingBalance).toFixed(2)})
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modalType === 'limits' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <h3 className={styles.modalTitle}>Manage Limits</h3>
            <p className={styles.modalMessage}>Set the spending limits for your {cardType} ending in {last4}.</p>
            <div className={styles.modalInputGroup}>
              <label className={styles.modalLabel}>Daily Limit ($)</label>
              <input type="number" className={styles.modalInput} value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
            </div>
            <div className={styles.modalInputGroup}>
              <label className={styles.modalLabel}>Monthly Limit ($)</label>
              <input type="number" className={styles.modalInput} value={monthlyLimit} onChange={(e) => setMonthlyLimit(e.target.value)} />
            </div>
            <div className={styles.toggleRow} style={{padding: '8px 0'}}>
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>Allow Online</span>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={allowOnline} onChange={(e) => setAllowOnline(e.target.checked)} />
                <span className={styles.slider}></span>
              </label>
            </div>
            <div className={styles.toggleRow} style={{padding: '8px 0'}}>
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>Allow International</span>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={allowInternational} onChange={(e) => setAllowInternational(e.target.checked)} />
                <span className={styles.slider}></span>
              </label>
            </div>
            <div className={styles.modalActions}>
              <button className={`${styles.modalBtn} ${styles.secondary}`} onClick={() => setModalType(null)}>Cancel</button>
              <button className={`${styles.modalBtn} ${styles.primary}`} onClick={handleSaveLimits}>Save Limits</button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'cancel' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <h3 className={styles.modalTitle}>Cancel Card</h3>
            <p className={styles.modalMessage}>Are you sure you want to cancel this card? This action cannot be undone.</p>
            <div className={styles.modalActions}>
              <button className={`${styles.modalBtn} ${styles.secondary}`} onClick={() => setModalType(null)}>Keep Card</button>
              <button className={`${styles.modalBtn} ${styles.danger}`} onClick={handleCancelCard}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {limitRequestModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <h3 className={styles.modalTitle}>Request Credit Limit Increase</h3>
            {creditInfo?.activeRequest && creditInfo.activeRequest.status === 'PENDING' ? (
              <>
                <div style={{
                  padding: '14px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, marginBottom: 16
                }}>
                  <div style={{fontWeight: 700, color: '#92400E', fontSize: 14, marginBottom: 4}}>
                    ⏳ Request Already Under Review
                  </div>
                  <div style={{fontSize: 13, color: '#B45309'}}>
                    You have an active request to increase your limit to <strong>${Number(creditInfo.activeRequest.requestedLimit).toLocaleString()}</strong>.
                  </div>
                  {creditInfo.activeRequest.reason && (
                    <div style={{fontSize: 12, color: '#B45309', marginTop: 6, fontStyle: 'italic'}}>
                      "{creditInfo.activeRequest.reason}"
                    </div>
                  )}
                  <div style={{fontSize: 11, color: '#92400E', marginTop: 8}}>
                    Submitted on: {new Date(creditInfo.activeRequest.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <p className={styles.modalMessage}>Please wait for our credit team to review your request before submitting a new one.</p>
                <div className={styles.modalActions}>
                  <button className={`${styles.modalBtn} ${styles.primary}`} onClick={() => setLimitRequestModal(false)}>Got It</button>
                </div>
              </>
            ) : !limitRequestSent ? (
              <>
                {creditInfo?.activeRequest && (
                  <div style={{
                    padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 12,
                    background: creditInfo.activeRequest.status === 'APPROVED' ? '#ECFDF5' : '#FEF2F2',
                    color: creditInfo.activeRequest.status === 'APPROVED' ? '#065F46' : '#991B1B',
                    border: `1px solid ${creditInfo.activeRequest.status === 'APPROVED' ? '#A7F3D0' : '#FECACA'}`
                  }}>
                    Previous Request ({creditInfo.activeRequest.status}): ${Number(creditInfo.activeRequest.requestedLimit).toLocaleString()}
                  </div>
                )}
                <p className={styles.modalMessage}>Submit a request to increase your credit limit. An admin will review your request.</p>
                <div className={styles.modalInputGroup}>
                  <label className={styles.modalLabel}>Current Limit</label>
                  <div style={{fontSize: 18, fontWeight: 700, color: '#191B22'}}>${Number(creditInfo.creditLimit).toLocaleString()}</div>
                </div>
                <div className={styles.modalInputGroup}>
                  <label className={styles.modalLabel}>Requested Limit ($)</label>
                  <input type="number" className={styles.modalInput} value={requestedLimit} onChange={(e) => setRequestedLimit(e.target.value)} min={creditInfo.creditLimit} />
                </div>
                <div className={styles.modalInputGroup}>
                  <label className={styles.modalLabel}>Reason (optional)</label>
                  <textarea className={styles.modalInput} value={limitReason} onChange={(e) => setLimitReason(e.target.value)} rows={3} placeholder="Why do you need a higher limit?" style={{resize: 'vertical'}} />
                </div>
                {limitRequestMsg && <div style={{color: '#dc3545', fontSize: 13, marginBottom: 8}}>{limitRequestMsg}</div>}
                <div className={styles.modalActions}>
                  <button className={`${styles.modalBtn} ${styles.secondary}`} onClick={() => setLimitRequestModal(false)}>Cancel</button>
                  <button className={`${styles.modalBtn} ${styles.primary}`} onClick={async () => {
                    if (!requestedLimit || Number(requestedLimit) <= Number(creditInfo.creditLimit)) {
                      setLimitRequestMsg('Requested limit must be higher than current limit');
                      return;
                    }
                    try {
                      await api.requestLimitIncrease(cardId, { requestedLimit: Number(requestedLimit), reason: limitReason });
                      setLimitRequestSent(true);
                      setLimitRequestMsg('Your request has been submitted for review.');
                      const updatedCi = await api.getCreditInfo(cardId);
                      setCreditInfo(updatedCi);
                    } catch (err) {
                      setLimitRequestMsg(err.message);
                    }
                  }}>Submit Request</button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.modalMessage} style={{color: '#155724'}}>{limitRequestMsg}</p>
                <div className={styles.modalActions}>
                  <button className={`${styles.modalBtn} ${styles.primary}`} onClick={() => setLimitRequestModal(false)}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function CardDetailsPage() {
  return (
    <Suspense fallback={<div style={{padding: '48px', textAlign: 'center'}}>Loading...</div>}>
      <CardDetailsContent />
    </Suspense>
  );
}
