"use client";

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UploadCloud, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import styles from './collateral.module.css';
import { api } from '@/lib/api';

function CollateralFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loanId = searchParams.get('loanId') || searchParams.get('id') || '';

  const [assetType, setAssetType] = useState('Vehicle');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [files, setFiles] = useState([]);
  const fileInputRef = React.useRef(null);

  const handleFileUpload = (newFiles) => {
    const uploaded = Array.from(newFiles).map((file, idx) => ({
      id: Date.now() + idx,
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      type: file.name.endsWith('.pdf') ? 'pdf' : 'image'
    }));
    setFiles(prev => [...prev, ...uploaded]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDelete = (id) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const handleSubmit = async () => {
    if (!loanId) {
      setError('No loan ID provided. Please apply for a loan first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let fileKeys = [];
      for (const f of files) {
        const formData = new FormData();
        formData.append('file', f.file);
        const result = await api.uploadCollateralDoc(formData);
        if (result && result.fileKey) {
          fileKeys.push(result.fileKey);
        }
      }
      const proofUrl = fileKeys.length > 0 ? fileKeys.join(',') : '';
      await api.addCollateral(loanId, {
        assetType,
        estimatedValue: parseFloat(value),
        proofDocumentUrl: proofUrl
      });
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/loans'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <h1 style={{ color: '#16A34A', marginBottom: '16px' }}>Collateral Added Successfully!</h1>
          <p>Redirecting to loans page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Collateral Upload</h1>
        <p className={styles.subText}>Submit documentation and details for your proposed collateral asset.</p>
      </div>

      {error && (
        <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className={styles.formCard}>
        <div className={styles.formBody}>

          <div className={styles.formGroup}>
            <label className={styles.label}>Asset Type</label>
            <select
              className={styles.selectInput}
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
            >
              <option value="Vehicle">Vehicle</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Equipment">Equipment</option>
              <option value="Inventory">Inventory</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Asset Description</label>
            <textarea
              className={styles.textArea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g., 2022 Tesla Model 3..."
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Estimated Value</label>
            <div className={styles.inputGroup}>
              <div className={styles.inputPrefix}>USD</div>
              <input
                type="text"
                className={`${styles.textInput} ${styles.inputWithPrefix}`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label className={styles.label}>Proof Documents</label>
              <span className={styles.labelSub}>Max 50MB total</span>
            </div>

            <div
              className={styles.dropzone}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                onChange={(e) => {
                  if (e.target.files) handleFileUpload(e.target.files);
                  e.target.value = null;
                }}
              />
              <div className={styles.dropIconBox}>
                <UploadCloud size={24} />
              </div>
              <p className={styles.dropTextMain}>Click to upload or drag and drop</p>
              <p className={styles.dropTextSub}>PDF, JPG, PNG, or DOCX (max. 10MB each)</p>
            </div>

            {files.length > 0 && (
              <div className={styles.fileList}>
                {files.map(file => (
                  <div key={file.id} className={styles.fileItem}>
                    <div className={styles.fileInfo}>
                      <div className={styles.fileIcon}>
                        {file.type === 'pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}
                      </div>
                      <div className={styles.fileDetails}>
                        <span className={styles.fileName}>{file.name}</span>
                        <span className={styles.fileMeta}>{file.size} &bull; Uploaded</span>
                      </div>
                    </div>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(file.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.formFooter}>
          <button className={styles.cancelBtn} onClick={() => router.back()}>Cancel</button>
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Add Collateral'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CollateralUploadPage() {
  return (
    <Suspense fallback={<div style={{padding: '48px', textAlign: 'center'}}>Loading...</div>}>
      <CollateralFormContent />
    </Suspense>
  );
}
