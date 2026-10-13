'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, CreditCard } from 'lucide-react';
import styles from './cards.module.css';
import { api } from '@/lib/api';

function getCardTheme(card) {
  const network = (card.cardTypeNetwork || '').toLowerCase();
  if (network.includes('mastercard')) return 'cardDark';
  return 'cardBlue';
}

function buildLabel(network, typeName) {
  return `${network || ''} ${typeName || ''}`.trim();
}

export default function CardsPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getCards();
        setCards(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load cards');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <style>{`@keyframes dash-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #E5E7EB', borderTopColor: '#0047AB', borderRadius: '50%', animation: 'dash-spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px', color: '#C0392B' }}>
          <p>Failed to load cards: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <div className={styles.headerText}>
          <h1 className={styles.heading}>My Cards</h1>
          <p className={styles.subText}>Manage and monitor your Equinox debit and credit cards.</p>
        </div>
        <Link href="/dashboard/cards/request" className={styles.primaryBtn}>
          <Plus size={18} />
          Request New Card
        </Link>
      </div>

      {cards.length === 0 ? (
        <p style={{ color: '#6B7280', textAlign: 'center', padding: '40px' }}>No cards found.</p>
      ) : (
        <div className={styles.cardsGrid}>
          {cards.map((card) => {
            const theme = getCardTheme(card);
            const label = buildLabel(card.cardTypeNetwork, card.cardTypeName);
            const last4 = (card.cardNumber || '').slice(-4);
            return (
              <Link href={`/dashboard/cards/details?id=${card.cardId}`} key={card.cardId} className={`${styles.cardVisual} ${styles[theme] || styles.cardBlue}`}>
                <div className={styles.cardTop}>
                  <div className={styles.cardTypeInfo}>
                    <span className={styles.cardTypeLabel}>{label}</span>
                  </div>
                  <div className={styles.contactlessIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8.5 16.5a7 7 0 0 1 0-9"></path>
                      <path d="M11.5 18a9 9 0 0 1 0-12"></path>
                      <path d="M14.5 19.5a11 11 0 0 1 0-15"></path>
                      <path d="M17.5 21a13 13 0 0 1 0-18"></path>
                    </svg>
                  </div>
                </div>

                <div className={styles.cardNumber}>
                  <span className={styles.cardDots}>**** **** ****</span>
                  {last4}
                </div>

                <div className={styles.cardBottom}>
                  <div className={styles.cardHolderInfo}>
                    <span className={styles.cardLabel}>CARD HOLDER</span>
                    <span className={styles.cardValue}>{card.cardholderName || card.cardholder || 'Cardholder'}</span>
                  </div>
                  <div className={styles.cardExpiresInfo}>
                    <span className={styles.cardLabel}>EXPIRES</span>
                    <span className={styles.cardValue}>{card.expiryDate ? String(card.expiryDate).substring(0, 7) : 'N/A'}</span>
                  </div>
                  <div className={styles.networkLogo}>
                    {card.cardTypeNetwork === 'Mastercard' ? (
                      <div style={{display: 'flex'}}>
                        <div style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#EB001B', zIndex: 2}}></div>
                        <div style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#F79E1B', marginLeft: -10, zIndex: 1}}></div>
                      </div>
                    ) : (
                      <span style={{fontWeight: 700, fontSize: '16px', letterSpacing: '2px'}}>{card.cardTypeNetwork || 'VISA'}</span>
                    )}
                  </div>
                </div>

                {card.isFrozen && (
                  <div className={styles.frozenOverlay}>
                    <CreditCard size={24} />
                    FROZEN
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
