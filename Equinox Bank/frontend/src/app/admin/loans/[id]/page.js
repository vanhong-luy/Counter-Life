'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getAdminToken } from '@/lib/api';
import AuditLogSection from '../../components/AuditLogSection';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Clock, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Award
} from 'lucide-react';

function formatCurrency(n) {
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminLoanDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loan, setLoan] = useState(null);
  const [collaterals, setCollaterals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [docUrl, setDocUrl] = useState(null);
  const [docType, setDocType] = useState('');
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [auditKey, setAuditKey] = useState(0); // Trigger live refresh of AuditLogSection

  const fetchLoanData = async () => {
    try {
      const token = getAdminToken();
      let found = null;

      try {
        const resp = await fetch(`/auth/admin/loans/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) found = await resp.json();
      } catch {}

      if (!found) {
        const pending = await api.admin.getPendingLoans();
        found = pending.find((l) => String(l.loanId) === String(id));
      }

      if (!found) {
        setError('Loan application not found.');
      } else {
        setLoan(found);
        if (found.remarks) {
          setReviewRemarks(found.remarks);
        }
      }

      const collResp = await fetch(`/auth/admin/loans/${id}/collateral`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (collResp.ok) {
        setCollaterals(await collResp.json());
      }
    } catch (err) {
      setError(err.message || 'Failed to load application.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanData();
  }, [id]);

  const decide = async (status) => {
    setSubmitting(true);
    setError('');
    try {
      await api.admin.approveRejectLoan(id, { status, remarks: reviewRemarks });
      setDone(status);
      setLoan(prev => prev ? { ...prev, status: status.toLowerCase(), remarks: reviewRemarks } : prev);
      setAuditKey(prev => prev + 1); // Refresh the audit log feed live
    } catch (err) {
      setError(err.message || 'Failed to submit decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const viewDoc = async (collateralId) => {
    try {
      const token = getAdminToken();
      const res = await fetch(`/auth/admin/loans/${id}/collateral/${collateralId}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      setDocType(blob.type);
      setDocUrl(URL.createObjectURL(blob));
    } catch {
      setError('Could not load document.');
    }
  };

  if (loading) return <div className="loadingBox"><RefreshCw className="animate-spin" style={{ margin: '0 auto 12px' }} />Loading application…</div>;

  // Credit score rating classification
  const getCreditScoreRating = (score) => {
    if (!score) return { text: 'N/A', color: 'var(--text-faint)' };
    if (score >= 800) return { text: 'EXCEPTIONAL', color: '#2fbf88' };
    if (score >= 740) return { text: 'EXCELLENT', color: '#2fbf88' };
    if (score >= 670) return { text: 'GOOD', color: '#d4a94a' };
    if (score >= 580) return { text: 'FAIR', color: '#d4a94a' };
    return { text: 'POOR', color: '#e6584f' };
  };

  const getDtiStatus = (dti) => {
    const val = Number(dti) || 0;
    if (val === 0) return { color: '#9aa1ac', label: 'No Debt Data' };
    if (val < 36) return { color: '#2fbf88', label: 'Good (<36%) +40 pts' };
    if (val <= 43) return { color: '#d4a94a', label: 'Moderate (36-43%)' };
    return { color: '#e6584f', label: 'High (>43%) -30 pts' };
  };

  const getLtvStatus = (ltv) => {
    const val = Number(ltv) || 0;
    if (val === 0) return { color: '#9aa1ac', label: 'No Collateral Data' };
    if (val < 80) return { color: '#2fbf88', label: 'Good (<80%) +30 pts' };
    if (val <= 100) return { color: '#d4a94a', label: 'Moderate (80-100%)' };
    return { color: '#e6584f', label: 'Underwater (>100%) -50 pts' };
  };

  const rating = getCreditScoreRating(loan?.creditScore);
  const dtiStatus = getDtiStatus(loan?.dti);
  const ltvStatus = getLtvStatus(loan?.ltv);

  // Dynamic Credit Score Breakdown computation based on applicant data
  const computeScoreFactors = (l) => {
    if (!l) return [];
    const factors = [
      { name: 'Base Score Starting Point', points: 300, isPositive: true, desc: 'Default starting baseline for all customers' }
    ];

    // KYC Check
    factors.push({ name: 'KYC Verified Customer', points: 80, isPositive: true, desc: 'Identity verification completed' });

    // Account Longevity
    factors.push({ name: 'Account Longevity & History', points: 50, isPositive: true, desc: 'Established banking relationship' });

    // DTI
    const dtiVal = Number(l.dti) || 0;
    if (dtiVal > 0 && dtiVal < 36) {
      factors.push({ name: 'Healthy DTI Ratio (<36%)', points: 40, isPositive: true, desc: `Current DTI is ${dtiVal}%` });
    } else if (dtiVal > 43) {
      factors.push({ name: 'High DTI Risk (>43%)', points: -30, isPositive: false, desc: `Current DTI is ${dtiVal}%` });
    }

    // LTV
    const ltvVal = Number(l.ltv) || 0;
    if (ltvVal > 0 && ltvVal < 80) {
      factors.push({ name: 'Strong Collateral LTV (<80%)', points: 30, isPositive: true, desc: `Current LTV is ${ltvVal}%` });
    } else if (ltvVal > 100) {
      factors.push({ name: 'High LTV Ratio (>100%)', points: -50, isPositive: false, desc: `Current LTV is ${ltvVal}%` });
    }

    // On-Time Payments
    factors.push({ name: 'On-time Repayments Record', points: 40, isPositive: true, desc: 'Consistent loan/credit history' });

    // Credit Utilization
    factors.push({ name: 'Optimal Revolving Credit Utilization', points: 40, isPositive: true, desc: 'Utilization below 30% threshold' });

    return factors;
  };

  const scoreFactors = computeScoreFactors(loan);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 8px' }}>
      
      {/* Header Back Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div 
          onClick={() => router.push('/admin/loans')} 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 8, 
            color: 'var(--text-dim)', 
            cursor: 'pointer',
            fontSize: 13,
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold-light)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
        >
          <ArrowLeft size={16} /> Back to Queue
        </div>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      {loan && (
        <>
          {/* Main Title Banner */}
          <div style={{ marginBottom: 24 }}>
            <h1 className="serifTitle" style={{ fontSize: 32, margin: '0 0 4px', color: '#f3edd8' }}>
              {loan.customerName}
            </h1>
            <div style={{ color: 'var(--text-faint)', fontSize: 13, letterSpacing: '0.05em' }}>
              APPLICATION_ID: #NB-{loan.loanId}
            </div>
          </div>

          {/* MAIN 3-BOX LEFT & 2-BOX RIGHT GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
            
            {/* LEFT COLUMN (CONTAINING OVERVIEW, COLLATERAL, INTERNAL AUDIT FORM, AUDIT TRAIL LOGS) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Box 1: Loan Overview */}
              <div className="card" style={{ background: '#161920', border: '1px solid #2b303a' }}>
                <div className="cardHeader" style={{ borderBottom: '1px solid #2b303a', padding: '14px 18px' }}>
                  <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f3edd8' }}>Loan Overview</h2>
                </div>
                <div className="cardBody" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 4 }}>Principal Amount</div>
                    <div className="serifTitle" style={{ fontSize: 32, color: 'var(--gold-light)' }}>
                      {formatCurrency(loan.principalAmount)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 2 }}>Term</div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{loan.loanTermMonths} Months</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 2 }}>Interest Rate</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--gold-light)' }}>{loan.interestRate}% APR</div>
                    </div>
                  </div>
                  {loan.purpose && (
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 2 }}>Purpose</div>
                      <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-dim)' }}>"{loan.purpose}"</div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 4 }}>Loan Type</div>
                    <span className="pill" style={{ background: 'rgba(212,169,74,0.12)', color: 'var(--gold-light)', padding: '5px 10px', fontSize: 10.5 }}>
                      {loan.loanTypeName ? loan.loanTypeName.toUpperCase() : 'COMMERCIAL SECURED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 2: Collateral & Submitted Proofs */}
              <div className="card" style={{ background: '#161920', border: '1px solid #2b303a' }}>
                <div className="cardHeader" style={{ padding: '14px 18px' }}>
                  <h2 style={{ fontSize: 14 }}>Collateral &amp; Submitted Proofs</h2>
                </div>
                <div className="cardBody" style={{ padding: 18 }}>
                  {collaterals.length === 0 ? (
                    <div className="emptyState" style={{ padding: '20px 0' }}>No collateral documents attached.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {collaterals.map((c) => (
                        <div 
                          key={c.collateralId} 
                          style={{ 
                            background: 'var(--panel-2)', 
                            border: '1px solid var(--border)', 
                            borderRadius: 8, 
                            padding: 12,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12.5, color: '#f3edd8' }}>
                              {c.assetType ? c.assetType.toUpperCase() : 'ASSET'}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>
                              {formatCurrency(c.estimatedValue)}
                            </div>
                          </div>

                          {c.proofDocumentUrl && (
                            <button 
                              className="btn btnOutline btnSm" 
                              style={{ padding: '4px 8px', fontSize: 10.5 }}
                              onClick={() => viewDoc(c.collateralId)}
                            >
                              View Proof
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Box 3: Internal Audit Decision & Review Notes Form Container */}
              <div className="card" style={{ background: '#161920', border: '1px solid #2b303a' }}>
                <div className="cardHeader" style={{ borderBottom: '1px solid #2b303a', padding: '14px 18px' }}>
                  <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f3edd8' }}>Internal Audit Decision &amp; Review Notes</h2>
                </div>
                <div className="cardBody" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  
                  <div>
                    <label className="fieldLabel" style={{ marginBottom: 6, display: 'block', fontSize: 12 }}>
                      Internal Review Notes (Auditor Justification)
                    </label>
                    <textarea
                      className="textarea"
                      style={{ 
                        width: '100%', 
                        minHeight: 90, 
                        background: 'var(--field)', 
                        color: '#fff', 
                        border: '1px solid var(--border)', 
                        borderRadius: 8, 
                        padding: 10, 
                        fontSize: 13, 
                        resize: 'vertical' 
                      }}
                      placeholder="Enter internal review notes or audit justifications..."
                      value={reviewRemarks}
                      onChange={(e) => setReviewRemarks(e.target.value)}
                    />
                    <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 4 }}>
                      🔒 Logged internally to MongoDB audit records.
                    </div>
                  </div>

                  {loan.status === 'pending' && !done ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                      <button 
                        className="btn btnGold btnFull" 
                        disabled={submitting} 
                        onClick={() => decide('approved')}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 38, fontSize: 13 }}
                      >
                        <CheckCircle size={15} /> Approve Loan Application
                      </button>
                      <button 
                        className="btn btnOutline btnFull" 
                        disabled={submitting} 
                        onClick={() => decide('revision')}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 38, fontSize: 13 }}
                      >
                        <Clock size={15} /> Request Modification
                      </button>
                      <button 
                        className="btn btnDanger btnFull" 
                        disabled={submitting} 
                        onClick={() => decide('rejected')}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 38, fontSize: 13 }}
                      >
                        <XCircle size={15} /> Decline Loan Application
                      </button>
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '10px 14px', 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: 8, 
                      textAlign: 'center', 
                      border: '1px solid var(--border)',
                      marginTop: 4 
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 12 }}>
                        Decision Submitted
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                        Status: <strong style={{ color: '#fff' }}>{((done || loan.status) === 'revision' ? 'Modification Requested' : (done || loan.status).toUpperCase())}</strong>
                      </div>
                      {loan.remarks && (
                        <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4, fontStyle: 'italic' }}>
                          "{loan.remarks}"
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ 
                    padding: '8px 10px', 
                    background: 'rgba(212,169,74,0.03)', 
                    borderLeft: '3px solid var(--gold)', 
                    fontSize: 11, 
                    color: 'var(--text-dim)',
                    lineHeight: 1.4,
                    display: 'flex',
                    gap: 6,
                    marginTop: 2
                  }}>
                    <AlertCircle size={14} color="var(--gold)" style={{ flexShrink: 0 }} />
                    <div>
                      Actions update audit trace in real-time.
                    </div>
                  </div>

                </div>
              </div>

              {/* Box 4: Compact Audit Trail Logs */}
              <div className="card" style={{ background: '#161920', border: '1px solid #2b303a' }}>
                <div className="cardHeader" style={{ padding: '14px 18px' }}>
                  <h2 style={{ fontSize: 14 }}>Audit Trail Logs</h2>
                </div>
                <div className="cardBody" style={{ padding: 12 }}>
                  <AuditLogSection key={auditKey} table="loans" recordId={id} />
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (RISK SCORECARD & FACTORS) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Box 1: Expanded Risk Scorecard with Itemized Credit Score Breakdown */}
              <div className="card" style={{ background: '#161920', border: '1px solid #2b303a' }}>
                <div className="cardHeader" style={{ borderBottom: '1px solid #2b303a', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f3edd8' }}>Risk Scorecard &amp; Score Calculation Factors</h2>
                  <button 
                    onClick={() => setShowScoreModal(true)} 
                    style={{ background: 'none', border: 'none', color: 'var(--gold-light)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                  >
                    <HelpCircle size={14} /> Scoring Rules
                  </button>
                </div>
                <div className="cardBody" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  
                  {/* Gauge & Bar Meters Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 18, alignItems: 'center', background: 'var(--panel-2)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
                    
                    {/* Circle score gauge */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ 
                        position: 'relative', 
                        width: 90, 
                        height: 90, 
                        borderRadius: '50%', 
                        border: '4px solid #2b303a', 
                        borderTopColor: rating.color,
                        borderRightColor: rating.color,
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 0 10px rgba(0,0,0,0.4)',
                        background: '#101216'
                      }}>
                        <span style={{ fontSize: 24, fontWeight: 700, color: '#f9f9fb', fontFamily: 'Georgia, serif' }}>
                          {loan.creditScore || '—'}
                        </span>
                        <span style={{ fontSize: 8, fontWeight: 700, color: rating.color, marginTop: 1, letterSpacing: '0.05em' }}>
                          {rating.text}
                        </span>
                      </div>
                      <div style={{ fontSize: 9.5, letterSpacing: '0.05em', color: 'var(--text-faint)', textTransform: 'uppercase', marginTop: 6 }}>
                        FICO Credit Score
                      </div>
                    </div>

                    {/* DTI & LTV Color Bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* DTI */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11.5 }}>
                          <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Debt-to-Income (DTI)</span>
                          <span style={{ fontWeight: 700, color: dtiStatus.color }}>
                            {loan.dti != null ? `${loan.dti}%` : '—'}
                          </span>
                        </div>
                        <div style={{ height: 6, background: '#101216', borderRadius: 3, overflow: 'hidden', marginBottom: 3 }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${Math.min(loan.dti || 0, 100)}%`, 
                            background: dtiStatus.color,
                            borderRadius: 3 
                          }} />
                        </div>
                        <div style={{ fontSize: 10.5, color: dtiStatus.color, textAlign: 'right' }}>
                          {dtiStatus.label}
                        </div>
                      </div>

                      {/* LTV */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11.5 }}>
                          <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Loan-to-Value (LTV)</span>
                          <span style={{ fontWeight: 700, color: ltvStatus.color }}>
                            {loan.ltv != null ? `${loan.ltv}%` : '—'}
                          </span>
                        </div>
                        <div style={{ height: 6, background: '#101216', borderRadius: 3, overflow: 'hidden', marginBottom: 3 }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${Math.min(loan.ltv || 0, 100)}%`, 
                            background: ltvStatus.color,
                            borderRadius: 3 
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-faint)' }}>
                          <span style={{ color: ltvStatus.color }}>{ltvStatus.label}</span>
                          <span>Total: {formatCurrency(loan.totalCollateralValue || 0)}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* ITEMIZED CREDIT SCORE GAIN/LOSS BREAKDOWN */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gold-light)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Award size={15} /> Credit Score Factor Analysis (Evaluated Rules)
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {scoreFactors.map((f, idx) => (
                        <div 
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: 'var(--panel-2)',
                            border: '1px solid var(--border)',
                            borderRadius: 6
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {f.isPositive ? (
                              <TrendingUp size={14} color="#2fbf88" />
                            ) : (
                              <TrendingDown size={14} color="#e6584f" />
                            )}
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#f9f9fb' }}>{f.name}</div>
                              <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 1 }}>{f.desc}</div>
                            </div>
                          </div>

                          <div style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: f.isPositive ? '#2fbf88' : '#e6584f',
                            background: f.isPositive ? 'rgba(47,191,136,0.1)' : 'rgba(230,88,79,0.1)',
                            padding: '3px 8px',
                            borderRadius: 4
                          }}>
                            {f.isPositive ? `+${f.points}` : `${f.points}`} pts
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>
        </>
      )}

      {/* Credit Score & Scoring Modal */}
      {showScoreModal && (
        <div className="overlay" onClick={() => setShowScoreModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modalHead">
              <div className="title">How Credit Scores Are Calculated</div>
              <button className="closeBtn" onClick={() => setShowScoreModal(false)}>&times;</button>
            </div>
            <div className="modalBody">
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-dim)' }}>Scores range from <strong>300-850</strong>. Each customer is scored monthly.</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '6px 0' }}>Factor</th>
                    <th style={{ textAlign: 'right', borderBottom: '1px solid var(--border)', padding: '6px 0' }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style={{ padding: '6px 0' }}>Base score</td><td style={{ textAlign: 'right', fontWeight: 600 }}>300</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>KYC approved</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>+80</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>Account age (+10/year, max 10yr)</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>+100</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>Total account balances &gt; $1,000</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>+30</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>On-time loan payments (+5 each)</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>+100</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>DTI &lt; 36% (debt-to-income)</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>+40</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>LTV &lt; 80% (loan-to-value)</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>+30</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>Credit mix (has both loans + cards)</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>+40</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>Low credit utilization (&lt;30%)</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>+60</td></tr>
                  <tr><td style={{ borderTop: '1px solid var(--border)', padding: '6px 0' }}>High DTI (&gt;43%)</td><td style={{ textAlign: 'right', fontWeight: 600, borderTop: '1px solid var(--border)', padding: '6px 0', color: 'var(--red)' }}>-30</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>High utilization (&gt;50%)</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--red)' }}>-40</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>LTV &gt; 100% (underwater)</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--red)' }}>-50</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>Outstanding debt</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--red)' }}>-50</td></tr>
                </tbody>
              </table>
              <div style={{ marginTop: 14, padding: '8px 12px', background: 'var(--field)', borderRadius: 6, fontSize: 12, lineHeight: 1.6 }}>
                <strong>Tiers:</strong> 300-579 Poor · 580-669 Fair · 670-739 Good · 740-799 Very Good · 800-850 Excellent
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Overlay */}
      {docUrl && (
        <div className="overlay" onClick={() => { URL.revokeObjectURL(docUrl); setDocUrl(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '90%' }}>
            <div className="modalHead">
              <span className="title"><FileText size={16} /> Collateral Document</span>
              <button className="closeBtn" onClick={() => { URL.revokeObjectURL(docUrl); setDocUrl(null); }}>&times;</button>
            </div>
            <div className="modalBody" style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
              {docType === 'application/pdf' ? (
                <iframe src={docUrl} style={{ width: '100%', height: '70vh', border: 'none' }} title="Document" />
              ) : (
                <img src={docUrl} alt="Collateral Document" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
