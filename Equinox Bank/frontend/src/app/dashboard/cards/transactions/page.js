'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, ArrowLeft } from 'lucide-react';
import styles from './transactions.module.css';
import { api } from '@/lib/api';

const DATE_RANGES = {
  'All Time': null,
  'Last 7 Days': 7,
  'Last 30 Days': 30,
  'Last 90 Days': 90,
  'This Year': 'year',
};

function CardTransactionsContent() {
  const searchParams = useSearchParams();
  const initialCardId = searchParams.get('id') || '';

  const [selectedCard, setSelectedCard] = useState(initialCardId);
  const [activeTab, setActiveTab] = useState('All');
  const [dateRange, setDateRange] = useState('All Time');
  const [cards, setCards] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cardPage, setCardPage] = useState(0);
  const [cardTotalPages, setCardTotalPages] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const cardsData = await api.getCards();
        const list = Array.isArray(cardsData) ? cardsData : (cardsData.cards || []);
        setCards(list);
        if (!initialCardId && list.length > 0) {
          setSelectedCard(list[0].id || list[0].cardId);
        }
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  const loadCardTxns = async (p) => {
    if (!selectedCard) return;
    setLoading(true);
    setError('');
    try {
      const txData = await api.getCardTransactions(selectedCard, p);
      if (txData && txData.items) {
        setAllTransactions(txData.items);
        setCardTotalPages(txData.totalPages || 0);
      } else {
        const list = Array.isArray(txData) ? txData : [];
        setAllTransactions(list);
        setCardTotalPages(0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load card transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCardPage(0);
  }, [selectedCard]);

  useEffect(() => {
    loadCardTxns(cardPage);
  }, [selectedCard, cardPage]);

  const dateFilteredTransactions = allTransactions.filter(t => {
    const spec = DATE_RANGES[dateRange];
    if (!spec || !t.transactionDate) return true;
    const txDate = new Date(t.transactionDate);
    if (spec === 'year') {
      return txDate.getFullYear() === new Date().getFullYear();
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - spec);
    return txDate >= cutoff;
  });

  const filteredTransactions = dateFilteredTransactions.filter(t => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Purchase') return t.typeName === 'debit_purchase' || t.typeName === 'credit_purchase' || !t.typeName;
    if (activeTab === 'Refund') return t.typeName === 'refund';
    if (activeTab === 'Fee') return (t.description || '').toLowerCase().includes('fee');
    return true;
  });

  const totalSpent = dateFilteredTransactions
    .reduce((sum, t) => sum + (Math.abs(Number(t.amount)) || 0), 0);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <Link href={selectedCard ? `/dashboard/cards/details?id=${initialCardId}` : '/dashboard/cards'} className={styles.backLink}>
          <ArrowLeft size={16} />
          Back to Cards
        </Link>
        <h1 className={styles.heading}>Card Transactions</h1>
        <p className={styles.subText}>Manage and review your recent card activity.</p>
      </div>

      {error && (
        <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className={styles.topSection}>
        <div className={styles.filtersPanel}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Select Card</span>
              <select
                className={styles.selectInput}
                value={selectedCard}
                onChange={(e) => setSelectedCard(e.target.value)}
              >
                {cards.map(c => {
                  const id = c.id || c.cardId;
                  const label = `${c.cardTypeNetwork || ''} ${c.cardTypeName || ''}`.trim();
                  const last4 = (c.cardNumber || '').slice(-4) || '0000';
                  return (
                    <option key={id} value={id}>
                      {label} **** {last4}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Date Range</span>
              <div className={styles.inputWithIcon}>
                <div className={styles.iconInside}>
                  <Calendar size={16} />
                </div>
                <select
                  className={styles.selectInput}
                  style={{ paddingLeft: 36 }}
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  {Object.keys(DATE_RANGES).map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.bottomFilterRow}>
            <div className={styles.tabs}>
              {['All', 'Purchase', 'Refund', 'Fee'].map(tab => (
                <button
                  key={tab}
                  className={`${styles.tabBtn} ${activeTab === tab ? styles.active : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.summaryPanel}>
          <div>
            <h3 className={styles.summaryTitle}>Summary</h3>
            <p className={styles.summaryLabel}>Total Spent</p>
            <h2 className={styles.summaryAmount}>${totalSpent.toLocaleString('en-US', {minimumFractionDigits: 2})}</h2>
          </div>
        </div>
      </div>

      <div className={styles.tablePanel}>
        {loading ? (
          <div style={{textAlign: 'center', padding: '48px'}}>Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{textAlign: 'center', padding: '48px', color: '#6B7280'}}>
            No transactions found for this card.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Description</th>
                <th>Date & Time</th>
                <th className={styles.alignRight}>Amount</th>
                <th className={styles.alignCenter}>Status</th>
                <th className={styles.alignRight}>Type</th>
                <th className={styles.alignCenter}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((trx, i) => {
                const amount = trx.amount != null ? Number(trx.amount) : 0;
                const isCredit = trx.typeName === 'refund' || trx.typeName === 'deposit' || amount > 0;
                const dateStr = trx.transactionDate ? new Date(trx.transactionDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : '';
                const timeStr = trx.transactionDate ? new Date(trx.transactionDate).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'}) : '';
                const merchantLabel = trx.merchant ? trx.merchant : 'Card Purchase';
                const isPurchase = trx.typeName === 'debit_purchase' || trx.typeName === 'credit_purchase';
                return (
                  <tr key={trx.cxnId || trx.id || i}>
                    <td>
                      <div className={styles.merchantCell}>
                        <div>
                          <p className={styles.merchantName}>{merchantLabel}</p>
                          <p className={styles.merchantCategory} style={{ fontSize: 11, color: '#9CA3AF' }}>{trx.description || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.dateCell}>
                        <span className={styles.dateText}>{dateStr}</span>
                        <span className={styles.timeText}>{timeStr}</span>
                      </div>
                    </td>
                    <td className={styles.amountCell}>
                      {(isCredit ? '+' : '-')}${Math.abs(amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
                    </td>
                    <td>
                      <div className={styles.statusCell}>
                        <div className={`${styles.statusBadge} ${(trx.status || '').toLowerCase() === 'pending' ? styles.pending : ''}`}>
                          <div className={styles.statusDot}></div>
                          {trx.status || 'completed'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.typeCell}>
                        <span style={{ fontSize: 11, textTransform: 'capitalize' }}>{trx.typeName ? trx.typeName.replace('_', ' ') : 'Card Purchase'}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isPurchase && (
                        <Link
                          href={trx.transactionId ? `/dashboard/transactions/${trx.transactionId}` : `/dashboard/transactions?search=${encodeURIComponent(trx.merchant || trx.description || '')}`}
                          style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}
                        >
                          Refund
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {cardTotalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '16px 0' }}>
            <button className={styles.paginationBtn} disabled={cardPage === 0} onClick={() => setCardPage(p => Math.max(0, p - 1))} style={{ opacity: cardPage === 0 ? 0.4 : 1 }}>
              Previous
            </button>
            {Array.from({ length: Math.min(cardTotalPages, 10) }, (_, i) => {
              const startPage = Math.max(0, Math.min(cardPage - 4, cardTotalPages - 10));
              const pNum = startPage + i;
              if (pNum >= cardTotalPages) return null;
              return (
                <button key={pNum} className={`${styles.paginationBtn} ${pNum === cardPage ? styles.paginationActive : ''}`} onClick={() => setCardPage(pNum)}>
                  {pNum + 1}
                </button>
              );
            })}
            <button className={styles.paginationBtn} disabled={cardPage >= cardTotalPages - 1} onClick={() => setCardPage(p => Math.min(cardTotalPages - 1, p + 1))} style={{ opacity: cardPage >= cardTotalPages - 1 ? 0.4 : 1 }}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CardTransactionsPage() {
  return (
    <Suspense fallback={<div style={{padding: '48px', textAlign: 'center'}}>Loading...</div>}>
      <CardTransactionsContent />
    </Suspense>
  );
}
