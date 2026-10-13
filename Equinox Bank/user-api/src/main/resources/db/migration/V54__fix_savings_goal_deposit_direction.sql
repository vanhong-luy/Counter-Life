-- Savings-goal funding moves money OUT of the account, but these rows were written
-- with the account on the target (incoming) side, so the ledger rendered them as
-- money in. Move the account to the source side to match the real direction.
UPDATE "transactions" t
SET "source_account_id" = t."target_account_id",
    "target_account_id" = NULL
FROM "transaction_types" tt
WHERE t."type_id" = tt."type_id"
  AND tt."type_name" = 'savings_goal_deposit'
  AND t."source_account_id" IS NULL
  AND t."target_account_id" IS NOT NULL;
