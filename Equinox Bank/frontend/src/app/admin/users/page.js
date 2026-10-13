'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import ProfileAvatar from '../components/ProfileAvatar';

function pillClass(status) {
  const s = (status || '').toUpperCase();
  if (s === 'VERIFIED' || s === 'APPROVED') return 'pillVerified';
  if (s === 'REJECTED') return 'pillRejected';
  return 'pillPending';
}

function scoreTier(score) {
  if (score == null) return { label: '—', cls: '', color: '' };
  if (score >= 800) return { label: 'Excellent', cls: 'pillVerified', color: '#155724' };
  if (score >= 740) return { label: 'Very Good', cls: 'pillVerified', color: '#155724' };
  if (score >= 670) return { label: 'Good', cls: 'pillPending', color: '#856404' };
  if (score >= 580) return { label: 'Fair', cls: 'pillReviewing', color: '#856404' };
  return { label: 'Poor', cls: 'pillRejected', color: '#721C24' };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const limit = 50;

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit, offset };
      if (query.trim()) params.search = query.trim();
      const data = await api.admin.getFilteredUsers(params);
      setUsers(data.customers || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [offset]);

  return (
    <>
      <div className="pageHeader" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <h1 className="pageTitle serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>User &amp; Account Directory</h1>
          <div className="pageSubtitle">{total.toLocaleString()} registered banking customers</div>
        </div>
        <div className="headerActions">
          <Link href="/admin/settings" className="btn btnGold" style={{ fontSize: 12, letterSpacing: '0.05em' }}>
            + MANAGE STAFF &amp; PERMISSIONS
          </Link>
        </div>
      </div>

      <div className="field" style={{ maxWidth: 380, marginBottom: 20 }}>
        <input
          className="input"
          placeholder="Search by name, email, or Customer ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setOffset(0); load(); } }}
        />
      </div>

      {error && <div className="errorBanner">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loadingBox">Loading customer accounts…</div>
        ) : users.length === 0 ? (
          <div className="emptyState">No customers match your search query.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Customer ID</th>
                <th>Credit Score <span style={{cursor:'pointer', fontSize:13, color:'var(--text-faint)'}} onClick={() => setShowScoreInfo(true)}>ⓘ</span></th>
                <th>KYC Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.customerId}>
                  <td>
                    <div className="customerCell">
                      <ProfileAvatar customerId={u.customerId} profilePhotoUrl={u.profilePhotoUrl} firstName={u.firstName} lastName={u.lastName} kycStatus={u.kycStatus} />
                      <div>
                        <div className="customerName">{u.firstName} {u.lastName}</div>
                        <div className="customerSub">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{u.customerId}</td>
                  <td>
                    {u.creditScore != null ? (
                      <span style={{display:'flex', alignItems:'center', gap:6}}>
                        <span style={{fontWeight:600}}>{u.creditScore}</span>
                        <span className={`pill ${scoreTier(u.creditScore).cls}`} style={{fontSize:10, padding:'2px 6px'}}>{scoreTier(u.creditScore).label}</span>
                      </span>
                    ) : <span style={{color:'var(--text-faint)'}}>—</span>}
                  </td>
                  <td><span className={`pill ${pillClass(u.kycStatus)}`}>{u.kycStatus || 'UNKNOWN'}</span></td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <Link href={`/admin/users/${u.customerId}`} className="btn btnOutline btnSm" style={{ borderColor: 'var(--gold)', color: 'var(--gold-light)' }}>
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="cardFooter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>Showing {Math.min(offset + 1, total)}–{Math.min(offset + limit, total)} of {total.toLocaleString()} entries</div>
          {total > limit && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn btnOutline btnSm" disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - limit))} style={{ opacity: offset <= 0 ? 0.4 : 1 }}>← Prev</button>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '0 8px' }}>Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}</span>
              <button className="btn btnOutline btnSm" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} style={{ opacity: offset + limit >= total ? 0.4 : 1 }}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {showScoreInfo && (
        <div className="overlay" onClick={() => setShowScoreInfo(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:480}}>
            <div className="modalHead">
              <div className="title">How Credit Scores Are Calculated</div>
              <button className="closeBtn" onClick={() => setShowScoreInfo(false)}>&times;</button>
            </div>
            <div className="modalBody">
              <p style={{margin:'0 0 12px', fontSize:13, color:'var(--text-dim)'}}>Scores range from <strong>300-850</strong>. Each customer is scored monthly.</p>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                <thead><tr><th style={{textAlign:'left', borderBottom:'1px solid var(--border)', padding:'6px 0'}}>Factor</th><th style={{textAlign:'right', borderBottom:'1px solid var(--border)', padding:'6px 0'}}>Points</th></tr></thead>
                <tbody>
                  <tr><td style={{padding:'6px 0'}}>Base score</td><td style={{textAlign:'right', fontWeight:600}}>300</td></tr>
                  <tr><td style={{padding:'6px 0'}}>KYC approved</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+80</td></tr>
                  <tr><td style={{padding:'6px 0'}}>Account age (+10/year, max 10yr)</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+100</td></tr>
                  <tr><td style={{padding:'6px 0'}}>Total account balances &gt; $1,000</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+30</td></tr>
                  <tr><td style={{padding:'6px 0'}}>On-time loan payments (+5 each)</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+100</td></tr>
                  <tr><td style={{padding:'6px 0'}}>DTI &lt; 36% (debt-to-income)</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+40</td></tr>
                  <tr><td style={{padding:'6px 0'}}>LTV &lt; 80% (loan-to-value)</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+30</td></tr>
                  <tr><td style={{padding:'6px 0'}}>Credit mix (has both loans + cards)</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+40</td></tr>
                  <tr><td style={{padding:'6px 0'}}>Low credit utilization (&lt;30%)</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+60</td></tr>
                  <tr><td style={{borderTop:'1px solid var(--border)', padding:'6px 0'}}>High DTI (&gt;43%)</td><td style={{textAlign:'right', fontWeight:600, borderTop:'1px solid var(--border)', padding:'6px 0', color:'#dc3545'}}>-30</td></tr>
                  <tr><td style={{padding:'6px 0'}}>High utilization (&gt;50%)</td><td style={{textAlign:'right', fontWeight:600, color:'#dc3545'}}>-40</td></tr>
                  <tr><td style={{padding:'6px 0'}}>LTV &gt; 100% (underwater)</td><td style={{textAlign:'right', fontWeight:600, color:'#dc3545'}}>-50</td></tr>
                  <tr><td style={{padding:'6px 0'}}>Outstanding debt</td><td style={{textAlign:'right', fontWeight:600, color:'#dc3545'}}>-50</td></tr>
                </tbody>
              </table>
              <div style={{marginTop:14, padding:'8px 12px', background:'var(--field)', borderRadius:6, fontSize:12, lineHeight:1.6}}>
                <strong>Tiers:</strong> 300-579 Poor · 580-669 Fair · 670-739 Good · 740-799 Very Good · 800-850 Excellent
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
