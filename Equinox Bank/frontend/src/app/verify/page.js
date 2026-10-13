'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import styles from './verify.module.css';

export default function Verify() {
  const router = useRouter();
  const [docType, setDocType] = useState('National ID');
  const [error, setError] = useState('');
  
  const [frontFile, setFrontFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const fileInputRef = React.useRef(null);

  const [backFile, setBackFile] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const backFileInputRef = React.useRef(null);

  const handleSubmit = async () => {
    setError('');

    if (!frontFile) {
      setError('Please upload the front of your document.');
      return;
    }

    const formData = new FormData();
    formData.append('file', frontFile);
    formData.append('documentType', docType);
    if (backFile) {
      formData.append('fileBack', backFile);
    }

    try {
      await api.uploadKyc(formData);
      router.push('/success');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
        if (file.size <= 5 * 1024 * 1024) {
          setFrontFile(file);
          if (file.type.startsWith('image/')) {
            setFrontPreview(URL.createObjectURL(file));
          } else {
            setFrontPreview('pdf');
          }
        } else {
          alert('File size exceeds 5MB limit.');
        }
      } else {
        alert('Invalid file format. Please upload JPG, PNG, or PDF.');
      }
    }
  };

  const handleBackFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
        if (file.size <= 5 * 1024 * 1024) {
          setBackFile(file);
          if (file.type.startsWith('image/')) {
            setBackPreview(URL.createObjectURL(file));
          } else {
            setBackPreview('pdf');
          }
        } else {
          alert('File size exceeds 5MB limit.');
        }
      } else {
        alert('Invalid file format. Please upload JPG, PNG, or PDF.');
      }
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        
        {/* Header */}
        <div className={styles.headerContent}>
          <h1 className={styles.heading}>Identity Verification</h1>
          <p className={styles.subText}>Securely upload your documentation to access full banking features.</p>
        </div>

        {/* Progress Indicator */}
        <div className={styles.progressContainer}>
          <div className={styles.progressLineBg}></div>
          <div className={styles.progressLineActive}></div>
          
          <div className={styles.stepWrapper}>
            <div className={styles.stepCircleChecked}>
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={styles.stepText}>Register</span>
          </div>
          
          <div className={styles.stepWrapper}>
            <div className={styles.stepCircleActive}>2</div>
            <span className={`${styles.stepText} ${styles.stepTextActive}`}>Verify</span>
          </div>
          
          <div className={styles.stepWrapper}>
            <div className={styles.stepCircleInactive}>3</div>
            <span className={`${styles.stepText} ${styles.stepTextInactive}`}>Active</span>
          </div>
        </div>

        {/* Main Card */}
        <div className={styles.card}>
          
          <div className={styles.sectionGroup}>
            <label className={styles.label}>Document Type</label>
            <div className={styles.toggleContainer}>
              <button 
                className={`${styles.toggleBtn} ${docType === 'National ID' ? styles.active : ''}`}
                onClick={() => setDocType('National ID')}
              >
                National ID
              </button>
              <button 
                className={`${styles.toggleBtn} ${docType === 'Passport' ? styles.active : ''}`}
                onClick={() => setDocType('Passport')}
              >
                Passport
              </button>
            </div>
          </div>

          <div className={styles.uploadRow}>
            <div className={styles.uploadCol}>
              <label className={styles.label}>Front of Document</label>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".jpg,.jpeg,.png,.pdf" 
                onChange={handleFileChange} 
              />
              {!frontPreview ? (
                <div className={styles.uploadBox} onClick={() => fileInputRef.current.click()}>
                  <div className={styles.uploadIconBox}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="12" y1="18" x2="12" y2="12"></line>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                  </div>
                  <div style={{display: 'flex', gap: '4px'}}>
                    <span className={styles.uploadText}>Click to upload</span>
                    <span className={styles.uploadSubText}>or drag and drop</span>
                  </div>
                  <span className={styles.uploadSubText} style={{fontSize: '12px', marginTop: '4px'}}>JPG, PNG, PDF (max 5MB)</span>
                </div>
              ) : (
                <div className={styles.uploadBoxFilled} onClick={() => fileInputRef.current.click()} style={{cursor: 'pointer'}}>
                  {frontPreview === 'pdf' ? (
                     <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                       <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                       <span style={{marginTop:'8px', fontFamily:'Inter', fontSize:'14px', color:'#191B22'}}>{frontFile.name}</span>
                     </div>
                  ) : (
                    <img src={frontPreview} alt="Front of Document" className={styles.uploadedImage} />
                  )}
                  <div className={styles.statusBadge}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Uploaded
                  </div>
                </div>
              )}
            </div>

            <div className={styles.uploadCol}>
              <label className={styles.label}>Back of Document</label>
              <input 
                type="file" 
                ref={backFileInputRef} 
                style={{ display: 'none' }} 
                accept=".jpg,.jpeg,.png,.pdf" 
                onChange={handleBackFileChange} 
              />
              {!backPreview ? (
                <div className={styles.uploadBox} onClick={() => backFileInputRef.current.click()}>
                  <div className={styles.uploadIconBox}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="12" y1="18" x2="12" y2="12"></line>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                  </div>
                  <div style={{display: 'flex', gap: '4px'}}>
                    <span className={styles.uploadText}>Click to upload</span>
                    <span className={styles.uploadSubText}>or drag and drop</span>
                  </div>
                  <span className={styles.uploadSubText} style={{fontSize: '12px', marginTop: '4px'}}>JPG, PNG, PDF (max 5MB)</span>
                </div>
              ) : (
                <div className={styles.uploadBoxFilled} onClick={() => backFileInputRef.current.click()} style={{cursor: 'pointer'}}>
                  {backPreview === 'pdf' ? (
                     <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                       <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                       <span style={{marginTop:'8px', fontFamily:'Inter', fontSize:'14px', color:'#191B22'}}>{backFile.name}</span>
                     </div>
                  ) : (
                    <img src={backPreview} alt="Back of Document" className={styles.uploadedImage} />
                  )}
                  <div className={styles.statusBadge}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Uploaded
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #E7E7F0', width: '100%', margin: '8px 0' }}></div>

          {error && <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>{error}</div>}

          <div className={styles.submitBtnContainer}>
            <button className={styles.submitBtn} onClick={handleSubmit}>
              Submit for Review
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
