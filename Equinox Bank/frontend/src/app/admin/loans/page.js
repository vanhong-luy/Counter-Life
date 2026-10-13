'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

function pillClass(status) {
  const s = (status || '').toUpperCase();
  if (s === 'APPROVED' || s === 'ACTIVE') return 'pillApproved';
  if (s === 'REJECTED' || s === 'DECLINED') return 'pillRejected';
  if (s === 'SETTLED') return 'pillApproved';
  if (s === 'PENDING') return 'pillPending';
  return 'pillReviewing';
}

export default function AdminLoansPage() {
  const [loans, setLoans] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('appliedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [offset, setOffset] = useState(0);
  const [availableTypes, setAvailableTypes] = useState(['ALL']);
  const [availableStatuses, setAvailableStatuses] = useState(['ALL', 'pending', 'approved', 'rejected', 'settled']);
  const limit = 50;

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit, offset, sortBy, sortDir };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (typeFilter !== 'ALL') params.loanType = typeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const data = await api.admin.getFilteredLoans(params);
      setLoans(data.loans || []);
      setTotal(data.total || 0);
      if (data.availableTypes) setAvailableTypes(['ALL', ...data.availableTypes]);
      if (data.availableStatuses) setAvailableStatuses(['ALL', ...data.availableStatuses]);
    } catch (err) {
      setError(err.message || 'Failed to load loans.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery, sortBy, sortDir, offset]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleSortAmount = () => {
    if (sortBy === 'principalAmount') {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy('principalAmount');
      setSortDir('desc');
    }
  };

  const sortAmountIndicator = sortBy === 'principalAmount' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <>
      <div className="pageHeader" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <h1 className="pageTitle serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>Loan Portfolio &amp; Approval Desk</h1>
          <div className="pageSubtitle">{total.toLocaleString()} credit applications across system ledger</div>
        </div>
        <div className="headerActions">
          <Link href="/admin/settings" className="btn btnGold" style={{ fontSize: 12, letterSpacing: '0.05em' }}>
            MANAGE BASE INTEREST RATES
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Search by customer name, email, or Loan ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setOffset(0); } }}
        />
        <select className="select" style={{ maxWidth: 180 }} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }}>
          {availableTypes.map((t) => <option key={t} value={t}>{t === 'ALL' ? 'All Loan Products' : t}</option>)}
        </select>
        <select className="select" style={{ maxWidth: 180 }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}>
          {availableStatuses.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Application Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loadingBox">Loading credit applications…</div>
        ) : loans.length === 0 ? (
          <div className="emptyState">No loan applications match your active filters.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Applicant Customer</th>
                <th>Product Type</th>
                <th onClick={handleSortAmount} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Principal Amount{sortAmountIndicator}
                </th>
                <th>Interest Rate</th>
                <th>Term</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.loanId}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>#{loan.loanId}</td>
                  <td className="customerName">{loan.customerName}</td>
                  <td>{loan.loanTypeName}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--gold-light)' }}>${Number(loan.principalAmount).toLocaleString()}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{loan.interestRate}%</td>
                  <td>{loan.loanTermMonths} mo</td>
                  <td><span className={`pill ${pillClass(loan.status)}`}>{loan.status}</span></td>
                  <td>
                    <Link href={`/admin/loans/${loan.loanId}`} className="btn btnOutline btnSm" style={{ borderColor: 'var(--gold)', color: 'var(--gold-light)' }}>
                      Review Application
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="cardFooter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>Showing {Math.min(offset + 1, total)}–{Math.min(offset + limit, total)} of {total.toLocaleString()} portfolio entries</div>
          {total > limit && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn btnOutline btnSm" disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - limit))} style={{ opacity: offset <= 0 ? 0.4 : 1 }}>← Prev</button>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '0 8px' }}>Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}</span>
              <button className="btn btnOutline btnSm" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} style={{ opacity: offset + limit >= total ? 0.4 : 1 }}>Next →</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
