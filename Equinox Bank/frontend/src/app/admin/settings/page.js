'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminToken, api } from '@/lib/api';

const ADMIN_PAGE_SIZE = 5;
const CATEGORY_PAGE_SIZE = 8;

const SYSTEM_CAPABILITIES = [
  { key: 'dashboard', label: 'View Financial Ledgers' },
  { key: 'loans',     label: 'Approve Loans > $500k' },
  { key: 'kyc',       label: 'Flag Fraud Suspicions' },
  { key: 'settings',    label: 'Modify System Settings' },
  { key: 'users',     label: 'User Management (RBAC)' },
];

export default function AdminSettingsPage() {
  const [roles, setRoles] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);
  const [cardTypes, setCardTypes] = useState([]);
  const [creditTiers, setCreditTiers] = useState([]);
  const [editingTier, setEditingTier] = useState(null);
  const [editTierLimit, setEditTierLimit] = useState('');
  const [editTierApr, setEditTierApr] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminPage, setAdminPage] = useState(0);
  const [adminTotal, setAdminTotal] = useState(0);
  const [roleCounts, setRoleCounts] = useState({});
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Transaction categories
  const [categories, setCategories] = useState([]);
  const [categoryPage, setCategoryPage] = useState(0);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Modals
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isCreateLoanTypeOpen, setIsCreateLoanTypeOpen] = useState(false);

  // Form states - Assign Staff from Existing Users
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newStaffEmployeeId, setNewStaffEmployeeId] = useState('');
  const [newStaffRoleId, setNewStaffRoleId] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState('');

  const searchUsers = async (q) => {
    if (!q.trim()) {
      try {
        const data = await api.admin.getFilteredUsers({ limit: 10, offset: 0 });
        setSearchResults(data.customers || []);
      } catch { setSearchResults([]); }
      return;
    }
    setSearchingUsers(true);
    try {
      const data = await api.admin.getFilteredUsers({ search: q.trim(), limit: 20, offset: 0 });
      setSearchResults(data.customers || []);
    } catch { setSearchResults([]); }
    finally { setSearchingUsers(false); }
  };

  // Form states - Create Role
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState([]);

  // Form states - Create Loan Product Type
  const [newLoanTypeName, setNewLoanTypeName] = useState('');
  const [newLoanBaseRate, setNewLoanBaseRate] = useState('');

  // Rate Editing
  const [editingAccType, setEditingAccType] = useState(null);
  const [accInterestRate, setAccInterestRate] = useState('');
  const [accMaintenanceFee, setAccMaintenanceFee] = useState('');

  const [editingLoanType, setEditingLoanType] = useState(null);
  const [loanBaseRate, setLoanBaseRate] = useState('');
  const [loanLateFee, setLoanLateFee] = useState('');

  const [editingCardType, setEditingCardType] = useState(null);
  const [cardApr, setCardApr] = useState('');
  const [cardLateFee, setCardLateFee] = useState('');

  // Time Skip Simulation Result
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const handleTriggerTimeSkip = async (months) => {
    setSimulating(true);
    setError(''); setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch(`/auth/admin/settings/time-skip?months=${months}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Time skip simulation failed');
      const data = await res.json();
      setSimResult(data);
      setSuccessMsg(`Advanced system time by ${months} month(s)! Interest & fees accrued across all ledgers.`);
      await refreshSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSimulating(false);
    }
  };

  const [fdRates, setFdRates] = useState([]);
  const [editingFdRate, setEditingFdRate] = useState(null);
  const [fdInterestRate, setFdInterestRate] = useState('');

  const loadAdmins = async (page = 0) => {
    setAdminsLoading(true);
    try {
      const token = getAdminToken();
      const headers = { Authorization: `Bearer ${token}` };
      const offset = page * ADMIN_PAGE_SIZE;
      const a = await fetch(`/auth/admin/settings/admins?limit=${ADMIN_PAGE_SIZE}&offset=${offset}`, { headers })
        .then(res => res.ok ? res.json() : {});
      setAdmins(a.admins || []);
      setAdminTotal(a.total || 0);
      setRoleCounts(a.roleCounts || {});
      setAdminPage(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdminsLoading(false);
    }
  };

  const loadCategories = async (page = 0) => {
    setCategoriesLoading(true);
    try {
      const token = getAdminToken();
      const headers = { Authorization: `Bearer ${token}` };
      const offset = page * CATEGORY_PAGE_SIZE;
      const d = await fetch(`/auth/admin/settings/categories?limit=${CATEGORY_PAGE_SIZE}&offset=${offset}`, { headers })
        .then(res => res.ok ? res.json() : {});
      setCategories(d.categories || []);
      setCategoryTotal(d.total || 0);
      setCategoryPage(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const refreshSettings = async () => {
    try {
      const token = getAdminToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [r, accs, loans, cards, tiers, logs, users, fds] = await Promise.all([
        fetch('/auth/admin/settings/roles', { headers }).then(res => res.ok ? res.json() : []),
        fetch('/auth/admin/settings/accounts', { headers }).then(res => res.ok ? res.json() : []),
        fetch('/auth/admin/settings/loans', { headers }).then(res => res.ok ? res.json() : []),
        fetch('/auth/admin/settings/card-types', { headers }).then(res => res.ok ? res.json() : []),
        fetch('/auth/admin/settings/credit-tiers', { headers }).then(res => res.ok ? res.json() : []),
        fetch('/auth/admin/audit-logs/filtered?limit=7', { headers }).then(res => res.ok ? res.json() : {}).then(d => d.logs || []),
        api.admin.getFilteredUsers({ limit: 10, offset: 0 }).then(d => d.customers || []).catch(() => []),
        fetch('/auth/admin/settings/fd-rates', { headers }).then(res => res.ok ? res.json() : []),
      ]);
      setRoles(r || []);
      setAccountTypes(accs || []);
      setLoanTypes(loans || []);
      setCardTypes(cards || []);
      setCreditTiers(tiers || []);
      setAuditLogs(logs || []);
      setRegisteredUsers(users || []);
      setFdRates(fds || []);

      if (r?.length > 0 && !newStaffRoleId) {
        setNewStaffRoleId(r[0].roleId);
      }
      if (users?.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(users[0].customerId);
        setSelectedUserName(users[0].firstName + ' ' + users[0].lastName);
        setSearchResults(users);
      }

      await Promise.all([loadAdmins(0), loadCategories(0)]);
    } catch (err) {
      setError(err.message);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      await refreshSettings();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFdRate = async (rateId) => {
    setError(''); setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch(`/auth/admin/settings/fd-rates/${rateId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interestRate: parseFloat(fdInterestRate) / 100,
        }),
      });
      if (!res.ok) throw new Error('Failed to update FD rate');
      setSuccessMsg('Updated Fixed Deposit tier rate');
      setEditingFdRate(null);
      await refreshSettings();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAddCategory = async () => {
    setError(''); setSuccessMsg('');
    const name = newCategoryName.trim();
    if (!name) { setError('Category name is required'); return; }
    try {
      const token = getAdminToken();
      const res = await fetch('/auth/admin/settings/categories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryName: name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to add category');
      }
      setNewCategoryName('');
      setSuccessMsg(`Added category "${name}"`);
      await loadCategories(0);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveCategoryName = async (id) => {
    setError(''); setSuccessMsg('');
    const name = editingCategoryName.trim();
    if (!name) { setError('Category name is required'); return; }
    try {
      const token = getAdminToken();
      const res = await fetch(`/auth/admin/settings/categories/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryName: name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to rename category');
      }
      setEditingCategoryId(null);
      setEditingCategoryName('');
      setSuccessMsg(`Renamed category to "${name}"`);
      await loadCategories(0);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"? This cannot be undone.`)) return;
    setError(''); setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch(`/auth/admin/settings/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete category');
      }
      setSuccessMsg(`Deleted category "${name}"`);
      await loadCategories(0);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRevokeStaff = async (adminId, email) => {
    if (!window.confirm(`Are you sure you want to revoke admin access and privileges for ${email}?`)) return;
    setError(''); setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch(`/auth/admin/settings/admins/${adminId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to revoke staff access');
      setSuccessMsg(`Revoked admin privileges and unassigned role for ${email}`);
      await loadAdmins(0);
    } catch (err) {
      setError(err.message);
    }
  };

  const changeRole = async (adminId, roleId) => {
    setError(''); setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch(`/auth/admin/settings/admins/${adminId}/role`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      setSuccessMsg('Staff member role updated successfully');
      await loadAdmins(0);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignStaffSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !newStaffRoleId) return;
    setError(''); setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch('/auth/admin/settings/admins', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: Number(selectedCustomerId),
          employeeId: newStaffEmployeeId,
          roleId: Number(newStaffRoleId),
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to assign staff member');
      }
      setSuccessMsg(`Promoted & assigned staff role to: ${selectedUserName || 'User'}`);
      setIsAddStaffOpen(false);
      setNewStaffEmployeeId('');
      setUserSearchQuery('');
      setSearchResults([]);
      setSelectedUserName('');
      await loadAdmins(0);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateRoleSubmit = async (e) => {
    e.preventDefault();
    if (!newRoleName) return;
    setError(''); setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch('/auth/admin/settings/roles', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleName: newRoleName,
          permissions: selectedPerms,
        }),
      });
      if (!res.ok) throw new Error('Failed to create role');
      setSuccessMsg(`Created new role: ROLE_${newRoleName.toUpperCase().replace('ROLE_', '')}`);
      setIsCreateRoleOpen(false);
      setNewRoleName('');
      setSelectedPerms([]);
      await refreshSettings();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateLoanTypeSubmit = async (e) => {
    e.preventDefault();
    if (!newLoanTypeName) return;
    setError(''); setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch('/auth/admin/settings/loans/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeName: newLoanTypeName,
          baseInterestRate: newLoanBaseRate !== '' ? parseFloat(newLoanBaseRate) / 100 : 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to create new loan product');
      setSuccessMsg(`Created new loan product type: ${newLoanTypeName}`);
      setIsCreateLoanTypeOpen(false);
      setNewLoanTypeName('');
      setNewLoanBaseRate('');
      await refreshSettings();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateAccountType = async (typeName) => {
    setError(''); setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch('/auth/admin/settings/accounts', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeName,
          interestRate: accInterestRate !== '' ? parseFloat(accInterestRate) / 100 : null,
          maintenanceFee: accMaintenanceFee !== '' ? parseFloat(accMaintenanceFee) : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update account type rates');
      setSuccessMsg(`Updated interest rate and fee for ${typeName}`);
      setEditingAccType(null);
      await refreshSettings();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateLoanType = async (typeName) => {
    setError(''); setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch('/auth/admin/settings/loans', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeName,
          baseInterestRate: loanBaseRate !== '' ? parseFloat(loanBaseRate) / 100 : null,
          lateFee: loanLateFee !== '' ? parseFloat(loanLateFee) : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update loan type rate');
      setSuccessMsg(`Updated base interest rate and late fee for ${typeName}`);
      setEditingLoanType(null);
      await refreshSettings();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateCardType = async (cardTypeId) => {
    setError(''); setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch(`/auth/admin/settings/card-types/${cardTypeId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultApr: cardApr !== '' ? parseFloat(cardApr) / 100 : null,
          lateFee: cardLateFee !== '' ? parseFloat(cardLateFee) : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update card type');
      setSuccessMsg('Updated card type rates');
      setEditingCardType(null);
      await refreshSettings();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateTier = async (tierId) => {
    setError(''); setSuccessMsg('');
    try {
      const token = getAdminToken();
      const res = await fetch(`/auth/admin/settings/credit-tiers/${tierId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditLimit: parseFloat(editTierLimit),
          apr: parseFloat(editTierApr) / 100,
        }),
      });
      if (!res.ok) throw new Error('Failed to update tier');
      setSuccessMsg('Updated credit score tier');
      setEditingTier(null);
      await refreshSettings();
    } catch (err) {
      setError(err.message);
    }
  };

  const togglePerm = (permKey) => {
    setSelectedPerms(prev =>
      prev.includes(permKey) ? prev.filter(p => p !== permKey) : [...prev, permKey]
    );
  };

  return (
    <>
      {/* Top Header Banner */}
      <div className="pageHeader" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <div>
          <h1 className="pageTitle serifTitle" style={{ fontSize: 28, color: '#f3edd8' }}>Staff Permissions &amp; Settings</h1>
          <div className="pageSubtitle" style={{ color: 'var(--text-dim)' }}>
            Manage staff roles, capability matrix, rate controls, and system audit trail
          </div>
        </div>
        <div className="headerActions" style={{ gap: 12 }}>
          <button
            className="btn btnOutline"
            style={{ borderColor: 'var(--gold)', color: 'var(--gold-light)', fontSize: 12, letterSpacing: '0.05em' }}
            onClick={() => setIsCreateRoleOpen(true)}
          >
            + CREATE ROLE
          </button>
          <button
            className="btn btnGold"
            style={{ fontSize: 12, letterSpacing: '0.05em' }}
            onClick={() => setIsAddStaffOpen(true)}
          >
            + ASSIGN USER TO STAFF
          </button>
        </div>
      </div>

      {error && <div className="errorBanner" style={{ marginBottom: 16 }}>{error}</div>}
      {successMsg && (
        <div style={{ padding: '10px 16px', background: 'rgba(47,191,136,0.12)', border: '1px solid rgba(47,191,136,0.3)', color: 'var(--green)', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
          {successMsg}
        </div>
      )}

      {/* Staff Summary Cards Row */}
      <div className="roleSummaryGrid">
        {roles.map(r => {
          const cleanName = r.roleName.replace('ROLE_', '');
          const count = roleCounts[cleanName] || 0;
          const formattedCount = count < 10 ? `0${count}` : `${count}`;
          return (
            <div key={r.roleId} className="roleCard">
              <div className="roleCardTitle">{cleanName}</div>
              <div className="roleCardCount">{formattedCount}</div>
              <div className="roleCardSub">Active Personnel</div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="lowerGrid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>

        {/* Left Column: Capability Matrix & Personnel Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Capability Matrix */}
          <div className="card">
            <div className="cardHeader">
              <h2 className="serifTitle" style={{ fontSize: 18 }}>Capability Matrix</h2>
            </div>
            <div className="cardBody" style={{ padding: 0 }}>
              {loading ? (
                <div className="loadingBox">Loading matrix…</div>
              ) : (
                <table className="matrixTable">
                  <thead>
                    <tr>
                      <th>Permissions</th>
                      {roles.map(r => (
                        <th key={r.roleId}>{r.roleName.replace('ROLE_', '')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SYSTEM_CAPABILITIES.map(cap => (
                      <tr key={cap.key}>
                        <td>{cap.label}</td>
                        {roles.map(r => {
                          const hasPerm = (r.permissions || []).includes(cap.key);
                          return (
                            <td key={r.roleId}>
                              {hasPerm ? (
                                <span className="checkIcon">✓</span>
                              ) : (
                                <span className="dashIcon">○</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Staff Roster & Role Assignment */}
          <div className="card">
            <div className="cardHeader" style={{ justifyContent: 'space-between' }}>
              <h2 className="serifTitle" style={{ fontSize: 18 }}>Staff Roster &amp; Role Assignments</h2>
              <button
                className="btn btnOutline btnSm"
                style={{ borderColor: 'var(--gold)', color: 'var(--gold-light)' }}
                onClick={() => setIsAddStaffOpen(true)}
              >
                + Assign Registered User
              </button>
            </div>
            <div className="cardBody" style={{ padding: 0 }}>
              {adminsLoading ? (
                <div className="loadingBox">Loading staff roster…</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Personnel</th>
                      <th>Emp ID</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map(admin => (
                      <tr key={admin.adminId}>
                        <td>
                          <div className="customerName">{admin.firstName} {admin.lastName}</div>
                          <div className="customerSub">{admin.email}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{admin.employeeId || '—'}</td>
                        <td>
                          <select
                            className="input"
                            style={{ width: 140, padding: '4px 8px', fontSize: 12, background: 'var(--field)', borderColor: 'var(--border)' }}
                            value={admin.roleName}
                            onChange={(e) => {
                              const role = roles.find(r => r.roleName === e.target.value);
                              if (role) changeRole(admin.adminId, role.roleId);
                            }}
                          >
                            {roles.map(role => (
                              <option key={role.roleId} value={role.roleName}>
                                {role.roleName.replace('ROLE_', '')}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <span className={`pill ${admin.isActive ? 'pillApproved' : 'pillRejected'}`} style={{ fontSize: 10 }}>
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btnDanger btnSm"
                            style={{ padding: '3px 10px', fontSize: 11 }}
                            onClick={() => handleRevokeStaff(admin.adminId, admin.email)}
                          >
                            Revoke Access
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {!adminsLoading && adminTotal > ADMIN_PAGE_SIZE && (
              <div className="cardFooter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  Showing {adminPage * ADMIN_PAGE_SIZE + 1}–{Math.min((adminPage + 1) * ADMIN_PAGE_SIZE, adminTotal)} of {adminTotal} staff
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btnOutline btnSm" disabled={adminPage <= 0} onClick={() => loadAdmins(adminPage - 1)} style={{ opacity: adminPage <= 0 ? 0.4 : 1 }}>← Prev</button>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '0 8px' }}>Page {adminPage + 1} of {Math.ceil(adminTotal / ADMIN_PAGE_SIZE)}</span>
                  <button className="btn btnOutline btnSm" disabled={(adminPage + 1) * ADMIN_PAGE_SIZE >= adminTotal} onClick={() => loadAdmins(adminPage + 1)} style={{ opacity: (adminPage + 1) * ADMIN_PAGE_SIZE >= adminTotal ? 0.4 : 1 }}>Next →</button>
                </div>
              </div>
            )}
          </div>

          {/* Account Types Interest Rates & Fees */}
          <div className="card">
            <div className="cardHeader">
              <h2 className="serifTitle" style={{ fontSize: 18 }}>Account Interest Rates &amp; Fees</h2>
            </div>
            <div className="cardBody" style={{ padding: 0 }}>
              {loading ? (
                <div className="loadingBox">Loading account rates…</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Account Type</th>
                      <th>Annual Interest Rate (%)</th>
                      <th>Monthly Fee ($)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountTypes.map(acc => {
                      const isEditing = editingAccType === acc.typeName;
                      return (
                        <tr key={acc.accountTypeId}>
                          <td className="customerName">{acc.typeName}</td>
                          <td>
                            {isEditing ? (
                              <input
                                type="number" step="0.01" className="input"
                                style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
                                value={accInterestRate}
                                onChange={e => setAccInterestRate(e.target.value)}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: 'var(--gold-light)' }}>{(Number(acc.interestRate) * 100).toFixed(2)}%</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="number" step="0.01" className="input"
                                style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
                                value={accMaintenanceFee}
                                onChange={e => setAccMaintenanceFee(e.target.value)}
                              />
                            ) : (
                              <span>${acc.maintenanceFee ?? 0}</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btnGold btnSm" onClick={() => handleUpdateAccountType(acc.typeName)}>Save</button>
                                <button className="btn btnOutline btnSm" onClick={() => setEditingAccType(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button
                                className="btn btnOutline btnSm"
                                onClick={() => {
                                  setEditingAccType(acc.typeName);
                                  setAccInterestRate(acc.interestRate != null ? (acc.interestRate * 100).toFixed(2) : '');
                                  setAccMaintenanceFee(acc.maintenanceFee ?? 0);
                                }}
                              >
                                Edit Rates
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Fixed Deposit Tiered Rates */}
          <div className="card">
            <div className="cardHeader">
              <h2 className="serifTitle" style={{ fontSize: 18 }}>Fixed Deposit Tiered Rates</h2>
            </div>
            <div className="cardBody" style={{ padding: 0 }}>
              {loading ? (
                <div className="loadingBox">Loading FD tiered rates…</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Term Length</th>
                      <th>Annual Interest Rate (APY)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fdRates.map(fd => {
                      const isEditing = editingFdRate === fd.rateId;
                      return (
                        <tr key={fd.rateId}>
                          <td className="customerName">{fd.termMonths} Months ({fd.termMonths / 12 >= 1 ? `${fd.termMonths / 12} Year${fd.termMonths / 12 > 1 ? 's' : ''}` : `${fd.termMonths} Mo`})</td>
                          <td>
                            {isEditing ? (
                              <input
                                type="number" step="0.01" className="input"
                                style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
                                value={fdInterestRate}
                                onChange={e => setFdInterestRate(e.target.value)}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: 'var(--gold-light)' }}>{(Number(fd.interestRate) * 100).toFixed(2)}%</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btnGold btnSm" onClick={() => handleUpdateFdRate(fd.rateId)}>Save</button>
                                <button className="btn btnOutline btnSm" onClick={() => setEditingFdRate(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button
                                className="btn btnOutline btnSm"
                                onClick={() => {
                                  setEditingFdRate(fd.rateId);
                                  setFdInterestRate((Number(fd.interestRate) * 100).toFixed(2));
                                }}
                              >
                                Edit Rate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Loan Types Interest Rates */}
          <div className="card">
            <div className="cardHeader" style={{ justifyContent: 'space-between' }}>
              <h2 className="serifTitle" style={{ fontSize: 18 }}>Loan Products Base Interest Rates</h2>
              <button
                className="btn btnGold btnSm"
                onClick={() => setIsCreateLoanTypeOpen(true)}
              >
                + CREATE NEW LOAN PRODUCT
              </button>
            </div>
            <div className="cardBody" style={{ padding: 0 }}>
              {loading ? (
                <div className="loadingBox">Loading loan rates…</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Loan Product Type</th>
                      <th>Base Interest Rate (%)</th>
                      <th>Late Fee ($)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanTypes.map(loan => {
                      const isEditing = editingLoanType === loan.typeName;
                      return (
                        <tr key={loan.loanTypeId}>
                          <td className="customerName">{loan.typeName}</td>
                          <td>
                            {isEditing ? (
                              <input
                                type="number" step="0.01" className="input"
                                style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
                                value={loanBaseRate}
                                onChange={e => setLoanBaseRate(e.target.value)}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: 'var(--gold-light)' }}>{(Number(loan.baseInterestRate) * 100).toFixed(2)}%</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="number" step="0.01" className="input"
                                style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
                                value={loanLateFee}
                                onChange={e => setLoanLateFee(e.target.value)}
                              />
                            ) : (
                              <span>${Number(loan.lateFee || 25).toFixed(2)}</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btnGold btnSm" onClick={() => handleUpdateLoanType(loan.typeName)}>Save</button>
                                <button className="btn btnOutline btnSm" onClick={() => setEditingLoanType(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button
                                className="btn btnOutline btnSm"
                                onClick={() => {
                                  setEditingLoanType(loan.typeName);
                                  setLoanBaseRate(loan.baseInterestRate != null ? (loan.baseInterestRate * 100).toFixed(2) : '');
                                  setLoanLateFee(String(loan.lateFee || 25));
                                }}
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Transaction Categories */}
          <div className="card">
            <div className="cardHeader" style={{ justifyContent: 'space-between' }}>
              <h2 className="serifTitle" style={{ fontSize: 18 }}>Transaction Categories</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                  style={{ width: 200, padding: '6px 10px', fontSize: 13 }}
                />
                <button className="btn btnGold btnSm" onClick={handleAddCategory}>+ ADD CATEGORY</button>
              </div>
            </div>
            <div className="cardBody" style={{ padding: 0 }}>
              {categoriesLoading ? (
                <div className="loadingBox">Loading categories…</div>
              ) : categories.length === 0 ? (
                <p style={{ color: '#6B7280', padding: '24px', textAlign: 'center' }}>No categories found.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => {
                      const isEditing = editingCategoryId === cat.categoryId;
                      const inUse = (cat.usedCount || 0) > 0;
                      return (
                        <tr key={cat.categoryId}>
                          <td className="customerName">
                            {isEditing ? (
                              <input
                                type="text"
                                className="input"
                                value={editingCategoryName}
                                onChange={e => setEditingCategoryName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveCategoryName(cat.categoryId); }}
                                style={{ width: 220, padding: '4px 8px', fontSize: 13 }}
                              />
                            ) : (
                              <>
                                {cat.categoryName}
                                {inUse && (
                                  <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 8 }}>
                                    (used by {cat.usedCount} {cat.usedCount === 1 ? 'txn' : 'txns'})
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btnGold btnSm" onClick={() => handleSaveCategoryName(cat.categoryId)}>Save</button>
                                <button className="btn btnOutline btnSm" onClick={() => setEditingCategoryId(null)}>Cancel</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  className="btn btnOutline btnSm"
                                  disabled={inUse}
                                  title={inUse ? `In use by ${cat.usedCount} transaction(s)` : ''}
                                  style={{ textDecoration: inUse ? 'line-through' : 'none', opacity: inUse ? 0.4 : 1, cursor: inUse ? 'not-allowed' : 'pointer' }}
                                  onClick={() => {
                                    if (inUse) return;
                                    setEditingCategoryId(cat.categoryId);
                                    setEditingCategoryName(cat.categoryName);
                                  }}
                                >
                                  Rename
                                </button>
                                <button
                                  className="btn btnOutline btnSm"
                                  disabled={inUse}
                                  title={inUse ? `In use by ${cat.usedCount} transaction(s)` : ''}
                                  style={{ color: 'var(--red, #DC2626)', textDecoration: inUse ? 'line-through' : 'none', opacity: inUse ? 0.4 : 1, cursor: inUse ? 'not-allowed' : 'pointer' }}
                                  onClick={() => {
                                    if (inUse) return;
                                    handleDeleteCategory(cat.categoryId, cat.categoryName);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {!categoriesLoading && categoryTotal > CATEGORY_PAGE_SIZE && (
              <div className="cardFooter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  Showing {categoryPage * CATEGORY_PAGE_SIZE + 1}–{Math.min((categoryPage + 1) * CATEGORY_PAGE_SIZE, categoryTotal)} of {categoryTotal} categories
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btnOutline btnSm" disabled={categoryPage <= 0} onClick={() => loadCategories(categoryPage - 1)} style={{ opacity: categoryPage <= 0 ? 0.4 : 1 }}>← Prev</button>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '0 8px' }}>Page {categoryPage + 1} of {Math.ceil(categoryTotal / CATEGORY_PAGE_SIZE)}</span>
                  <button className="btn btnOutline btnSm" disabled={(categoryPage + 1) * CATEGORY_PAGE_SIZE >= categoryTotal} onClick={() => loadCategories(categoryPage + 1)} style={{ opacity: (categoryPage + 1) * CATEGORY_PAGE_SIZE >= categoryTotal ? 0.4 : 1 }}>Next →</button>
                </div>
              </div>
            )}
          </div>

          {/* Card Rate Settings */}
          <div className="card">
            <div className="cardHeader"><h2>Card Rate Settings</h2></div>
            <div className="cardBody" style={{ padding: 0 }}>
              {loading ? (
                <div className="loadingBox">Loading card types…</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Network</th>
                      <th>Type</th>
                      <th>Default APR (%)</th>
                      <th>Late Fee ($)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardTypes.map(ct => {
                      const isEditing = editingCardType === ct.cardTypeId;
                      return (
                        <tr key={ct.cardTypeId}>
                          <td className="customerName">{ct.network}</td>
                          <td>{ct.typeName}</td>
                          <td>
                            {isEditing ? (
                              <input type="number" step="0.01" className="input" style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
                                value={cardApr} onChange={e => setCardApr(e.target.value)} />
                            ) : (
                              <span style={{ fontWeight: 600 }}>{ct.defaultApr != null ? (ct.defaultApr * 100).toFixed(2) + '%' : '—'}</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input type="number" step="0.01" className="input" style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
                                value={cardLateFee} onChange={e => setCardLateFee(e.target.value)} />
                            ) : (
                              <span>${Number(ct.lateFee || 0).toFixed(2)}</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btnGold btnSm" onClick={() => handleUpdateCardType(ct.cardTypeId)}>Save</button>
                                <button className="btn btnOutline btnSm" onClick={() => setEditingCardType(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button className="btn btnOutline btnSm" onClick={() => {
                                setEditingCardType(ct.cardTypeId);
                                setCardApr(ct.defaultApr ? (ct.defaultApr * 100).toFixed(2) : '0');
                                setCardLateFee(String(ct.lateFee || 0));
                              }}>Edit</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Credit Score Tiers */}
          <div className="card">
            <div className="cardHeader"><h2>Credit Score Tiers</h2></div>
            <div className="cardBody" style={{ padding: 0 }}>
              {loading ? (
                <div className="loadingBox">Loading tiers…</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tier</th>
                      <th>Score Range</th>
                      <th>Credit Limit ($)</th>
                      <th>APR (%)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditTiers.map(t => {
                      const isEditing = editingTier === t.tierId;
                      return (
                        <tr key={t.tierId}>
                          <td className="customerName">{t.tierName}</td>
                          <td>{t.minScore} - {t.maxScore}</td>
                          <td>
                            {isEditing ? (
                              <input type="number" className="input" style={{ width: 100, padding: '4px 8px', fontSize: 12 }}
                                value={editTierLimit} onChange={e => setEditTierLimit(e.target.value)} />
                            ) : (
                              <span>${Number(t.creditLimit).toLocaleString()}</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input type="number" step="0.01" className="input" style={{ width: 80, padding: '4px 8px', fontSize: 12 }}
                                value={editTierApr} onChange={e => setEditTierApr(e.target.value)} />
                            ) : (
                              <span>{(t.apr * 100).toFixed(2)}%</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btnGold btnSm" onClick={() => handleUpdateTier(t.tierId)}>Save</button>
                                <button className="btn btnOutline btnSm" onClick={() => setEditingTier(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button className="btn btnOutline btnSm" onClick={() => {
                                setEditingTier(t.tierId);
                                setEditTierLimit(String(t.creditLimit));
                                setEditTierApr((t.apr * 100).toFixed(2));
                              }}>Edit</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Credit Score Calculation */}
          <div className="card">
            <div className="cardHeader"><h2>Credit Score Calculation</h2></div>
            <div className="cardBody" style={{fontSize:13}}>
              <p style={{margin:'0 0 12px', color:'var(--text-dim)'}}>Scores range from <strong>300-850</strong>. Recalculated on the 1st of each month.</p>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead><tr><th style={{textAlign:'left', borderBottom:'1px solid var(--border)', padding:'6px 0'}}>Factor</th><th style={{textAlign:'right', borderBottom:'1px solid var(--border)', padding:'6px 0'}}>Points</th></tr></thead>
                <tbody>
                  <tr><td style={{padding:'4px 0'}}>Base score</td><td style={{textAlign:'right', fontWeight:600}}>300</td></tr>
                  <tr><td style={{padding:'4px 0'}}>KYC approved</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+80</td></tr>
                  <tr><td style={{padding:'4px 0'}}>Account age (+10/yr, max 10yrs)</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+100</td></tr>
                  <tr><td style={{padding:'4px 0'}}>Total balances &gt; $1,000</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+30</td></tr>
                  <tr><td style={{padding:'4px 0'}}>On-time loan payments (+5 each)</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+100</td></tr>
                  <tr><td style={{padding:'4px 0'}}><strong>DTI</strong> &lt; 36% (debt-to-income)</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+40</td></tr>
                  <tr><td style={{padding:'4px 0'}}><strong>LTV</strong> &lt; 80% (loan-to-value)</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+30</td></tr>
                  <tr><td style={{padding:'4px 0'}}>Credit mix (has loans + cards)</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+40</td></tr>
                  <tr><td style={{padding:'4px 0'}}>Low credit utilization (&lt;30%)</td><td style={{textAlign:'right', fontWeight:600, color:'#155724'}}>+60</td></tr>
                  <tr><td style={{borderTop:'1px solid var(--border)', padding:'4px 0'}}>High <strong>DTI</strong> (&gt;43%)</td><td style={{textAlign:'right', fontWeight:600, borderTop:'1px solid var(--border)', padding:'4px 0', color:'#dc3545'}}>-30</td></tr>
                  <tr><td style={{padding:'4px 0'}}>High utilization (&gt;50%)</td><td style={{textAlign:'right', fontWeight:600, color:'#dc3545'}}>-40</td></tr>
                  <tr><td style={{padding:'4px 0'}}>High <strong>LTV</strong> (&gt;100%, underwater)</td><td style={{textAlign:'right', fontWeight:600, color:'#dc3545'}}>-50</td></tr>
                  <tr><td style={{padding:'4px 0'}}>Outstanding debt</td><td style={{textAlign:'right', fontWeight:600, color:'#dc3545'}}>-50</td></tr>
                </tbody>
              </table>
              <div style={{marginTop:14, padding:'8px 12px', background:'var(--field)', borderRadius:6, fontSize:12}}>
                <strong>Tiers:</strong> 300-579 Poor · 580-669 Fair · 670-739 Good · 740-799 Very Good · 800-850 Excellent
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Time Skip Simulation & Audit Trail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Time Skip & Interest Rate Simulation Panel */}
          <div className="card" style={{ borderColor: 'rgba(229,193,88,0.3)', background: 'linear-gradient(135deg, rgba(22,25,32,0.98), rgba(26,30,38,0.95))' }}>
            <div className="cardHeader">
              <h2 className="serifTitle" style={{ fontSize: 18, color: 'var(--gold-light)' }}>⚡ Time Skip &amp; Rate Simulation</h2>
            </div>
            <div className="cardBody">
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.5 }}>
                Advance system time by N months to execute interest accrual, maintenance fees, and loan interest charges across all active customer ledgers.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="btn btnGold btnFull"
                  disabled={simulating}
                  onClick={() => handleTriggerTimeSkip(1)}
                  style={{ fontSize: 12, letterSpacing: '0.05em' }}
                >
                  {simulating ? 'Simulating…' : '⚡ SIMULATE +1 MONTH'}
                </button>
                <button
                  className="btn btnOutline btnFull"
                  disabled={simulating}
                  onClick={() => handleTriggerTimeSkip(3)}
                  style={{ borderColor: 'var(--gold)', color: 'var(--gold-light)', fontSize: 12, letterSpacing: '0.05em' }}
                >
                  {simulating ? 'Simulating…' : '⚡ SIMULATE +3 MONTHS'}
                </button>
                <button
                  className="btn btnOutline btnFull"
                  disabled={simulating}
                  onClick={() => handleTriggerTimeSkip(6)}
                  style={{ borderColor: 'var(--border)', fontSize: 12, letterSpacing: '0.05em' }}
                >
                  {simulating ? 'Simulating…' : '⚡ SIMULATE +6 MONTHS'}
                </button>
              </div>
            </div>
          </div>

          {/* Audit Trail Panel */}
          <div className="card" style={{ borderColor: 'rgba(229,193,88,0.2)' }}>
            <div className="cardHeader">
              <h2 className="serifTitle" style={{ fontSize: 18 }}>Audit Trail</h2>
            </div>
            <div className="cardBody">
              {loading ? (
                <div className="loadingBox">Loading audit history…</div>
              ) : auditLogs.length === 0 ? (
                <div className="emptyState">No audit log entries recorded yet.</div>
              ) : (
                <div className="auditFeed">
                  {auditLogs.slice(0, 7).map((log, idx) => (
                    <div key={log.id || idx} className="auditItem">
                      <span className="auditDot" />
                      <div>
                        <div className="auditText">
                          <strong style={{ color: 'var(--gold-light)' }}>{log.adminEmail || 'Staff'}</strong>: {log.description || log.details || log.actionType || log.action}
                        </div>
                        <div className="auditTime">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="cardFooter" style={{ justifyContent: 'center' }}>
              <Link href="/admin/audit" className="btn btnOutline btnFull" style={{ borderColor: 'var(--border)', fontSize: 11, letterSpacing: '0.08em', textAlign: 'center' }}>
                VIEW FULL HISTORY PAGE
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* Modal: Assign Existing User to Staff */}
      {isAddStaffOpen && (
        <div className="overlay" onClick={() => setIsAddStaffOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modalHead">
              <span className="title serifTitle">Assign Registered User to Staff</span>
              <button className="closeBtn" onClick={() => setIsAddStaffOpen(false)}>×</button>
            </div>
            <div className="modalBody">
              <form onSubmit={handleAssignStaffSubmit}>
                <div className="field">
                  <label className="fieldLabel">Select Registered User / Customer</label>
                  <input
                    className="input" required
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={e => { setUserSearchQuery(e.target.value); searchUsers(e.target.value); }}
                  />
                  {searchingUsers && <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 0' }}>Searching...</div>}
                  {searchResults.length > 0 && (
                    <div style={{ marginTop: 6, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--field)' }}>
                      {searchResults.map(u => (
                        <div key={u.customerId}
                          onClick={() => {
                            setSelectedCustomerId(u.customerId);
                            setSelectedUserName(u.firstName + ' ' + u.lastName);
                            setUserSearchQuery(u.firstName + ' ' + u.lastName + ' (' + u.email + ')');
                          }}
                          style={{
                            padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                            borderBottom: '1px solid var(--border)',
                            background: selectedCustomerId === u.customerId ? 'rgba(229,193,88,0.1)' : 'transparent',
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</span>
                          <span style={{ color: 'var(--text-dim)', marginLeft: 8, fontSize: 12 }}>{u.email}</span>
                          <span style={{ color: 'var(--text-faint)', marginLeft: 8, fontSize: 11 }}>CID: {u.customerId}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!searchingUsers && userSearchQuery && searchResults.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 0' }}>No users found matching &quot;{userSearchQuery}&quot;</div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label className="fieldLabel">Employee ID (Optional)</label>
                    <input
                      type="text" className="input" placeholder="EMP-8021"
                      value={newStaffEmployeeId} onChange={e => setNewStaffEmployeeId(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="fieldLabel">Assigned Role</label>
                    <select
                      className="select" required
                      value={newStaffRoleId} onChange={e => setNewStaffRoleId(e.target.value)}
                    >
                      {roles.map(r => (
                        <option key={r.roleId} value={r.roleId}>
                          {r.roleName.replace('ROLE_', '')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btnOutline" onClick={() => setIsAddStaffOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btnGold">Assign Staff Role</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Role */}
      {isCreateRoleOpen && (
        <div className="overlay" onClick={() => setIsCreateRoleOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modalHead">
              <span className="title serifTitle">Create New Role</span>
              <button className="closeBtn" onClick={() => setIsCreateRoleOpen(false)}>×</button>
            </div>
            <div className="modalBody">
              <form onSubmit={handleCreateRoleSubmit}>
                <div className="field">
                  <label className="fieldLabel">Role Name</label>
                  <input
                    type="text" required className="input" placeholder="e.g. Senior Auditor"
                    value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="fieldLabel">Granted Capabilities</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    {SYSTEM_CAPABILITIES.map(cap => {
                      const isChecked = selectedPerms.includes(cap.key);
                      return (
                        <label key={cap.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePerm(cap.key)}
                          />
                          <span>{cap.label} ({cap.key})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                  <button type="button" className="btn btnOutline" onClick={() => setIsCreateRoleOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btnGold">Save New Role</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Loan Product Type */}
      {isCreateLoanTypeOpen && (
        <div className="overlay" onClick={() => setIsCreateLoanTypeOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modalHead">
              <span className="title serifTitle">Create New Loan Product &amp; Base Rate</span>
              <button className="closeBtn" onClick={() => setIsCreateLoanTypeOpen(false)}>×</button>
            </div>
            <div className="modalBody">
              <form onSubmit={handleCreateLoanTypeSubmit}>
                <div className="field">
                  <label className="fieldLabel">Loan Product Name</label>
                  <input
                    type="text" required className="input" placeholder="e.g., Student Loan, Solar Loan"
                    value={newLoanTypeName} onChange={e => setNewLoanTypeName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="fieldLabel">Base Annual Interest Rate (%)</label>
                  <input
                    type="number" step="0.01" required className="input" placeholder="e.g., 4.5"
                    value={newLoanBaseRate} onChange={e => setNewLoanBaseRate(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                  <button type="button" className="btn btnOutline" onClick={() => setIsCreateLoanTypeOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btnGold">Create Loan Product</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Time Skip Simulation Results */}
      {simResult && (
        <div className="overlay" onClick={() => setSimResult(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modalHead">
              <span className="title serifTitle">⚡ Time Skip Simulation Result</span>
              <button className="closeBtn" onClick={() => setSimResult(null)}>×</button>
            </div>
            <div className="modalBody">
              <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-dim)' }}>
                Advanced system time by <strong>{simResult.monthsSkipped} month(s)</strong>. Interest, fees, and loan interest accrued across all active customer ledgers.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 14, background: 'var(--field)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interest Paid to Accounts</div>
                  <div className="serifTitle" style={{ fontSize: 20, color: 'var(--gold-light)', marginTop: 4 }}>
                    ${Number(simResult.interestEarned || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ padding: 14, background: 'var(--field)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Maintenance Fees Charged</div>
                  <div className="serifTitle" style={{ fontSize: 20, color: '#f3edd8', marginTop: 4 }}>
                    ${Number(simResult.feesCharged || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ padding: 14, background: 'var(--field)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Loan Interest Accrued</div>
                  <div className="serifTitle" style={{ fontSize: 20, color: '#f18981', marginTop: 4 }}>
                    ${Number(simResult.loanInterestAccrued || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ padding: 14, background: 'var(--field)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transactions Created</div>
                  <div className="serifTitle" style={{ fontSize: 20, color: '#f3edd8', marginTop: 4 }}>
                    {simResult.transactionsCreated || 0}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: 16 }}>
                MongoDB analytics cache was invalidated and updated. All new balances and ledger transactions have been committed to PostgreSQL.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btnGold" onClick={() => setSimResult(null)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
