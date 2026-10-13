'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { AdminAuthProvider, useAdminAuth } from '@/lib/AdminAuthContext';
import './admin-theme.css';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/admin/dashboard', permission: 'dashboard', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
  )},
  { name: 'Transactions', path: '/admin/transactions', permission: 'transactions', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
  )},
  { name: 'Refund Claims', path: '/admin/refunds', permission: 'transactions', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 8l-8 8"/><path d="M8 8v8h8"/></svg>
  )},
  { name: 'KYC', path: '/admin/kyc', permission: 'kyc', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 3h16v18l-4-2-4 2-4-2-4 2z"/></svg>
  )},
  { name: 'Loans', path: '/admin/loans', permission: 'loans', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
  )},
  { name: 'Cards', path: '/admin/cards', permission: 'cards', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/><line x1="5" y1="15" x2="7" y2="15"/></svg>
  )},
  { name: 'Users & Accounts', path: '/admin/users', permission: 'users', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
  )},
  { name: 'Audit Trail', path: '/admin/audit', permission: 'settings', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  )},
  { name: 'Telemetry', path: '/admin/telemetry', permission: 'settings', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-9-9"/><path d="M12 6v6l3 2"/><path d="M21 3v6h-6"/></svg>
  )},
  { name: 'System Analytics', path: '/admin/analytics', permission: 'dashboard', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/><path d="M2 3v18"/><path d="M22 3v18"/></svg>
  )},
];

function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, loading, logout } = useAdminAuth();

  const isLoginPage = pathname === '/admin/login';
  const perms = admin ? (admin.permissions || []) : [];

  useEffect(() => {
    if (!isLoginPage && !loading && !admin) {
      router.replace('/admin/login');
    }
  }, [isLoginPage, loading, admin, router]);

  useEffect(() => {
    if (!isLoginPage && !loading && admin) {
      const currentItem = NAV_ITEMS.find(i => pathname.startsWith(i.path));
      if (currentItem && !perms.includes(currentItem.permission)) {
        router.replace('/admin/dashboard');
      }
      if (pathname.startsWith('/admin/settings') && !perms.includes('settings')) {
        router.replace('/admin/dashboard');
      }
    }
  }, [isLoginPage, loading, admin, pathname, perms, router]);

  if (isLoginPage) {
    return <div className="adminRoot" style={{ display: 'block' }}>{children}</div>;
  }

  if (loading) {
    return (
      <div className="adminRoot" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="loadingBox">Verifying staff session…</div>
      </div>
    );
  }

  if (!admin) return null;

  const initials = admin.email ? admin.email.slice(0, 2).toUpperCase() : 'ST';

  const visibleItems = NAV_ITEMS.filter(item => perms.includes(item.permission));

  return (
    <div className="adminRoot">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandIcon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-6h6v6"/></svg>
          </div>
          <div className="brandName">Equinox Banking</div>
        </div>
        <div className="menuLabel">MAIN MENU</div>
        <nav className="nav">
          {visibleItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`navItem ${pathname.startsWith(item.path) ? 'navItemActive' : ''}`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="sidebarBottom">
          {perms.includes('settings') && (
            <Link href="/admin/settings" className={`navItem ${pathname.startsWith('/admin/settings') ? 'navItemActive' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              Settings
            </Link>
          )}
          <Link href="/admin/profile" className={`navItem ${pathname.startsWith('/admin/profile') ? 'navItemActive' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>
            My Profile
          </Link>
          <button className="navItem" onClick={logout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Log Out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Search by name, email, or CID…
          </div>
          <div className="userBlock">
            <div>
              <div className="userRole" style={{ textAlign: 'right' }}>{admin.roleName ? admin.roleName.replace('ROLE_', '') : 'STAFF'}</div>
              <div className="userName">{admin.email}</div>
            </div>
            <div className="avatar">{initials}</div>
          </div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
