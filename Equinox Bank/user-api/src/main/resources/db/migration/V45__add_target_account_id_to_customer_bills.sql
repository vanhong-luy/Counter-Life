ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS target_account_id BIGINT REFERENCES accounts(account_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customer_bills_target_account_id ON customer_bills(target_account_id);
