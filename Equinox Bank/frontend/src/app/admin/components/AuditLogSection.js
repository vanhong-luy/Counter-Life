'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

function actionLabel(action) {
  const map = {
    REVIEW_KYC: 'KYC Reviewed',
    REVIEW_LOAN: 'Loan Reviewed',
    UPDATE_USER: 'User Updated',
    REVIEW_REFUND: 'Refund Reviewed',
    UPDATE_SETTINGS: 'Settings Updated',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  };
  return map[action] || action;
}

function actionClass(action) {
  if (!action) return 'pillPending';
  const up = action.toUpperCase();
  if (up.includes('APPROV') || up === 'VERIFIED') return 'pillApproved';
  if (up.includes('REJECT') || up === 'REJECTED') return 'pillRejected';
  if (up.includes('REVIEW') || up === 'PENDING') return 'pillReviewing';
  return 'pillPending';
}

export default function AuditLogSection({ table, recordId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!table || recordId == null) return;
    (async () => {
      try {
        const data = await api.getAuditLogs(table, recordId);
        setLogs(data);
      } catch {
        // silently fail — audit trail is supplementary
      } finally {
        setLoading(false);
      }
    })();
  }, [table, recordId]);

  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Audit Trail</h2>
        {!loading && <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{logs.length} entr{logs.length === 1 ? 'y' : 'ies'}</span>}
      </div>
      {loading ? (
        <div className="loadingBox">Loading audit trail…</div>
      ) : logs.length === 0 ? (
        <div className="emptyState">No audit records for this entry.</div>
      ) : (
        <div style={{ padding: 0 }}>
          {logs.map((log) => (
            <div key={log.id} style={{
              display: 'flex', gap: 14, padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--field)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--gold-light)',
                flexShrink: 0,
              }}>
                {(log.adminEmail || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{log.adminEmail}</span>
                  <span className={`pill ${actionClass(log.actionType)}`} style={{ fontSize: 10 }}>{actionLabel(log.actionType)}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 4 }}>{log.description}</div>
                {log.payloadDiff?.remarks && (
                  <div style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                    &ldquo;{log.payloadDiff.remarks}&rdquo;
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>
                  {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
