'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Zap, Music, MoreHorizontal, RefreshCw, X, ArrowLeft } from 'lucide-react';
import styles from './analytics.module.css';
import { api } from '@/lib/api';

const CHART_HEIGHT = 180;

const CATEGORY_COLORS = [
  '#0047AB', '#C0392B', '#7B88E8', '#E67E22', '#27AE60',
  '#8E44AD', '#16A085', '#D35400', '#2980B9', '#2C3E50',
  '#F39C12', '#1ABC9C', '#9B59B6', '#34495E', '#E74C3C',
];

export default function AnalyticsPage() {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [spendingSummary, setSpendingSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dateRange, setDateRange] = useState('all');
  const [filterAccountId, setFilterAccountId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const buildDateParams = (range) => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start = null;
    switch (range) {
      case '1w': start = new Date(now - 7 * 86400000).toISOString().split('T')[0]; break;
      case '1m': start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0]; break;
      case '3m': start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0]; break;
      case '6m': start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0]; break;
      case '1y': start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0]; break;
      case 'all': start = '2000-01-01'; break;
      default: return {};
    }
    return { startDate: start, endDate: end };
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const params = buildDateParams(dateRange);
        if (filterAccountId !== 'all') params.accountId = filterAccountId;

        const [summary, categories, accts] = await Promise.all([
          api.getSpendingSummary(Object.keys(params).length > 0 ? params : undefined).catch(() => null),
          api.getSpendingByCategory(Object.keys(params).length > 0 ? params : undefined).catch(() => []),
          api.getAccounts().catch(() => [])
        ]);

        setSpendingSummary(summary);
        setCategoryData(categories || []);
        setAccounts((accts || []).filter(a => !(a.accountTypeName || '').toLowerCase().includes('loan')));
      } catch (err) {
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [dateRange, filterAccountId]);

  const spendingData = useMemo(() => {
    if (!categoryData || categoryData.length === 0) return [];
    const sorted = [...categoryData].sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
    return sorted.map((cat, i) => ({
      label: cat.categoryName || 'Uncategorized',
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      icon: MoreHorizontal,
      value: cat.totalAmount || 0,
    }));
  }, [categoryData]);

  const total = spendingData.reduce((acc, d) => acc + d.value, 0);
  const maxVal = Math.max(...spendingData.map(d => d.value), 1);

  const radius = 60, cx = 80, cy = 80, strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  const donutSegments = spendingData.map(item => {
    const pct = total > 0 ? item.value / total : 0;
    const offset = circumference * (1 - cumulative);
    const dash = circumference * pct;
    cumulative += pct;
    return { ...item, pct, offset, dash };
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
          <p>Failed to load analytics: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <div className={styles.titleBox}>
          <h1 className={styles.heading}>Analytics</h1>
          <p className={styles.subText}>Gain insights into your financial habits and spending patterns.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#434653', marginRight: '4px' }}>Period:</span>
        {[
          { key: 'all', label: 'All Time' },
          { key: '1w', label: '1 Week' },
          { key: '1m', label: '1 Month' },
          { key: '3m', label: '3 Months' },
          { key: '6m', label: '6 Months' },
          { key: '1y', label: '1 Year' },
        ].map(r => (
          <button
            key={r.key}
            onClick={() => setDateRange(r.key)}
            style={{
              padding: '6px 14px', border: '1px solid ' + (dateRange === r.key ? '#00327D' : '#C3C6D5'),
              borderRadius: '20px', background: dateRange === r.key ? '#EAF1FB' : '#FFF',
              color: dateRange === r.key ? '#00327D' : '#434653',
              cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'Inter',
              whiteSpace: 'nowrap'
            }}
          >{r.label}</button>
        ))}

        <span style={{ fontSize: '13px', fontWeight: 600, color: '#434653', marginLeft: '16px', marginRight: '4px' }}>Account:</span>
        <select
          value={filterAccountId}
          onChange={(e) => setFilterAccountId(e.target.value)}
          style={{
            padding: '6px 12px', border: '1px solid #C3C6D5', borderRadius: '8px',
            fontSize: '13px', fontFamily: 'Inter', color: '#191B22', background: '#FFF',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Accounts</option>
          {accounts.map(a => (
            <option key={a.accountId} value={a.accountId}>
              {a.name || a.accountTypeName}
            </option>
          ))}
        </select>
      </div>

      {total === 0 ? (
        <div className={styles.emptyState}>
          <RefreshCw size={32} style={{ opacity: 0.3 }} />
          <p>No spending data for this period.</p>
        </div>
      ) : (
        <div className={styles.topRow}>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Spending Summary</h3>
              <span className={styles.totalAmount}>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className={styles.chartArea}>
              <div className={styles.yAxis}>
                {[100, 75, 50, 25, 0].map((pct) => (
                  <div key={pct} className={styles.yTick}>
                    <span className={styles.yTickLabel}>${Math.round(maxVal * pct / 100).toLocaleString()}</span>
                    <div className={styles.yGridLine} />
                  </div>
                ))}
              </div>

              <div className={styles.barGroup}>
                {spendingData.map((item, index) => {
                  const barH = (item.value / maxVal) * CHART_HEIGHT;
                  const isHovered = hoveredBar === index;
                  return (
                    <div
                      key={index}
                      className={styles.barWrapper}
                      onMouseEnter={() => setHoveredBar(index)}
                      onMouseLeave={() => setHoveredBar(null)}
                      onClick={() => {
                        const match = categoryData.find(c =>
                          (c.categoryName || '').toLowerCase() === item.label.toLowerCase()
                        );
                        if (match) setSelectedCategory(match);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {isHovered && (
                        <div className={styles.tooltip}>
                          <span className={styles.tooltipLabel}>{item.label}</span>
                          <span className={styles.tooltipValue}>${item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          <span className={styles.tooltipPercent}>{total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}% of total</span>
                        </div>
                      )}
                      <div className={styles.barTrack} style={{ height: `${CHART_HEIGHT}px` }}>
                        <div
                          className={styles.bar}
                          style={{
                            height: `${barH}px`,
                            backgroundColor: isHovered ? '#0034A0' : item.color,
                            opacity: hoveredBar !== null && !isHovered ? 0.5 : 1,
                          }}
                        />
                      </div>
                      <span className={styles.barLabel}>{item.label === 'Entertainment' ? 'Ent.' : item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Breakdown</h3>
            </div>

            <div className={styles.donutContainer}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#F3F3FC" strokeWidth={strokeWidth} />
                {donutSegments.map((seg, i) => (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                    strokeDashoffset={seg.offset}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '80px 80px' }}
                  />
                ))}
                <text x={cx} y={cy - 6} textAnchor="middle" fill="#191B22" fontSize="11" fontWeight="600" fontFamily="Inter">Total</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fill="#00327D" fontSize="14" fontWeight="700" fontFamily="Inter">
                  ${(total / 1000).toFixed(1)}k
                </text>
              </svg>
            </div>

            <div className={styles.categoryList}>
              {donutSegments.map((item, i) => {
                const pct = total > 0 ? (item.value / total * 100) : 0;
                return (
                  <div key={i} className={styles.categoryItem} style={{ cursor: item.value > 0 ? 'pointer' : 'default' }}
                    onClick={() => {
                      const match = categoryData.find(c =>
                        (c.categoryName || '').toLowerCase() === item.label.toLowerCase()
                      );
                      if (match) setSelectedCategory(match);
                    }}>
                    <div className={styles.categoryLeft}>
                      <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
                      <span className={styles.categoryName}>{item.label}{item.value > 0 ? ' ›' : ''}</span>
                    </div>
                    <div className={styles.categoryRight}>
                      <div className={styles.progressTrack}>
                        <div className={styles.progressBar} style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                      <span className={styles.categoryPct}>{Math.round(pct)}%</span>
                      <span className={styles.categoryAmount}>${item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedCategory && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCategory(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ArrowLeft size={20} color="#00327D" style={{ cursor: 'pointer' }} onClick={() => setSelectedCategory(null)} />
                <h3 className={styles.modalTitle} style={{ margin: 0 }}>{selectedCategory.categoryName}</h3>
              </div>
              <X size={24} color="#737784" style={{ cursor: 'pointer' }} onClick={() => setSelectedCategory(null)} />
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Spent</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#191B22' }}>${(selectedCategory.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Transactions</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#191B22' }}>{selectedCategory.transactionCount}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#434653', marginBottom: 12 }}>Top Transactions</div>
              {selectedCategory.topTransactions?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedCategory.topTransactions.map((tx, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', background: '#F9FAFB', borderRadius: 6, border: '1px solid #E5E7EB'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#191B22' }}>{tx.description || tx.referenceNumber || 'Transaction'}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>{tx.date ? new Date(tx.date).toLocaleDateString() : ''}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#C0392B' }}>${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 14, color: '#6B7280' }}>No transaction details available for this period.</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
