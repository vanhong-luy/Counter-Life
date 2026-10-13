export const MOCK_TRANSACTIONS = [
  {
    id: 'TRX-92837492',
    merchant: 'Whole Foods Market',
    category: 'Groceries',
    date: 'Oct 24, 2023',
    time: '09:41 AM',
    ref: 'REF-92837492',
    status: 'Cleared',
    amount: '-$1250.00',
    type: 'negative',
    iconType: 'store'
  },
  {
    id: 'TRX-74839201',
    merchant: 'Acme Corp',
    category: 'Refund',
    date: 'Oct 23, 2023',
    time: '02:00 AM',
    ref: 'REF-74839201',
    status: 'Processing',
    amount: '+$4,250.00',
    type: 'positive',
    iconType: 'refund'
  },
  {
    id: 'TRX-10293847',
    merchant: 'Transfer to Savings',
    category: 'Internal Transfer',
    date: 'Oct 22, 2023',
    time: '14:30 PM',
    ref: 'REF-10293847',
    status: 'Pending',
    amount: '-$500.00',
    type: 'negative',
    iconType: 'transfer'
  },
  {
    id: 'TRX-48392019',
    merchant: 'Starbucks',
    category: 'Dining',
    date: 'Oct 21, 2023',
    time: '08:15 AM',
    ref: 'REF-48392019',
    status: 'Cleared',
    amount: '-$5.40',
    type: 'negative',
    iconType: 'dining'
  },
  {
    id: 'TRX-48392039',
    merchant: 'Cash Withdrawal',
    category: 'Withdrawal',
    date: 'Oct 21, 2023',
    time: '08:15 AM',
    ref: 'REF-48392039',
    status: 'Cleared',
    amount: '-$10,000',
    type: 'negative',
    iconType: 'transfer'
  },
  {
    id: 'TRX-48392739',
    merchant: 'Cash Deposit',
    category: 'Deposit',
    date: 'Oct 21, 2023',
    time: '08:15 AM',
    ref: 'REF-48392739',
    status: 'Cleared',
    amount: '+$10,000.00',
    type: 'positive',
    iconType: 'transfer'
  }
];

export const generateTransactions = (count = 100, accounts = []) => {
  const merchants = ['Amazon', 'Target', 'Uber', 'Netflix', 'Shell Gas', 'Trader Joes', 'Apple Store', 'CVS Pharmacy', 'AT&T', 'Lyft'];
  const generalCategories = ['Shopping', 'Transport', 'Entertainment', 'Groceries', 'Dining', 'Utilities', 'General'];
  const otherCategories = ['Refund', 'Internal Saving', 'Withdrawal', 'Deposit'];
  const statuses = ['Cleared', 'Pending', 'Processing'];
  
  return Array.from({ length: count }, (_, i) => {
    const isPositive = Math.random() > 0.8;
    const amountVal = (Math.random() * 500 + 5).toFixed(2);
    
    let category = '';
    if (Math.random() > 0.7) {
      category = otherCategories[Math.floor(Math.random() * otherCategories.length)];
    } else {
      category = generalCategories[Math.floor(Math.random() * generalCategories.length)];
    }

    let fromAccount = '';
    if (accounts.length > 0) {
      fromAccount = accounts[Math.floor(Math.random() * accounts.length)].name;
    }

    // Spread dates across 4 months
    const daysAgo = Math.floor(Math.random() * 120);
    const txDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    return {
      id: `TRX-${Math.floor(10000000 + Math.random() * 90000000)}`,
      merchant: category === 'Withdrawal' ? 'ATM Withdrawal' : category === 'Deposit' ? 'ATM Deposit' : merchants[Math.floor(Math.random() * merchants.length)],
      category: category,
      date: txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      ref: `REF-${Math.floor(10000000 + Math.random() * 90000000)}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      amount: isPositive ? `+$${amountVal}` : `-$${amountVal}`,
      type: isPositive ? 'positive' : 'negative',
      iconType: category === 'Refund' ? 'refund' : category === 'Dining' ? 'dining' : 'store',
      fromAccount: fromAccount
    };
  });
};
