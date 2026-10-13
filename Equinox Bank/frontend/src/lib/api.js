const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jwt_token');
  }
  return null;
}

function getRefreshToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refresh_token');
  }
  return null;
}

export function setToken(token) {
  localStorage.setItem('jwt_token', token);
}

export function setRefreshToken(token) {
  localStorage.setItem('refresh_token', token);
}

export function clearToken() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('refresh_token');
}

export function hasToken() {
  return !!getToken();
}

export function getAdminToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('admin_token');
  }
  return null;
}

function getAdminRefreshToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('admin_refresh_token');
  }
  return null;
}

function clearAdminTokens() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_refresh_token');
}

async function tryRefresh(path) {
  const isAdmin = path.startsWith('/auth/admin');
  const refreshToken = isAdmin ? getAdminRefreshToken() : getRefreshToken();
  if (!refreshToken) return null;

  const refreshPath = isAdmin ? '/auth/admin/refresh' : '/auth/refresh';
  try {
    const res = await fetch(`${API_BASE}${refreshPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      // Only clear tokens on explicit auth failure (4xx), not network errors
      if (res.status >= 400 && res.status < 500) {
        if (isAdmin) clearAdminTokens(); else clearToken();
      }
      return null;
    }
    const data = await res.json();
    if (isAdmin) {
      localStorage.setItem('admin_token', data.token);
      if (data.refreshToken) localStorage.setItem('admin_refresh_token', data.refreshToken);
    } else {
      localStorage.setItem('jwt_token', data.token);
      if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
    }
    return data.token;
  } catch {
    // Network error — don't clear tokens, the server may just be temporarily unreachable
    return null;
  }
}

async function request(path, options = {}) {
  let token = null;
  const isPublicAuthRoute = path === '/auth/login' || path === '/auth/register' || path === '/auth/admin-login' || path === '/auth/forgot-password' || path === '/auth/reset-password' || path === '/auth/refresh' || path === '/auth/admin/refresh';
  const isAdminRoute = path.startsWith('/auth/admin');

  if (typeof window !== 'undefined' && !isPublicAuthRoute) {
    token = isAdminRoute
      ? localStorage.getItem('admin_token')
      : localStorage.getItem('jwt_token');
  }
  const headers = { ...options.headers };

  if (token && !isPublicAuthRoute) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // If 401 and not a public/refresh route, attempt token refresh
  if (res.status === 401 && typeof window !== 'undefined' && !isPublicAuthRoute && !isRefreshRoute(path)) {
    const newToken = await tryRefresh(path);
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } else {
      // Refresh failed — redirect to login
      if (isAdminRoute) {
        window.location.href = '/admin/login';
      } else {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  const text = await res.text();

  if (!res.ok) {
    let message;
    try {
      message = JSON.parse(text);
    } catch {
      message = text;
    }
    throw new Error(typeof message === 'string' ? message : message.message || `Request failed: ${res.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRefreshRoute(path) {
  return path === '/auth/refresh' || path === '/auth/admin/refresh';
}

export const api = {
  // Auth
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => {
    const refreshToken = getRefreshToken();
    const headers = {};
    if (refreshToken) headers['X-Refresh-Token'] = refreshToken;
    return request('/auth/logout', { method: 'POST', headers });
  },
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  // Profile
  getProfile: () => request('/auth/profile'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // KYC
  uploadKyc: (formData) => request('/auth/kyc/upload', { method: 'POST', body: formData }),
  getKycDocuments: () => request('/auth/kyc/documents'),
  getKycReviews: () => request('/auth/kyc/reviews'),
  uploadProfilePhoto: (formData) => request('/auth/kyc/profile-photo', { method: 'POST', body: formData }),

  // Accounts
  getAccounts: () => request('/auth/accounts'),
  getAccount: (id) => request(`/auth/accounts/${id}`),
  getAccountTypes: () => request('/auth/accounts/types'),
  getFdRates: () => request('/auth/accounts/fd-rates'),
  createAccount: (data) => request('/auth/accounts', { method: 'POST', body: JSON.stringify(data) }),
  setPrimaryAccount: (id) => request(`/auth/accounts/${id}/primary`, { method: 'PUT' }),
  updateAccountName: (id, name) => request(`/auth/accounts/${id}/name`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteAccount: (id) => request(`/auth/accounts/${id}`, { method: 'DELETE' }),
  lookupAccount: (accountNumber) => request('/auth/accounts/lookup?accountNumber=' + encodeURIComponent(accountNumber)),
  getCategories: () => request('/auth/categories'),
  // Transactions
  getTransactions: () => request('/auth/transactions'),
  getTransaction: (id) => request(`/auth/transactions/${id}`),
  getTransactionRefund: (id) => request(`/auth/transactions/${id}/refund`),
  deposit: (data) => request('/auth/transactions/deposit', { method: 'POST', body: JSON.stringify(data) }),
  withdraw: (data) => request('/auth/transactions/withdraw', { method: 'POST', body: JSON.stringify(data) }),
  transfer: (data) => request('/auth/transactions/transfer', { method: 'POST', body: JSON.stringify(data) }),
  refund: (id, data) => request(`/auth/transactions/${id}/refund`, { method: 'POST', body: JSON.stringify(data) }),

  // Bills
  getBills: () => request('/auth/bills'),
  createBill: (data) => request('/auth/bills', { method: 'POST', body: JSON.stringify(data) }),
  deleteBill: (id) => request(`/auth/bills/${id}`, { method: 'DELETE' }),
  payBill: (id, data) => request(`/auth/bills/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  lookupPayee: (accountNumber) => request('/auth/bills/payees/lookup?accountNumber=' + encodeURIComponent(accountNumber)),

  // Loans
  getLoanTypes: () => request('/auth/loans/types'),
  getLoans: () => request('/auth/loans'),
  getLoan: (id) => request(`/auth/loans/${id}`),
  applyForLoan: (data) => request('/auth/loans', { method: 'POST', body: JSON.stringify(data) }),
  updateLoan: (id, data) => request(`/auth/loans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  repayLoan: (id, data, fromAccountId) =>
    request(`/auth/loans/${id}/repay?fromAccountId=${fromAccountId}`, { method: 'POST', body: JSON.stringify(data) }),
  addCollateral: (id, data) => request(`/auth/loans/${id}/collateral`, { method: 'POST', body: JSON.stringify(data) }),
  getCollateral: (id) => request(`/auth/loans/${id}/collateral`),
  getLoanRepayments: (id) => request(`/auth/loans/${id}/repayments`),
  uploadCollateralDoc: (formData) => request('/auth/loans/collateral/upload', { method: 'POST', body: formData }),

  // Savings Goals
  getSavingsGoals: () => request('/auth/savings-goals'),
  createSavingsGoal: (data) => request('/auth/savings-goals', { method: 'POST', body: JSON.stringify(data) }),
  depositToSavingsGoal: (id, data) => request(`/auth/savings-goals/${id}/deposit`, { method: 'POST', body: JSON.stringify(data) }),
  withdrawFromSavingsGoal: (id, data) => request(`/auth/savings-goals/${id}/withdraw`, { method: 'POST', body: JSON.stringify(data) }),
  deleteSavingsGoal: (id) => request(`/auth/savings-goals/${id}`, { method: 'DELETE' }),

  // Cards
  getCardTypes: () => request('/auth/cards/types'),
  getCards: () => request('/auth/cards'),
  getCard: (id) => request(`/auth/cards/${id}`),
  issueCard: (data) => request('/auth/cards/issue', { method: 'POST', body: JSON.stringify(data) }),
  freezeCard: (id) => request(`/auth/cards/${id}/freeze`, { method: 'PUT' }),
  unfreezeCard: (id) => request(`/auth/cards/${id}/unfreeze`, { method: 'PUT' }),
  deactivateCard: (id) => request(`/auth/cards/${id}`, { method: 'DELETE' }),
  getCardLimits: (id) => request(`/auth/cards/${id}/limits`),
  updateCardLimits: (id, data) => request(`/auth/cards/${id}/limits`, { method: 'PUT', body: JSON.stringify(data) }),
  getCardTransactions: (id, page = 0) => request(`/auth/cards/${id}/transactions?page=${page}&size=50`),
  getCreditInfo: (id) => request(`/auth/cards/${id}/credit`),
  creditPurchase: (id, data) => request(`/auth/cards/${id}/credit/purchase`, { method: 'POST', body: JSON.stringify(data) }),
  creditPay: (id, data) => request(`/auth/cards/${id}/credit/pay`, { method: 'POST', body: JSON.stringify(data) }),
  requestLimitIncrease: (id, data) => request(`/auth/cards/${id}/credit/request-limit`, { method: 'POST', body: JSON.stringify(data) }),
  getCreditStatements: (id) => request(`/auth/cards/${id}/credit/statements`),
  simulatePurchase: (id, data) => request(`/auth/cards/${id}/purchase`, { method: 'POST', body: JSON.stringify(data) }),

  // Analytics
  getSpendingSummary: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request('/auth/analytics/spending' + qs);
  },
  getSpendingByCategory: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request('/auth/analytics/spending/categories' + qs);
  },
  getIncomeVsExpense: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request('/auth/analytics/income-vs-expense' + qs);
  },

  getProfilePhotoBlob: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwt_token') : null;
    const res = await fetch('/auth/profile-photo', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  },

  // Audit logs
  getAuditLogs: (table, recordId) => {
    const params = new URLSearchParams({ table, recordId }).toString();
    return request('/auth/admin/audit-logs?' + params);
  },
  getFilteredAuditLogs: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request('/auth/admin/audit-logs/filtered' + qs);
  },

  // Seed / Dev utilities
  seed: {
    transactions: (startMonth, endMonth) =>
      request(`/auth/seed/transactions?startMonth=${startMonth}&endMonth=${endMonth}`, { method: 'POST' }),
    categories: () => request('/auth/seed/categories', { method: 'POST' }),
  },

  // Simulation
  sim: {
    timeSkip: (months) => request(`/auth/sim/time-skip?months=${months}`, { method: 'POST' }),
  },

  // Admin
  admin: {
    getDashboard: () => request('/auth/admin/dashboard'),
    getKycQueue: () => request('/auth/admin/kyc'),
    getFilteredKycQueue: (params) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request('/auth/admin/kyc/filtered' + qs);
    },
    reviewKyc: (documentId, data) => request(`/auth/admin/kyc/${documentId}/review`, { method: 'PUT', body: JSON.stringify(data) }),
    getAllUsers: () => request('/auth/admin/users'),
    getFilteredUsers: (params) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request('/auth/admin/users/filtered' + qs);
    },
    getUserDetail: (id) => request(`/auth/admin/users/${id}`),
    updateCustomerStatus: (id, data) => request(`/auth/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getAllTransactions: (params) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request('/auth/admin/transactions' + qs);
    },
    getAllLoans: (params) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request('/auth/admin/loans' + qs);
    },
    getTransactionVolume: (range) => request(`/auth/admin/dashboard/transaction-volume?range=${range}`),
    getFilteredLoans: (params) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request('/auth/admin/loans/filtered' + qs);
    },
    getPendingLoans: () => request('/auth/admin/loans/pending'),
    approveRejectLoan: (id, data) => request(`/auth/admin/loans/${id}/review`, { method: 'PUT', body: JSON.stringify(data) }),
    getTelemetry: () => request('/auth/admin/telemetry'),
    getCards: (params) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request('/auth/admin/cards' + qs);
    },
    getCard: (id) => request(`/auth/admin/cards/${id}`),
    getCardRequests: (id) => request(`/auth/admin/cards/${id}/requests`),
    getCreditRequests: (params) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request('/auth/admin/cards/credit-requests' + qs);
    },
    reviewCreditRequest: (requestId, data) => request(`/auth/admin/cards/credit-requests/${requestId}/review`, { method: 'PUT', body: JSON.stringify(data) }),
    overrideCard: (id, data) => request(`/auth/admin/cards/${id}/override`, { method: 'PUT', body: JSON.stringify(data) }),
    adjustBalance: (id, data) => request(`/auth/admin/cards/${id}/adjust-balance`, { method: 'POST', body: JSON.stringify(data) }),
  },
};