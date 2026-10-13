'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

function fmtNum(n) {
  if (n == null || n < 0) return '—';
  return Number(n).toLocaleString();
}

function latencyColor(ms) {
  if (ms >= 1000) return '#f18981';
  if (ms >= 500) return '#e6c579';
  return '#2fbf88';
}

function LatencyBadge({ ms }) {
  if (ms == null || ms < 0) return <span style={{ color: 'var(--text-faint)' }}>—</span>;
  return (
    <span style={{
      color: latencyColor(ms),
      fontFamily: 'monospace',
      fontWeight: 700,
      fontSize: 13,
    }}>
      {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`}
    </span>
  );
}

export default function AdminTelemetryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pgSort, setPgSort] = useState({ key: 'count', dir: 'desc' });
  const [mongoSort, setMongoSort] = useState({ key: 'count', dir: 'desc' });
  const [bmSort, setBmSort] = useState({ key: 'queryTimeMs', dir: 'desc' });

  const loadTelemetry = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.getTelemetry();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load telemetry data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTelemetry(); }, []);

  const sortedPg = data
    ? [...data.postgres].sort((a, b) => {
        const av = a[pgSort.key] ?? -1;
        const bv = b[pgSort.key] ?? -1;
        return pgSort.dir === 'desc' ? bv - av : av - bv;
      })
    : [];

  const sortedMongo = data
    ? [...data.mongodb].sort((a, b) => {
        const av = a[mongoSort.key] ?? -1;
        const bv = b[mongoSort.key] ?? -1;
        return mongoSort.dir === 'desc' ? bv - av : av - bv;
      })
    : [];

  const sortedBm = data?.benchmarks
    ? [...data.benchmarks].sort((a, b) => {
        const av = a[bmSort.key] ?? 0;
        const bv = b[bmSort.key] ?? 0;
        return bmSort.dir === 'desc' ? bv - av : av - bv;
      })
    : [];

  const handleSort = (setter, field) => {
    setter(prev => ({
      key: field,
      dir: prev.key === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const SortIcon = ({ field, current }) => {
    if (current.key !== field) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{current.dir === 'desc' ? '↓' : '↑'}</span>;
  };

  if (loading) return <div className="loadingBox">Collecting database telemetry…</div>;

  return (
    <>
      <div className="pageHeader" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <h1 className="pageTitle serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>Database Telemetry</h1>
          <div className="pageSubtitle">
            Row counts, query latency, and benchmark diagnostics for PostgreSQL &amp; MongoDB
            {data && <span style={{ marginLeft: 12, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-faint)' }}>collected {new Date(data.timestamp).toLocaleString()}</span>}
          </div>
        </div>
        <div className="headerActions">
          <button className="btn btnOutline" style={{ borderColor: 'var(--gold)', color: 'var(--gold-light)' }} onClick={loadTelemetry}>
            ⟳ Refresh
          </button>
        </div>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      {data && (
        <>
          {/* Summary stat cards */}
          <div className="statGrid" style={{ marginBottom: 24 }}>
            <div className="statCard" style={{ borderColor: 'rgba(229,193,88,0.18)' }}>
              <div className="statLabel" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>PostgreSQL Rows</div>
              <div className="statValue serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>{fmtNum(data.summary.pgTotalRows)}</div>
              <div className="statSub" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{data.summary.pgTables} tables &middot; <LatencyBadge ms={data.summary.pgTotalQueryTimeMs} /> total</div>
            </div>
            <div className="statCard" style={{ borderColor: 'rgba(229,193,88,0.18)' }}>
              <div className="statLabel" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>MongoDB Docs</div>
              <div className="statValue serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>{fmtNum(data.summary.mongoTotalDocs)}</div>
              <div className="statSub" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{data.summary.mongoCollections} collections &middot; <LatencyBadge ms={data.summary.mongoTotalQueryTimeMs} /> total</div>
            </div>
            <div className="statCard" style={{ borderColor: 'rgba(229,193,88,0.18)' }}>
              <div className="statLabel" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Total Queries</div>
              <div className="statValue serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>{(data.postgres?.length || 0) + (data.mongodb?.length || 0)}</div>
              <div className="statSub" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{data.benchmarks?.length || 0} benchmark queries</div>
            </div>
            <div className="statCard" style={{ borderColor: data.summary.pgTotalQueryTimeMs + data.summary.mongoTotalQueryTimeMs > 2000 ? 'rgba(230,88,79,0.3)' : 'rgba(229,193,88,0.18)' }}>
              <div className="statLabel" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Total Response Time</div>
              <div className="statValue serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>
                <LatencyBadge ms={data.summary.pgTotalQueryTimeMs + data.summary.mongoTotalQueryTimeMs} />
              </div>
              <div className="statSub" style={{ fontSize: 11, color: 'var(--text-faint)' }}>All count queries combined</div>
            </div>
          </div>

          {/* PostgreSQL table stats */}
          <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(229,193,88,0.15)' }}>
            <div className="cardHeader">
              <h2 className="serifTitle" style={{ fontSize: 18 }}>PostgreSQL — Table Row Counts</h2>
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{sortedPg.length} tables</span>
            </div>
            <div className="cardBody" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort(setPgSort, 'table')} style={{ cursor: 'pointer' }}>
                      Table <SortIcon field="table" current={pgSort} />
                    </th>
                    <th onClick={() => handleSort(setPgSort, 'count')} style={{ cursor: 'pointer' }}>
                      Row Count <SortIcon field="count" current={pgSort} />
                    </th>
                    <th onClick={() => handleSort(setPgSort, 'queryTimeMs')} style={{ cursor: 'pointer' }}>
                      Query Time <SortIcon field="queryTimeMs" current={pgSort} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPg.map(row => (
                    <tr key={row.table}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--gold-light)' }}>{row.table}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{row.count < 0 ? <span style={{ color: 'var(--text-faint)' }}>Error</span> : fmtNum(row.count)}</td>
                      <td><LatencyBadge ms={row.queryTimeMs} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cardFooter">
              <div>{fmtNum(data.summary.pgTotalRows)} total rows across {data.summary.pgTables} tables</div>
              <div>Total: <LatencyBadge ms={data.summary.pgTotalQueryTimeMs} /></div>
            </div>
          </div>

          {/* MongoDB collection stats */}
          <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(229,193,88,0.15)' }}>
            <div className="cardHeader">
              <h2 className="serifTitle" style={{ fontSize: 18 }}>MongoDB — Collection Document Counts</h2>
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{sortedMongo.length} collections</span>
            </div>
            <div className="cardBody" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort(setMongoSort, 'table')} style={{ cursor: 'pointer' }}>
                      Collection <SortIcon field="table" current={mongoSort} />
                    </th>
                    <th onClick={() => handleSort(setMongoSort, 'count')} style={{ cursor: 'pointer' }}>
                      Document Count <SortIcon field="count" current={mongoSort} />
                    </th>
                    <th onClick={() => handleSort(setMongoSort, 'queryTimeMs')} style={{ cursor: 'pointer' }}>
                      Query Time <SortIcon field="queryTimeMs" current={mongoSort} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMongo.map(row => (
                    <tr key={row.table}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--gold-light)' }}>{row.table}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{row.count < 0 ? <span style={{ color: 'var(--text-faint)' }}>Error</span> : fmtNum(row.count)}</td>
                      <td><LatencyBadge ms={row.queryTimeMs} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cardFooter">
              <div>{fmtNum(data.summary.mongoTotalDocs)} total docs across {data.summary.mongoCollections} collections</div>
              <div>Total: <LatencyBadge ms={data.summary.mongoTotalQueryTimeMs} /></div>
            </div>
          </div>

          {/* Benchmark queries */}
          <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
            <div className="cardHeader">
              <h2 className="serifTitle" style={{ fontSize: 18 }}>Benchmark Queries</h2>
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{sortedBm.length} queries</span>
            </div>
            <div className="cardBody" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort(setBmSort, 'name')} style={{ cursor: 'pointer' }}>
                      Query <SortIcon field="name" current={bmSort} />
                    </th>
                    <th onClick={() => handleSort(setBmSort, 'resultCount')} style={{ cursor: 'pointer' }}>
                      Results <SortIcon field="resultCount" current={bmSort} />
                    </th>
                    <th onClick={() => handleSort(setBmSort, 'queryTimeMs')} style={{ cursor: 'pointer' }}>
                      Latency <SortIcon field="queryTimeMs" current={bmSort} />
                    </th>
                    <th>SQL / Query</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBm.map((bm, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{bm.name}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{fmtNum(bm.resultCount)}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                        }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: latencyColor(bm.queryTimeMs),
                            flexShrink: 0,
                          }} />
                          <LatencyBadge ms={bm.queryTimeMs} />
                        </span>
                      </td>
                      <td style={{ maxWidth: 400 }}>
                        <code style={{
                          fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace',
                          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {bm.query}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
