'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, Clock, Building2, XCircle } from 'lucide-react';
import styles from './refund.module.css';
import { api } from '@/lib/api';

export default function RefundStatus() {
  const params = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundResult, setRefundResult] = useState(null);
  const [existingRefund, setExistingRefund] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('Duplicate Charge Detected');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      setLoading(true);
      try {
        const data = await api.getTransaction(params.id);
        setTransaction(data);
        setRefundAmount(data.amount ? Math.abs(Number(data.amount)).toString() : '0');
        const refund = await api.getTransactionRefund(params.id);
        if (refund && refund.refundId) {
          setExistingRefund(refund);
          setRefundResult(refund);
        }
      } catch (err) {
        if (err.message !== 'No Content') setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  const handleRefund = async (e) => {
    if (e) e.preventDefault();
    setRefunding(true);
    setError('');
    try {
      const result = await api.refund(params.id, {
        refundAmount: parseFloat(refundAmount),
        reason: reason || 'Duplicate Charge Detected',
        comment: comment || ''
      });
      setRefundResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefunding(false);
    }
  };

  if (loading) return <div style={{padding: '48px', textAlign: 'center'}}>Loading refund details...</div>;
  if (error && !transaction) return <div style={{padding: '48px', color: '#DC2626'}}>Error: {error}</div>;
  if (!transaction) return <div style={{padding: '48px'}}>Transaction not found.</div>;

  const refNum = transaction.referenceNumber || transaction.reference || `TXN-${params.id}`;
  const isRejected = refundResult?.status === 'rejected';
  const isCompleted = refundResult?.status === 'completed';
  const isPending = refundResult?.status === 'pending' || (refundResult && !isRejected && !isCompleted);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Refund Status</h1>
            <span className={styles.subtitle}>
              Transaction Ref: <code style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{refNum}</code>
            </span>
          </div>
          <div className={styles.badge} style={{
            background: isRejected ? '#FEE2E2' : isCompleted ? '#DCFCE7' : '#FEF3C7',
            color: isRejected ? '#DC2626' : isCompleted ? '#16A34A' : '#D97706'
          }}>
            {isRejected ? <XCircle size={14} /> : <Clock size={14} />}
            {isRejected ? 'REJECTED' : isCompleted ? 'COMPLETED' : 'PROCESSING'}
          </div>
        </div>

        {/* Refund Amount Banner */}
        <div className={styles.amountCard}>
          <span className={styles.amountLabel}>REFUND AMOUNT</span>
          <h2 className={styles.amountValue}>+${Number(refundResult?.refundAmount || refundAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
        </div>

        {/* Stepper Timeline */}
        <div style={{ padding: '0 32px 32px' }}>
          <div className={styles.stepperContainer}>
            <div className={styles.stepItem}>
              <div className={`${styles.stepCircle} ${refundResult ? styles.stepCompleted : styles.stepInactive}`}>
                <Check size={16} />
              </div>
              <span className={refundResult ? styles.stepLabelActive : styles.stepLabelInactive}>Requested</span>
            </div>

            <div className={`${styles.stepLine} ${isCompleted ? styles.stepLineActive : refundResult ? styles.stepLineHalf : ''}`} />

            <div className={styles.stepItem}>
              <div className={`${styles.stepCircle} ${isCompleted ? styles.stepCompleted : refundResult && !isRejected ? styles.stepActive : isRejected ? styles.stepInactive : styles.stepInactive}`}>
                {isCompleted ? <Check size={16} /> : isRejected ? <XCircle size={16} /> : <div className={styles.innerDot} />}
              </div>
              <span className={refundResult && !isRejected ? styles.stepLabelActive : styles.stepLabelInactive}>
                {isRejected ? 'Rejected' : 'Under Review'}
              </span>
            </div>

            <div className={`${styles.stepLine} ${isCompleted ? styles.stepLineActive : ''}`} />

            <div className={styles.stepItem}>
              <div className={`${styles.stepCircle} ${isCompleted ? styles.stepCompleted : styles.stepInactive}`}>
                <Building2 size={16} />
              </div>
              <span className={isCompleted ? styles.stepLabelActive : styles.stepLabelInactive}>Credited</span>
            </div>
          </div>

          {/* Rejection Banner */}
          {isRejected && refundResult?.remarks && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 16, marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <XCircle size={18} color="#DC2626" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#991B1B' }}>Refund Request Rejected</div>
                  <div style={{ fontSize: 13, color: '#7F1D1D', marginTop: 4 }}>{refundResult.remarks}</div>
                </div>
              </div>
            </div>
          )}

          {!refundResult ? (
            <form onSubmit={handleRefund} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '12px', borderRadius: '6px', fontSize: 13 }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Reason for Refund</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 14 }}
                >
                  <option value="Duplicate Charge Detected">Duplicate Charge Detected</option>
                  <option value="Incorrect Amount Charged">Incorrect Amount Charged</option>
                  <option value="Merchant Order Cancelled">Merchant Order Cancelled</option>
                  <option value="Unauthorized Transaction">Unauthorized Transaction</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Additional Comment (Optional)</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Provide any additional details about why you're requesting this refund..."
                  rows={3}
                  style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <button
                type="submit"
                disabled={refunding}
                style={{
                  padding: '12px', background: '#00327D', color: '#FFF', border: 'none', borderRadius: 6,
                  fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 8
                }}
              >
                {refunding ? 'Processing Refund...' : 'Confirm Refund Request'}
              </button>
            </form>
          ) : (
            <div className={styles.detailsBox}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Reason for Refund</span>
                <span className={styles.detailValue}>{refundResult.reason || reason}</span>
              </div>
              {refundResult.comment && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Your Comment</span>
                  <span className={styles.detailValue}>{refundResult.comment}</span>
                </div>
              )}
              {refundResult.remarks && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Admin Response</span>
                  <span className={styles.detailValue} style={{ color: isRejected ? '#DC2626' : '#2563EB' }}>{refundResult.remarks}</span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{isRejected ? 'Reviewed Date' : 'Processed Date'}</span>
                <span className={styles.detailValue}>
                  {refundResult.reviewedAt
                    ? new Date(refundResult.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {!isRejected && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Expected Timeline</span>
                  <span className={styles.detailValue} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2563EB' }}>
                    <Clock size={14} /> {isCompleted ? 'Credited' : '3-5 Business Days'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bottom Action Buttons */}
          <div style={{ display: 'flex', gap: 16, marginTop: 28, justifyContent: 'center' }}>
            <Link
              href={`/dashboard/transactions/${params.id}`}
              className={styles.secondaryBtn}
              style={{ textDecoration: 'none' }}
            >
              <ArrowLeft size={16} />
              Back to Transaction
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
