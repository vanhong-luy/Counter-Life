"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Home, Car, Store, Calculator, Info, ArrowRight, Shield } from 'lucide-react';
import styles from './apply.module.css';
import { api } from '@/lib/api';

const LOAN_TYPE_UI = {
  Personal: { icon: <User size={18} />, desc: "Flexible funds for life's events." },
  Home: { icon: <Home size={18} />, desc: 'Mortgages and equity lines.' },
  Auto: { icon: <Car size={18} />, desc: 'Auto, RV, and marine financing.' },
  Vehicle: { icon: <Car size={18} />, desc: 'Auto, RV, and marine financing.' },
  Education: { icon: <Store size={18} />, desc: 'Financing for education and tuition.' },
  Business: { icon: <Store size={18} />, desc: 'Capital for operational growth.' },
};
const LOAN_TYPE_FALLBACK_UI = { icon: <Calculator size={18} />, desc: 'Financing for your goals.' };

export default function ApplyLoanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editLoanId = searchParams.get('edit');

  const [loanTypes, setLoanTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [amount, setAmount] = useState('15000');
  const [term, setTerm] = useState('36');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [loanResult, setLoanResult] = useState(null);
  const isEdit = !!editLoanId;

  const [collateralType, setCollateralType] = useState('');
  const [collateralValue, setCollateralValue] = useState('');
  const [collateralDocFile, setCollateralDocFile] = useState(null);
  const [collateralOtherText, setCollateralOtherText] = useState('');
  const [existingCollateral, setExistingCollateral] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const types = (await api.getLoanTypes().catch(() => [])) || [];
        setLoanTypes(types);
        if (types.length > 0) setSelectedTypeId(types[0].loanTypeId);

        if (editLoanId) {
          const [loan, collats] = await Promise.all([
            api.getLoan(editLoanId),
            api.getCollateral(editLoanId).catch(() => [])
          ]);
          const match = types.find(t => t.typeName.toLowerCase() === (loan.loanTypeName || '').toLowerCase());
          if (match) setSelectedTypeId(match.loanTypeId);
          if (loan.principalAmount) setAmount(String(loan.principalAmount));
          if (loan.loanTermMonths) setTerm(String(loan.loanTermMonths));
          if (loan.purpose) setPurpose(loan.purpose);
          if (collats && collats.length > 0) {
            const c = collats[0];
            setExistingCollateral(c);
            if (c.assetType) {
              const found = c.assetType;
              if (['Real Estate', 'Vehicle', 'Stocks', 'Other'].includes(found)) {
                setCollateralType(found);
              } else {
                setCollateralType('Other');
                setCollateralOtherText(found);
              }
            }
            if (c.estimatedValue) setCollateralValue(String(c.estimatedValue));
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load loan for editing.');
      } finally {
        setPageLoading(false);
      }
    })();
  }, [editLoanId]);

  const selectedTypeObj = loanTypes.find(t => t.loanTypeId === selectedTypeId);
  const selectedTypeUI = selectedTypeObj
    ? LOAN_TYPE_UI[selectedTypeObj.typeName] || LOAN_TYPE_FALLBACK_UI
    : LOAN_TYPE_FALLBACK_UI;

  const { estRate, monthlyPayment, totalInterest } = useMemo(() => {
    const baseRate = selectedTypeObj?.baseInterestRate != null
      ? Number(selectedTypeObj.baseInterestRate) * 100
      : 0;
    const p = parseFloat(amount) || 0;
    const r = baseRate / 100 / 12;
    const n = parseInt(term) || 36;

    let monthly = 0;
    let totalInt = 0;

    if (p > 0 && r > 0 && n > 0) {
      monthly = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      totalInt = (monthly * n) - p;
    }

    return {
      estRate: baseRate.toFixed(2) + '%',
      monthlyPayment: monthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalInterest: totalInt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  }, [selectedTypeId, amount, term]);

  const uploadCollateralFile = async (file) => {
    if (!file) return null;
    const fd = new FormData();
    fd.append('file', file);
    const data = await api.uploadCollateralDoc(fd);
    return data.fileKey;
  };

  const handleSubmit = async () => {
    setError('');

    if (!collateralType) {
      setError('Please select a collateral asset type.');
      return;
    }
    if (collateralType === 'Other' && !collateralOtherText.trim()) {
      setError('Please specify the collateral asset.');
      return;
    }
    if (!collateralValue || parseFloat(collateralValue) <= 0) {
      setError('Please enter the estimated value of your collateral.');
      return;
    }
    if (parseFloat(collateralValue) > 999999999) {
      setError('Collateral value cannot exceed $999,999,999.');
      return;
    }
    if (!isEdit && !collateralDocFile) {
      setError('Proof Document is required.');
      return;
    }

    const effectiveAssetType = collateralType === 'Other' ? collateralOtherText.trim() : collateralType;

    setLoading(true);
    try {
      const principal = parseFloat(amount);
      if (principal > 999999999) {
        setError('Loan amount cannot exceed $999,999,999.');
        setLoading(false);
        return;
      }
      const payload = {
        loanTypeId: selectedTypeObj?.loanTypeId,
        principalAmount: principal,
        interestRate: selectedTypeObj?.baseInterestRate || 0,
        loanTermMonths: parseInt(term),
        purpose: purpose || null
      };

      const result = isEdit
        ? await api.updateLoan(editLoanId, payload)
        : await api.applyForLoan(payload);

      const loanId = result?.loanId || editLoanId;

      if (loanId) {
        const proofDocumentUrl = collateralDocFile
          ? await uploadCollateralFile(collateralDocFile)
          : existingCollateral?.proofDocumentUrl || null;
        await api.addCollateral(loanId, {
          assetType: effectiveAssetType,
          estimatedValue: parseFloat(collateralValue),
          proofDocumentUrl,
        });
      }

      setLoanResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #E5E7EB', borderTopColor: '#0047AB', borderRadius: '50%', animation: 'dash-spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (loanResult) {
    setTimeout(() => router.push('/dashboard/loans'), 2000);
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <h1 style={{ color: '#16A34A', marginBottom: '16px' }}>{isEdit ? 'Loan Resubmitted!' : 'Loan Application Submitted!'}</h1>
          <p>Your application is being reviewed. Redirecting to loans page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.heading}>{isEdit ? 'Edit & Resubmit Loan' : 'Apply for a Loan'}</h1>
      {isEdit && <p style={{ color: '#6B7280', marginTop: -8, marginBottom: 20, fontSize: 15 }}>Updating previously rejected application #{editLoanId}.</p>}

      {error && (
        <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className={styles.layoutGrid}>

        <div className={styles.leftCol}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Select Loan Type</h2>
              <p className={styles.sectionSub}>Choose the product that best fits your needs.</p>
            </div>

            <div className={styles.loanTypesGrid}>
              {loanTypes.map(type => (
                <div
                  key={type.loanTypeId}
                  className={`${styles.typeCard} ${selectedTypeId === type.loanTypeId ? styles.typeCardActive : ''}`}
                  onClick={() => setSelectedTypeId(type.loanTypeId)}
                >
                  <div className={`${styles.typeIconBox} ${selectedTypeId === type.loanTypeId ? styles.typeIconBoxActive : ''}`}>
                    {(LOAN_TYPE_UI[type.typeName] || LOAN_TYPE_FALLBACK_UI).icon}
                  </div>
                  <div className={styles.typeInfo}>
                    <span className={styles.typeTitle}>{type.typeName}</span>
                    <span className={styles.typeDesc}>{(LOAN_TYPE_UI[type.typeName] || LOAN_TYPE_FALLBACK_UI).desc}</span>
                  </div>
                  {selectedTypeId === type.loanTypeId && (
                    <div className={styles.activeRing}>
                      <div className={styles.activeDot} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Loan Details</h2>

            <div className={styles.formGroup}>
              <label className={styles.label}>Requested Amount</label>
              <div className={styles.inputWrapper}>
                <span className={styles.currencySymbol}>$</span>
                <input
                  type="number"
                  className={styles.textInput}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Loan Term (Months)</label>
              <select
                className={styles.selectInput}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              >
                <option value="12">12 Months</option>
                <option value="24">24 Months</option>
                <option value="36">36 Months</option>
                <option value="48">48 Months</option>
                <option value="60">60 Months</option>
                <option value="72">72 Months</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Purpose of Loan</label>
              <textarea
                className={styles.textArea}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Briefly describe how you intend to use these funds..."
              />
            </div>
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div className={styles.previewTitleWrap}>
                <Shield size={18} color="#00327D" />
                <h2 className={styles.sectionTitle}>Collateral</h2>
              </div>
              <p className={styles.sectionSub}>Pledge an asset to secure your loan application.</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Asset Type</label>
              <select className={styles.selectInput} value={collateralType} onChange={(e) => setCollateralType(e.target.value)}>
                <option value="">Select asset type...</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Stocks">Stocks / Securities</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {collateralType === 'Other' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Please specify</label>
                <input
                  className={styles.textInput}
                  type="text"
                  value={collateralOtherText}
                  onChange={(e) => setCollateralOtherText(e.target.value)}
                  placeholder="e.g., Antique watch collection"
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>Estimated Value</label>
              <div className={styles.inputWrapper}>
                <span className={styles.currencySymbol}>$</span>
                <input className={styles.textInput} type="number" value={collateralValue} onChange={(e) => setCollateralValue(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Proof Document {isEdit ? '(optional, leave empty to keep existing)' : ''}</label>
              <input className={styles.textInput} style={{ paddingLeft: 16, paddingTop: 10, paddingBottom: 10 }} type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setCollateralDocFile(e.target.files[0])} />
              {collateralDocFile && <span style={{ fontSize: 12, color: '#737784', marginTop: 4, display: 'block' }}>{collateralDocFile.name}</span>}
              {isEdit && existingCollateral?.proofDocumentUrl && !collateralDocFile && (
                <span style={{ fontSize: 12, color: '#16A34A', marginTop: 4, display: 'block' }}>Existing document on file — upload new one to replace</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className={styles.stickyCol}>
            <div className={styles.previewDeco} />

            <div className={styles.previewContent}>
              <div className={styles.previewHeader}>
                <div className={styles.previewTitleWrap}>
                  <Calculator size={16} color="#00327D" />
                  <h3 className={styles.previewTitle}>Estimated Preview</h3>
                </div>
                <p className={styles.previewSub}>Rates auto-calculated based on current selections.</p>
              </div>

              <div>
                <div className={styles.previewRow}>
                  <span className={styles.previewRowLabel}>Est. Interest Rate (APR)</span>
                  <span className={styles.previewRowValHigh}>{estRate}</span>
                </div>
                <div className={styles.previewRow} style={{ marginTop: '16px' }}>
                  <span className={styles.previewRowLabel}>Est. Monthly Payment</span>
                  <span className={styles.previewRowValMain}>${monthlyPayment}</span>
                </div>
                <div className={styles.previewRow} style={{ marginTop: '16px', borderBottom: 'none', paddingBottom: '0' }}>
                  <span className={styles.previewRowLabel}>Total Interest</span>
                  <span className={styles.previewRowValSub}>${totalInterest}</span>
                </div>
              </div>

              <div className={styles.infoAlert}>
                <Info size={16} className={styles.alertIcon} />
                <span>This is an estimate. Final rates are determined during the review step based on your credit profile.</span>
              </div>

              <div className={styles.actions}>
                <button className={styles.primaryBtn} onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Submitting...' : <>Submit Application <ArrowRight size={16} /></>}
                </button>
                <Link href="/dashboard/loans" className={styles.secondaryBtn} style={{textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Cancel</Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
