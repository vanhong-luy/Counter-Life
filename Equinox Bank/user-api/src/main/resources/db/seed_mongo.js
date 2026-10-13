// =============================================================================
// MONGODB SEED — audit logs + monthly analytics
//
// AUDIT LOGS mirror the REAL admin flow: they reference actual record IDs from
// the PostgreSQL seed (exported to /audit_refs.json by seed.ps1) and use the
// exact action types + descriptions the admin-api code produces.
//
// Run:  mongosh bank_analytics /seed.js   (after seed.ps1 copies refs + this)
// =============================================================================

const BATCH = 2500;

// --- Real references exported by seed.ps1 from PostgreSQL ------------------
let refs = { admins: [], kyc: [], loans: [], refunds: [], clrs: [], cards: [], customers: [] };
try {
  refs = JSON.parse(fs.readFileSync('/audit_refs.json', 'utf8'));
} catch (e) {
  print('WARN: could not read /audit_refs.json — falling back to empty refs: ' + e.message);
}

const ADMINS = refs.admins || [];
const KYC = refs.kyc || [];          // [{id, status}]
const LOANS = refs.loans || [];      // [{id, status}]
const REFUNDS = refs.refunds || [];  // [{id, status}]
const CLRS = refs.clrs || [];        // [{id, status}]
const CARDS = refs.cards || [];      // [id]
const CUSTOMERS = refs.customers || []; // [{id, name}]

// Admin role groups (admin_id ranges match seed_mass.sql insert order)
function adminsByRange(min, max) {
  return ADMINS.filter(a => a.id >= min && a.id <= max);
}
const SUPER = adminsByRange(1, 10);       // ROLE_SUPER_ADMIN
const ADMINS_OP = adminsByRange(11, 40);  // ROLE_ADMIN
const KYC_OFF = adminsByRange(41, 65);    // ROLE_KYC_OFFICER
const LOAN_OFF = adminsByRange(66, 90);   // ROLE_LOAN_OFFICER
const AUDITOR = adminsByRange(91, 110);   // ROLE_AUDITOR

function rnd(max) { return Math.floor(Math.random() * max); }
function pick(arr) { return arr.length > 0 ? arr[rnd(arr.length)] : null; }
function upper(s) { return (s || '').toUpperCase(); }
function randomDate(monthsBack) {
  return new Date(Date.now() - Math.floor(Math.random() * monthsBack * 30 * 24 * 3600000));
}
function remarksFor() {
  return pick(['', '', 'All checks passed', 'Document verified', 'Verified with source', 'Approved after review', 'Requires follow-up', 'On hold']);
}

const ACTIONS = [];

// REVIEW_KYC — one log per approved/rejected KYC doc (real doc IDs)
for (const doc of KYC) {
  if (!['approved', 'rejected'].includes((doc.status || '').toLowerCase())) continue;
  const admin = pick([...KYC_OFF, ...SUPER]);
  if (!admin) continue;
  ACTIONS.push({
    adminId: admin.id, adminEmail: admin.email,
    actionType: 'REVIEW_KYC', tableAffected: 'kyc_documents', recordId: doc.id,
    description: 'Reviewed KYC document status to ' + upper(doc.status),
    timestamp: randomDate(12),
    payloadDiff: { status: upper(doc.status), remarks: remarksFor() },
  });
}

// REVIEW_LOAN — one log per approved/active/settled/rejected loan (real IDs)
for (const loan of LOANS) {
  const s = (loan.status || '').toLowerCase();
  if (!['approved', 'active', 'settled', 'rejected'].includes(s)) continue;
  const admin = pick([...LOAN_OFF, ...SUPER]);
  if (!admin) continue;
  ACTIONS.push({
    adminId: admin.id, adminEmail: admin.email,
    actionType: 'REVIEW_LOAN', tableAffected: 'loans', recordId: loan.id,
    description: 'Reviewed loan application status to ' + upper(s),
    timestamp: randomDate(12),
    payloadDiff: { status: upper(s), remarks: remarksFor() },
  });
}

// REVIEW_REFUND — one log per completed/rejected refund (real IDs)
for (const rf of REFUNDS) {
  const s = (rf.status || '').toLowerCase();
  if (!['completed', 'rejected'].includes(s)) continue;
  const admin = pick([...AUDITOR, ...ADMINS_OP]);
  if (!admin) continue;
  ACTIONS.push({
    adminId: admin.id, adminEmail: admin.email,
    actionType: 'REVIEW_REFUND', tableAffected: 'refunds', recordId: rf.id,
    description: 'Reviewed refund request status to ' + upper(s),
    timestamp: randomDate(12),
    payloadDiff: { status: upper(s), remarks: remarksFor() },
  });
}

// REVIEW_CREDIT_REQUEST — one log per APPROVED/REJECTED credit limit request
for (const req of CLRS) {
  const s = (req.status || '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(s)) continue;
  const admin = pick([...ADMINS_OP, ...SUPER]);
  if (!admin) continue;
  ACTIONS.push({
    adminId: admin.id, adminEmail: admin.email,
    actionType: 'REVIEW_CREDIT_REQUEST', tableAffected: 'credit_limit_requests', recordId: req.id,
    description: 'Reviewed credit limit request to ' + s,
    timestamp: randomDate(9),
    payloadDiff: { status: s, adminNotes: pick(['Credit score qualifies', 'Payment history good', 'Income verified', 'Limit too high for profile']) },
  });
}

// OVERRIDE_CARD — subset of cards
for (let i = 0; i < Math.min(CARDS.length, 3000); i += 1) {
  const cardId = CARDS[rnd(CARDS.length)];
  const admin = pick([...ADMINS_OP, ...SUPER]);
  if (!admin) continue;
  ACTIONS.push({
    adminId: admin.id, adminEmail: admin.email,
    actionType: 'OVERRIDE_CARD', tableAffected: 'cards', recordId: cardId,
    description: 'Overrode card settings',
    timestamp: randomDate(9),
    payloadDiff: { apr: '24.99', creditLimit: String(1000 + rnd(9000)) },
  });
}

// ADJUST_BALANCE — subset of cards
for (let i = 0; i < Math.min(CARDS.length, 2000); i += 1) {
  const cardId = CARDS[rnd(CARDS.length)];
  const admin = pick([...ADMINS_OP, ...SUPER]);
  if (!admin) continue;
  const amt = (10 + Math.random() * 500).toFixed(2);
  ACTIONS.push({
    adminId: admin.id, adminEmail: admin.email,
    actionType: 'ADJUST_BALANCE', tableAffected: 'cards', recordId: cardId,
    description: 'Adjusted outstanding balance by ' + amt,
    timestamp: randomDate(6),
    payloadDiff: { amount: amt, reason: pick(['Customer dispute', 'Billing error correction', 'Waiver applied', 'Manual correction']) },
  });
}

// UPDATE_USER — subset of customers
for (let i = 0; i < Math.min(CUSTOMERS.length, 6000); i += 1) {
  const cust = CUSTOMERS[rnd(CUSTOMERS.length)];
  const admin = pick(ADMINS_OP);
  if (!admin) continue;
  ACTIONS.push({
    adminId: admin.id, adminEmail: admin.email,
    actionType: 'UPDATE_USER', tableAffected: 'customers', recordId: cust.id,
    description: 'Updated customer details for ' + (cust.name || 'Customer'),
    timestamp: randomDate(12),
    payloadDiff: { kycStatus: pick(['APPROVED', 'PENDING', 'REJECTED']) },
  });
}

// UPDATE_SETTINGS — FD rates, account types, loan types (fixed reference tables)
const SETTINGS_ACTIONS = [
  { table: 'fixed_deposit_rates', desc: 'Updated FD rate tier 12 months to 4.5%', payload: { termMonths: 12, interestRate: 0.045 } },
  { table: 'fixed_deposit_rates', desc: 'Updated FD rate tier 24 months to 5.25%', payload: { termMonths: 24, interestRate: 0.0525 } },
  { table: 'account_types', desc: 'Updated account type Savings Account settings', payload: { interestRate: 0.04, maintenanceFee: 5 } },
  { table: 'account_types', desc: 'Updated account type Everyday Checking settings', payload: { interestRate: 0.02, maintenanceFee: 8 } },
  { table: 'loan_types', desc: 'Updated loan type Personal settings', payload: { baseInterestRate: 0.08 } },
  { table: 'loan_types', desc: 'Updated loan type Home settings', payload: { baseInterestRate: 0.062 } },
];
for (const s of SETTINGS_ACTIONS) {
  const admin = pick(SUPER);
  if (!admin) continue;
  ACTIONS.push({
    adminId: admin.id, adminEmail: admin.email,
    actionType: 'UPDATE_SETTINGS', tableAffected: s.table,
    recordId: 1 + rnd(5),
    description: s.desc, timestamp: randomDate(6), payloadDiff: s.payload,
  });
}

// Staff / role / loan-product admin actions
const adminPool = ADMINS.filter(a => a.id > 1);
for (const staff of adminPool.slice(0, 40)) {
  const actor = pick(SUPER);
  if (!actor) continue;
  ACTIONS.push({
    adminId: actor.id, adminEmail: actor.email,
    actionType: 'ASSIGN_STAFF', tableAffected: 'admin_users', recordId: staff.id,
    description: 'Assigned staff role to ' + staff.email,
    timestamp: randomDate(6),
    payloadDiff: { email: staff.email, role: 'ROLE_ADMIN' },
  });
}
for (const staff of adminPool.slice(0, 8)) {
  const actor = pick(SUPER);
  if (!actor) continue;
  ACTIONS.push({
    adminId: actor.id, adminEmail: actor.email,
    actionType: 'REVOKE_STAFF', tableAffected: 'admin_users', recordId: staff.id,
    description: 'Revoked staff access & unassigned admin role from ' + staff.email,
    timestamp: randomDate(6),
    payloadDiff: { email: staff.email, employeeId: '' },
  });
}
for (let i = 0; i < 3; i++) {
  const actor = pick(SUPER);
  if (!actor) continue;
  ACTIONS.push({
    adminId: actor.id, adminEmail: actor.email,
    actionType: 'CREATE_ROLE', tableAffected: 'admin_roles', recordId: 6 + i,
    description: 'Created new role ' + pick(['ROLE_COMPLIANCE', 'ROLE_FINANCE', 'ROLE_BRANCH_MGR']),
    timestamp: randomDate(9), payloadDiff: { roleName: 'NEW_ROLE', permissions: 'dashboard,kyc' },
  });
}
for (let i = 0; i < 2; i++) {
  const actor = pick(SUPER);
  if (!actor) continue;
  ACTIONS.push({
    adminId: actor.id, adminEmail: actor.email,
    actionType: 'CREATE_LOAN_TYPE', tableAffected: 'loan_types', recordId: 5 + i,
    description: 'Created new loan product type ' + pick(['Green Energy', 'Startup Loan']),
    timestamp: randomDate(9), payloadDiff: { typeName: 'NEW_LOAN_TYPE', baseInterestRate: '7.5' },
  });
}

// TIME_SKIP_SIMULATION — a few past simulation runs
for (let i = 0; i < 5; i++) {
  const actor = pick(SUPER);
  if (!actor) continue;
  ACTIONS.push({
    adminId: actor.id, adminEmail: actor.email,
    actionType: 'TIME_SKIP_SIMULATION', tableAffected: 'system', recordId: 3,
    description: 'Executed 3 month(s) time skip simulation across all accounts & loans',
    timestamp: randomDate(4),
    payloadDiff: { monthsSkipped: 3, interestTxns: 10000 + rnd(40000), loanInterestTxns: 1000 + rnd(9000) },
  });
}

// Insert in batches
print('=== Generating audit_logs (' + ACTIONS.length + ' logs mirroring real flow) ===');
db.audit_logs.deleteMany({});
for (let i = 0; i < ACTIONS.length; i += BATCH) {
  const chunk = ACTIONS.slice(i, i + BATCH).map(a => ({
    adminId: a.adminId, adminEmail: a.adminEmail,
    actionType: a.actionType, tableAffected: a.tableAffected,
    recordId: a.recordId, description: a.description,
    timestamp: a.timestamp, payloadDiff: a.payloadDiff,
    _class: 'com.equinox.admin.document.AuditLogDocument',
  }));
  db.audit_logs.insertMany(chunk, { ordered: false });
}
print('  inserted ' + ACTIONS.length + ' audit logs');

// =============================================================================
// 2. MONTHLY ANALYTICS — COUNT: ~300,000
//    Per-customer monthly spending summaries with category breakdowns.
// =============================================================================
print('=== Generating monthly_analytics ===');

const CATEGORIES = [
  { name: 'Groceries', avg: 450, range: 0.6 },
  { name: 'Utilities', avg: 220, range: 0.4 },
  { name: 'Entertainment', avg: 130, range: 0.5 },
  { name: 'Dining', avg: 280, range: 0.6 },
  { name: 'Shopping', avg: 350, range: 0.7 },
  { name: 'Transportation', avg: 180, range: 0.4 },
  { name: 'Health', avg: 210, range: 0.5 },
  { name: 'Rent', avg: 1400, range: 0.2 },
  { name: 'Insurance', avg: 160, range: 0.3 },
  { name: 'Subscription', avg: 45, range: 0.3 },
];

function amount(avg, range) {
  return Math.round(avg * (1 - range + Math.random() * range * 2) * 100) / 100;
}

function analyticsEmail() {
  if (CUSTOMERS.length === 0) return 'customer1@seed.local';
  const c = CUSTOMERS[rnd(CUSTOMERS.length)];
  const name = (c.name || 'Customer').toLowerCase().replace(/[^a-z ]/g, '').split(' ');
  const f = name[0] || 'customer';
  const l = name.length > 1 ? name[name.length - 1] : 'seed';
  return f + '.' + l + c.id + '@seed.local';
}

let totalAnalytics = 0;
for (let b = 0; b < 12; b++) {
  const docs = [];
  for (let i = 0; i < BATCH; i++) {
    const e = analyticsEmail();
    const monthsAgo = rnd(12);
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    const period = d.toISOString().slice(0, 7);

    let totalExpenses = 0;
    const cats = [];
    for (const c of CATEGORIES) {
      const amt = amount(c.avg, c.range);
      totalExpenses += amt;
      cats.push({
        categoryName: c.name,
        totalAmount: amt,
        transactionCount: rnd(18) + 1,
        topTransactions: []
      });
    }
    const income = Math.round(totalExpenses * (1.1 + Math.random() * 0.6) * 100) / 100;

    docs.push({
      email: e,
      period: period,
      totalIncome: income,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netBalance: Math.round((income - totalExpenses) * 100) / 100,
      categories: cats,
      computedAt: new Date(d.getTime()),
      _class: 'com.equinox.bank.document.MonthlyAnalyticsDocument'
    });
  }
  db.monthly_analytics.insertMany(docs, { ordered: false });
  totalAnalytics += BATCH;
  print('  Batch ' + (b + 1) + '/12 — ' + totalAnalytics.toLocaleString() + ' analytics docs inserted');
}

// =============================================================================
// RESULT
// =============================================================================
print('');
print('========================================');
print('  MONGODB SEED COMPLETE');
print('========================================');
print('  audit_logs:         ' + db.audit_logs.countDocuments({}).toLocaleString());
print('  monthly_analytics:  ' + db.monthly_analytics.countDocuments({}).toLocaleString());
