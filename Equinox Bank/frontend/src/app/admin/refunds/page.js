'use client';

import React, { useEffect, useState } from 'react';
import { getAdminToken } from '@/lib/api';

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [reviewModal, setReviewModal] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [actionStatus, setActionStatus] = useState('completed');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const loadRefunds = async (status = filter, p = page) => {
    setLoading(true);
    setError('');
    try {
      const token = getAdminToken();
      const endpoint = status === 'all' ? `/auth/admin/refunds?page=${p}&size=20` : `/auth/admin/refunds/${status}?page=${p}&size=20`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRefunds(data.items || []);
        setTotalPages(data.totalPages || 0);
        setTotalItems(data.totalItems || 0);
      } else {
        setRefunds([]);
        if (res.status !== 200) setError('Failed to load refunds');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, [filter, page]);

  const handleReviewRefund = async (refundId, status) => {
    setError('');
    setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch(`/auth/admin/refunds/${refundId}/review`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks: adminRemarks })
      });
      if (!res.ok) throw new Error('Failed to submit refund review');
      setSuccessMsg(`Refund #${refundId} successfully ${status === 'completed' ? 'approved' : 'rejected'}`);
      setReviewModal(null);
      setAdminRemarks('');
      await loadRefunds();
    } catch (err) {
      setError(err.message);
    }
  };

  const statusPill = (status) => {
    const map = { pending: 'pillPending', completed: 'pillActive', rejected: 'pillInactive' };
    return <span className={`pill ${map[status] || 'pillPending'}`}>{status.toUpperCase()}</span>;
  };

  return (
    <>
      <div className="pageHeader" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <h1 className="pageTitle serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>Customer Refund Review Queue</h1>
          <div className="pageSubtitle">Review and approve or reject customer-initiated dispute & refund requests</div>
        </div>
        <div className="headerActions" style={{ gap: 10 }}>
          <select className="input" style={{ width: 140, padding: '6px 10px' }} value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}>
            <option value="all">All Refunds</option>
            <option value="pending">Pending Only</option>
          </select>
          <button className="btn btnOutline" style={{ borderColor: 'var(--gold)', color: 'var(--gold-light)' }} onClick={() => loadRefunds()}>
            REFRESH
          </button>
        </div>
      </div>

      {error && <div className="errorBanner">{error}</div>}
      {successMsg && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#16A34A', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>{successMsg}</div>}

      <div className="card">
          <div className="cardHeader">
            <h2 className="serifTitle" style={{ fontSize: 18 }}>{filter === 'pending' ? 'Pending' : 'All'} Refund Claims</h2>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{totalItems} claim(s)</span>
          </div>

        <div className="cardBody" style={{ padding: 0 }}>
          {loading ? (
            <div className="loadingBox">Loading refund claims...</div>
          ) : refunds.length === 0 ? (
            <div className="emptyState">No refund claims found.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Customer</th>
                  <th>Trans Ref</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>User Comment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map(r => (
                  <tr key={r.refundId}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--gold-light)', fontWeight: 600 }}>#{r.refundId}</td>
                    <td>
                      <div className="customerName">{r.customerName || '-'}</div>
                      <div className="customerSub">{r.email || '-'}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{r.originalTransactionId}</td>
                    <td style={{ fontWeight: 700, color: 'var(--gold-light)' }}>
                      ${Number(r.refundAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontSize: 13, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reason}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.comment || '-'}</td>
                    <td>{statusPill(r.status)}</td>
                    <td>
                      {r.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btnGold btnSm" onClick={() => {
                            setReviewModal(r);
                            setActionStatus('completed');
                            setAdminRemarks('');
                          }}>Approve</button>
                          <button className="btn btnOutline btnSm" style={{ borderColor: '#dc3545', color: '#dc3545' }} onClick={() => {
                            setReviewModal(r);
                            setActionStatus('rejected');
                            setAdminRemarks('');
                          }}>Reject</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                          {r.remarks ? `Remarks: ${r.remarks}` : '-'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '16px 0' }}>
              <button className="btn btnOutline btnSm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} style={{ opacity: page === 0 ? 0.4 : 1 }}>
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const startPage = Math.max(0, Math.min(page - 4, totalPages - 10));
                const pNum = startPage + i;
                if (pNum >= totalPages) return null;
                return (
                  <button key={pNum} className={`btn ${pNum === page ? 'btnGold' : 'btnOutline'} btnSm`} onClick={() => setPage(pNum)} style={{ minWidth: 36 }}>
                    {pNum + 1}
                  </button>
                );
              })}
              <button className="btn btnOutline btnSm" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} style={{ opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {reviewModal && (
        <div className="overlay" onClick={() => setReviewModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modalHead">
              <span className="title serifTitle">
                {actionStatus === 'completed' ? 'Approve' : 'Reject'} Refund #{reviewModal.refundId}
              </span>
              <button className="closeBtn" onClick={() => setReviewModal(null)}>×</button>
            </div>
            <div className="modalBody">
              <div style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                <div><strong>Amount:</strong> ${Number(reviewModal.refundAmount).toFixed(2)}</div>
                <div><strong>Reason:</strong> {reviewModal.reason}</div>
                {reviewModal.comment && <div><strong>User Comment:</strong> {reviewModal.comment}</div>}
              </div>
              <div className="field">
                <label className="fieldLabel">Admin Remarks</label>
                <textarea
                  className="input"
                  style={{ width: '100%', minHeight: 80, padding: 8 }}
                  placeholder={actionStatus === 'completed' ? 'e.g., Approved, funds will be credited within 3-5 business days' : 'e.g., Merchant verified valid non-refundable purchase'}
                  value={adminRemarks}
                  onChange={e => setAdminRemarks(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button className="btn btnOutline" onClick={() => setReviewModal(null)}>Cancel</button>
                <button
                  className="btn btnGold"
                  style={actionStatus === 'rejected' ? { background: '#dc3545', borderColor: '#dc3545' } : {}}
                  onClick={() => handleReviewRefund(reviewModal.refundId, actionStatus)}
                >
                  {actionStatus === 'completed' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
