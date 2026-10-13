-- ============================================================
-- V37: Performance Indexes
--
-- Adds indexes identified by the INDEX_ANALYSIS.md document.
-- Drops old single-column indexes replaced by composites.
-- ============================================================

-- Drop old single-column indexes superseded by composites below.
-- The new composites satisfy all queries the old indexes served
-- (via leftmost prefix rule), plus additional query patterns.
DROP INDEX IF EXISTS "idx_accounts_customer";
DROP INDEX IF EXISTS "idx_loans_customer";

-- 1. collaterals: FK with no existing index (read on every loan detail view)
CREATE INDEX IF NOT EXISTS "idx_collaterals_loan" ON "collaterals" ("loan_id");

-- 2. accounts: replace (customer_id) with (customer_id, is_primary)
--    Covers: findByCustomer(), findByCustomerAndIsPrimaryTrue()
CREATE INDEX IF NOT EXISTS "idx_accounts_customer_primary" ON "accounts" ("customer_id", "is_primary");

-- 3. accounts: daily batch job for matured fixed deposits
--    Covers: findMaturedFixedDeposits(date) — filters maturity_date <= ? AND matured = false
CREATE INDEX IF NOT EXISTS "idx_accounts_maturity_matured" ON "accounts" ("maturity_date", "matured");

-- 4. loans: admin queue filtering by status
--    Covers: findByStatusWithDetails(), countByStatus(), findByStatusOrderByAppliedAtDesc()
CREATE INDEX IF NOT EXISTS "idx_loans_status" ON "loans" ("status");

-- 5. loans: replace (customer_id) with (customer_id, status)
--    Covers: findByCustomer(), findByCustomer_CustomerId(), status-filtered variants
CREATE INDEX IF NOT EXISTS "idx_loans_customer_status" ON "loans" ("customer_id", "status");

-- 6. customers: dashboard KPI count
--    Covers: countByKycStatus('pending')
CREATE INDEX IF NOT EXISTS "idx_customers_kyc_status" ON "customers" ("kyc_status");

-- 7. refunds: admin queue filtering by status
--    Covers: findByStatusOrderByProcessedAtDesc(), findByStatus()
CREATE INDEX IF NOT EXISTS "idx_refunds_status" ON "refunds" ("status");

-- 8. kyc_documents: admin KYC review filtering by status
--    Covers: findByStatus(), findFiltered() status filter
CREATE INDEX IF NOT EXISTS "idx_kyc_documents_status" ON "kyc_documents" ("status");

-- 9. cards: partial index — only frozen cards (tiny subset)
--    Covers: findFilteredAdvanced() when frozen=true
CREATE INDEX IF NOT EXISTS "idx_cards_frozen" ON "cards" ("is_frozen") WHERE "is_frozen" = true;

-- 10. card_statements: partial index — only unpaid statements (monthly late-fee batch)
--     Covers: findByPaidFalseAndDueDateBefore(date)
CREATE INDEX IF NOT EXISTS "idx_card_statements_unpaid_due" ON "card_statements" ("due_date") WHERE "paid" = false;

-- 11. transactions: partial index — only completed transactions (admin aggregations)
--     Covers: sumCompletedDeposits(), sumDepositsSince(), sumDebtPaymentsSince(),
--             aggregateVolume(), findAllFiltered() when status='completed'
CREATE INDEX IF NOT EXISTS "idx_transactions_completed_type_date" ON "transactions" ("type_id", "transaction_date") WHERE "status" = 'completed';

-- 12. card_transactions: per-card spending limit checks + history
--     Covers: sumAmountSince(), findByCardIdAndDateRange(),
--             findByCard_CardIdAndTransactionDateGreaterThanEqual(),
--             findByCard_CardIdOrderByTransactionDateDesc()
CREATE INDEX IF NOT EXISTS "idx_card_transactions_card_date" ON "card_transactions" ("card_id", "transaction_date");

-- 13. card_statements: statement history ordering by period
--     Covers: findByCard_CardIdOrderByPeriodEndDesc()
CREATE INDEX IF NOT EXISTS "idx_card_statements_card_period" ON "card_statements" ("card_id", "period_end");
