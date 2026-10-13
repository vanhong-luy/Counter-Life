'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '@/lib/api';

function pillClass(status) {
  const s = (status || '').toUpperCase();
  if (s === 'COMPLETED' || s === 'SUCCESS') return 'pillApproved';
  if (s === 'FAILED' || s === 'DECLINED') return 'pillRejected';
  if (s === 'PENDING') return 'pillPending';
  return 'pillReviewing';
}

export default function AdminTransactionsPage() {
  const [txns, setTxns] = useState([]);
  const [total, setTotal] = useState(0);
  const [availableTypes, setAvailableTypes] = useState(['ALL']);
  const [availableStatuses, setAvailableStatuses] = useState(['ALL']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('transactionDate');
  const [sortDir, setSortDir] = useState('desc');
  const [offset, setOffset] = useState(0);
  const limit = 100;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit, offset };
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (query.trim()) params.search = query.trim();
      params.sortBy = sortBy;
      params.sortDir = sortDir;

      const data = await api.admin.getAllTransactions(params);
      setTxns(data.transactions || []);
      setTotal(data.total || 0);
      if (data.availableTypes) setAvailableTypes(['ALL', ...data.availableTypes]);
      if (data.availableStatuses) setAvailableStatuses(['ALL', ...data.availableStatuses]);
    } catch (err) {
      setError(err.message || 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, startDate, endDate, sortBy, sortDir, offset, query]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSortAmount = () => {
    if (sortBy === 'amount') {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy('amount');
      setSortDir('asc');
    }
    setOffset(0);
  };

  const sortAmountIndicator = sortBy === 'amount' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const goToPage = (page) => {
    setOffset((page - 1) * limit);
  };

  return (
    <>
      <div className="pageHeader" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <h1 className="pageTitle serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>Global Transaction Audit Ledger</h1>
          <div className="pageSubtitle">{total.toLocaleString()} settled and pending financial movements</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Search reference, account, or notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setOffset(0); fetchTransactions(); } }}
        />
        <select className="select" style={{ maxWidth: 150 }} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }}>
          {availableTypes.map((t) => <option key={t} value={t}>{t === 'ALL' ? 'All TX Types' : t}</option>)}
        </select>
        <select className="select" style={{ maxWidth: 150 }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}>
          {availableStatuses.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
          From:
          <input className="input" type="date" style={{ maxWidth: 140 }} value={startDate} onChange={(e) => { setStartDate(e.target.value); setOffset(0); }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
          To:
          <input className="input" type="date" style={{ maxWidth: 140 }} value={endDate} onChange={(e) => { setEndDate(e.target.value); setOffset(0); }} />
        </label>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loadingBox">Loading audit ledger…</div>
        ) : txns.length === 0 ? (
          <div className="emptyState">No transactions match your search filters.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Reference Ref</th>
                <th>Transaction Type</th>
                <th>Source &amp; Target Accounts</th>
                <th onClick={handleSortAmount} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Amount{sortAmountIndicator}
                </th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.transactionId}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--gold-light)' }}>
                    {t.referenceNumber || `#${t.transactionId}`}
                  </td>
                  <td>
                    <div className="customerName">{t.typeName}</div>
                    <div className="customerSub">{t.categoryName || 'General'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {t.sourceAccountNumber ? (
                        <div>
                          <div className="customerName">{t.sourceAccountNumber}</div>
                          {t.sourceAccountName && <div className="customerSub">{t.sourceAccountName}</div>}
                        </div>
                      ) : <span className="customerName" style={{ color: 'var(--text-faint)' }}>EXTERNAL</span>}
                      <span style={{ color: 'var(--gold-light)', fontWeight: 700 }}>→</span>
                      {t.targetAccountNumber ? (
                        <div>
                          <div className="customerName">{t.targetAccountNumber}</div>
                          {t.targetAccountName && <div className="customerSub">{t.targetAccountName}</div>}
                        </div>
                      ) : <span className="customerName" style={{ color: 'var(--text-faint)' }}>EXTERNAL</span>}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--gold-light)' }}>
                      {t.currency || 'USD'} {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{t.transactionDate ? new Date(t.transactionDate).toLocaleString() : '—'}</td>
                  <td><span className={`pill ${pillClass(t.status)}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="cardFooter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>Showing {Math.min(offset + 1, total)}–{Math.min(offset + limit, total)} of {total.toLocaleString()} ledger entries</div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn btnOutline btnSm" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)} style={{ opacity: currentPage <= 1 ? 0.4 : 1 }}>
                ← Prev
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '0 8px' }}>Page {currentPage} of {totalPages}</span>
              <button className="btn btnOutline btnSm" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)} style={{ opacity: currentPage >= totalPages ? 0.4 : 1 }}>
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
