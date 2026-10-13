'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import styles from './kyc.module.css';

export default function KycPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState('National ID');
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  

  
  // Edit mode for rejected document
  const [isEditing, setIsEditing] = useState(false);

  // Document preview modal
  const [previewModal, setPreviewModal] = useState(false);
  const [docFileUrl, setDocFileUrl] = useState(null);
  const [docFileType, setDocFileType] = useState('');
  const [docBackFileUrl, setDocBackFileUrl] = useState(null);
  const [docBackFileType, setDocBackFileType] = useState('');

  // Profile photo blob state
  const [photoBlobUrl, setPhotoBlobUrl] = useState(null);

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const kycStatus = (user?.kycStatus || 'pending').toLowerCase();
  const hasPhoto = !!user?.profilePhotoUrl;

  useEffect(() => {
    if (kycStatus === 'approved' || kycStatus === 'verified') {
      router.replace('/dashboard');
      return;
    }
    loadData();
  }, []);

  useEffect(() => {
    if (hasPhoto) {
      api.getProfilePhotoBlob().then(url => { if (url) setPhotoBlobUrl(url); });
    }
    return () => {
      if (photoBlobUrl) {
        URL.revokeObjectURL(photoBlobUrl);
        setPhotoBlobUrl(null);
      }
    };
  }, [hasPhoto]);

  const loadData = async () => {
    setLoading(true);
    try {
      const d = await api.getKycDocuments().catch(() => []);
      setDocs(d || []);
      if (d && d.length > 0) {
        // Select latest doc type by default
        const latestDoc = d.reduce((a, b) =>
          new Date(a.uploadedAt) > new Date(b.uploadedAt) ? a : b
        );
        if (latestDoc?.documentType) {
          setDocType(latestDoc.documentType);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (text, type) => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const latestDoc = docs.length > 0 ? docs.reduce((a, b) =>
    new Date(a.uploadedAt) > new Date(b.uploadedAt) ? a : b
  ) : null;

  const currentReviewStatus = (latestDoc?.reviewStatus || kycStatus).toLowerCase();
  const isRejected = currentReviewStatus === 'rejected';

  const openDocumentPreview = async () => {
    if (!latestDoc) return;
    if (docFileUrl) { URL.revokeObjectURL(docFileUrl); setDocFileUrl(null); }
    if (docBackFileUrl) { URL.revokeObjectURL(docBackFileUrl); setDocBackFileUrl(null); }
    try {
      const token = localStorage.getItem('jwt_token');
      
      // Open modal first so user sees loading state
      setPreviewModal(true);

      const [frontRes, backRes] = await Promise.all([
        fetch(`/auth/kyc/documents/${latestDoc.documentId}/file?side=front`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`/auth/kyc/documents/${latestDoc.documentId}/file?side=back`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      if (frontRes && frontRes.ok) {
        const blob = await frontRes.blob();
        setDocFileType(blob.type);
        setDocFileUrl(URL.createObjectURL(blob));
      } else {
        showMsg('Could not load front document preview.', 'error');
      }

      if (backRes && backRes.ok) {
        const backBlob = await backRes.blob();
        setDocBackFileType(backBlob.type);
        setDocBackFileUrl(URL.createObjectURL(backBlob));
      }
    } catch (err) {
      showMsg('Could not load document preview.', 'error');
    }
  };

  const handleFrontChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      alert('Invalid file format. Please upload JPG, PNG, or PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }
    setFrontFile(file);
  };

  const handleBackChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      alert('Invalid file format. Please upload JPG, PNG, or PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }
    setBackFile(file);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Invalid photo format. Please upload JPG or PNG.');
      return;
    }
    setProfilePhoto(file);
  };

  const submitAll = async () => {
    if (!latestDoc && !frontFile) {
      showMsg('Please upload the front of your document.', 'error');
      return;
    }
    if (isRejected && isEditing && !frontFile && !profilePhoto) {
      showMsg('Please select a new document or profile photo to re-submit.', 'error');
      return;
    }

    setUploading(true);
    try {
      if (profilePhoto) {
        const fd = new FormData();
        fd.append('file', profilePhoto);
        const updated = await api.uploadProfilePhoto(fd);
        updateUser(updated);
      }

      if (frontFile) {
        const fd = new FormData();
        fd.append('file', frontFile);
        if (backFile) fd.append('backFile', backFile);
        fd.append('documentType', docType);
        if (isRejected && latestDoc?.documentId) {
          fd.append('documentId', latestDoc.documentId);
        }
        await api.uploadKyc(fd);
      }

      showMsg('Submitted successfully.', 'success');
      setFrontFile(null);
      setBackFile(null);
      setProfilePhoto(null);
      setIsEditing(false);
      await loadData();
    } catch (err) {
      showMsg(err.message || 'Failed to submit.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const statusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return { cls: styles.pillApproved, label: 'Approved' };
    if (s === 'rejected') return { cls: styles.pillRejected, label: 'Rejected' };
    return { cls: styles.pillPending, label: 'Pending Review' };
  };

  // Determine if document section should render upload inputs
  const hasExistingDoc = !!latestDoc;
  const showUploadBoxes = !hasExistingDoc || (isRejected && isEditing);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        <div className={styles.headerContent}>
          <h1 className={styles.heading}>Identity Verification</h1>
          <p className={styles.subText}>
            {isRejected
              ? 'Your previous verification was rejected. Please review the details below and update your documents.'
              : 'Securely upload your documentation to access full banking features.'}
          </p>
        </div>

        {msg && (
          <div className={msgType === 'error' ? styles.errorMsg : styles.successMsg}>
            {msg}
          </div>
        )}

        <div className={styles.singleCol}>
          {/* Status & Remarks Card */}
          <div className={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className={styles.label}>Verification Status</span>
                <div style={{ fontSize: 13, color: '#737784', marginTop: 2 }}>
                  {latestDoc ? `Last updated ${new Date(latestDoc.uploadedAt).toLocaleDateString()}` : 'No documents submitted yet'}
                </div>
              </div>
              <span className={`${styles.pill} ${statusBadge(currentReviewStatus).cls}`}>
                {statusBadge(currentReviewStatus).label}
              </span>
            </div>

            {/* If rejected or has remarks, show notes banner right under status */}
            {latestDoc?.remarks && (
              <div className={styles.remarksBanner}>
                <div className={styles.remarksTitle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  Reviewer Notes:
                </div>
                <div className={styles.remarksContent}>
                  {latestDoc.remarks}
                </div>
              </div>
            )}
          </div>

          {/* Profile Photo Card */}
          <div className={styles.card}>
            <div className={styles.sectionGroup}>
              <label className={styles.label}>Profile Photo</label>
              
              {hasPhoto && photoBlobUrl && !profilePhoto ? (
                <div className={styles.photoContainer}>
                  <img src={photoBlobUrl} alt="Profile" className={styles.photoPreview} />
                  <div className={styles.photoDetails}>
                    <span className={styles.photoStatusText}>Profile Photo Uploaded</span>
                    {(isRejected || isEditing || !hasExistingDoc) && (
                      <button
                        type="button"
                        className={styles.pencilEditBtn}
                        style={{ marginTop: 8, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        onClick={() => photoInputRef.current?.click()}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        Change Photo
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.uploadBox} onClick={() => photoInputRef.current?.click()}>
                  <div className={styles.uploadIconBox}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <span className={styles.uploadText}>
                    {profilePhoto ? profilePhoto.name : (hasPhoto ? 'Click to change profile photo' : 'Click to select profile photo')}
                  </span>
                </div>
              )}

              <input
                type="file"
                ref={photoInputRef}
                style={{ display: 'none' }}
                accept="image/jpeg,image/png"
                onChange={handlePhotoChange}
              />
            </div>
          </div>

          {/* Document Section Card */}
          <div className={styles.card}>
            {/* Document Type Selector (National ID vs Passport) */}
            <div className={styles.sectionGroup}>
              <label className={styles.label}>Document Type</label>
              <div className={styles.toggleContainer}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${docType === 'National ID' ? styles.active : ''}`}
                  onClick={() => {
                    setDocType('National ID');
                    setFrontFile(null);
                    setBackFile(null);
                  }}
                  disabled={hasExistingDoc && !isEditing}
                >
                  National ID
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${docType === 'Passport' ? styles.active : ''}`}
                  onClick={() => {
                    setDocType('Passport');
                    setFrontFile(null);
                    setBackFile(null);
                  }}
                  disabled={hasExistingDoc && !isEditing}
                >
                  Passport
                </button>
              </div>
            </div>

            {/* Document Display OR Upload Boxes */}
            {!showUploadBoxes ? (
              /* Existing Submitted Document Summary with View and Edit (if rejected) */
              <div className={styles.submittedDocCard}>
                <div className={styles.submittedDocHeader}>
                  <div>
                    <span className={styles.submittedDocType}>{latestDoc.documentType}</span>
                    <span className={styles.submittedDocDate}>
                      Submitted on {new Date(latestDoc.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {isRejected && (
                    <button
                      type="button"
                      className={styles.pencilEditBtn}
                      title="Edit / Re-submit document"
                      onClick={() => setIsEditing(true)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                      Edit Document
                    </button>
                  )}
                </div>

                <div className={styles.docViewRow}>
                  <button
                    type="button"
                    className={styles.viewBtn}
                    onClick={openDocumentPreview}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View Document
                  </button>
                </div>
              </div>
            ) : (
              /* Upload Boxes mode (No document uploaded yet OR in Pencil Edit Mode) */
              <div>
                {isEditing && (
                  <div className={styles.editModeNotice}>
                    <span>Updating document re-submission for <strong>{docType}</strong></span>
                    <button type="button" className={styles.cancelEditBtn} onClick={() => { setIsEditing(false); setFrontFile(null); setBackFile(null); }}>
                      Cancel
                    </button>
                  </div>
                )}

                <div className={styles.uploadRow}>
                  {/* Front File Upload */}
                  <div className={styles.uploadCol}>
                    <label className={styles.label}>
                      {docType === 'Passport' ? 'Passport Main Page' : 'Front of Document'}
                    </label>
                    <input
                      type="file"
                      ref={frontInputRef}
                      style={{ display: 'none' }}
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={handleFrontChange}
                    />
                    <div className={styles.uploadBox} style={{ height: 130 }} onClick={() => frontInputRef.current?.click()}>
                      {frontFile ? (
                        <span className={styles.selectedFileName}>{frontFile.name}</span>
                      ) : (
                        <>
                          <div className={styles.uploadIconBoxSmall}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="12" y1="18" x2="12" y2="12"></line>
                              <line x1="9" y1="15" x2="15" y2="15"></line>
                            </svg>
                          </div>
                          <span className={styles.uploadText}>Click to upload front</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Back File Upload */}
                  <div className={styles.uploadCol}>
                    <label className={styles.label}>
                      Back of Document <span style={{ color: '#737784', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      type="file"
                      ref={backInputRef}
                      style={{ display: 'none' }}
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={handleBackChange}
                    />
                    <div className={styles.uploadBox} style={{ height: 130 }} onClick={() => backInputRef.current?.click()}>
                      {backFile ? (
                        <span className={styles.selectedFileName}>{backFile.name}</span>
                      ) : (
                        <>
                          <div className={styles.uploadIconBoxSmall}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="12" y1="18" x2="12" y2="12"></line>
                              <line x1="9" y1="15" x2="15" y2="15"></line>
                            </svg>
                          </div>
                          <span className={styles.uploadText}>Click to upload back</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Submit Button */}
            {(showUploadBoxes || profilePhoto) && (
              <div className={styles.submitBtnContainer}>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={submitAll}
                  disabled={uploading || (!frontFile && !profilePhoto)}
                >
                  {uploading ? 'Submitting…' : 'Submit Verification'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {previewModal && (
          <div className={styles.overlay} onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (docFileUrl) URL.revokeObjectURL(docFileUrl);
              if (docBackFileUrl) URL.revokeObjectURL(docBackFileUrl);
              setDocFileUrl(null);
              setDocBackFileUrl(null);
              setPreviewModal(false);
            }
          }}>
            <div className={styles.modal}>
              <div className={styles.modalHead}>
                <span className={styles.label}>Document Preview — {latestDoc?.documentType}</span>
                <button type="button" className={styles.closeBtn}
                  onClick={() => {
                    if (docFileUrl) URL.revokeObjectURL(docFileUrl);
                    if (docBackFileUrl) URL.revokeObjectURL(docBackFileUrl);
                    setDocFileUrl(null);
                    setDocBackFileUrl(null);
                    setPreviewModal(false);
                  }}>
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div className={styles.docPreviewPanel}>
                    <span className={styles.docPreviewLabel}>FRONT</span>
                    {docFileUrl ? (
                      docFileType.startsWith('image/') ? (
                        <img src={docFileUrl} alt="Document Front" className={styles.docPreviewImage} />
                      ) : (
                        <embed src={docFileUrl} type={docFileType} className={styles.docPreviewEmbed} />
                      )
                    ) : (
                      <span className={styles.docPreviewLoading}>Loading preview…</span>
                    )}
                  </div>
                  {docBackFileUrl && (
                    <div className={styles.docPreviewPanel}>
                      <span className={styles.docPreviewLabel}>BACK</span>
                      {docBackFileType.startsWith('image/') ? (
                        <img src={docBackFileUrl} alt="Document Back" className={styles.docPreviewImage} />
                      ) : (
                        <embed src={docBackFileUrl} type={docBackFileType} className={styles.docPreviewEmbed} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}