'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import ProfileAvatar from '../components/ProfileAvatar';

const WEEKLY_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TODAY_BLOCKS = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];
const MONTHLY_WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

function money(n) {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

function pillClass(status) {
  const s = (status || '').toUpperCase();
  if (s === 'APPROVED' || s === 'VERIFIED') return 'pillApproved';
  if (s === 'REJECTED' || s === 'DECLINED' || s === 'LOW SCORE') return 'pillRejected';
  if (s === 'PENDING') return 'pillPending';
  return 'pillReviewing';
}


export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [kyc, setKyc] = useState([]);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [timeRange, setTimeRange] = useState('weekly'); // 'today' | 'weekly' | 'monthly'
  const [hoveredInfo, setHoveredInfo] = useState(null);
  const [volumeData, setVolumeData] = useState(null);

  const loadData = async () => {
    try {
      const [dash, kycQueue, pendingLoans] = await Promise.all([
        api.admin.getDashboard(),
        api.admin.getKycQueue().catch(() => []),
        api.admin.getPendingLoans().catch(() => []),
      ]);
      setStats(dash);
      setKyc(kycQueue.slice(0, 3));
      setLoans(pendingLoans.slice(0, 4));
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    api.admin.getTransactionVolume(timeRange).then(setVolumeData).catch(() => setVolumeData(null));
  }, [timeRange]);

  const chartData = useMemo(() => {
    if (!volumeData) return { depositsSum: 0, withdrawalsSum: 0, transfersSum: 0, scaleTicks: ['$0'], bars: [] };
    const allVals = (volumeData.buckets || []).flatMap(b => [b.deposit || 0, b.transfer || 0]);
    const maxRaw = Math.max(...allVals, 100);
    const scaleMax = maxRaw <= 1000 ? 1000 : maxRaw <= 10000 ? 10000 : Math.ceil(maxRaw / 10000) * 10000;
    const scaleTicks = [money(scaleMax), money(scaleMax * 0.75), money(scaleMax * 0.5), money(scaleMax * 0.25), '$0'];
    const bars = (volumeData.buckets || []).map(b => ({
      label: b.label,
      depositVal: b.deposit || 0,
      transferVal: b.transfer || 0,
      depositPct: Math.min(100, Math.round(((b.deposit || 0) / scaleMax) * 100)),
      transferPct: Math.min(100, Math.round(((b.transfer || 0) / scaleMax) * 100)),
    }));
    return {
      depositsSum: volumeData.depositsSum || 0,
      withdrawalsSum: volumeData.withdrawalsSum || 0,
      transfersSum: volumeData.transfersSum || 0,
      scaleTicks,
      bars,
    };
  }, [volumeData]);

  const handleQuickKycReview = async (docId, status, customerName) => {
    setActionMsg('');
    setError('');
    try {
      await api.admin.reviewKyc(docId, { status, remarks: `Quick dashboard ${status.toLowerCase()}` });
      setActionMsg(`KYC application for ${customerName} has been ${status.toLowerCase()}.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to process decision.');
    }
  };

  if (loading) return <div className="loadingBox">Loading System Dashboard…</div>;

  return (
    <>
      {/* Header Banner */}
      <div className="pageHeader" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <h1 className="pageTitle serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>System Dashboard</h1>
          <div className="pageSubtitle" style={{ color: 'var(--text-dim)' }}>Operational overview for Equinox Bank</div>
        </div>
      </div>

      {error && <div className="errorBanner" style={{ marginBottom: 16 }}>{error}</div>}
      {actionMsg && (
        <div style={{ padding: '10px 16px', background: 'rgba(47,191,136,0.12)', border: '1px solid rgba(47,191,136,0.3)', color: 'var(--green)', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
          {actionMsg}
        </div>
      )}

      {/* Top 4 Stat Cards */}
      {stats && (
        <div className="statGrid" style={{ marginBottom: 24 }}>
          <div className="statCard" style={{ borderColor: 'rgba(229,193,88,0.18)', padding: '20px' }}>
            <div className="statLabel" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Active Customers</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
              <div className="statValue serifTitle" style={{ fontSize: 32, color: '#f3edd8' }}>{stats.totalCustomers?.toLocaleString() || '0'}</div>
              <span className="delta" style={{ fontSize: 12, fontWeight: 600 }}>↗ +3.2%</span>
            </div>
            <div className="statSub" style={{ marginTop: 6, fontSize: 12, color: 'var(--text-faint)' }}>{stats.totalAccounts?.toLocaleString()} active accounts</div>
          </div>

          <div className="statCard" style={{ borderColor: 'rgba(229,193,88,0.18)', padding: '20px' }}>
            <div className="statLabel" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Total Deposits</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
              <div className="statValue serifTitle" style={{ fontSize: 32, color: '#f3edd8' }}>{money(stats.totalDeposits)}</div>
              <span className="delta" style={{ fontSize: 12, fontWeight: 600 }}>↗ +1.8%</span>
            </div>
            <div className="statSub" style={{ marginTop: 6, fontSize: 12, color: 'var(--text-faint)' }}>Across all vault ledgers</div>
          </div>

          <div className="statCard" style={{ borderColor: 'rgba(229,193,88,0.18)', padding: '20px' }}>
            <div className="statLabel" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Pending Tasks</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
              <div className="statValue serifTitle" style={{ fontSize: 32, color: '#f3edd8' }}>{stats.pendingKycCount + stats.pendingLoansCount}</div>
            </div>
            <div className="statSub" style={{ marginTop: 6, fontSize: 11, color: 'var(--gold-light)', letterSpacing: '0.05em', fontWeight: 600 }}>
              {stats.pendingKycCount} KYC &bull; {stats.pendingLoansCount} LOANS
            </div>
          </div>

          <div className="statCard" style={{ borderColor: 'rgba(229,193,88,0.18)', padding: '20px' }}>
            <div className="statLabel" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Today&apos;s Txns</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
              <div className="statValue serifTitle" style={{ fontSize: 32, color: '#f3edd8' }}>{stats.totalTransactions?.toLocaleString() || '0'}</div>
              <span className="delta" style={{ fontSize: 12, fontWeight: 600 }}>↗ +12%</span>
            </div>
            <div className="statSub" style={{ marginTop: 6, fontSize: 12, color: 'var(--text-faint)' }}>System-wide ledger</div>
          </div>
        </div>
      )}

      {/* Middle Row: Transaction Volume Chart & Measuring Scale */}
      <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(229,193,88,0.15)' }}>
        <div className="cardHeader" style={{ borderBottom: '1px solid var(--border)', padding: '16px 24px', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 className="serifTitle" style={{ fontSize: 20, margin: 0 }}>Transaction Volume</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-dim)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold-light)' }} /> Deposits
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#656c78' }} /> Transfers
              </span>
            </div>
          </div>

          {/* Time Range Filter Tabs */}
          <div style={{ display: 'flex', gap: 6, background: 'var(--field)', padding: 3, borderRadius: 6, border: '1px solid var(--border)' }}>
            <button
              onClick={() => setTimeRange('today')}
              style={{
                padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: timeRange === 'today' ? 'linear-gradient(180deg, #eccf8a, #c99e46)' : 'transparent',
                color: timeRange === 'today' ? '#121419' : 'var(--text-dim)', transition: 'all 0.15s'
              }}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange('weekly')}
              style={{
                padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: timeRange === 'weekly' ? 'linear-gradient(180deg, #eccf8a, #c99e46)' : 'transparent',
                color: timeRange === 'weekly' ? '#121419' : 'var(--text-dim)', transition: 'all 0.15s'
              }}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeRange('monthly')}
              style={{
                padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: timeRange === 'monthly' ? 'linear-gradient(180deg, #eccf8a, #c99e46)' : 'transparent',
                color: timeRange === 'monthly' ? '#121419' : 'var(--text-dim)', transition: 'all 0.15s'
              }}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="cardBody" style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 32, alignItems: 'center' }}>
            
            {/* Chart Area with Y-Axis Measuring Scale & Gridlines */}
            <div style={{ display: 'flex', gap: 14 }}>
              {/* Y-Axis Measuring Scale Ticks */}
              <div style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                height: 180, paddingBottom: 24, fontSize: 10, color: 'var(--text-faint)',
                fontFamily: 'monospace', textAlign: 'right', minWidth: 50, userSelect: 'none'
              }}>
                {chartData.scaleTicks.map((tick, i) => (
                  <span key={i}>{tick}</span>
                ))}
              </div>

              {/* Chart Body with Horizontal Gridlines & Dual Bars */}
              <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {/* Horizontal Gridlines */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 180,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  pointerEvents: 'none', zIndex: 1
                }}>
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div key={idx} style={{ borderBottom: '1px dashed rgba(255,255,255,0.06)', width: '100%' }} />
                  ))}
                </div>

                {/* Dual Bars Container */}
                <div style={{
                  height: 180, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
                  paddingBottom: 8, position: 'relative', zIndex: 2
                }}>
                  {chartData.bars.map((item, idx) => (
                    <div
                      key={item.label}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
                        height: '100%', justifyContent: 'flex-end', position: 'relative'
                      }}
                    >
                      {/* Hover Tooltip */}
                      {hoveredInfo === idx && (
                        <div style={{
                          position: 'absolute', top: -38, background: '#1c1f26', border: '1px solid var(--gold)',
                          color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          whiteSpace: 'nowrap', zIndex: 30, boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
                        }}>
                          <div style={{ color: 'var(--gold-light)' }}>Deposits: {money(item.depositVal)}</div>
                          <div style={{ color: '#a4acb9' }}>Transfers: {money(item.transferVal)}</div>
                        </div>
                      )}

                      {/* 2 Side-by-Side Bars (Deposit & Transfer) */}
                      <div
                        style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: '150px', cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredInfo(idx)}
                        onMouseLeave={() => setHoveredInfo(null)}
                      >
                        {/* Deposit Bar (Gold) */}
                        <div style={{
                          width: 16, height: '100%', background: 'rgba(255,255,255,0.03)',
                          borderRadius: 4, display: 'flex', alignItems: 'flex-end', overflow: 'hidden',
                          border: '1px solid rgba(229,193,88,0.1)'
                        }}>
                          <div style={{
                            width: '100%', height: `${item.depositPct}%`,
                            background: 'linear-gradient(180deg, #eccf8a, #c99e46)',
                            borderRadius: '3px 3px 0 0', transition: 'height 0.3s ease'
                          }} />
                        </div>

                        {/* Transfer Bar (Gray/Silver) */}
                        <div style={{
                          width: 16, height: '100%', background: 'rgba(255,255,255,0.03)',
                          borderRadius: 4, display: 'flex', alignItems: 'flex-end', overflow: 'hidden',
                          border: '1px solid rgba(164,172,185,0.1)'
                        }}>
                          <div style={{
                            width: '100%', height: `${item.transferPct}%`,
                            background: 'linear-gradient(180deg, #a4acb9, #525866)',
                            borderRadius: '3px 3px 0 0', transition: 'height 0.3s ease'
                          }} />
                        </div>
                      </div>

                      {/* Day / Period Label */}
                      <span style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8, letterSpacing: '0.05em', fontWeight: 600 }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Right Summary Column (Strictly Database Sums) */}
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deposits</div>
                <div className="serifTitle" style={{ fontSize: 22, color: '#f3edd8', marginTop: 4 }}>{money(chartData.depositsSum)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Withdrawals</div>
                <div className="serifTitle" style={{ fontSize: 22, color: '#f3edd8', marginTop: 4 }}>{money(chartData.withdrawalsSum)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transfers</div>
                <div className="serifTitle" style={{ fontSize: 22, color: 'var(--gold-light)', marginTop: 4 }}>{money(chartData.transfersSum)}</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Grid: 2 Equal Columns */}
      <div className="lowerGrid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* Left Column: KYC Pending Preview with Direct Actions */}
        <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
          <div className="cardHeader">
            <h2 className="serifTitle" style={{ fontSize: 18 }}>KYC Pending Preview</h2>
            <Link className="linkAction" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }} href="/admin/kyc">
              VIEW ALL
            </Link>
          </div>
          <div className="cardBody" style={{ padding: 0 }}>
            {kyc.length === 0 ? (
              <div className="emptyState">No pending KYC documents waiting on review.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {kyc.map((doc) => (
                  <div key={doc.documentId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', borderBottom: '1px solid var(--border)', gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ProfileAvatar
                        customerId={doc.customerId}
                        profilePhotoUrl={doc.profilePhotoUrl}
                        firstName={doc.customerName?.split(' ')[0]}
                        lastName={doc.customerName?.split(' ').slice(1).join(' ')}
                        kycStatus={doc.reviewStatus}
                      />
                      <div>
                        <div className="customerName" style={{ fontSize: 14 }}>{doc.customerName}</div>
                        <div className="customerSub" style={{ fontSize: 12 }}>
                          ID: {doc.customerId} &bull; {doc.documentType || 'Resident'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btnOutline btnSm"
                        style={{ padding: '5px 12px', fontSize: 11, borderColor: 'var(--border)' }}
                        onClick={() => handleQuickKycReview(doc.documentId, 'REJECTED', doc.customerName)}
                      >
                        Reject
                      </button>
                      <button
                        className="btn btnGold btnSm"
                        style={{ padding: '5px 14px', fontSize: 11 }}
                        onClick={() => handleQuickKycReview(doc.documentId, 'APPROVED', doc.customerName)}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Loan Applications */}
        <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
          <div className="cardHeader">
            <h2 className="serifTitle" style={{ fontSize: 18 }}>Loan Applications</h2>
            <Link className="linkAction" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }} href="/admin/loans">
              ALL APPLICATIONS
            </Link>
          </div>
          <div className="cardBody" style={{ padding: 0 }}>
            {loans.length === 0 ? (
              <div className="emptyState">No loan applications pending.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>APPLICANT</th>
                    <th>AMOUNT</th>
                    <th>SCORE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => {
                    const score = loan.creditScore || 740;
                    return (
                      <tr key={loan.loanId}>
                        <td>
                          <div className="customerName">{loan.customerName}</div>
                          <div className="customerSub">{loan.loanTypeName}</div>
                        </td>
                        <td>
                          <span className="serifTitle" style={{ fontSize: 15, color: 'var(--gold-light)' }}>
                            ${Number(loan.principalAmount).toLocaleString()}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: score >= 700 ? 'var(--gold-light)' : score >= 600 ? 'var(--text)' : '#f18981' }}>
                          {score}
                        </td>
                        <td>
                          <span className={`pill ${pillClass(loan.status)}`} style={{ fontSize: 10 }}>
                            {loan.status === 'pending' ? 'IN REVIEW' : loan.status}
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
