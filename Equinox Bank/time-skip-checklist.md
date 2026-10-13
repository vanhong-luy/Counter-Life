# Time-Skip Checklist

**Endpoint:** `POST /auth/admin/settings/time-skip?months=N`
**File:** `admin-api/.../controller/SettingsController.java:404`

---

## ✅ Currently Handled

### 1. Account Interest
| Table | What happens |
|---|---|
| `accounts.balance` | Savings/Checking accounts accrue monthly interest (`balance × rate / 12`) |
| `transactions` | `SIM-INT-{id}-{uuid}` — "Monthly Interest Payment" |

### 2. Account Maintenance Fees
| Table | What happens |
|---|---|
| `accounts.balance` | Monthly maintenance fee deducted (if `balance >= fee`) |
| `transactions` | `SIM-FEE-{uuid}` — "Monthly Maintenance Fee" |

> **Note:** Only applies to account types with `maintenance_fee > 0`. Currently all types have fee = 0.

### 3. Loan Interest
| Table | What happens |
|---|---|
| `loans.outstanding_balance` | Active/approved loans accrue monthly interest (`balance × rate / 12`) |
| `transactions` | `SIM-LNINT-{uuid}` — "Loan Interest Charge" |

### 4. Auto-Pay Bills
| Table | What happens |
|---|---|
| `accounts.balance` | Source account debited, target account credited |
| `customer_bills.last_paid_at` | Updated to simulation time |
| `transactions` | `AUTO-{uuid}` — "Auto Pay — {biller}" |

**Supports:** MONTHLY, ONE_TIME, YEARLY, WEEKLY frequencies.

### 5. Credit Card Statements
| Table | What happens |
|---|---|
| `card_statements` | New statement for each credit card with balance > 0 |
| `cards.outstanding_balance` | Interest applied via APR daily rate |
| `cards.statement_date` / `due_date` | Updated |

### 6. Credit Card Late Fees
| Table | What happens |
|---|---|
| `cards.outstanding_balance` | Late fee added for past-due unpaid statements |
| Uses `card_types.late_fee` rate |

### 7. Savings Goals Auto-Release ✅ *(NEW)*
| Table | What happens |
|---|---|
| `savings_goals` | ACTIVE + autoRelease=true + targetDate <= simulated → COMPLETED |
| `accounts.balance` | `currentAmount` credited back to linked account |
| `transactions` | `SGR-{uuid}` — "Auto-release from matured goal: {name}" |

### 8. Credit Score Recalculation
| Table | What happens |
|---|---|
| `customers.credit_score` | Recalculated for ALL customers based on account age, balance, loan status, card utilization |

Runs once after all months are processed.

---

## ✅ Recently Added

### 9. Card Purchase Simulation ✅ *(NEW)*
Credit cards generate 1-3 random purchases each month via paginated processing.

| Table | What happens |
|---|---|
| `cards.outstanding_balance` | Increases with each purchase |
| `card_transactions` | New CardTransaction per purchase |
| `transactions` | `CRD-{uuid}` — "Card purchase at {merchant}" |
| Card limits checked via `card_limits` | Daily/monthly limits enforced |

### 10. Income / Payroll Simulation ✅ *(NEW)*
Checking accounts (~8% per month) receive random payroll deposits.

| Table | What happens |
|---|---|
| `accounts.balance` | Credited with $2K-$8K deposit |
| `transactions` | `SIM-PAY-{uuid}` — "Direct Deposit — Payroll" |

### 11. Loan Repayments ✅ *(NEW)*
~20% of active/approved loans get repaid each month.

| Table | What happens |
|---|---|
| `loans.outstanding_balance` | Decreased by repayment amount |
| `accounts.balance` | Primary checking debited |
| `transactions` | `SIM-LNREP-{uuid}` — "Loan Repayment" |

## ❌ Currently MISSING

### 12. Fixed Deposit Maturity

### 12. Fixed Deposit Maturity
Neither time-skip handles FD maturity (term deposits reaching end of term).

| Impact | Tables affected |
|---|---|
| FD accounts never mature/auto-renew | `accounts` |
| No maturity payout transaction | `transactions` |
| Principal never released back to source account | — |

### 13. Card Expiry
Cards have `expiry_date` set 4 years from issuance. Neither time-skip handles expiry.

| Impact | Tables affected |
|---|---|
| Expired cards remain `is_frozen=false` | `cards` |
| No card status history for expiry | `card_status_history` |
| No re-issue flow triggered | — |

### 14. Monthly/Daily Card Limit Reset
`card_limits` has `daily_limit` and `monthly_limit` — neither time-skip resets usage counters (though the current schema also lacks usage tracking columns).

### 15. Credit Limit Requests
No auto-approval/rejection of PENDING requests. They just sit forever.

| Impact | Tables affected |
|---|---|
| PENDING requests never get reviewed | `credit_limit_requests` |

### 16. KYC Re-Verification
No re-verification or expiry for KYC documents. Status stays the same forever.

| Impact | Tables affected |
|---|---|
| `kyc_status` never changes | `customers`, `kyc_documents` |

---

## 🔍 Priority Ranking

| Priority | Item | Effort | Impact |
|---|---|---|---|
| **P1** | Loan repayments | Medium | Prevents loan debt spiral during multi-month skips |
| **P1** | Card purchase simulation | Medium | Generates realistic transaction volume |
| **P2** | Income simulation | Low | Keeps account balances healthy |
| **P3** | Fixed Deposit maturity | Medium | Important for FD customers |
| **P3** | Credit limit request auto-review | Low | Tidies up pending requests |
| **P4** | Card expiry handling | Low | Long-term realism |
| **P4** | KYC re-verification | Low | Very long-term realism |

---

## ⚠️ Known Quirks

| Quirk | Detail |
|---|---|
| Account batch size | 2,000 per page — uses `TIME_SKIP_BATCH = 2000` constant |
| Per-customer vs bulk | Admin time-skip processes ALL customers in bulk. User-api skips per customer |
| Credit score recalculation | Only runs once at the end, not per month |
| Transaction type lookup | Uses `transactionTypeRepository.findByTypeName()` — type must exist or INSERT fails in loan interest |
| Late fees | Only assessed if `card_types.late_fee > 0` (currently 0 for all types) |
