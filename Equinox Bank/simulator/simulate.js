import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_API = process.env.ADMIN_API || 'http://localhost:8081';
const USER_API = process.env.USER_API || 'http://localhost:8082';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);
const SKIP_CARD_PURCHASES = process.env.SKIP_CARD_PURCHASES === 'true';

let adminToken = null;
const totalStart = Date.now();

function vlog(msg, level = 'info') {
  const ts = new Date().toISOString().slice(11, 19);
  const prefix = { info: '  •', ok: '  ✓', warn: '  ⚠', err: '  ✗', step: '────' }[level] || '  •';
  const color = { info: '\x1b[37m', ok: '\x1b[32m', warn: '\x1b[33m', err: '\x1b[31m', step: '\x1b[36m' }[level] || '\x1b[37m';
  process.stdout.write(`${color}[${ts}] ${prefix} ${msg}\x1b[0m\n`);
}

async function api(baseUrl, method, path, opts = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { ...opts.headers };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts.json !== undefined) headers['Content-Type'] = 'application/json';
  const body = opts.json !== undefined ? JSON.stringify(opts.json) : opts.body;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeout || 180000);
  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${url} → ${res.status}: ${text.slice(0, 200)}`);
    try { return JSON.parse(text); } catch { return text; }
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fmtNum(n) {
  if (n == null || n < 0) return '—';
  return Number(n).toLocaleString();
}

async function adminLogin() {
  const res = await api(ADMIN_API, 'POST', '/auth/login', {
    json: { email: 'admin@equinox.com', password: 'admin' },
  });
  adminToken = res.token;
  vlog(`Logged in as admin@equinox.com | token: ${res.token.slice(0, 20)}...`, 'ok');
}

function progressBar(current, total, width = 30) {
  const pct = total > 0 ? Math.min(current / total, 1) : 0;
  const filled = Math.round(pct * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled) + ` ${current}/${total}`;
}

async function pollStatus(jobId) {
  const steps = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frame = 0;
  let lastStep = '';

  while (true) {
    const res = await api(USER_API, 'GET', `/auth/admin/seed/status/${jobId}`, { token: adminToken });

    if (res.status === 'done' || res.status === 'error') {
      if (res.currentStep) {
        process.stdout.write(`\r\x1b[K${res.status === 'done' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${res.currentStep}\n`);
      }
      if (res.errorMessage) {
        process.stdout.write(`\x1b[31m  Error: ${res.errorMessage.slice(0, 200)}\x1b[0m\n`);
      }
      return res;
    }

    const bar = progressBar(res.currentItem || 0, res.totalItems || 0);
    const spinner = steps[frame % steps.length];

    const statusLine = `${spinner} ${res.currentStep || 'starting...'}  ${bar}`;
    if (statusLine !== lastStep) {
      process.stdout.write(`\r\x1b[K${statusLine}`);
      lastStep = statusLine;
    }

    frame++;
    await sleep(1000);
  }
}

function printResult(res) {
  const timeSec = (res.timeTakenMs / 1000).toFixed(1);
  const line = '─'.repeat(50);

  console.log(`\n\x1b[36m╔${line}╗\x1b[0m`);
  console.log(`\x1b[36m║  SEED SIMULATION COMPLETE — ${timeSec}s\x1b[0m`);
  console.log(`\x1b[36m╚${line}╝\x1b[0m`);

  const rows = [
    ['Customers registered', res.customers],
    ['KYC documents', res.kycDocuments],
    ['Accounts created', res.accounts],
    ['Deposits', res.deposits],
    ['Withdrawals', res.withdrawals],
    ['Transfers', res.transfers],
    ['Cards issued', res.cards],
    ['Card purchases', res.purchases],
    ['Loans applied', res.loans],
    ['Collaterals added', res.collaterals],
    ['Refunds', res.refunds],
    ['Loan repayments', res.repayments],
    ['Credit card payments', res.creditPayments],
    ['Interest transactions', res.interestTransactions],
    ['Card statements', res.cardStatements],
    ['Credit limit requests', res.creditRequests],
    ['Card status changes', res.cardStatusChanges],
    ['Bill payments', res.billPayments],
  ];

  const nameWidth = Math.max(...rows.map(r => r[0].length));
  for (const [name, val] of rows) {
    console.log(`  \x1b[90m${name.padEnd(nameWidth)}\x1b[0m  \x1b[97m${fmtNum(val).padStart(12)}\x1b[0m`);
  }

  console.log(`  \x1b[90m${'─'.repeat(nameWidth)}\x1b[0m  \x1b[90m${'─'.repeat(12)}\x1b[0m`);
  console.log(`  \x1b[33mTotal time\x1b[0m  \x1b[97m${timeSec}s`.padEnd(30) + '\x1b[0m');
}

async function main() {
  console.log('\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[36m  BANK DATA SIMULATOR (SERVER-SIDE)\x1b[0m');
  console.log(`\x1b[36m  ${new Date().toISOString()}\x1b[0m`);
  console.log('\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m');
  console.log(`  User API: ${USER_API}`);
  console.log(`  Batch:    ${BATCH_SIZE} customers`);
  console.log(`  Purchases: ${SKIP_CARD_PURCHASES ? 'SKIPPED' : 'enabled'}`);
  console.log('');

  await adminLogin();

  const payload = { batchSize: BATCH_SIZE, skipCardPurchases: SKIP_CARD_PURCHASES };

  vlog(`POST /auth/admin/seed/simulate → starting seed job...`, 'step');
  const { jobId } = await api(USER_API, 'POST', '/auth/admin/seed/simulate', {
    token: adminToken, json: payload,
  });
  vlog(`Job ID: ${jobId}`, 'ok');

  const result = await pollStatus(jobId);

  if (result.status === 'done' && result.result) {
    printResult(result.result);
  } else if (result.status === 'error') {
    console.log(`\n\x1b[31m✗ Seed simulation failed after ${((Date.now() - totalStart) / 1000).toFixed(1)}s\x1b[0m`);
    process.exit(1);
  }

  const totalTime = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log(`\n  \x1b[90mTotal wall time: ${totalTime}s\x1b[0m`);
  console.log('');
  console.log('  Config env vars:');
  console.log('    $env:BATCH_SIZE=200           Customers to simulate (default 50)');
  console.log('    $env:SKIP_CARD_PURCHASES=true  Skip card purchases for speed');
}

main().catch(e => { console.error('\n\x1b[31m✗ Fatal error:\x1b[0m', e.message); process.exit(1); });
