ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;

WITH first_accounts AS (
  SELECT DISTINCT ON (customer_id) account_id
  FROM accounts
  ORDER BY customer_id, created_at ASC
)
UPDATE accounts SET is_primary = TRUE WHERE account_id IN (SELECT account_id FROM first_accounts);
