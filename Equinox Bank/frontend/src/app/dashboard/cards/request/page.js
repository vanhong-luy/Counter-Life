'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, CreditCard } from 'lucide-react';
import styles from './request.module.css';
import { api } from '@/lib/api';

export default function RequestCardPage() {
  const router = useRouter();

  const [network, setNetwork] = useState('visa');
  const [cardType, setCardType] = useState('debit');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [cardTypes, setCardTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [data, types] = await Promise.all([
          api.getAccounts(),
          api.getCardTypes().catch(() => [])
        ]);
        const list = Array.isArray(data) ? data : (data.accounts || []);
        setAccounts(list);
        setCardTypes(Array.isArray(types) ? types : []);
        if (list.length > 0) {
          setLinkedAccountId(list[0].accountId);
        }
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  const getCardTypeId = () => {
    const net = network === 'visa' ? 'Visa' : 'Mastercard';
    const match = cardTypes.find(t => t.network === net && t.typeName === cardType);
    return match ? match.cardTypeId : null;
  };

  const selectedCreditType = cardTypes.find(t => t.typeName === 'credit');
  const creditApr = selectedCreditType?.defaultApr != null
    ? (Number(selectedCreditType.defaultApr) * 100).toFixed(2)
    : null;

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.issueCard({
        cardTypeId: getCardTypeId(),
        accountId: Number(linkedAccountId),
      });
      setModalTitle('Success');
      setModalMessage('Card request submitted successfully!');
      setModalOpen(true);
      setTimeout(() => router.push('/dashboard/cards'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedAcc = accounts.find(a => (a.id || a.accountId) == linkedAccountId);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <div style={{ display: 'flex' }}>
          <Link href="/dashboard/cards" className={styles.backLink}>
            <ArrowLeft size={16} />
            Back to Cards
          </Link>
        </div>
        <h1 className={styles.heading}>Request New Card</h1>
        <p className={styles.subText}>Configure your new Equinox physical card. Delivery typically takes 3-5 business days.</p>
      </div>

      {error && (
        <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <form className={styles.contentGrid} onSubmit={handleRequest}>
        <div className={styles.formSection}>
          <div className={styles.formGroup}>
            <h3 className={styles.sectionTitle}>Select Network</h3>
            <div className={styles.cardOptionsGrid}>
              <div
                className={`${styles.optionCard} ${network === 'visa' ? styles.selected : ''}`}
                onClick={() => setNetwork('visa')}
              >
                <div className={styles.optionTop}>
                  <div className={styles.networkLogo}>VISA</div>
                  {network === 'visa' && <CheckCircle2 size={20} className={styles.checkIcon} />}
                </div>
                <div>
                  <p className={styles.optionTitle}>Equinox Visa Signature</p>
                  <p className={styles.optionDesc}>Global acceptance, premium travel perks.</p>
                </div>
              </div>
              <div
                className={`${styles.optionCard} ${network === 'mastercard' ? styles.selected : ''}`}
                onClick={() => setNetwork('mastercard')}
              >
                <div className={styles.optionTop}>
                  <div style={{display: 'flex'}}>
                    <div style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#EB001B', zIndex: 2}}></div>
                    <div style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#F79E1B', marginLeft: -10, zIndex: 1}}></div>
                  </div>
                  {network === 'mastercard' && <CheckCircle2 size={20} className={styles.checkIcon} />}
                </div>
                <div>
                  <p className={styles.optionTitle}>Equinox World Elite</p>
                  <p className={styles.optionDesc}>Exclusive experiences, enhanced security.</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <h3 className={styles.sectionTitle}>Card Type</h3>
            <div className={styles.cardOptionsGrid}>
              <div
                className={`${styles.optionCard} ${cardType === 'debit' ? styles.selected : ''}`}
                onClick={() => setCardType('debit')}
              >
                <div className={styles.optionTop}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                    <div style={{width: 32, height: 32, borderRadius: 8, background: '#F3F3FC', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <CreditCard size={16} color="#434653" />
                    </div>
                    <div>
                      <p className={styles.optionTitle}>Debit Card</p>
                      <p className={styles.optionDesc}>Linked directly to your checking account.</p>
                    </div>
                  </div>
                  {cardType === 'debit' && <CheckCircle2 size={20} className={styles.checkIcon} />}
                </div>
              </div>
              <div
                className={`${styles.optionCard} ${cardType === 'credit' ? styles.selected : ''}`}
                onClick={() => setCardType('credit')}
              >
                <div className={styles.optionTop}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                    <div style={{width: 32, height: 32, borderRadius: 8, background: '#F3F3FC', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <CreditCard size={16} color="#434653" />
                    </div>
                    <div>
                      <p className={styles.optionTitle}>Credit Card</p>
                      <p className={styles.optionDesc}>Subject to credit approval.</p>
                    </div>
                  </div>
                  {cardType === 'credit' && <CheckCircle2 size={20} className={styles.checkIcon} />}
                </div>
                {cardType === 'credit' && (
                  <div style={{marginTop: 8, fontSize: 12, color: '#737784', padding: '8px 12px', background: '#F8F9FC', borderRadius: 6}}>
                    Your credit limit and APR will be determined based on your credit score at the time of approval.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.accountDeliveryPanel}>
            <h3 className={styles.sectionTitle}>Account</h3>
            <div className={styles.inputGroup}>
              <div className={styles.labelRow}>
                <label className={styles.inputLabel}>Linked Account</label>
              </div>
              <select
                className={styles.selectInput}
                value={linkedAccountId}
                onChange={(e) => setLinkedAccountId(e.target.value)}
              >
                {accounts.map(acc => {
                  const id = acc.id || acc.accountId;
                  const name = acc.name || acc.accountName || `Account ${id}`;
                  const bal = acc.balance || acc.currentBalance;
                  return (
                    <option key={id} value={id}>
                      {name} {bal !== undefined ? `- $${Number(bal).toLocaleString('en-US', {minimumFractionDigits: 2})}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.summarySidebar}>
          <div>
            <h3 className={styles.summaryTitle}>Request Summary</h3>
            <div style={{marginTop: 24}}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Network</span>
                <span className={styles.summaryValue}>{network === 'visa' ? 'Visa Signature' : 'Mastercard World Elite'}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Type</span>
                <span className={styles.summaryValue}>{cardType === 'debit' ? 'Debit' : 'Credit'}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Linked Account</span>
                <span className={styles.summaryValue}>
                  {selectedAcc ? (selectedAcc.name || selectedAcc.accountName || `Account ${selectedAcc.accountId}`) : 'None'}
                </span>
              </div>
              <div className={styles.summaryDivider}></div>
              {cardType === 'credit' && creditApr && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Credit APR</span>
                  <span className={styles.summaryValue}>{creditApr}%</span>
                </div>
              )}
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Card Fee</span>
                <span className={styles.summaryValue}>$0.00</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Standard Delivery</span>
                <span className={styles.summaryValue}>Free</span>
              </div>
            </div>
          </div>
          <div>
            <button type="submit" className={styles.primaryBtn} disabled={loading}>
              {loading ? 'Submitting...' : 'Confirmed'}
            </button>
            <Link href="/dashboard/cards" className={styles.cancelBtn}>
              Cancel
            </Link>
            <p className={styles.termsText}>
              By requesting this card, you agree to the <a href="#">Cardholder Agreement</a>.
            </p>
          </div>
        </div>
      </form>

      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <h3 className={styles.modalTitle}>{modalTitle}</h3>
            <p className={styles.modalMessage}>{modalMessage}</p>
            <button className={styles.modalCloseBtn} onClick={() => setModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
