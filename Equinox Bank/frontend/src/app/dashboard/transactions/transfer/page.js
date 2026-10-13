'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './transfer.module.css';
import { api } from '@/lib/api';

function TransferFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initialToAccount = searchParams.get('toAccount') || '';
  const initialRecipient = searchParams.get('recipient') || '';
  const initialAmount = searchParams.get('amount') || '';
  const isReadOnly = searchParams.get('readonly') === 'true';

  const [transferType, setTransferType] = useState(isReadOnly ? 'other' : 'own');
  const [fromAccount, setFromAccount] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [toAccount, setToAccount] = useState(null);
  const [toDropdownOpen, setToDropdownOpen] = useState(false);
  const toDropdownRef = useRef(null);

  const [toAccountNum, setToAccountNum] = useState(initialToAccount);
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState(initialAmount);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [swiftCode, setSwiftCode] = useState('');

  const [lookedUpAccount, setLookedUpAccount] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const lookupTimer = useRef(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [transferPayload, setTransferPayload] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const showModal = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalOpen(true);
  };

  const lookupAccount = async (acctNum) => {
    if (!acctNum || acctNum.length < 3) {
      setLookedUpAccount(null);
      setLookupError('');
      return;
    }
    setLookupLoading(true);
    setLookupError('');
    try {
      const data = await api.lookupAccount(acctNum);
      setLookedUpAccount(data);
    } catch {
      setLookedUpAccount(null);
      setLookupError('Account number not found');
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getAccounts();
        const list = Array.isArray(data) ? data : (data.accounts || []);
        const eligible = list.filter(a =>
          a.accountTypeName?.toLowerCase() !== 'fixed deposit'
        );
        setAccounts(eligible);
        if (eligible.length > 0) {
          setFromAccount(eligible[0]);
        }
      } catch (err) {
        setError(err.message);
      }
      try {
        const cats = await api.getCategories();
        setCategories(Array.isArray(cats) ? cats : []);
      } catch {
        setCategories([]);
      }
    })();

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (toDropdownRef.current && !toDropdownRef.current.contains(e.target)) {
        setToDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (transferType !== 'other') {
      setLookedUpAccount(null);
      setLookupError('');
      return;
    }
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    lookupTimer.current = setTimeout(() => lookupAccount(toAccountNum), 500);
    return () => { if (lookupTimer.current) clearTimeout(lookupTimer.current); };
  }, [toAccountNum, transferType]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setError('');

    if (transferType === 'other' && (!amount || !toAccountNum)) return;
    if (transferType === 'own' && (!amount || !toAccount)) return;
    if (transferType === 'intl' && (!amount || !toAccountNum || !recipient || !swiftCode)) return;

    if (!fromAccount) return;

    const transferAmount = parseFloat(amount);
    const sourceId = fromAccount.id || fromAccount.accountId;

    if (transferType === 'own' && toAccount) {
      const targetId = toAccount.id || toAccount.accountId;
      setLoading(true);
      try {
        await api.transfer({
          sourceAccountId: Number(sourceId),
          targetAccountId: Number(targetId),
          amount: transferAmount,
          categoryId: categoryId ? Number(categoryId) : undefined,
          description: description || `Transfer to ${toAccount.name || toAccount.accountName}`
        });
        showModal('Success', 'Transfer initiated successfully!');
        setTimeout(() => router.push('/dashboard/transactions'), 1500);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (transferType === 'other' && !lookedUpAccount) {
        setError('Please enter a valid account number first.');
        return;
      }
      const payload = {
        sourceAccountId: Number(sourceId),
        targetAccountId: lookedUpAccount ? lookedUpAccount.accountId : undefined,
        amount: transferAmount,
        categoryId: categoryId ? Number(categoryId) : undefined,
        description: description || `Transfer to ${lookedUpAccount ? (lookedUpAccount.name || lookedUpAccount.accountTypeName) : toAccountNum}`,
        isInternational: transferType === 'intl',
        recipientName: transferType === 'intl' ? recipient : undefined,
        swiftCode: transferType === 'intl' ? swiftCode : undefined,
      };
      setTransferPayload(payload);
      setConfirmModalOpen(true);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transferPayload) return;
    setLoading(true);
    setConfirmModalOpen(false);
    try {
      await api.transfer(transferPayload);
      const feeNote = transferPayload.isInternational ? ' (plus $25.00 international transfer fee)' : '';
      showModal('Transfer Complete', `Successfully transferred $${transferPayload.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}${feeNote}`);
      setTimeout(() => router.push('/dashboard/transactions'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayBalance = (acc) => {
    const bal = acc.balance || acc.currentBalance;
    if (bal === undefined || bal === null) return '';
    return `$${Number(bal).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  };

  const getDisplayName = (acc) => acc.name || acc.accountName || 'Account';

  return (
    <div className={styles.pageContainer}>
      <Link href="/dashboard/transactions" className={styles.backLink}>
        <svg className={styles.backIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Transactions
      </Link>

      {error && (
        <div style={{ color: '#DC2626', background: '#FEE2E2', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Transfer Details</h2>

        {!isReadOnly && (
          <div className={styles.tabsContainer}>
            <button type="button" className={`${styles.tabBtn} ${transferType === 'own' ? styles.tabActive : ''}`} onClick={() => setTransferType('own')}>Own Account</button>
            <button type="button" className={`${styles.tabBtn} ${transferType === 'other' ? styles.tabActive : ''}`} onClick={() => setTransferType('other')}>Other Account</button>
            <button type="button" className={`${styles.tabBtn} ${transferType === 'intl' ? styles.tabActive : ''}`} onClick={() => setTransferType('intl')}>International</button>
            </div>
          )}

          {transferType === 'other' && (
            <div style={{ marginTop: '0', marginBottom: '16px' }}>
              {lookupLoading && <span style={{ color: '#6B7280', fontSize: '13px' }}>Looking up account number...</span>}
              {lookupError && !lookupLoading && <span style={{ color: '#DC2626', fontSize: '13px' }}>{lookupError}</span>}
              {lookedUpAccount && !lookupLoading && (
                <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '6px', padding: '8px 12px', fontSize: '13px' }}>
                  <span style={{ color: '#16A34A', fontWeight: 600 }}>Found: </span>
                  {lookedUpAccount.name || lookedUpAccount.accountTypeName} — {lookedUpAccount.accountNumber}
                </div>
              )}
            </div>
          )}

        <form onSubmit={handleTransfer}>
          <div className={styles.formGroup}>
            <label className={styles.label}>From Account</label>
            <div className={styles.customDropdown} ref={dropdownRef}>
              <button
                type="button"
                className={styles.dropdownTrigger}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {fromAccount ? (
                  <div className={styles.dropdownSelected}>
                    <div className={styles.dropdownSelectedTop}>
                      <span className={styles.dropdownAccName}>{getDisplayName(fromAccount)}</span>
                    </div>
                    <span className={styles.dropdownAccBalance}>{getDisplayBalance(fromAccount)}</span>
                  </div>
                ) : (
                  <span className={styles.dropdownPlaceholder}>Select account</span>
                )}
                <svg className={`${styles.dropdownChevron} ${dropdownOpen ? styles.dropdownChevronOpen : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {dropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {accounts.map((acc) => {
                    const id = acc.id || acc.accountId;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`${styles.dropdownOption} ${fromAccount && (fromAccount.id || fromAccount.accountId) === id ? styles.dropdownOptionActive : ''}`}
                        onClick={() => {
                          setFromAccount(acc);
                          setDropdownOpen(false);
                          if (toAccount && (toAccount.id || toAccount.accountId) === id) {
                            setToAccount(null);
                          }
                        }}
                      >
                        <div className={styles.dropdownOptionTop}>
                          <span className={styles.dropdownAccName}>{getDisplayName(acc)}</span>
                        </div>
                        <span className={styles.dropdownAccBalance}>{getDisplayBalance(acc)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {transferType === 'own' ? (
            <div className={styles.formGroup}>
              <label className={styles.label}>To Account</label>
              <div className={styles.customDropdown} ref={toDropdownRef}>
                <button
                  type="button"
                  className={styles.dropdownTrigger}
                  onClick={() => setToDropdownOpen(!toDropdownOpen)}
                >
                  {toAccount ? (
                    <div className={styles.dropdownSelected}>
                      <div className={styles.dropdownSelectedTop}>
                        <span className={styles.dropdownAccName}>{getDisplayName(toAccount)}</span>
                      </div>
                      <span className={styles.dropdownAccBalance}>{getDisplayBalance(toAccount)}</span>
                    </div>
                  ) : (
                    <span className={styles.dropdownPlaceholder}>Select receiving account</span>
                  )}
                  <svg className={`${styles.dropdownChevron} ${toDropdownOpen ? styles.dropdownChevronOpen : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {toDropdownOpen && (
                  <div className={styles.dropdownMenu}>
                    {accounts.filter(a => {
                      const fid = fromAccount ? (fromAccount.id || fromAccount.accountId) : null;
                      const aid = a.id || a.accountId;
                      const isLoanDisbursement = a.accountTypeName?.toLowerCase() === 'loan disbursement';
                      return (!fid || aid !== fid) && !isLoanDisbursement;
                    }).map((acc) => {
                      const id = acc.id || acc.accountId;
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`${styles.dropdownOption} ${toAccount && (toAccount.id || toAccount.accountId) === id ? styles.dropdownOptionActive : ''}`}
                          onClick={() => { setToAccount(acc); setToDropdownOpen(false); }}
                        >
                          <div className={styles.dropdownOptionTop}>
                            <span className={styles.dropdownAccName}>{getDisplayName(acc)}</span>
                          </div>
                          <span className={styles.dropdownAccBalance}>{getDisplayBalance(acc)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.label}>To Account Number</label>
                <div className={styles.inputWithIcon}>
                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="e.g., ACC0000000001-1"
                    value={toAccountNum}
                    onChange={(e) => setToAccountNum(e.target.value)}
                    readOnly={isReadOnly}
                    required={transferType === 'other'}
                  />
                  <div className={styles.iconInside}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                      <path d="M7 15h.01M11 15h2M7 19h10"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {transferType === 'intl' && (
                <div className={styles.col}>
                  <label className={styles.label}>Recipient Name</label>
                  <div className={styles.inputWithIcon}>
                    <input
                      type="text"
                      className={styles.textInput}
                      placeholder="e.g., John Doe or ACME Corp"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      readOnly={isReadOnly}
                      required={true}
                    />
                    <div className={styles.iconInside}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {transferType === 'intl' && (
            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.label}>SWIFT / BIC Code</label>
                <div className={styles.inputWithIcon}>
                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="e.g., BOFAUS3N"
                    value={swiftCode}
                    onChange={(e) => setSwiftCode(e.target.value)}
                    required={transferType === 'intl'}
                  />
                  <div className={styles.iconInside}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Amount</label>
            <div className={styles.amountGroup}>
              <div className={`${styles.selectInput} ${styles.currencySelect}`} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6', color: '#6B7280', border: '1px solid #D1D5DB', borderRight: 'none', borderRadius: '4px 0 0 4px'}}>
                USD
              </div>
              <input
                type="number"
                step="0.01"
                className={`${styles.textInput} ${styles.amountInput}`}
                placeholder="1500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                readOnly={isReadOnly}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description / Notes (Optional)</label>
            <textarea
              className={styles.textArea}
              placeholder="e.g., Invoice Payment #4592"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Category (Optional)</label>
            <select
              className={styles.selectInput}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', fontFamily: 'Inter', fontSize: '14px',
                border: '1px solid #C3C6D5', borderRadius: '4px', outline: 'none',
                background: '#FFF', color: '#191B22'
              }}
            >
              <option value="">Unselected</option>
              {categories.map(c => (
                <option key={c.categoryId} value={String(c.categoryId)}>{c.categoryName}</option>
              ))}
            </select>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.btnGroup}>
            <button type="button" className={styles.cancelBtn} onClick={() => router.push('/dashboard/transactions')}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={loading || (transferType === 'own' ? (!amount || !toAccount) : transferType === 'intl' ? (!amount || !toAccountNum || !recipient || !swiftCode) : (!amount || !toAccountNum))}>
              {loading ? 'Processing...' : 'Review Transfer'}
            </button>
          </div>

        </form>
      </div>

      {confirmModalOpen && transferPayload && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <h3 className={styles.modalTitle}>Confirm Transfer</h3>
            <div className={styles.confirmDetails}>
              <div className={styles.detailGroup}>
                <span className={styles.detailLabel}>From</span>
                <span className={styles.detailValue}>{fromAccount?.name || fromAccount?.accountTypeName || 'Account'} — ${fromAccount?.balance || 0}</span>
              </div>
              <div className={styles.detailGroup}>
                <span className={styles.detailLabel}>To</span>
                <span className={styles.detailValue}>
                  {lookedUpAccount
                    ? `${lookedUpAccount.name || lookedUpAccount.accountTypeName} — ${lookedUpAccount.accountNumber}`
                    : `${recipient} (${toAccountNum})${transferType === 'intl' ? ' — SWIFT: ' + swiftCode : ''}`}
                </span>
              </div>
              <div className={styles.detailGroup}>
                <span className={styles.detailLabel}>Amount</span>
                <span className={`${styles.detailValue} ${styles.detailValueAmount}`}>${transferPayload.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
              </div>
              {transferPayload.isInternational && (
                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>Transfer fee</span>
                  <span className={`${styles.detailValue} ${styles.detailValueFee}`}>$25.00</span>
                </div>
              )}
              {transferPayload.description && (
                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>Description</span>
                  <span className={`${styles.detailValue} ${styles.detailValueMuted}`}>{transferPayload.description}</span>
                </div>
              )}
            </div>
            <div className={styles.btnGroup} style={{ marginTop: '24px' }}>
              <button className={styles.cancelBtn} onClick={() => { setConfirmModalOpen(false); setTransferPayload(null); }}>
                Cancel
              </button>
              <button className={styles.primaryBtn} onClick={handleConfirmTransfer}>
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

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

export default function TransferForm() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TransferFormContent />
    </Suspense>
  );
}
