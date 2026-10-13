INSERT INTO "transaction_types" ("type_name") VALUES
('savings_goal_deposit'),
('savings_goal_withdrawal')
ON CONFLICT ("type_name") DO NOTHING;

INSERT INTO "transaction_categories" ("category_name") VALUES
('Savings Goal')
ON CONFLICT ("category_name") DO NOTHING;

CREATE TABLE IF NOT EXISTS "savings_goals" (
    "goal_id" BIGSERIAL PRIMARY KEY,
    "customer_id" BIGINT NOT NULL REFERENCES "customers"("customer_id") ON DELETE CASCADE,
    "account_id" BIGINT NOT NULL REFERENCES "accounts"("account_id") ON DELETE CASCADE,
    "goal_name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'Other',
    "target_amount" NUMERIC(19, 4) NOT NULL CHECK ("target_amount" > 0),
    "current_amount" NUMERIC(19, 4) NOT NULL DEFAULT 0.00 CHECK ("current_amount" >= 0),
    "target_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_savings_goals_customer" ON "savings_goals" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_savings_goals_account" ON "savings_goals" ("account_id");
