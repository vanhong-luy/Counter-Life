# Database Index Analysis

> **Project:** Banking Application (PostgreSQL + Spring Data JPA)
> **Date:** 2026-07-29
> **Scope:** All PostgreSQL tables — read/write pattern analysis, index recommendations with cost/benefit

---

## 1. Methodology

Each index candidate was evaluated on four axes:

| Factor | Metric |
|--------|--------|
| **Read Frequency** | How many query methods use this column as a filter/join/order |
| **Write Frequency** | How many service methods INSERT/UPDATE/DELETE on this table |
| **Selectivity** | What fraction of rows match a typical filter (higher = better) |
| **Row Volume** | Expected table size (rows × writes per operation) |

**Verdict scale:**
- ✅ **STRONG YES** — read benefit clearly exceeds write cost
- ⚠️ **BORDERLINE** — trade-offs exist, needs judgment
- ❌ **NO** — write cost exceeds read benefit
- 🔄 **UPGRADE** — replace existing single-column index with composite

---

## 2. Table-Level Read/Write Profile

| Table | Read Queries | Write Ops | Read/Write Ratio | Est. Rows (prod) |
|-------|-------------|-----------|-----------------|-------------------|
| `transactions` | 12 (user + admin) | Every financial event | 50:50 | Highest |
| `accounts` | 7 | Balance on every tx | 40:60 | High |
| `card_transactions` | 6 | Every card purchase | 50:50 | High |
| `cards` | 11 | Status/balance changes | 60:40 | Medium |
| `loans` | 14 (mostly admin) | Apply/review/repay | 80:20 | Medium |
| `customers` | 8 | Registration/profile | 70:30 | Medium |
| `collaterals` | 2 | Loan creation only | 90:10 | Low |
| `refunds` | 5 | Request/review | 60:40 | Low |
| `kyc_documents` | 4 | Upload/review | 60:40 | Low |
| `card_statements` | 2 | Monthly generation | 50:50 | Low |
| `customer_bills` | 3 | Create/pay/auto-pay | 50:50 | Low |
| `savings_goals` | 2 | Deposit/withdraw | 40:60 | Low |

---

## 3. Candidate-by-Candidate Analysis

### 3.1 `collaterals(loan_id)` ✅ STRONG YES

**Why:** FK column with **no existing index**. Every loan detail view loads collaterals via `findByLoan()` / `findByLoanIn()`.

| Factor | Assessment |
|--------|-----------|
| Read frequency | Moderate — every loan detail view (admin + user) |
| Write frequency | Very low — only when loan is created with collateral |
| Selectivity | High — 1:1 or few per loan |
| Row volume | Low |
| **Verdict** | **No index at all on a frequently joined FK.** Low write cost, high read benefit. No-brainer. |

**Covered queries:**
- `CollateralRepository.findByLoan(Loan)` (both modules)
- `CollateralRepository.findByLoanIn(List<Loan>)` (both modules)

---

### 3.2 `accounts(customer_id, is_primary)` 🔄 UPGRADE

**Why:** Replaces existing `accounts(customer_id)` with a covering index for `findByCustomerAndIsPrimaryTrue()`.

| Factor | Assessment |
|--------|-----------|
| Read frequency | High — customer account listing + primary account lookup |
| Write frequency | High — balance updates on every financial event |
| Selectivity | High — per-customer queries |
| Row volume | High |
| **Verdict** | The composite index still covers `findByCustomer()` via leftmost prefix. Adding `is_primary` enables index-only lookups for the primary account without a separate index scan or filter. |

**Covered queries:**
- `AccountRepository.findByCustomer(Customer)` (both modules)
- `AccountRepository.findByCustomerAndIsPrimaryTrue(Customer)`

**Index replaced:** `idx_accounts_customer`

---

### 3.3 `accounts(maturity_date, matured)` ✅ STRONG YES

**Why:** The daily batch job `processMaturedFixedDeposits()` runs `findMaturedFixedDeposits(date)` which filters by `maturity_date <= :date AND matured = false`.

| Factor | Assessment |
|--------|-----------|
| Read frequency | Low — once per day (batch job) |
| Write frequency | Very low — `matured` flips once per FD lifetime |
| Selectivity | High — most accounts are not FDs, even fewer mature per day |
| Row volume | Medium (subset of accounts) |
| **Verdict** | Without this index, the daily job does a sequential scan of all accounts. Very low write cost for a once-daily batch. |

**Covered queries:**
- `AccountRepository.findMaturedFixedDeposits(LocalDate)` (JPQL: `WHERE a.maturityDate <= :date AND a.matured = false`)

---

### 3.4 `loans(status)` ✅ STRONG YES

**Why:** Admin loan queues filter by status constantly: pending, active, defaulted.

| Factor | Assessment |
|--------|-----------|
| Read frequency | High — admin dashboard, queue pages, KPI counts |
| Write frequency | Low-Moderate — loan inserted once, status changes a few times |
| Selectivity | Medium-High — depends on status (pending is a small subset) |
| Row volume | Medium |
| **Verdict** | Low write overhead, high read frequency. Essential for admin UX. |

**Covered queries:**
- `LoanRepository.findByStatusWithDetails(String status)` (both variants)
- `LoanRepository.countByStatus(String status)`
- `LoanRepository.findByStatusOrderByAppliedAtDesc(String status)`

---

### 3.5 `loans(customer_id, status)` 🔄 UPGRADE

**Why:** Replaces existing `loans(customer_id)` with a composite serving both per-customer lookups and status-filtered lookups.

| Factor | Assessment |
|--------|-----------|
| Read frequency | High — customer loan list + admin filtered queries |
| Write frequency | Low |
| Selectivity | High — per customer × status |
| Row volume | Medium |
| **Verdict** | The composite covers all existing `findByCustomer` queries (leftmost prefix) and adds status filtering efficiency. |

**Covered queries:**
- `LoanRepository.findByCustomer(Customer)` (user-api)
- `LoanRepository.findByCustomer_CustomerId(Long)` (admin-api)
- Many `findAllFiltered*` queries that filter by status

**Index replaced:** `idx_loans_customer`

---

### 3.6 `customers(kyc_status)` ✅ STRONG YES

**Why:** Dashboard `countByKycStatus("pending")` and admin KYC filtering.

| Factor | Assessment |
|--------|-----------|
| Read frequency | Moderate — dashboard loads on every admin page view |
| Write frequency | Very low — changes once or twice per customer |
| Selectivity | Medium — depends on pending volume |
| Row volume | Medium |
| **Verdict** | Tiny index, near-zero write cost, serves admin dashboard KPI. |

**Covered queries:**
- `CustomerRepository.countByKycStatus(String)` (admin-api)
- Admin filtered customer queries filtering by KYC status

---

### 3.7 `refunds(status)` ✅ STRONG YES

**Why:** Admin refund queue pages filter by status.

| Factor | Assessment |
|--------|-----------|
| Read frequency | Moderate — refund queue + review pages |
| Write frequency | Low — refund created once, status changes a few times |
| Selectivity | Medium — pending refunds are a subset |
| Row volume | Low |
| **Verdict** | Low write cost, helps admin pagination. |

**Covered queries:**
- `RefundRepository.findByStatusOrderByProcessedAtDesc(String)` (both variants)
- `RefundRepository.findByStatus(String)` (admin-api)

---

### 3.8 `kyc_documents(status)` ✅ STRONG YES

**Why:** Admin KYC review page filters documents by status.

| Factor | Assessment |
|--------|-----------|
| Read frequency | Moderate — admin KYC page, filtered + unfiltered |
| Write frequency | Low — uploaded once, reviewed once |
| Selectivity | Medium — pending KYC vs approved |
| Row volume | Low-Medium |
| **Verdict** | Low write overhead, admin-facing page. |

**Covered queries:**
- `KycDocumentRepository.findByStatus(String)` (user-api)
- `KycDocumentRepository.findFiltered(String status, ...)` (admin-api)
- `KycDocumentRepository.findAllDistinctStatuses()` (admin-api)

---

### 3.9 `cards(is_frozen)` WHERE is_frozen = true ✅ PARTIAL INDEX

**Why:** Admin `findFilteredAdvanced` filters by `c.isFrozen = :frozen`. Frozen cards are a tiny subset.

| Factor | Assessment |
|--------|-----------|
| Read frequency | Moderate — admin card management page |
| Write frequency | Very low — freeze/unfreeze is rare |
| Selectivity | Very high — frozen cards are a tiny fraction |
| Row volume | Low (in index) |
| **Verdict** | **Partial index** `WHERE is_frozen = true` stores only frozen cards. Negligible write cost for non-frozen cards (99%+). Perfect for this query pattern. |

**Covered queries:**
- `CardRepository.findFilteredAdvanced(search, Boolean frozen, ...)` when `frozen = true`
- `CardRepository.countByIsFrozen(Boolean true)`

---

### 3.10 `card_statements(paid, due_date)` WHERE paid = false ✅ PARTIAL INDEX

**Why:** Monthly late fee batch uses `findByPaidFalseAndDueDateBefore(date)`.

| Factor | Assessment |
|--------|-----------|
| Read frequency | Low — once per month (batch job) |
| Write frequency | Low — statement paid once |
| Selectivity | High — unpaid statements before a date is a small window |
| Row volume | Low (in index) |
| **Verdict** | Only indexes unpaid statements. Near-zero write cost since `paid` rarely changes. Without it, the batch scans all statements. |

**Covered queries:**
- `CardStatementRepository.findByPaidFalseAndDueDateBefore(LocalDate)` (both modules)

---

### 3.11 `transactions(type_id, transaction_date)` WHERE status = 'completed' ⚠️ BORDERLINE → RECOMMEND

**Why:** Admin aggregation queries (`sumCompletedDeposits`, `sumDepositsSince`, `sumDebtPaymentsSince`, `aggregateVolume`) filter by `status = 'completed'` plus type and date range.

| Factor | Assessment |
|--------|-----------|
| Read frequency | High — admin dashboard aggregations, analytics |
| Write frequency | Very high — every financial event inserts a transaction |
| Selectivity | High — status='completed' is ~90% of rows, but partial index + type_id + date is selective |
| Row volume | Highest |
| **Verdict** | **Partial index** `WHERE status = 'completed'` avoids indexing failed/reversed/pending transactions. The composite `(type_id, transaction_date)` enables index-only scans for all aggregation queries. Without this, every admin dashboard load scans the entire transactions table. |

**Covered queries:**
- `TransactionRepository.sumCompletedDeposits()` (admin)
- `TransactionRepository.sumDepositsSince()` (both)
- `TransactionRepository.sumDebtPaymentsSince()` (both)
- `TransactionRepository.aggregateVolume()` (admin — native SQL)
- `TransactionRepository.findAllFiltered()` (admin — when status='completed')
- `TransactionRepository.countFiltered()` (admin — when status='completed')

---

### 3.12 `card_transactions(card_id, transaction_date)` ✅ STRONG YES

**Why:** Every single card purchase must check spending limits via `sumAmountSince()`, `findByCardIdAndDateRange()`, and `findByCard_CardIdAndTransactionDateGreaterThanEqual()`. Also used for transaction history.

| Factor | Assessment |
|--------|-----------|
| Read frequency | **Very high** — checked on EVERY card purchase (hot path) |
| Write frequency | High — every purchase inserts a row |
| Selectivity | Very high — per-card queries |
| Row volume | High |
| **Verdict** | This is the **most important missing index**. Without it, every purchase does a sequential scan of card_transactions to sum spending. The index pays for itself on every single transaction. |

**Covered queries:**
- `CardTransactionRepository.sumAmountSince(Long cardId, LocalDateTime start)`
- `CardTransactionRepository.findByCardIdAndDateRange(Long cardId, LocalDateTime start, LocalDateTime end)`
- `CardTransactionRepository.findByCard_CardIdAndTransactionDateGreaterThanEqual(Long cardId, LocalDateTime from)`
- `CardTransactionRepository.findByCard_CardIdOrderByTransactionDateDesc(Long cardId)` (both variants)

---

### 3.13 `card_transactions(card_id, statement_id)` ❌ SKIP

**Why:** `statement_id` is nullable (only assigned during monthly statement generation). The query `findByCard_CardIdAndStatementIdOrderByTransactionDateDesc` is on-demand (user clicks a statement).

| Factor | Assessment |
|--------|-----------|
| Read frequency | Low — user needs to click into a statement |
| Write frequency | Very high — every purchase inserts a row |
| Selectivity | High, but query is infrequent |
| **Verdict** | **Not worth the write overhead.** The existing `card_id` FK index already narrows results to a single card. Scanning a few hundred rows per statement is acceptable. |

---

### 3.14 `accounts(status, account_type_id)` ❌ SKIP

**Why:** Monthly interest scheduler processes all active accounts. But `accounts` is the **most write-heavy table** (balance updates on every financial event).

| Factor | Assessment |
|--------|-----------|
| Read frequency | Low — once per month (batch) |
| Write frequency | **Very high** — every deposit/withdrawal/transfer updates balance |
| Selectivity | Low — most accounts are active |
| **Verdict** | The interest scheduler runs once per month. Maintaining this index on every single balance update is not worth a monthly batch job. A sequential scan of accounts once per month is acceptable. |

---

### 3.15 `card_statements(card_id, period_end)` ✅ STRONG YES

**Why:** `findByCard_CardIdOrderByPeriodEndDesc` loads statement history for a card.

| Factor | Assessment |
|--------|-----------|
| Read frequency | Moderate — every card detail page |
| Write frequency | Low — new statement created monthly |
| Selectivity | High — per-card queries |
| Row volume | Low |
| **Verdict** | Enables index-only sort. Small index, low write cost. |

**Covered queries:**
- `CardStatementRepository.findByCard_CardIdOrderByPeriodEndDesc(Long)` (both modules)

---

## 4. Summary of Recommendations

### 4.1 Indexes to CREATE

| # | Table | Index | Type | Priority |
|---|-------|-------|------|----------|
| 1 | `collaterals` | `(loan_id)` | B-tree | **Critical** — no existing index on FK |
| 2 | `card_transactions` | `(card_id, transaction_date)` | B-tree | **Critical** — hot path per purchase |
| 3 | `transactions` | `(type_id, transaction_date)` WHERE `status = 'completed'` | Partial B-tree | **High** — admin dashboard aggregations |
| 4 | `loans` | `(status)` | B-tree | **High** — admin queue pages |
| 5 | `accounts` | `(maturity_date, matured)` | B-tree | **High** — daily batch job |
| 6 | `customers` | `(kyc_status)` | B-tree | **Medium** — dashboard KPI |
| 7 | `refunds` | `(status)` | B-tree | **Medium** — admin queue |
| 8 | `kyc_documents` | `(status)` | B-tree | **Medium** — admin KYC page |
| 9 | `cards` | `(is_frozen)` WHERE `is_frozen = true` | Partial B-tree | **Low** — admin filtering |
| 10 | `card_statements` | `(due_date)` WHERE `paid = false` | Partial B-tree | **Low** — monthly batch |
| 11 | `card_statements` | `(card_id, period_end)` | B-tree | **Low** — enables index-only sort |

### 4.2 Indexes to UPGRADE (replace single-column with composite)

| Table | Old Index | New Index | Reason |
|-------|-----------|-----------|--------|
| `accounts` | `(customer_id)` | `(customer_id, is_primary)` | Covering index for primary lookup, still covers per-customer queries |
| `loans` | `(customer_id)` | `(customer_id, status)` | Covering index for status filter, still covers per-customer queries |

### 4.3 Indexes to SKIP

| Table | Candidate | Reason |
|-------|-----------|--------|
| `accounts` | `(status, account_type_id)` | Write cost too high for a monthly batch |
| `card_transactions` | `(card_id, statement_id)` | `statement_id` nullable, write cost too high for infrequent read |
| `transactions` | `(source_account_id, transaction_date)` | Existing FK index covers the common query |
| `transactions` | `(target_account_id, transaction_date)` | Same as above |

---

## 5. Write Overhead Calculation

Each index adds: **~24 bytes per row** (B-tree overhead) + **indexed column sizes**.

| Index | Est. Size (1M rows) | Write Impact |
|-------|--------------------|-------------|
| `collaterals(loan_id)` | ~8 MB | Negligible (low write volume) |
| `card_transactions(card_id, transaction_date)` | ~32 MB | Moderate — but pays for itself per-read |
| `transactions(type_id, transaction_date) WHERE status='completed'` | ~32 MB | Moderate — but partial index skips 10% of rows |
| `loans(status)` | ~8 MB | Negligible (low write volume) |
| `accounts(maturity_date, matured)` | ~16 MB | Low — only 3 table columns, rare writes to these columns |
| `customers(kyc_status)` | ~4 MB | Negligible |
| `refunds(status)` | ~2 MB | Negligible |
| `kyc_documents(status)` | ~4 MB | Negligible |
| `cards(is_frozen) WHERE frozen` | ~0.1 MB | Near-zero (99% of cards never in index) |
| `card_statements(due_date) WHERE unpaid` | ~0.5 MB | Near-zero |
| `card_statements(card_id, period_end)` | ~4 MB | Negligible (low volume) |

**Total additional storage at 1M rows: ~110 MB** — negligible for modern hardware.

---

## 6. Implementation Plan

### Migration V37: Add all indexes

```sql
-- Drop old single-column indexes being replaced
DROP INDEX IF EXISTS "idx_accounts_customer";
DROP INDEX IF EXISTS "idx_loans_customer";

-- Add all new indexes
CREATE INDEX IF NOT EXISTS "idx_collaterals_loan" ON "collaterals" ("loan_id");
CREATE INDEX IF NOT EXISTS "idx_accounts_customer_primary" ON "accounts" ("customer_id", "is_primary");
CREATE INDEX IF NOT EXISTS "idx_accounts_maturity_matured" ON "accounts" ("maturity_date", "matured");
CREATE INDEX IF NOT EXISTS "idx_loans_status" ON "loans" ("status");
CREATE INDEX IF NOT EXISTS "idx_loans_customer_status" ON "loans" ("customer_id", "status");
CREATE INDEX IF NOT EXISTS "idx_customers_kyc_status" ON "customers" ("kyc_status");
CREATE INDEX IF NOT EXISTS "idx_refunds_status" ON "refunds" ("status");
CREATE INDEX IF NOT EXISTS "idx_kyc_documents_status" ON "kyc_documents" ("status");
CREATE INDEX IF NOT EXISTS "idx_cards_frozen" ON "cards" ("is_frozen") WHERE "is_frozen" = true;
CREATE INDEX IF NOT EXISTS "idx_card_statements_unpaid_due" ON "card_statements" ("due_date") WHERE "paid" = false;
CREATE INDEX IF NOT EXISTS "idx_transactions_completed_type_date" ON "transactions" ("type_id", "transaction_date") WHERE "status" = 'completed';
CREATE INDEX IF NOT EXISTS "idx_card_transactions_card_date" ON "card_transactions" ("card_id", "transaction_date");
CREATE INDEX IF NOT EXISTS "idx_card_statements_card_period" ON "card_statements" ("card_id", "period_end");

-- Note: idx_card_statements_card_period can replace idx_card_statements_unpaid_due
-- if we want one fewer index, but keeping separate is fine since they serve
-- different query patterns.
```

### Rollback

```sql
DROP INDEX IF EXISTS "idx_collaterals_loan";
DROP INDEX IF EXISTS "idx_accounts_customer_primary";
DROP INDEX IF EXISTS "idx_accounts_maturity_matured";
DROP INDEX IF EXISTS "idx_loans_status";
DROP INDEX IF EXISTS "idx_loans_customer_status";
DROP INDEX IF EXISTS "idx_customers_kyc_status";
DROP INDEX IF EXISTS "idx_refunds_status";
DROP INDEX IF EXISTS "idx_kyc_documents_status";
DROP INDEX IF EXISTS "idx_cards_frozen";
DROP INDEX IF EXISTS "idx_card_statements_unpaid_due";
DROP INDEX IF EXISTS "idx_transactions_completed_type_date";
DROP INDEX IF EXISTS "idx_card_transactions_card_date";
DROP INDEX IF EXISTS "idx_card_statements_card_period";

-- Restore old indexes
CREATE INDEX IF NOT EXISTS "idx_accounts_customer" ON "accounts" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_loans_customer" ON "loans" ("customer_id");
```

---

## 7. Verification

### Before migration:
```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM collaterals WHERE loan_id = 1;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM card_transactions WHERE card_id = 1 AND transaction_date >= '2026-01-01';
EXPLAIN (ANALYZE, BUFFERS) SELECT SUM(amount) FROM transactions WHERE type_id = 1 AND status = 'completed';
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM loans WHERE status = 'pending' ORDER BY applied_at DESC;
EXPLAIN (ANALYZE, BUFFERS) SELECT COUNT(*) FROM customers WHERE kyc_status = 'pending';
```

### After migration:
Run the same queries and compare:
- **Seq Scan** → **Index Scan** or **Index Only Scan**
- Reduced `Buffers: read` count
- Lower `Execution Time`

### Monitoring:
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname IN ('idx_collaterals_loan', 'idx_card_transactions_card_date', ...)
ORDER BY idx_scan DESC;
```
