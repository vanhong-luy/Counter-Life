'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Download, Share2, Copy, Check, Info, Store } from 'lucide-react';
import styles from './details.module.css';
import { api } from '@/lib/api';
import { generateStatement } from '@/utils/generateStatement';

export default function TransactionDetails() {
  const params = useParams();
  const [transaction, setTransaction] = useState(null);
  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      setLoading(true);
      try {
        const data = await api.getTransaction(params.id);
        setTransaction(data);
        const refundData = await api.getTransactionRefund(params.id);
        if (refundData && refundData.refundId) {
          setRefund(refundData);
        }
      } catch (err) {
        if (err.message !== 'No Content') setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) return <div style={{padding: '48px', textAlign: 'center'}}>Loading transaction details...</div>;
  if (error) return <div style={{padding: '48px', color: '#DC2626'}}>Error: {error}</div>;
  if (!transaction) return <div style={{padding: '48px'}}>Transaction not found.</div>;

  const refNum = transaction.referenceNumber || transaction.reference || `TRX-${transaction.transactionId || params.id}`;
  const txnType = (transaction.typeName || transaction.type || '').toLowerCase();
  const isPositive = ['deposit', 'credit', 'refund', 'savings_goal_withdrawal'].includes(txnType);
  const formattedAmount = (isPositive ? '+' : '-') + '$' + Math.abs(Number(transaction.amount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Oct 24, 2023, 14:30 EST';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' EST';
    } catch { return dateStr; }
  };

  const copyRef = () => {
    navigator.clipboard.writeText(refNum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReceipt = () => {
    const txData = [{
      date: formatDate(transaction.transactionDate || transaction.createdAt),
      merchant: transaction.description || 'Transaction',
      ref: refNum,
      status: transaction.status || 'Completed',
      amount: formattedAmount
    }];
    generateStatement({ name: `Receipt ${refNum}`, id: transaction.transactionId }, txData, 'Official Transaction Receipt');
  };

  const isRefundable = !isPositive && (transaction.status || '').toLowerCase() === 'completed';

  return (
    <div className={styles.pageContainer}>
      <Link href="/dashboard/transactions" className={styles.backLink}>
        <svg className={styles.backIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Transactions
      </Link>

      <div className={styles.iconContainer}>
        <Store size={28} />
      </div>

      <h1 className={styles.amount}>{formattedAmount}</h1>

      <div className={styles.badge}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        {transaction.status ? transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) : 'Completed'}
      </div>

      <div className={styles.detailsCard}>
        <div className={styles.detailsHeader}>
          Transaction Details
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Reference Number</span>
          <div className={styles.detailValue} style={{ cursor: 'pointer' }} onClick={copyRef}>
            <span>{refNum}</span>
            {copied ? <Check size={16} color="#16A34A" /> : <Copy size={16} color="#737784" />}
          </div>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Date & Time</span>
          <span className={styles.detailValue}>{formatDate(transaction.transactionDate || transaction.createdAt)}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>From Account</span>
          <div className={styles.accountValue}>
            <div className={styles.dot}></div>
            <span style={{ fontWeight: 600 }}>Equinox Account (...{String(transaction.sourceAccountId || '4589').slice(-4)})</span>
          </div>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Merchant / Recipient</span>
          <span className={styles.detailValue} style={{ fontWeight: 600 }}>{transaction.description?.split('-')[0] || 'Merchant Store'}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Description</span>
          <span className={styles.detailValue}>{transaction.description || 'Retail Purchase'}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Transaction Fee</span>
          <span className={styles.detailValue}>$0.00</span>
        </div>

        <div className={styles.actionsCard}>
          <div className={styles.btnGroup}>
            <button className={styles.primaryBtn} onClick={handleDownloadReceipt}>
              <Download size={16} />
              Download Receipt
            </button>
            <button className={styles.secondaryBtn} onClick={handleDownloadReceipt}>
              <Share2 size={16} />
              Share
            </button>
            {refund ? (
              <Link href={`/dashboard/transactions/refund/${params.id}`} className={styles.secondaryBtn} style={{ textDecoration: 'none' }}>
                {refund.status === 'completed' ? 'View Refund' : refund.status === 'rejected' ? 'Refund Rejected' : 'View Refund Request'}
              </Link>
            ) : isRefundable && (
              <Link href={`/dashboard/transactions/refund/${params.id}`} className={styles.secondaryBtn} style={{ textDecoration: 'none' }}>
                Request Refund
              </Link>
            )}
          </div>
          <div className={styles.infoText}>
            <Info size={16} />
            {refund ? (
              <span>Refund {refund.status === 'completed' ? 'completed' : refund.status === 'rejected' ? 'was rejected' : 'is pending review'}</span>
            ) : (
              <span>Refund period active (30 days)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
