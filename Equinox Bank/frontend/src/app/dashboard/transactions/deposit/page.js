'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import styles from './deposit.module.css';

export default function DepositPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCard, setSelectedCard] = useState('');
  const [amount, setAmount] = useState('0');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [accts, cardData] = await Promise.all([api.getAccounts(), api.getCards()]);
        const eligible = (accts || []).filter(a => {
          const type = a.accountTypeName?.toLowerCase();
          return type !== 'loan disbursement' && type !== 'fixed deposit';
        });
        setAccounts(eligible);
        setCards(Array.isArray(cardData) ? cardData : []);
        if (eligible.length > 0) {
          setSelectedAccount(eligible[0].id || eligible[0].accountId);
        }
      } catch {
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const eligibleAccountIds = new Set(accounts.map(a => String(a.id || a.accountId)));
  const selectableCards = cards.filter(c => eligibleAccountIds.has(String(c.accountId)));
  const selectedCardObj = selectableCards.find(c => String(c.cardId) === String(selectedCard));
  const accountOptions = selectedCard
    ? accounts.filter(a => String(a.id || a.accountId) === String(selectedCardObj?.accountId))
    : accounts;

  const handleCardChange = (cardId) => {
    setSelectedCard(cardId);
    setError('');
    if (cardId) {
      const card = selectableCards.find(c => String(c.cardId) === String(cardId));
      if (card) setSelectedAccount(card.accountId);
    }
  };

  const handleAccountChange = (accId) => {
    setSelectedAccount(accId);
    setError('');
  };

  const handleKeyPress = (key) => {
    if (isSuccess) return;
    if (key === 'CLEAR') {
      setAmount('0');
    } else {
      if (amount === '0') {
        setAmount(key);
      } else if (amount.length < 8) {
        setAmount(amount + key);
      }
    }
  };

  const handleQuickCash = (val) => {
    if (isSuccess) return;
    setAmount(val.toString());
  };

  const handleConfirm = async () => {
    if (isSuccess || amount === '0') return;
    setError('');

    if (selectedCardObj?.isFrozen) {
      setError('This card is frozen — ATM transactions are not allowed until it is unfrozen.');
      return;
    }

    const depositAmount = parseFloat(amount);
    const accId = selectedAccount;

    try {
      await api.deposit({ accountId: accId, amount: depositAmount, cardId: selectedCard || undefined });

      setReceiptData({
        amount: depositAmount.toFixed(2),
        account: accounts.find(a => (a.id || a.accountId) === accId)?.name || 'Account',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        ref: `DEP-${Date.now()}`
      });
      setIsSuccess(true);
    } catch (err) {
      setError(err.message || 'Transaction failed.');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/transactions');
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.atmMachine}>
          <div className={styles.atmHeader}>EQUINOX ATM NETWORK</div>
          <div className={styles.atmScreen}>
            <div style={{ textAlign: 'center', padding: '40px', color: '#0047AB' }}>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.atmMachine}>
        <div className={styles.atmHeader}>EQUINOX ATM NETWORK</div>
        
        <div className={styles.atmScreen}>
          {isSuccess ? (
            <div className={styles.successOverlay}>
              <div className={styles.successText}>
                DEPOSIT SUCCESSFUL<br/><br/>
                ${receiptData.amount}<br/>
                ADDED TO {receiptData.account.toUpperCase()}<br/><br/>
                REF: {receiptData.ref}
              </div>
              <button className={styles.receiptBtn} onClick={handleCancel}>
                RETURN TO MENU (TAKE RECEIPT)
              </button>
            </div>
          ) : (
            <>
              <div className={styles.screenTitle}>CASH DEPOSIT</div>
              
              <div className={styles.screenContent}>
                <select
                  className={styles.accountSelect}
                  value={selectedCard}
                  onChange={(e) => handleCardChange(e.target.value)}
                >
                  <option value="">No Card (Account Only)</option>
                  {selectableCards.map(c => (
                    <option key={c.cardId} value={c.cardId}>
                      {c.cardTypeNetwork || 'Card'} •••• {(c.cardNumber || '').slice(-4) || '0000'}{c.isFrozen ? ' — FROZEN' : ''}
                    </option>
                  ))}
                </select>

                <select
                  className={styles.accountSelect}
                  value={selectedAccount}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  disabled={!!selectedCard}
                >
                  {accountOptions.map(acc => (
                    <option key={acc.id || acc.accountId} value={acc.id || acc.accountId}>
                      {acc.name || acc.accountTypeName} ({acc.accountNumber?.slice(-4) || '****'})
                    </option>
                  ))}
                </select>

                <div className={styles.amountDisplay}>
                  <span>$</span> {amount}
                </div>
                {error && <div className={styles.errorText}>{error}</div>}
              </div>

              <div className={styles.screenFooter}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div className={`${styles.screenBtn} ${styles.left}`} onClick={() => handleQuickCash(100)} style={{cursor: 'pointer'}}> $100</div>
                  <div className={`${styles.screenBtn} ${styles.left}`} onClick={() => handleQuickCash(500)} style={{cursor: 'pointer'}}> $500</div>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-end'}}>
                  <div className={`${styles.screenBtn} ${styles.right}`} onClick={() => handleQuickCash(1000)} style={{cursor: 'pointer'}}>$1000 </div>
                  <div className={`${styles.screenBtn} ${styles.right}`} onClick={() => handleQuickCash(2000)} style={{cursor: 'pointer'}}>$2000 </div>
                </div>
              </div>
            </>
          )}
        </div>

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
            <button className={`${styles.actionBtn} ${styles.btnConfirm}`} onClick={handleConfirm}>
              CONFIRM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
