'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AuditLogSection from '../../components/AuditLogSection';
import { ArrowLeft, DollarSign, Percent, RefreshCw, CheckCircle, XCircle, ShieldCheck, AlertCircle } from 'lucide-react';

function formatCurrency(n) {
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminCardDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [card, setCard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showOverride, setShowOverride] = useState(false);
  const [overrideApr, setOverrideApr] = useState('');
  const [overrideLimit, setOverrideLimit] = useState('');

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [showReview, setShowReview] = useState(null); // requestId
  const [reviewNotes, setReviewNotes] = useState('');
  const [recentTxns, setRecentTxns] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [auditKey, setAuditKey] = useState(0);

  const fetchData = async () => {
    try {
      const [cardData, reqData, txnData] = await Promise.all([
        api.admin.getCard(id),
        api.admin.getCardRequests(id).catch(() => []),
        api.getCardTransactions(id).catch(() => ({}))
      ]);
      setCard(cardData);
      setRequests(Array.isArray(reqData) ? reqData : []);
      const txns = Array.isArray(txnData) ? txnData : (txnData.items || []);
      setRecentTxns(txns.slice(0, 20));
      if (cardData) {
        setOverrideApr(cardData.apr ? (Number(cardData.apr) * 100).toFixed(2) : '');
        setOverrideLimit(cardData.creditLimit ? String(cardData.creditLimit) : '');
      }
    } catch (err) {
      setError(err.message || 'Failed to load card.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleOverride = async () => {
    setSubmitting(true);
    setError('');
    try {
      const body = {};
      if (overrideApr) body.apr = Number(overrideApr) / 100;
      if (overrideLimit) body.creditLimit = Number(overrideLimit);
      const updated = await api.admin.overrideCard(id, body);
      setCard(updated);
      setShowOverride(false);
      setAuditKey(k => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to override.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjust = async () => {
    setSubmitting(true);
    setError('');
    try {
      const updated = await api.admin.adjustBalance(id, {
        amount: Number(adjustAmount),
        reason: adjustReason
      });
      setCard(updated);
      setShowAdjust(false);
      setAdjustAmount('');
      setAdjustReason('');
      setAuditKey(k => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to adjust balance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (requestId, status) => {
    setSubmitting(true);
    setError('');
    try {
      await api.admin.reviewCreditRequest(requestId, { status, adminNotes: reviewNotes });
      setShowReview(null);
      setReviewNotes('');
      await fetchData();
      setAuditKey(k => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to review request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loadingBox"><RefreshCw className="animate-spin" style={{ margin: '0 auto 12px' }} />Loading card details…</div>;
  if (error && !card) return <div className="errorBanner">{error}</div>;
  if (!card) return <div className="emptyState" style={{ padding: 40, textAlign: 'center' }}>Card not found.</div>;

  const isCredit = (card.cardTypeName || '').toLowerCase() === 'credit';
  const available = isCredit ? Math.max(0, Number(card.creditLimit) - Number(card.outstandingBalance)) : 0;

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 8px' }}>
      <div
        onClick={() => router.push('/admin/cards')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13, marginBottom: 20 }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold-light)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
      >
        <ArrowLeft size={16} /> Back to Cards
      </div>

      {error && <div className="errorBanner">{error}</div>}

      <div style={{ marginBottom: 24 }}>
        <h1 className="serifTitle" style={{ fontSize: 32, margin: '0 0 4px', color: '#f3edd8' }}>
          {card.customerName}
        </h1>
        <div style={{ color: 'var(--text-faint)', fontSize: 13, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>CARD_ID: #{card.cardId} &middot; {card.network} {card.cardTypeName}</span>
          <span className={`pill ${isCredit ? 'pillApproved' : 'pillPending'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
            {isCredit ? 'CREDIT' : 'DEBIT'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ background: '#161920', border: '1px solid #2b303a' }}>
            <div className="cardHeader" style={{ borderBottom: '1px solid #2b303a', padding: '14px 18px' }}>
              <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f3edd8' }}>Card Info</h2>
            </div>
            <div className="cardBody" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Card Number</span><div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 600 }}>{card.cardNumber}</div></div>
              <div><span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Cardholder</span><div style={{ fontWeight: 600 }}>{card.cardholderName}</div></div>
              <div><span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Email</span><div>{card.customerEmail}</div></div>
              <div><span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Expiry</span><div>{card.expiryDate ? String(card.expiryDate).substring(0, 7) : 'N/A'}</div></div>
              <div>
                <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Status</span>
                <div><span className={`pill ${card.isFrozen ? 'pillPending' : 'pillApproved'}`} style={{ fontSize: 10.5, padding: '3px 8px' }}>{card.isFrozen ? 'Frozen' : 'Active'}</span></div>
              </div>
              <div><span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Linked Account</span><div>{card.accountName || 'Account #' + card.accountId}</div></div>
            </div>
          </div>

          {isCredit && (
            <div className="card" style={{ background: '#161920', border: '1px solid #2b303a' }}>
              <div className="cardHeader" style={{ borderBottom: '1px solid #2b303a', padding: '14px 18px' }}>
                <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f3edd8' }}>Credit Metrics</h2>
              </div>
              <div className="cardBody" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Credit Limit</span>
                  <div className="serifTitle" style={{ fontSize: 28, color: 'var(--gold-light)' }}>{formatCurrency(card.creditLimit)}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Outstanding</span><div style={{ fontSize: 16, fontWeight: 600, color: '#e6584f' }}>{formatCurrency(card.outstandingBalance)}</div></div>
                  <div><span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Available</span><div style={{ fontSize: 16, fontWeight: 600, color: '#2fbf88' }}>{formatCurrency(available)}</div></div>
                </div>
                <div><span style={{ color: 'var(--text-faint)', fontSize: 11 }}>APR</span><div style={{ fontSize: 16, fontWeight: 600 }}>{card.apr != null ? (Number(card.apr) * 100).toFixed(2) + '%' : 'N/A'}</div></div>
                {card.statementDate && <div><span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Statement Date</span><div>{card.statementDate}</div></div>}
                {card.dueDate && <div><span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Due Date</span><div>{card.dueDate}</div></div>}
              </div>
            </div>
          )}

          <div className="card" style={{ background: '#161920', border: '1px solid #2b303a' }}>
            <div className="cardHeader" style={{ padding: '14px 18px' }}>
              <h2 style={{ fontSize: 14 }}>Audit Trail Logs</h2>
            </div>
            <div className="cardBody" style={{ padding: 12 }}>
              <AuditLogSection key={auditKey} table="cards" recordId={id} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {isCredit && (
            <>
              {/* Credit Limit Increase Requests */}
              <div className="card" style={{ background: '#161920', border: requests.some(r => r.status === 'PENDING') ? '1px solid #F59E0B' : '1px solid #2b303a' }}>
                <div className="cardHeader" style={{ borderBottom: '1px solid #2b303a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f3edd8', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Credit Limit Increase Requests
                    {requests.some(r => r.status === 'PENDING') && (
                      <span style={{ fontSize: 10, background: '#F59E0B', color: '#000', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                        ACTION REQUIRED
                      </span>
                    )}
                  </h2>
                </div>
                <div className="cardBody" style={{ padding: 20 }}>
                  {requests.length === 0 ? (
                    <div className="emptyState" style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No requests from this customer.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {requests.map((req) => (
                        <div key={req.requestId} style={{ background: req.status === 'PENDING' ? 'rgba(245, 158, 11, 0.05)' : 'var(--panel-2)', border: req.status === 'PENDING' ? '1px solid #F59E0B' : '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#f3edd8' }}>Requested: {formatCurrency(req.requestedLimit)}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Current Limit: {formatCurrency(req.currentLimit)}</div>
                            </div>
                            <span className={`pill ${req.status === 'APPROVED' ? 'pillApproved' : req.status === 'REJECTED' ? 'pillRejected' : 'pillPending'}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                              {req.status}
                            </span>
                          </div>
                          {req.reason && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, fontStyle: 'italic' }}>"{req.reason}"</div>}
                          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                            Submitted: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}
                          </div>
                          {req.status === 'PENDING' && (
                            <div style={{ marginTop: 10 }}>
                              {showReview === req.requestId ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <textarea
                                    className="textarea"
                                    style={{ width: '100%', minHeight: 60, background: 'var(--field)', color: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: 8, fontSize: 12, resize: 'vertical' }}
                                    placeholder="Admin review notes..."
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                  />
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn btnGold btnSm" disabled={submitting} onClick={() => handleReview(req.requestId, 'APPROVED')} style={{ flex: 1, padding: '6px 12px', fontSize: 11 }}>
                                      <CheckCircle size={12} /> Approve
                                    </button>
                                    <button className="btn btnDanger btnSm" disabled={submitting} onClick={() => handleReview(req.requestId, 'REJECTED')} style={{ flex: 1, padding: '6px 12px', fontSize: 11 }}>
                                      <XCircle size={12} /> Reject
                                    </button>
                                    <button className="btn btnOutline btnSm" onClick={() => { setShowReview(null); setReviewNotes(''); }} style={{ padding: '6px 12px', fontSize: 11 }}>
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button className="btn btnGold btnSm" onClick={() => setShowReview(req.requestId)} style={{ fontSize: 11, padding: '6px 14px', width: '100%', justifyContent: 'center' }}>
                                  Review &amp; Decide Request
                                </button>
                              )}
                            </div>
                          )}
                          {req.status !== 'PENDING' && req.adminNotes && (
                            <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 4, fontSize: 11, color: 'var(--text-dim)' }}>
                              Admin note: {req.adminNotes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Override Controls */}
              <div className="card" style={{ background: '#161920', border: '1px solid #2b303a' }}>
                <div className="cardHeader" style={{ borderBottom: '1px solid #2b303a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f3edd8' }}>Admin Override Controls</h2>
                  <ShieldCheck size={18} color="var(--gold)" />
                </div>
                <div className="cardBody" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button className="btn btnGold btnFull" onClick={() => setShowOverride(true)} style={{ height: 40 }}>
                    <Percent size={16} /> Override APR &amp; Credit Limit
                  </button>
                  <button className="btn btnOutline btnFull" onClick={() => setShowAdjust(true)} style={{ height: 40 }}>
                    <DollarSign size={16} /> Adjust Outstanding Balance
                  </button>
                  <div style={{ padding: '8px 10px', background: 'rgba(212,169,74,0.03)', borderLeft: '3px solid var(--gold)', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>
                    <AlertCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    All override actions are logged to the audit trail.
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Recent Transactions */}
          <div className="card" style={{ background: '#161920', border: '1px solid #2b303a' }}>
            <div className="cardHeader" style={{ borderBottom: '1px solid #2b303a', padding: '14px 18px' }}>
              <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f3edd8' }}>Recent Transactions</h2>
            </div>
            <div className="cardBody" style={{ padding: 0 }}>
              {recentTxns.length === 0 ? (
                <div className="emptyState" style={{ padding: 24, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No recent transactions.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2b303a' }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Merchant</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Type</th>
                      <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTxns.map((t, i) => {
                      const amt = Number(t.amount) || 0;
                      return (
                        <tr key={t.cxnId || i} style={{ borderBottom: '1px solid #2b303a' }}>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: '#e8e6e0' }}>{t.merchant || '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-dim)' }}>
                            {t.transactionDate ? new Date(t.transactionDate).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className="pill" style={{ background: 'rgba(212,169,74,0.12)', color: 'var(--gold-light)', padding: '2px 7px', fontSize: 10 }}>
                              {(t.typeName || 'card_purchase').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, textAlign: 'right', color: t.typeName === 'refund' ? '#2fbf88' : '#e8e6e0' }}>
                            {t.typeName === 'refund' ? '+' : '-'}${Math.abs(amt).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {showOverride && (
        <div className="overlay" onClick={() => setShowOverride(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modalHead">
              <div className="title">Override APR &amp; Credit Limit</div>
              <button className="closeBtn" onClick={() => setShowOverride(false)}>&times;</button>
            </div>
            <div className="modalBody" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
              <div>
                <label className="fieldLabel" style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-dim)' }}>Annual Percentage Rate (APR %)</label>
                <input type="number" step="0.01" className="input" value={overrideApr} onChange={(e) => setOverrideApr(e.target.value)} placeholder="e.g. 14.99" style={{ width: '100%', background: 'var(--field)', color: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13 }} />
              </div>
              <div>
                <label className="fieldLabel" style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-dim)' }}>Credit Limit ($)</label>
                <input type="number" step="0.01" className="input" value={overrideLimit} onChange={(e) => setOverrideLimit(e.target.value)} placeholder="e.g. 10000" style={{ width: '100%', background: 'var(--field)', color: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13 }} />
              </div>
              <div style={{ padding: '8px 10px', background: 'rgba(212,169,74,0.03)', borderLeft: '3px solid var(--gold)', fontSize: 11.5, color: 'var(--text-dim)' }}>
                Leave a field empty to keep its current value.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btnOutline" onClick={() => setShowOverride(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btnGold" disabled={submitting} onClick={handleOverride} style={{ flex: 1 }}>Apply Override</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {showAdjust && (
        <div className="overlay" onClick={() => setShowAdjust(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modalHead">
              <div className="title">Adjust Outstanding Balance</div>
              <button className="closeBtn" onClick={() => setShowAdjust(false)}>&times;</button>
            </div>
            <div className="modalBody" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
              <div>
                <label className="fieldLabel" style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-dim)' }}>Amount ($)</label>
                <input type="number" step="0.01" className="input" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="e.g. -35.00 for fee waiver" style={{ width: '100%', background: 'var(--field)', color: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13 }} />
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Use negative values for credits/fee waivers, positive for charges.</div>
              </div>
              <div>
                <label className="fieldLabel" style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-dim)' }}>Reason</label>
                <select className="input" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} style={{ width: '100%', background: 'var(--field)', color: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13 }}>
                  <option value="">Select reason...</option>
                  <option value="fee_waiver">Fee Waiver</option>
                  <option value="dispute_credit">Dispute Credit</option>
                  <option value="promotional_credit">Promotional Credit</option>
                  <option value="late_fee">Late Fee Charge</option>
                  <option value="interest_charge">Interest Charge</option>
                  <option value="manual_adjustment">Manual Adjustment</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btnOutline" onClick={() => setShowAdjust(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btnGold" disabled={submitting || !adjustAmount || !adjustReason} onClick={handleAdjust} style={{ flex: 1 }}>Apply Adjustment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
