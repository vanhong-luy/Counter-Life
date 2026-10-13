'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AuditLogSection from '../../components/AuditLogSection';

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getUserDetail(id);
      setUser(data);
      if (data?.email) {
        api.admin.getCards({ search: data.email, limit: 20, offset: 0 })
          .then(res => setCards(res.cards || []))
          .catch(() => {});
      }
    } catch (err) {
      setError(err.message || 'Failed to load customer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="loadingBox">Loading customer…</div>;
  if (error && !user) return <div className="errorBanner">{error}</div>;
  if (!user) return null;

  const initials = `${(user.firstName || '?')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase();
  const kycStatus = (user.kycStatus || '').toUpperCase();
  const kycPillClass = kycStatus === 'VERIFIED' || kycStatus === 'APPROVED' ? 'pillVerified' : kycStatus === 'REJECTED' ? 'pillRejected' : 'pillPending';

  return (
    <>
      <div className="backLink" onClick={() => router.push('/admin/users')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Users
      </div>

      <div className="pageHeader">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: 18 }}>{initials}</div>
          <div>
            <h1 className="pageTitle">{user.firstName} {user.lastName}</h1>
            <div className="pageSubtitle">Customer ID: {user.customerId} &middot; {user.email}</div>
          </div>
        </div>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      <div className="lowerGrid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="cardHeader"><h2>Account Overview</h2></div>
          <div className="cardBody">
            <div className="field">
              <span className="fieldLabel">Phone Number</span>
              <div>{user.phoneNumber || '—'}</div>
            </div>
            <div className="field">
              <span className="fieldLabel">Joined</span>
              <div>{user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}</div>
            </div>
            <div className="field">
              <span className="fieldLabel">KYC Status</span>
              <span className={`pill ${kycPillClass}`}>{user.kycStatus || 'UNKNOWN'}</span>
            </div>
            <div className="field">
              <span className="fieldLabel">Credit Score</span>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{user.creditScore ?? '—'}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cardHeader"><h2>Cards ({cards.length})</h2></div>
          <div className="cardBody" style={{ padding: 0 }}>
            {cards.length === 0 ? (
              <div className="emptyState" style={{ padding: 24, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No cards found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2b303a' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Card ID</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Card Number</th>
                    <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Limit</th>
                    <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Balance</th>
                    <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map(card => (
                    <tr key={card.cardId} style={{ borderBottom: '1px solid #2b303a', cursor: 'pointer' }}
                        onClick={() => router.push(`/admin/cards/${card.cardId}`)}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'monospace' }}>#{card.cardId}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="pill" style={{ background: 'rgba(212,169,74,0.12)', color: 'var(--gold-light)', padding: '2px 7px', fontSize: 10 }}>
                          {card.network} {card.cardTypeName}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'monospace' }}>{card.cardNumber}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right' }}>{card.creditLimit != null ? '$' + Number(card.creditLimit).toLocaleString() : '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: Number(card.outstandingBalance) > 0 ? '#e6584f' : 'inherit' }}>${Number(card.outstandingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span className={`pill ${card.isFrozen ? 'pillPending' : 'pillApproved'}`} style={{ fontSize: 10, padding: '2px 7px' }}>
                          {card.isFrozen ? 'Frozen' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <AuditLogSection table="customers" recordId={id} />
    </>
  );
}
