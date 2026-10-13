'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

function getAction(l) { return l.actionType || l.action || 'ACTIVITY'; }
function getDetails(l) { return l.description || l.details || ''; }
function getTable(l) { return l.tableAffected || l.targetTable || 'system'; }
function getPayload(l) { return l.payloadDiff || l.metadata || null; }

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [tableFilter, setTableFilter] = useState('ALL');
  const [availableTables, setAvailableTables] = useState(['ALL']);
  const [offset, setOffset] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const limit = 50;

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit, offset };
      if (tableFilter !== 'ALL') params.table = tableFilter;
      if (query.trim()) params.search = query.trim();
      const data = await api.getFilteredAuditLogs(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      if (data.availableTables) setAvailableTables(['ALL', ...data.availableTables]);
    } catch (err) {
      setError(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [tableFilter, offset]);

  return (
    <>
      <div className="pageHeader" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <h1 className="pageTitle serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>Global Audit Trail &amp; System Logs</h1>
          <div className="pageSubtitle">{total.toLocaleString()} total recorded compliance &amp; administrative log events from MongoDB</div>
        </div>
        <div className="headerActions">
          <button className="btn btnOutline" style={{ borderColor: 'var(--gold)', color: 'var(--gold-light)' }} onClick={loadLogs}>
            REFRESH AUDIT LOGS
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          style={{ maxWidth: 300 }}
          placeholder="Filter by admin, action, or details..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setOffset(0); loadLogs(); } }}
        />
        <select
          className="select"
          style={{ maxWidth: 180 }}
          value={tableFilter}
          onChange={e => { setTableFilter(e.target.value); setOffset(0); }}
        >
          {availableTables.map(t => (
            <option key={t} value={t}>{t === 'ALL' ? 'All System Tables' : t}</option>
          ))}
        </select>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loadingBox">Loading system audit trail…</div>
        ) : logs.length === 0 ? (
          <div className="emptyState">No audit log records match your filter criteria.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Staff Member</th>
                <th>Action</th>
                <th>Target Object</th>
                <th>Details</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => {
                const action = getAction(l);
                const details = getDetails(l);
                const targetTable = getTable(l);
                const payload = getPayload(l);
                return (
                  <tr key={l.id || l.timestamp}>
                    <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}
                    </td>
                    <td>
                      <div className="customerName">{l.adminEmail || 'System'}</div>
                      <div className="customerSub">Admin ID: {l.adminId || '—'}</div>
                    </td>
                    <td>
                      <span className="pill pillPending" style={{ fontSize: 10, letterSpacing: '0.05em' }}>
                        {action}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-light)' }}>{targetTable}</div>
                      <div className="customerSub" style={{ fontFamily: 'monospace' }}>Record ID: {l.recordId || '—'}</div>
                    </td>
                    <td style={{ maxWidth: 340, fontSize: 13 }}>{details || action}</td>
                    <td>
                      {payload && Object.keys(payload).length > 0 ? (
                        <button
                          className="btn btnOutline btnSm"
                          style={{ fontSize: 11, padding: '3px 8px', borderColor: 'var(--gold)', color: 'var(--gold-light)' }}
                          onClick={() => setSelectedLog(l)}
                        >
                          Inspect JSON
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="cardFooter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>Showing {Math.min(offset + 1, total)}–{Math.min(offset + limit, total)} of {total.toLocaleString()} audit entries</div>
          {total > limit && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn btnOutline btnSm" disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - limit))} style={{ opacity: offset <= 0 ? 0.4 : 1 }}>← Prev</button>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '0 8px' }}>Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}</span>
              <button className="btn btnOutline btnSm" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} style={{ opacity: offset + limit >= total ? 0.4 : 1 }}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <div className="overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modalHead">
              <span className="title serifTitle">Audit Log Payload Detail</span>
              <button className="closeBtn" onClick={() => setSelectedLog(null)}>×</button>
            </div>
            <div className="modalBody">
              <div style={{ marginBottom: 12 }}>
                <strong>Action:</strong> {getAction(selectedLog)} &middot; <strong>Admin:</strong> {selectedLog.adminEmail}
              </div>
              <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-dim)' }}>
                Target: <code>{getTable(selectedLog)}</code> (Record #{selectedLog.recordId || '—'}) &middot; {new Date(selectedLog.timestamp).toLocaleString()}
              </div>
              <div className="field">
                <label className="fieldLabel">Details</label>
                <div style={{ padding: 10, background: 'var(--field)', borderRadius: 6, fontSize: 13 }}>
                  {getDetails(selectedLog) || getAction(selectedLog)}
                </div>
              </div>
              <div className="field">
                <label className="fieldLabel">Raw Payload Diff</label>
                <pre style={{
                  padding: 12, background: 'var(--field)', borderRadius: 8, fontSize: 12,
                  fontFamily: 'monospace', color: 'var(--gold-light)', overflowX: 'auto', border: '1px solid var(--border)'
                }}>
                  {JSON.stringify(getPayload(selectedLog), null, 2)}
                </pre>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btnOutline" onClick={() => setSelectedLog(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
