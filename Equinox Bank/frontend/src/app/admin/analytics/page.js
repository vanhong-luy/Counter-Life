'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/lib/AdminAuthContext';
import styles from './analytics.module.css';

const COLORS = ['#d4a94a', '#2fbf88', '#3b82f6', '#8b5cf6', '#e6584f', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

function fmt(n) {
  if (n == null) return '$0.00';
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString();
}

function pct(a, b) {
  if (!b || Number(b) === 0) return '0%';
  return (Number(a) / Number(b) * 100).toFixed(1) + '%';
}

function StatCard({ label, value, sub, goldValue = false, highlightColor }) {
  return (
    <div className="statCard" style={{ borderColor: 'rgba(229,193,88,0.18)', padding: '20px' }}>
      <div className="statLabel" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
        <div className={`statValue ${goldValue ? 'serifTitle' : ''}`} style={{ fontSize: 28, color: highlightColor || (goldValue ? '#f3edd8' : 'var(--text)') }}>
          {value}
        </div>
      </div>
      {sub && <div className="statSub" style={{ marginTop: 6, fontSize: 12, color: 'var(--text-faint)' }}>{sub}</div>}
    </div>
  );
}

function Bar({ label, value, max, color, pctVal }) {
  const w = max > 0 ? (value / max * 100) : 0;
  return (
    <div className={styles.barWrap}>
      <span className={styles.barLabel}>{label}</span>
      <div style={{ flex: 1, background: 'var(--field)', borderRadius: 4, height: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div className={styles.bar} style={{ width: Math.max(w, 2) + '%', background: color || 'var(--gold-light)' }} />
      </div>
      <span className={styles.barVal}>{fmt(value)}</span>
      <span className={styles.barPct}>{pctVal || pct(value, max)}</span>
    </div>
  );
}

function Table({ headers, rows, renderRow }) {
  return (
    <table className="table">
      <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{renderRow(r, i)}</tr>)}</tbody>
    </table>
  );
}

export default function AdminAnalyticsPage() {
  const { admin } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/auth/admin/system-analytics', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('Failed to load system analytics data');
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!admin) return;
    loadData();
  }, [admin]);

  if (loading) return <div className="loadingBox">Loading System Analytics…</div>;
  if (error) return <div className="errorBanner">{error}</div>;
  if (!data) return null;

  const { overview, accounts, transactions, spending, loans, creditCards, savingsGoals, customers, monthlyTrends } = data;
  const utilRate = creditCards?.utilizationRate ?? 0;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'spending', label: 'Spending' },
    { id: 'loans', label: 'Loans' },
    { id: 'credit', label: 'Credit Cards' },
    { id: 'savings', label: 'Savings Goals' },
    { id: 'trends', label: 'Monthly Trends' },
  ];

  return (
    <>
      <div className="pageHeader" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <h1 className="pageTitle serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>System Analytics</h1>
          <div className="pageSubtitle" style={{ color: 'var(--text-dim)' }}>Comprehensive metrics across all banking domains</div>
        </div>
        <div className="headerActions">
          <button className="btn btnOutline" style={{ borderColor: 'var(--gold)', color: 'var(--gold-light)' }} onClick={loadData}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            REFRESH ANALYTICS
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', background: 'var(--panel-2)', padding: 6, borderRadius: 10, border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: 'none',
              background: tab === t.id ? 'linear-gradient(180deg, #eccf8a, #c99e46)' : 'transparent',
              color: tab === t.id ? '#14171d' : 'var(--text-dim)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              letterSpacing: '0.03em'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="statGrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', marginBottom: 24 }}>
            <StatCard label="Total Customers" value={fmtNum(overview?.totalCustomers)} sub="Registered users" goldValue />
            <StatCard label="Total Accounts" value={fmtNum(overview?.totalAccounts)} sub={accounts?.activeAccounts + ' active accounts'} goldValue />
            <StatCard label="Total Transactions" value={fmtNum(overview?.totalTransactions)} sub={transactions?.completedCount + ' completed'} goldValue />
            <StatCard label="Total Deposits" value={fmt(overview?.totalDeposits)} sub="Lifetime sum" goldValue highlightColor="var(--green)" />
            <StatCard label="Total Withdrawals" value={fmt(overview?.totalWithdrawals)} sub="Lifetime sum" goldValue highlightColor="var(--amber)" />
            <StatCard label="Active Loans" value={fmtNum(overview?.activeLoans)} sub={fmt(overview?.totalLoanOutstanding) + ' outstanding'} goldValue highlightColor="var(--red)" />
            <StatCard label="Credit Card Debt" value={fmt(overview?.totalCreditCardDebt)} sub={utilRate.toFixed(1) + '% utilization'} goldValue highlightColor={utilRate > 50 ? 'var(--red)' : 'var(--gold-light)'} />
            <StatCard label="Savings Goal Funds" value={fmt(overview?.totalSavingsGoalFunds)} sub={'Across ' + fmtNum(savingsGoals?.activeGoals) + ' active goals'} goldValue highlightColor="var(--gold-light)" />
          </div>

          <div className="lowerGrid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
              <div className="cardHeader">
                <h2 className="serifTitle" style={{ fontSize: 18 }}>Accounts by Type</h2>
              </div>
              <div className="cardBody" style={{ padding: 0 }}>
                {accounts?.byType?.length > 0 ? (
                  <Table headers={['TYPE', 'COUNT', 'TOTAL BALANCE']}
                    rows={accounts.byType}
                    renderRow={(r) => (
                      <>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{r.typeName}</td>
                        <td style={{ color: 'var(--text-dim)' }}>{fmtNum(r.count)}</td>
                        <td className="serifTitle" style={{ fontWeight: 700, color: 'var(--gold-light)' }}>{fmt(r.totalBalance)}</td>
                      </>
                    )} />
                ) : <div className="emptyState">No account data available.</div>}
              </div>
            </div>

            <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
              <div className="cardHeader">
                <h2 className="serifTitle" style={{ fontSize: 18 }}>Customer Verification & Score</h2>
              </div>
              <div className="cardBody">
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)', marginBottom: 10 }}>KYC Status Breakdown</div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  <span className="pill pillApproved" style={{ padding: '6px 12px', fontSize: 11 }}>{fmtNum(customers?.kycApproved)} Approved</span>
                  <span className="pill pillPending" style={{ padding: '6px 12px', fontSize: 11 }}>{fmtNum(customers?.kycPending)} Pending</span>
                  <span className="pill pillRejected" style={{ padding: '6px 12px', fontSize: 11 }}>{fmtNum(customers?.kycRejected)} Rejected</span>
                </div>

                {customers?.creditScoreDistribution?.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)', marginBottom: 12 }}>Credit Score Distribution</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {customers.creditScoreDistribution.map((t, i) => (
                        <Bar key={t.tierName} label={t.tierName} value={t.customerCount}
                          max={Math.max(...customers.creditScoreDistribution.map(x => x.customerCount), 1)}
                          color={COLORS[i % COLORS.length]} pctVal={pct(t.customerCount, customers.totalCustomers)} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
            <div className="cardHeader">
              <h2 className="serifTitle" style={{ fontSize: 18 }}>Ledger Velocity & Daily Volume</h2>
            </div>
            <div className="cardBody">
              <div className="statGrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', marginBottom: 0 }}>
                <StatCard label="Today's Transactions" value={fmtNum(transactions?.todayCount)} sub={fmt(transactions?.todayVolume) + ' volume'} goldValue />
                <StatCard label="This Month" value={fmtNum(transactions?.thisMonthCount)} sub={fmt(transactions?.thisMonthVolume) + ' volume'} goldValue />
                <StatCard label="Avg Transaction" value={fmt(transactions?.averageTransaction)} sub="Across all time" goldValue />
                <StatCard label="Avg Account Balance" value={fmt(accounts?.averageBalance)} sub={accounts?.activeAccounts + ' active accounts'} goldValue />
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'spending' && (
        <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
          <div className="cardHeader">
            <h2 className="serifTitle" style={{ fontSize: 18 }}>Spending by Category (This Month)</h2>
          </div>
          <div className="cardBody">
            <div className="statGrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
              <StatCard label="Total Spent" value={fmt(spending?.totalSpent)} goldValue highlightColor="var(--red)" />
              <StatCard label="Total Income" value={fmt(spending?.totalIncome)} goldValue highlightColor="var(--green)" />
              <StatCard label="Net Balance" value={fmt(spending?.netBalance)} goldValue highlightColor={spending?.netBalance >= 0 ? 'var(--green)' : 'var(--red)'} />
            </div>
            {spending?.byCategory?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {spending.byCategory.map((c, i) => (
                  <Bar key={c.categoryName} label={c.categoryName} value={c.totalAmount}
                    max={spending.byCategory[0].totalAmount}
                    color={COLORS[i % COLORS.length]}
                    pctVal={c.transactionCount + ' txns'} />
                ))}
              </div>
            ) : <div className="emptyState">No spending data for this month.</div>}
          </div>
        </div>
      )}

      {tab === 'loans' && (
        <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
          <div className="cardHeader">
            <h2 className="serifTitle" style={{ fontSize: 18 }}>Loan Portfolio Analytics</h2>
          </div>
          <div className="cardBody" style={{ paddingBottom: 16 }}>
            <div className="statGrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', marginBottom: 24 }}>
              <StatCard label="Total Loans" value={fmtNum(loans?.totalLoans)} sub={fmt(loans?.totalDisbursed) + ' disbursed'} goldValue />
              <StatCard label="Active" value={fmtNum(loans?.activeLoans)} sub={fmt(loans?.totalOutstanding) + ' outstanding'} goldValue highlightColor="var(--gold-light)" />
              <StatCard label="Paid In Full" value={fmtNum(loans?.paidLoans)} goldValue highlightColor="var(--green)" />
              <StatCard label="Overdue" value={fmtNum(loans?.overdueLoans)} goldValue highlightColor="var(--red)" />
              <StatCard label="Pending Approval" value={fmtNum(loans?.pendingLoans)} goldValue highlightColor="var(--amber)" />
              <StatCard label="Late Fees Collected" value={fmt(loans?.totalLateFeesCollected)} goldValue highlightColor="var(--amber)" />
              <StatCard label="Avg Loan Amount" value={fmt(loans?.averageLoanAmount)} sub={loans?.averageApr?.toFixed(2) + '% avg APR'} goldValue />
            </div>
            {loans?.byType?.length > 0 && (
              <>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)', marginBottom: 12, marginTop: 10 }}>Portfolio Breakdown by Loan Type</div>
                <Table headers={['LOAN TYPE', 'ACTIVE COUNT', 'OUTSTANDING']}
                  rows={loans.byType}
                  renderRow={(r) => (
                    <>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{r.loanType}</td>
                      <td style={{ color: 'var(--text-dim)' }}>{fmtNum(r.count)}</td>
                      <td className="serifTitle" style={{ fontWeight: 700, color: 'var(--gold-light)' }}>{fmt(r.totalOutstanding)}</td>
                    </>
                  )} />
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'credit' && (
        <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
          <div className="cardHeader">
            <h2 className="serifTitle" style={{ fontSize: 18 }}>Credit Card & Card Debt Metrics</h2>
          </div>
          <div className="cardBody">
            <div className="statGrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', marginBottom: 24 }}>
              <StatCard label="Total Cards Issued" value={fmtNum(creditCards?.totalCards)} sub={creditCards?.debitCards + ' debit, ' + creditCards?.creditCards + ' credit'} goldValue />
              <StatCard label="Outstanding Balance" value={fmt(creditCards?.totalOutstanding)} goldValue highlightColor="var(--red)" />
              <StatCard label="Total Credit Limit" value={fmt(creditCards?.totalCreditLimit)} goldValue highlightColor="var(--green)" />
              <StatCard label="Utilization Rate" value={utilRate.toFixed(1) + '%'}
                goldValue highlightColor={utilRate > 50 ? 'var(--red)' : utilRate > 30 ? 'var(--amber)' : 'var(--green)'}
                sub={creditCards?.frozenCards + ' frozen cards'} />
              <StatCard label="Cards with Statements" value={fmtNum(creditCards?.cardsWithStatements)} goldValue />
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)', marginBottom: 8 }}>Global Credit Utilization Visual</div>
              <Bar label="Credit Utilization" value={creditCards?.totalOutstanding} max={creditCards?.totalCreditLimit}
                color={utilRate > 50 ? 'var(--red)' : utilRate > 30 ? 'var(--amber)' : 'var(--green)'} />
            </div>
          </div>
        </div>
      )}

      {tab === 'savings' && (
        <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
          <div className="cardHeader">
            <h2 className="serifTitle" style={{ fontSize: 18 }}>Savings Goals Performance</h2>
          </div>
          <div className="cardBody">
            <div className="statGrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', marginBottom: 24 }}>
              <StatCard label="Total Goals" value={fmtNum(savingsGoals?.totalGoals)} goldValue />
              <StatCard label="Active Goals" value={fmtNum(savingsGoals?.activeGoals)} goldValue highlightColor="var(--gold-light)" />
              <StatCard label="Completed Goals" value={fmtNum(savingsGoals?.completedGoals)} goldValue highlightColor="var(--green)" />
              <StatCard label="Cancelled" value={fmtNum(savingsGoals?.cancelledGoals)} goldValue highlightColor="var(--red)" />
              <StatCard label="Total Saved" value={fmt(savingsGoals?.totalSaved)} sub={'of ' + fmt(savingsGoals?.totalTargets) + ' target'} goldValue highlightColor="var(--green)" />
              <StatCard label="Completion Rate" value={savingsGoals?.completionRate?.toFixed(1) + '%'} goldValue highlightColor="var(--gold-light)" />
            </div>
            {savingsGoals?.byCategory?.length > 0 && (
              <>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)', marginBottom: 12 }}>Savings Breakdown by Category</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {savingsGoals.byCategory.map((c, i) => (
                    <Bar key={c.category} label={c.category} value={c.totalSaved}
                      max={savingsGoals.byCategory[0].totalSaved}
                      color={COLORS[i % COLORS.length]}
                      pctVal={c.count + ' goals'} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'trends' && (
        <div className="card" style={{ borderColor: 'rgba(229,193,88,0.15)' }}>
          <div className="cardHeader">
            <h2 className="serifTitle" style={{ fontSize: 18 }}>Monthly Trends (Historical Ledger)</h2>
          </div>
          <div className="cardBody" style={{ padding: 0 }}>
            {monthlyTrends?.length > 0 ? (
              <Table headers={['PERIOD', 'INCOME', 'EXPENSES', 'NET BALANCE', 'TRANSACTIONS']}
                rows={monthlyTrends}
                renderRow={(r) => (
                  <>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{r.period}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(r.income)}</td>
                    <td style={{ color: 'var(--red)', fontWeight: 600 }}>{fmt(r.expenses)}</td>
                    <td style={{ color: r.netBalance >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{fmt(r.netBalance)}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{fmtNum(r.transactionCount)}</td>
                  </>
                )} />
            ) : <div className="emptyState">No monthly trend data available.</div>}
          </div>
        </div>
      )}
    </>
  );
}
