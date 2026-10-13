'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import styles from './success.module.css';

export default function Success() {
  const router = useRouter();
  const { user } = useAuth();

  const handleGoToDashboard = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.card}>
        
        <div className={styles.iconBox}>
          <div className={styles.iconCircle} style={{ background: '#E6A23C' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        </div>

        <h1 className={styles.heading}>Verification Pending</h1>
        
        <p className={styles.subText}>
          Your documents have been successfully submitted and are currently under review. Please wait for approval. Once approved, a button will appear here for you to access your dashboard.
        </p>

        <div className={styles.actions}>
          <button onClick={handleGoToDashboard} className={styles.primaryBtn}>
            Go to Dashboard (Demo)
          </button>
        </div>

      </div>
    </div>
  );
}
