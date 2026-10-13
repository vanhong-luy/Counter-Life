'use client';

import { useEffect, useState } from 'react';
import { api, getAdminToken } from '@/lib/api';
import AuditLogSection from '../components/AuditLogSection';
import ProfileAvatar from '../components/ProfileAvatar';
const PROFILE_PHOTO_BASE = '/auth/profile-photo';

function pillClass(status) {
  const s = (status || '').toUpperCase();
  if (s === 'PENDING') return 'pillPending';
  if (s === 'APPROVED' || s === 'VERIFIED') return 'pillApproved';
  if (s === 'REJECTED' || s === 'DECLINED') return 'pillRejected';
  return 'pillPending';
}

function labelForStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminKycPage() {
  const [docs, setDocs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  const [fileType, setFileType] = useState('');
  const [backFileUrl, setBackFileUrl] = useState(null);
  const [backFileType, setBackFileType] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit, offset };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const data = await api.admin.getFilteredKycQueue(params);
      setDocs(data.documents || []);
      setTotal(data.total || 0);
      setAvailableStatuses((data.availableStatuses || []).length > 0
        ? data.availableStatuses
        : ['pending', 'approved', 'rejected']);
    } catch (err) {
      setError(err.message || 'Failed to load KYC queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, offset]);

  const toggleDateSort = () => {};

  const openReview = async (doc) => {
    setActive(doc);
    setRemarks('');
    setError('');
    setFileUrl(null);
    setFileType('');
    setBackFileUrl(null);
    setBackFileType('');
    setProfilePhotoUrl(null);
    try {
      const token = getAdminToken();
      const res = await fetch(`/auth/kyc/documents/${doc.documentId}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load document');
      const blob = await res.blob();
      setFileType(blob.type);
      setFileUrl(URL.createObjectURL(blob));

      if (doc.backUrl) {
        const backRes = await fetch(`/auth/kyc/documents/${doc.documentId}/file?side=back`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (backRes.ok) {
          const backBlob = await backRes.blob();
          setBackFileType(backBlob.type);
          setBackFileUrl(URL.createObjectURL(backBlob));
        }
      }

      if (doc.profilePhotoUrl) {
        const photoRes = await fetch(`${PROFILE_PHOTO_BASE}/${doc.customerId}/file`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (photoRes.ok) {
          const photoBlob = await photoRes.blob();
          setProfilePhotoUrl(URL.createObjectURL(photoBlob));
        }
      }
    } catch (err) {
      setError('Could not load document preview.');
    }
  };

  const closeModal = () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    if (backFileUrl) URL.revokeObjectURL(backFileUrl);
    setFileUrl(null);
    setBackFileUrl(null);
    setActive(null);
  };

  const decide = async (status) => {
    if (!active) return;
    setSubmitting(true);
    setError('');
    try {
      await api.admin.reviewKyc(active.documentId, { status, remarks });
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      if (backFileUrl) URL.revokeObjectURL(backFileUrl);
      setFileUrl(null);
      setBackFileUrl(null);
      setActive(null);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to submit decision.');
    } finally {
      setSubmitting(false);
    }
  };

  // A doc that has already been approved or rejected is read-only in the
  // review modal — hide the decision form; show only the audit trail.
  // When the customer resubmits (status returns to pending) the form reappears.
  const isReviewed = ['approved', 'rejected', 'verified'].includes(
    (active?.reviewStatus || '').toLowerCase()
  );

  return (
    <>
      <div className="pageHeader" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <h1 className="pageTitle serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>KYC &amp; Identity Verification</h1>
          <div className="pageSubtitle">Review submitted legal documentation, selfies, and approve or reject identity verification.</div>
        </div>
        <div className="headerActions">
          <button className="btn btnOutline" style={{ borderColor: 'var(--gold)', color: 'var(--gold-light)' }} onClick={load}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            REFRESH QUEUE
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Search by customer name, CID, or doc type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setOffset(0); load(); } }}
        />
        <select
          className="select"
          style={{ maxWidth: 180 }}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
        >
          <option value="ALL">All Statuses</option>
          {availableStatuses.map(s => (
            <option key={s} value={s}>{labelForStatus(s)}</option>
          ))}
        </select>
      </div>

      {error && !active && <div className="errorBanner">{error}</div>}

      <div className="card">
        <div className="cardHeader">
          <h2 className="serifTitle" style={{ fontSize: 18 }}>Identity Verification Queue</h2>
        </div>

        {loading ? (
          <div className="loadingBox">Loading KYC queue…</div>
        ) : docs.length === 0 ? (
          <div className="emptyState">No documents match your active status or search filters.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Document Type</th>
                <th>Submitted Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.documentId}>
                  <td>
                    <div className="customerCell">
                      <ProfileAvatar customerId={doc.customerId} profilePhotoUrl={doc.profilePhotoUrl} firstName={doc.customerName?.split(' ')[0]} lastName={doc.customerName?.split(' ').slice(1).join(' ')} kycStatus={doc.reviewStatus} />
                      <div>
                        <div className="customerName">{doc.customerName}</div>
                        <div className="customerSub">Customer ID: {doc.customerId}</div>
                      </div>
                    </div>
                  </td>
                  <td>{doc.documentType}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                    {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '—'}
                  </td>
                  <td><span className={`pill ${pillClass(doc.reviewStatus)}`}>{doc.reviewStatus}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btnGold btnSm" onClick={() => openReview(doc)}>Review Document</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="cardFooter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>Showing {Math.min(offset + 1, total)}–{Math.min(offset + limit, total)} of {total.toLocaleString()} entr{total === 1 ? 'y' : 'ies'}</div>
          {total > limit && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn btnOutline btnSm" disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - limit))} style={{ opacity: offset <= 0 ? 0.4 : 1 }}>← Prev</button>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '0 8px' }}>Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}</span>
              <button className="btn btnOutline btnSm" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} style={{ opacity: offset + limit >= total ? 0.4 : 1 }}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {active && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modalHead">
              <div className="title serifTitle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg>
                Identity Verification Review
              </div>
              <button className="closeBtn" onClick={closeModal}>&times;</button>
            </div>
            <div className="modalBody">
              <h2 className="serifTitle" style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--gold-light)' }}>{active.customerName}</h2>
              <div style={{ color: 'var(--text-faint)', fontSize: 12.5, marginBottom: 18 }}>
                Customer ID: {active.customerId} &middot; Document: {active.documentType}
              </div>

              {profilePhotoUrl && (
                <div className="field">
                  <span className="fieldLabel">Profile Photo (Face Verification)</span>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#101216', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <img src={profilePhotoUrl} alt="Profile" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                </div>
              )}

              <div className="field">
                <span className="fieldLabel">Document Preview</span>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 250, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#101216', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontSize: 11, color: 'var(--gold-light)', padding: '8px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>FRONT SIDE</span>
                    {fileUrl ? (
                      fileType.startsWith('image/') ? (
                        <img src={fileUrl} alt="KYC Document" style={{ maxWidth: '100%', maxHeight: 350, objectFit: 'contain' }} />
                      ) : fileType === 'application/pdf' ? (
                        <embed src={fileUrl} type="application/pdf" style={{ width: '100%', height: 350 }} />
                      ) : (
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btnOutline" style={{ margin: 20 }}>Open Document</a>
                      )
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontSize: 14 }}>Loading preview…</span>
                    )}
                  </div>
                  {backFileUrl && (
                    <div style={{ flex: 1, minWidth: 250, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#101216', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span style={{ fontSize: 11, color: 'var(--gold-light)', padding: '8px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BACK SIDE</span>
                      {backFileType.startsWith('image/') ? (
                        <img src={backFileUrl} alt="KYC Document Back" style={{ maxWidth: '100%', maxHeight: 350, objectFit: 'contain' }} />
                      ) : backFileType === 'application/pdf' ? (
                        <embed src={backFileUrl} type="application/pdf" style={{ width: '100%', height: 350 }} />
                      ) : (
                        <a href={backFileUrl} target="_blank" rel="noopener noreferrer" className="btn btnOutline" style={{ margin: 20 }}>Open Document</a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!isReviewed ? (
                <>
                  <div className="field">
                    <label className="fieldLabel" htmlFor="kyc-remarks">Internal Audit Notes</label>
                    <textarea
                      id="kyc-remarks"
                      className="textarea"
                      placeholder="Provide rationale for your decision (optional)..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>

                  {error && <div className="errorBanner">{error}</div>}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button className="btn btnGold btnFull" disabled={submitting} onClick={() => decide('APPROVED')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                      Approve Identity
                    </button>
                    <button className="btn btnDanger btnFull" disabled={submitting} onClick={() => decide('REJECTED')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      Reject Application
                    </button>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 14, textAlign: 'center' }}>
                    Decisions are recorded to the immutable review audit log.
                  </div>
                </>
              ) : (
                <div className="pill" style={{
                  padding: '8px 14px', fontSize: 12, alignSelf: 'flex-start',
                  color: 'var(--text-dim)', background: 'var(--field)',
                }}>
                  This document has already been reviewed ({active.reviewStatus}). Changes are recorded below.
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <AuditLogSection table="kyc_documents" recordId={active.documentId} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
