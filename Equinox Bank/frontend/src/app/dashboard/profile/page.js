'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Mail, Smartphone, Home, Edit2, RefreshCw, X, LogOut } from 'lucide-react';
import styles from './profile.module.css';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';

function getScoreStatus(score) {
  if (score >= 800) return 'Exceptional';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

function getUserInitials(user) {
  if (!user) return '';
  const first = user.firstName || user.firstname || '';
  const last = user.lastName || user.lastname || '';
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

function getUserFullName(user) {
  if (!user) return '';
  const first = user.firstName || user.firstname || '';
  const last = user.lastName || user.lastname || '';
  if (first || last) return `${first} ${last}`.trim();
  return user.email || '';
}

function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function ProfilePage() {
  const { user, loading: authLoading, logout, updateUser } = useAuth();
  const [showContactModal, setShowContactModal] = useState(false);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [updating, setUpdating] = useState(false);
  const [profileBlob, setProfileBlob] = useState(null);

  useEffect(() => {
    if (user?.profilePhotoUrl) {
      api.getProfilePhotoBlob().then(url => { if (url) setProfileBlob(url); });
    }
    return () => { if (profileBlob) URL.revokeObjectURL(profileBlob); };
  }, [user?.profilePhotoUrl]);

  const openContactModal = () => {
    setEmail(user?.email || '');
    setAddress(user?.address || '');
    setShowContactModal(true);
  };

  const handleSaveContact = async () => {
    setUpdating(true);
    try {
      const updated = await api.updateProfile({ email, address });
      updateUser(updated);
      setShowContactModal(false);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading) {
    return (
      <div className={styles.pageContainer}>
        <style>{`@keyframes dash-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #E5E7EB', borderTopColor: '#0047AB', borderRadius: '50%', animation: 'dash-spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
          <p>Unable to load profile. Please sign in again.</p>
        </div>
      </div>
    );
  }

  const score = user.creditScore || user.credit_score || 0;
  const scoreStatus = getScoreStatus(score);
  const initials = getUserInitials(user);
  const fullName = getUserFullName(user);
  const kycVerified = ['approved', 'verified'].includes((user.kycStatus || user.kyc_status || '').toLowerCase());
  const phone = user.phoneNumber || user.phone_number || user.phone || '';
  const memberSince = formatDate(user.createdAt || user.created_at);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <h1 className={styles.heading}>Profile Settings</h1>
        <p className={styles.subText}>Manage your personal information and security preferences.</p>
      </div>

      <div className={styles.profileHeaderCard}>
        <div className={styles.userProfileLeft}>
          <div className={`${styles.avatar} ${user.profilePhotoUrl ? styles.avatarWithPhoto : ''}`}>
            {user.profilePhotoUrl && profileBlob ? (
              <img src={profileBlob} alt={fullName} className={styles.avatarImg}
                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.remove(styles.avatarWithPhoto); }} />
            ) : (
              <span>{initials}</span>
            )}
            <div className={styles.editBadge} onClick={openContactModal}>
              <Edit2 size={14} />
            </div>
          </div>
          
          <div className={styles.userInfo}>
            <div className={styles.userName}>
              {fullName}
              {kycVerified && (
                <span className={styles.kycBadge}>
                  <Shield size={12} />
                  KYC Verified
                </span>
              )}
            </div>
            {memberSince && (
              <span className={styles.memberSince}>Member since {memberSince}</span>
            )}
          </div>
        </div>

        <div className={styles.equinoxScore}>
          <span className={styles.scoreLabel}>EQUINOX SCORE</span>
          <span className={styles.scoreValue}>{score}</span>
          <span className={styles.scoreStatus}>{scoreStatus}</span>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            Contact Information
          </div>
          <div className={styles.cardBody}>
            <div className={styles.infoRow}>
              <Mail className={styles.infoIcon} size={20} />
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>Email Address</span>
                <span className={styles.infoValue}>{user.email || ''}</span>
              </div>
            </div>

            <div className={styles.infoRow}>
              <Smartphone className={styles.infoIcon} size={20} />
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>Mobile Phone</span>
                <span className={styles.infoValue}>{phone || 'ΓÇö'}</span>
              </div>
            </div>

            <div className={styles.infoRow}>
              <Home className={styles.infoIcon} size={20} />
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>Primary Residence</span>
                <span className={styles.infoValue} style={{ whiteSpace: 'pre-line' }}>
                  {user.address || 'ΓÇö'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showContactModal && (
        <div className={styles.modalOverlay} onClick={() => setShowContactModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Update Contact Info</h3>
              <button className={styles.closeModalBtn} onClick={() => setShowContactModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Mobile Phone (Cannot be changed)</label>
                <input type="text" value={phone || 'ΓÇö'} disabled className={styles.textInput} style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.textInput} />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Primary Residence</label>
                <textarea 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  className={styles.textInput} 
                  rows={4}
                  style={{ resize: 'none' }}
                />
              </div>

              <button 
                className={styles.submitBtn} 
                onClick={handleSaveContact}
                disabled={updating}
              >
                <RefreshCw size={16} />
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.signOutSection}>
        <div className={styles.signOutDivider} />
        <button onClick={logout} className={styles.signOutBtn}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
