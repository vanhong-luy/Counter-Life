'use client';

import React, { useState, useEffect } from 'react';
import { Target, Plus, ShieldCheck, Calendar, Sparkles, PartyPopper, Gift, Rocket, History } from 'lucide-react';
import Link from 'next/link';
import styles from './savings.module.css';
import { api } from '@/lib/api';

const celebrations = [
  { icon: PartyPopper, msg: ' Goal Completed! Time to celebrate!' },
  { icon: Gift, msg: ' Target Reached! You crushed it!' },
  { icon: Rocket, msg: ' Goal Achieved! On to the next one!' },
];

export default function SavingsGoalsPage() {
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const [goalName, setGoalName] = useState('');
  const [category, setCategory] = useState('Emergency');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [autoRelease, setAutoRelease] = useState(false);

  const [actionAmount, setActionAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justCompletedId, setJustCompletedId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const accList = await api.getAccounts().catch(() => []);
      setAccounts(accList || []);

      const goalsList = await api.getSavingsGoals().catch(() => []);
      setGoals(goalsList || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.targetAmount || 0), 0);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createSavingsGoal({
        goalName,
        category,
        targetAmount: parseFloat(targetAmount),
        targetDate,
        accountId: parseInt(linkedAccountId),
        autoRelease
      });
      setCreateModalOpen(false);
      setGoalName('');
      setTargetAmount('');
      setAutoRelease(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!selectedGoal || !actionAmount) return;
    setSubmitting(true);
    try {
      const result = await api.depositToSavingsGoal(selectedGoal.goalId, { amount: parseFloat(actionAmount) });
      setDepositModalOpen(false);
      setActionAmount('');
      await loadData();
      if (result?.status === 'COMPLETED' && result?.currentAmount === 0) {
        setJustCompletedId(result.goalId);
        setTimeout(() => setJustCompletedId(null), 4000);
      } else if (result?.status === 'COMPLETED') {
        setJustCompletedId(result.goalId);
        setTimeout(() => setJustCompletedId(null), 4000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!selectedGoal || !actionAmount) return;
    setSubmitting(true);
    try {
      await api.withdrawFromSavingsGoal(selectedGoal.goalId, { amount: parseFloat(actionAmount) });
      setWithdrawModalOpen(false);
      setActionAmount('');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawAll = async (goal) => {
    setSubmitting(true);
    try {
      await api.withdrawFromSavingsGoal(goal.goalId, { amount: goal.currentAmount });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelGoal = async (goal) => {
    if (!confirm(`Are you sure you want to cancel '${goal.goalName}'? All $${Number(goal.currentAmount).toFixed(2)} saved will be automatically returned to your primary account.`)) return;
    try {
      await api.deleteSavingsGoal(goal.goalId);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Savings Goals</h1>
          <span className={styles.subtitle}>Earmark funds from your account to hit your target milestones</span>
        </div>
        <button className={styles.primaryBtn} onClick={() => setCreateModalOpen(true)}>
          <Plus size={18} />
          Create New Goal
        </button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <Target size={24} />
          </div>
          <div>
            <div className={styles.summaryLabel}>Total Earmarked Saved</div>
            <div className={styles.summaryValue}>${totalSaved.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ background: '#F0FDF4', color: '#16A34A' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div className={styles.summaryLabel}>Total Goals Target</div>
            <div className={styles.summaryValue}>${totalTarget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className={styles.summaryLabel}>Active Vaults</div>
            <div className={styles.summaryValue}>{goals.filter(g => g.status === 'ACTIVE').length} Active Goals</div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#FEF2F2', color: '#DC2626', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className={styles.goalsGrid}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: '#64748B' }}>Loading savings goals...</div>
        ) : goals.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: '#64748B' }}>
            No savings goals yet. Create your first goal to start saving!
          </div>
        ) : goals.map(g => {
          const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
          const isNewlyComplete = justCompletedId === g.goalId;
          const isCompleted = g.status === 'COMPLETED';
          const celebration = celebrations[g.goalId % celebrations.length];

          return (
            <div key={g.goalId} className={`${styles.goalCard} ${isNewlyComplete ? styles.goalCardCelebration : ''} ${g.status === 'CANCELLED' ? styles.goalCardCancelled : ''}`}>
              {isNewlyComplete && (
                <div className={styles.celebrationBanner}>
                  <celebration.icon size={16} />
                  {celebration.msg}
                </div>
              )}

              <div className={styles.goalHeader}>
                <span className={styles.goalCategoryBadge}>
                  <Target size={12} />
                  {g.category}
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {isCompleted && !isNewlyComplete && (
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 12, background: '#FEF9C3', color: '#854D0E' }}>
                      <Rocket size={11} style={{ display: 'inline', marginRight: 2 }} />
                      Done!
                    </span>
                  )}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                    background: g.status === 'COMPLETED' ? '#DCFCE7' : g.status === 'CANCELLED' ? '#FEE2E2' : '#DBEAFE',
                    color: g.status === 'COMPLETED' ? '#15803D' : g.status === 'CANCELLED' ? '#DC2626' : '#1E40AF'
                  }}>
                    {g.status}
                  </span>
                </div>
              </div>

              <h3 className={styles.goalTitle}>{g.goalName}</h3>

              <div className={styles.goalAmounts} style={{ marginTop: 12 }}>
                <div className={styles.goalCurrentAmount}>
                  ${Number(g.currentAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className={styles.goalTargetAmount}>
                  of ${Number(g.targetAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} target
                </div>
              </div>

              <div className={styles.progressContainer}>
                {isCompleted && !isNewlyComplete ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, height: 10, background: '#DCFCE7', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #16A34A 0%, #15803D 100%)', borderRadius: 5 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>100%</span>
                  </div>
                ) : (
                  <div className={styles.progressBarBg}>
                    <div className={styles.progressBarFill} style={{ width: `${pct}%` }} />
                  </div>
                )}
                <div className={styles.progressMeta}>
                  <span>{isCompleted ? 'Goal Achieved' : `${pct}% Achieved`}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} /> {g.targetDate}
                  </span>
                </div>
              </div>

              <div className={styles.goalActions}>
                {g.status === 'ACTIVE' && (
                  <>
                    <button className={styles.depositBtn} onClick={() => { setSelectedGoal(g); setDepositModalOpen(true); }}>
                      + Add Funds
                    </button>
                    <button className={styles.withdrawBtn} onClick={() => { setSelectedGoal(g); setWithdrawModalOpen(true); }}>
                      Release
                    </button>
                    <Link
                      href={`/dashboard/transactions?search=${encodeURIComponent(g.goalName)}`}
                      className={styles.withdrawBtn}
                      style={{ flex: '0 0 auto', padding: '10px 12px', textDecoration: 'none', textAlign: 'center', fontSize: 13 }}
                      title="View transaction history for this goal"
                    >
                      <History size={13} style={{ display: 'inline', marginRight: 2 }} /> Log
                    </Link>
                    <button
                      className={styles.withdrawBtn}
                      style={{ flex: '0 0 auto', padding: '10px 12px', borderColor: '#FECACA', color: '#DC2626', background: '#FEF2F2' }}
                      title="Cancel & Close Goal"
                      onClick={() => handleCancelGoal(g)}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {isCompleted && g.currentAmount > 0 && (
                  <>
                    <button className={styles.depositBtn} style={{ background: '#16A34A' }} onClick={() => handleWithdrawAll(g)}>
                      <PartyPopper size={14} /> Withdraw All
                    </button>
                    <button className={styles.withdrawBtn} onClick={() => { setSelectedGoal(g); setWithdrawModalOpen(true); }}>
                      Partial
                    </button>
                    <Link
                      href={`/dashboard/transactions?search=${encodeURIComponent(g.goalName)}`}
                      className={styles.withdrawBtn}
                      style={{ flex: '0 0 auto', padding: '10px 12px', textDecoration: 'none', textAlign: 'center', fontSize: 13 }}
                      title="View transaction history for this goal"
                    >
                      <History size={13} style={{ display: 'inline', marginRight: 2 }} /> Log
                    </Link>
                  </>
                )}
                {isCompleted && g.currentAmount === 0 && !isNewlyComplete && (
                  <div style={{ width: '100%', textAlign: 'center', fontSize: 13, color: '#64748B', padding: 8 }}>
                    Funds have been released back to your account
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {createModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setCreateModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create Savings Goal</h3>
              <button className={styles.closeBtn} onClick={() => setCreateModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateGoal}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Goal Name</label>
                <input className={styles.input} placeholder="e.g. Vacation, House Downpayment" value={goalName} onChange={e => setGoalName(e.target.value)} required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Category</label>
                <select className={styles.select} value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="Emergency">Emergency Fund</option>
                  <option value="Travel">Travel &amp; Vacation</option>
                  <option value="Vehicle">Car &amp; Vehicle</option>
                  <option value="Education">Education &amp; Tuition</option>
                  <option value="Other">Other Goal</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Target Amount ($)</label>
                <input type="number" step="0.01" className={styles.input} placeholder="3000.00" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Target Completion Date</label>
                <input type="date" className={styles.input} value={targetDate} onChange={e => setTargetDate(e.target.value)} required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Source Account</label>
                <select className={styles.select} value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)}>
                  <option value="">Select an account...</option>
                  {accounts.map(acc => (
                    <option key={acc.accountId} value={acc.accountId}>
                      {acc.name || acc.accountTypeName} (**** {String(acc.accountNumber).slice(-4)}) — Available: ${Number(acc.balance).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={autoRelease} onChange={e => setAutoRelease(e.target.checked)} />
                  <span>
                    <strong>Auto-release on completion</strong>
                    <span style={{ display: 'block', fontSize: 12, color: '#64748B', fontWeight: 400, marginTop: 2 }}>
                      When your target is reached, funds are automatically released back to your account
                    </span>
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className={styles.withdrawBtn} onClick={() => setCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {depositModalOpen && selectedGoal && (
        <div className={styles.modalOverlay} onClick={() => setDepositModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Deposit to "{selectedGoal.goalName}"</h3>
              <button className={styles.closeBtn} onClick={() => setDepositModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleDeposit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Amount to Earmark ($)</label>
                <input type="number" step="0.01" className={styles.input} placeholder="500.00" value={actionAmount} onChange={e => setActionAmount(e.target.value)} required />
              </div>
              {selectedGoal.autoRelease && (
                <div style={{ padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, fontSize: 13, color: '#15803D', marginBottom: 8 }}>
                  <Sparkles size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Auto-release is ON — funds will be unlocked when the target is hit.
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className={styles.withdrawBtn} onClick={() => setDepositModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                  {submitting ? 'Transferring...' : 'Confirm Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {withdrawModalOpen && selectedGoal && (
        <div className={styles.modalOverlay} onClick={() => setWithdrawModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Release Funds from "{selectedGoal.goalName}"</h3>
              <button className={styles.closeBtn} onClick={() => setWithdrawModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleWithdraw}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Amount to Return to Primary Account ($)</label>
                <input type="number" step="0.01" className={styles.input} max={selectedGoal.currentAmount} placeholder="200.00" value={actionAmount} onChange={e => setActionAmount(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className={styles.withdrawBtn} onClick={() => setWithdrawModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                  {submitting ? 'Releasing...' : 'Release Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
