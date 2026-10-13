-- Speed up category usage counts (delete-guard) on the large transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category_id);
