CREATE INDEX IF NOT EXISTS "idx_transactions_source_date" ON "transactions" ("source_account_id", "transaction_date");
CREATE INDEX IF NOT EXISTS "idx_transactions_target_date" ON "transactions" ("target_account_id", "transaction_date");
