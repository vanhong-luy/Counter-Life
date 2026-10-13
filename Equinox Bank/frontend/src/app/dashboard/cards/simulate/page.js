'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import styles from './simulate.module.css';

function SimulatePurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCardId = searchParams.get('id') || '';

  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(initialCardId);
  const [merchant, setMerchant] = useState('Test Merchant');
  const [amount, setAmount] = useState('0');
  const [isOnline, setIsOnline] = useState(false);
  const [isInternational, setIsInternational] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getCards();
        const list = Array.isArray(data) ? data : (data.cards || []);
        setCards(list);
        if (!initialCardId && list.length > 0) {
          setSelectedCard(list[0].cardId);
        }
      } catch {
        setCards([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleKeyPress = (key) => {
    if (result) return;
    if (key === 'CLEAR') {
      setAmount('0');
    } else if (amount === '0') {
      setAmount(key);
    } else if (amount.length < 8) {
      setAmount(amount + key);
    }
  };

  const handleCancel = () => {
    router.push(selectedCard ? `/dashboard/cards/details?id=${selectedCard}` : '/dashboard/cards');
  };

  const handleConfirm = async () => {
    if (submitting || result || amount === '0' || !selectedCard) return;
    setSubmitting(true);
    try {
      const data = await api.simulatePurchase(selectedCard, {
        amount: parseFloat(amount),
        merchant,
        description: `Test purchase at ${merchant}`,
        isOnline,
        isInternational,
      });
      setResult({ success: true, data });
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setAmount('0');
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.posMachine}>
          <div className={styles.posHeader}>EQUINOX POS TERMINAL</div>
          <div className={styles.posScreen}>
            <div style={{ textAlign: 'center', padding: '40px', color: '#38BDF8' }}>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.posMachine}>
        <div className={styles.posHeader}>EQUINOX POS TERMINAL</div>

        <div className={styles.posScreen}>
          {result ? (
            <div className={styles.resultOverlay}>
              {result.success ? (
                <>
                  <div className={styles.resultTextSuccess}>
                    PURCHASE APPROVED<br /><br />
                    ${Number(result.data.amount).toFixed(2)} AT {merchant.toUpperCase()}
                  </div>
                  <div className={styles.resultSub}>
                    {result.data.cardType === 'credit' ? 'Charged to credit line' : 'Deducted from linked account'}
                    {result.data.remainingDailyLimit != null && (
                      <><br />Remaining daily limit: ${Number(result.data.remainingDailyLimit).toFixed(2)}</>
                    )}
                    {result.data.remainingMonthlyLimit != null && (
                      <><br />Remaining monthly limit: ${Number(result.data.remainingMonthlyLimit).toFixed(2)}</>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.resultTextFail}>PURCHASE DECLINED</div>
                  <div className={styles.resultSub}>{result.message}</div>
                </>
              )}
              <button className={styles.receiptBtn} onClick={handleRetry}>
                TRY ANOTHER PURCHASE
              </button>
              <button className={styles.receiptBtn} onClick={handleCancel}>
                RETURN TO CARD
              </button>
            </div>
          ) : (
            <>
              <div className={styles.screenTitle}>SIMULATE PURCHASE</div>

              <div className={styles.screenContent}>
                <select
                  className={styles.cardSelect}
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                >
                  {cards.map(c => (
                    <option key={c.cardId} value={c.cardId}>
                      {c.cardTypeNetwork} {c.cardTypeName} **** {(c.cardNumber || '').slice(-4)}
                      {c.isFrozen ? ' (FROZEN)' : ''}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  className={styles.merchantInput}
                  placeholder="Merchant name"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                />

                <div className={styles.amountDisplay}>
                  <span>$</span> {amount}
                </div>

                <div className={styles.togglesRow}>
                  <label className={styles.toggleItem}>
                    <span className={styles.miniSwitch}>
                      <input type="checkbox" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)} />
                      <span className={styles.miniSlider}></span>
                    </span>
                    Online Purchase
                  </label>
                  <label className={styles.toggleItem}>
                    <span className={styles.miniSwitch}>
                      <input type="checkbox" checked={isInternational} onChange={(e) => setIsInternational(e.target.checked)} />
                      <span className={styles.miniSlider}></span>
                    </span>
                    International Purchase
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {!result && (
          <div className={styles.hardwarePanel}>
            <div className={styles.keypad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <div key={num} className={styles.keyBtn} onClick={() => handleKeyPress(num.toString())}>
                  {num}
                </div>
              ))}
              <div className={styles.keyBtn} onClick={() => handleKeyPress('0')}>0</div>
              <div className={styles.keyBtn} onClick={() => handleKeyPress('CLEAR')}>CLR</div>
            </div>

            <div className={styles.actionPad}>
              <button className={`${styles.actionBtn} ${styles.btnCancel}`} onClick={handleCancel}>
                CANCEL
              </button>
              <button
                className={`${styles.actionBtn} ${styles.btnConfirm}`}
                onClick={handleConfirm}
                disabled={submitting || amount === '0' || !selectedCard}
              >
                {submitting ? 'PROCESSING...' : 'PAY'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SimulatePurchasePage() {
  return (
    <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center' }}>Loading...</div>}>
      <SimulatePurchaseContent />
    </Suspense>
  );
}
