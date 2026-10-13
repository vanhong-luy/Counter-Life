ALTER TABLE "card_transactions" ADD COLUMN IF NOT EXISTS "transaction_id" BIGINT REFERENCES "transactions"("transaction_id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_card_transactions_transaction" ON "card_transactions" ("transaction_id");
