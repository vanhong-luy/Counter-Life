'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminToken } from '@/lib/api';

function statusPillClass(action) {
  if (!action) return 'pillPending';
  const a = action.toUpperCase();
  if (a.includes('APPROV') || a.includes('CREATE') || a === 'COMPLETED') return 'pillApproved';
  if (a.includes('REJECT') || a.includes('DECLINE') || a === 'FAILED') return 'pillRejected';
  if (a.includes('REVIEW') || a.includes('UPDATE') || a.includes('ASSIGN')) return 'pillReviewing';
  return 'pillPending';
}

function actionIcon(action) {
  const a = (action || '').toUpperCase();
  if (a.includes('LOAN')) {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>;
  }
  if (a.includes('KYC')) {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg>;
  }
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState(null);
  const [userLogs, setUserLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfileAndLogs() {
      setLoading(true);
      setError('');
      try {
        const token = getAdminToken();
        if (!token) throw new Error('Unauthenticated session');
        const headers = { Authorization: `Bearer ${token}` };

        const [profRes, logsRes] = await Promise.all([
          fetch('/auth/admin/me', { headers }),
          fetch('/auth/admin/audit-logs', { headers }).then(r => r.ok ? r.json() : []),
        ]);

        if (!profRes.ok) throw new Error('Failed to load profile details');
        const profData = await profRes.json();
        setProfile(profData);

        // Filter activity logs strictly for THIS logged-in account owner
        const myLogs = (logsRes || []).filter(l =>
          (l.adminEmail && l.adminEmail.toLowerCase() === (profData.email || '').toLowerCase()) ||
          (l.adminId && String(l.adminId) === String(profData.adminId))
        );
        setUserLogs(myLogs.slice(0, 5));
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    loadProfileAndLogs();
  }, []);

  if (loading) return <div className="loadingBox">Loading personnel credentials…</div>;
  if (error) return <div className="errorBanner">{error}</div>;
  if (!profile) return null;

  const fullName = profile.firstName && profile.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile.email ? profile.email.split('@')[0].replace('.', ' ') : 'Staff Member';

  const initials = fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'ST';
  const roleTitle = profile.roleName ? profile.roleName.replace('ROLE_', '').replace('_', ' ') : 'Senior Underwriter';

  const workFocusTags = (profile.workFocus && profile.workFocus.length > 0)
    ? profile.workFocus
    : ['Institutional Credit', 'AML Compliance', 'Large-scale Lending', 'Risk Assessment'];

  return (
    <>
      {/* Top Hero Banner */}
      <div className="card" style={{
        padding: '32px', marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(22,25,32,0.95), rgba(15,17,22,0.98))',
        border: '1px solid rgba(229,193,88,0.2)', borderRadius: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Avatar with Edit Indicator */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 88, height: 88, borderRadius: 12, border: '2px solid var(--gold)',
              background: '#161920', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: 'var(--gold-light)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}>
              {initials}
            </div>
            <div style={{
              position: 'absolute', bottom: -6, right: -6, width: 26, height: 26, borderRadius: '50%',
              background: 'var(--gold)', color: '#121419', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, border: '2px solid #161920', cursor: 'pointer'
            }}>
              ✏️
            </div>
          </div>

          <div>
            <h1 className="serifTitle" style={{ fontSize: 32, color: '#f3edd8', margin: 0, textTransform: 'capitalize' }}>
              {fullName}
            </h1>
            <div style={{ marginTop: 8 }}>
              <span className="pill pillPending" style={{
                fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '4px 12px', background: 'rgba(229,193,88,0.12)', borderColor: 'rgba(229,193,88,0.3)',
                color: 'var(--gold-light)', fontWeight: 600
              }}>
                {roleTitle}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Column Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Personal Information Card */}
        <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
          <div className="cardHeader" style={{ borderBottom: '1px solid var(--border)', justifyContent: 'space-between' }}>
            <h2 className="serifTitle" style={{ fontSize: 20 }}>Personal Information</h2>
            <span style={{ color: 'var(--text-faint)', cursor: 'pointer', fontSize: 18 }}>&bull;&bull;&bull;</span>
          </div>
          <div className="cardBody" style={{ padding: '24px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 600 }}>
                  FULL NAME
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#f3edd8', marginTop: 4 }}>
                  {fullName}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 600 }}>
                  OFFICIAL EMAIL
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--gold-light)', marginTop: 4 }}>
                  {profile.email}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 600 }}>
                  EMPLOYEE ID
                </div>
                <div style={{ fontSize: 15, fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-dim)', marginTop: 4 }}>
                  {profile.employeeId || `EMP-${1000 + (profile.adminId || 1)}`}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 600 }}>
                  DEPARTMENT ROLE
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#f3edd8', marginTop: 4 }}>
                  {profile.departmentRole || 'Risk & Compliance Management'}
                </div>
              </div>
            </div>

            {/* Work Focus Tags */}
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 12 }}>
                WORK FOCUS
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {workFocusTags.map((tag, idx) => (
                  <span key={idx} style={{
                    padding: '6px 14px', borderRadius: 6, background: 'var(--field)',
                    border: '1px solid var(--border)', fontSize: 12, color: 'var(--text)',
                    fontWeight: 500
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Recent Activity Card (Specifically for this user) */}
        <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
          <div className="cardHeader" style={{ borderBottom: '1px solid var(--border)', justifyContent: 'space-between' }}>
            <h2 className="serifTitle" style={{ fontSize: 20 }}>Recent Activity</h2>
            <Link className="linkAction" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6 }} href="/admin/audit">
              VIEW FULL LOG &rarr;
            </Link>
          </div>
          <div className="cardBody" style={{ padding: 0 }}>
            {userLogs.length === 0 ? (
              <div className="emptyState">No recent audit log actions recorded for your account session.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>ACTION TYPE</th>
                    <th>ENTITY / TARGET</th>
                    <th>TIMESTAMP</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {userLogs.map((log, idx) => {
                    const action = log.actionType || log.action || 'ACTIVITY';
                    const target = log.tableAffected || log.targetTable || 'System';
                    const details = log.description || log.details || action;

                    return (
                      <tr key={log.id || idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: 'var(--gold-light)' }}>
                              {actionIcon(action)}
                            </span>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#f3edd8' }}>
                                {details}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                          {target} (ID: #{log.recordId || '—'})
                        </td>
                        <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-faint)' }}>
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                        </td>
                        <td>
                          <span className={`pill ${statusPillClass(action)}`} style={{ fontSize: 10 }}>
                            {action}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
