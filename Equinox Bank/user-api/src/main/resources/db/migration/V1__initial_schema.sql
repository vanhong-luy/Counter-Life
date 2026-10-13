CREATE TABLE "admin_roles" (
  "role_id" SERIAL PRIMARY KEY,
  "role_name" VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE "admin_users" (
  "admin_id" BIGSERIAL PRIMARY KEY,
  "role_id" INT NOT NULL,
  "first_name" VARCHAR(50) NOT NULL,
  "last_name" VARCHAR(50) NOT NULL,
  "email" VARCHAR(100) UNIQUE NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);

CREATE TABLE "account_types" (
  "account_type_id" SERIAL PRIMARY KEY,
  "type_name" VARCHAR(50) UNIQUE NOT NULL,
  "interest_rate" NUMERIC(5,4) NOT NULL DEFAULT 0,
  "maintenance_fee" NUMERIC(19,4) NOT NULL DEFAULT 0
);

CREATE TABLE "transaction_types" (
  "type_id" SERIAL PRIMARY KEY,
  "type_name" VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE "transaction_categories" (
  "category_id" SERIAL PRIMARY KEY,
  "category_name" VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE "customers" (
  "customer_id" BIGSERIAL PRIMARY KEY,
  "first_name" VARCHAR(50) NOT NULL,
  "last_name" VARCHAR(50) NOT NULL,
  "email" VARCHAR(100) UNIQUE NOT NULL,
  "phone_number" VARCHAR(20),
  "password_hash" VARCHAR(255) NOT NULL,
  "date_of_birth" DATE,
  "address" TEXT,
  "kyc_status" VARCHAR(20) NOT NULL CHECK (kyc_status IN ('pending','approved','rejected')) DEFAULT 'pending',
  "credit_score" INT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);

CREATE TABLE "kyc_documents" (
  "document_id" BIGSERIAL PRIMARY KEY,
  "customer_id" BIGINT NOT NULL,
  "document_type" VARCHAR(50) NOT NULL,
  "document_url" VARCHAR(255) NOT NULL,
  "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);

CREATE TABLE "kyc_reviews" (
  "review_id" BIGSERIAL PRIMARY KEY,
  "document_id" BIGINT NOT NULL,
  "admin_id" BIGINT NOT NULL,
  "status" VARCHAR(20) NOT NULL CHECK (status IN ('pending','approved','rejected')),
  "remarks" TEXT,
  "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);

CREATE TABLE "accounts" (
  "account_id" BIGSERIAL PRIMARY KEY,
  "customer_id" BIGINT NOT NULL,
  "account_type_id" INT NOT NULL,
  "account_number" VARCHAR(20) UNIQUE NOT NULL,
  "balance" NUMERIC(19,4) NOT NULL DEFAULT 0,
  "name" VARCHAR(100),
  "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  "status" VARCHAR(20) NOT NULL CHECK (status IN ('active','frozen','closed')) DEFAULT 'active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);

CREATE TABLE "account_statements" (
  "statement_id" BIGSERIAL PRIMARY KEY,
  "account_id" BIGINT NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "file_url" VARCHAR(255),
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);

CREATE TABLE "transactions" (
  "transaction_id" BIGSERIAL PRIMARY KEY,
  "reference_number" VARCHAR(100) UNIQUE NOT NULL,
  "type_id" INT NOT NULL,
  "category_id" INT,
  "source_account_id" BIGINT,
  "target_account_id" BIGINT,
  "amount" NUMERIC(19,4) NOT NULL CHECK (amount > 0),
  "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  "status" VARCHAR(20) NOT NULL CHECK (status IN ('pending','completed','failed','reversed')) DEFAULT 'pending',
  "description" TEXT,
  "transaction_date" TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);

CREATE TABLE "refunds" (
  "refund_id" BIGSERIAL PRIMARY KEY,
  "original_transaction_id" BIGINT NOT NULL,
  "refund_amount" NUMERIC(19,4) NOT NULL CHECK (refund_amount > 0),
  "reason" TEXT,
  "status" VARCHAR(20) NOT NULL CHECK (status IN ('pending','completed','failed')) DEFAULT 'pending',
  "processed_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);

CREATE TABLE "loan_types" (
  "loan_type_id" SERIAL PRIMARY KEY,
  "type_name" VARCHAR(50) UNIQUE NOT NULL,
  "base_interest_rate" NUMERIC(5,4) NOT NULL DEFAULT 0
);

CREATE TABLE "loans" (
  "loan_id" BIGSERIAL PRIMARY KEY,
  "customer_id" BIGINT NOT NULL,
  "loan_type_id" INT NOT NULL,
  "approved_by" BIGINT,
  "principal_amount" NUMERIC(19,4) NOT NULL CHECK (principal_amount > 0),
  "outstanding_balance" NUMERIC(19,4) NOT NULL DEFAULT 0,
  "interest_rate" NUMERIC(5,4) NOT NULL,
  "loan_term_months" INT NOT NULL,
  "status" VARCHAR(20) NOT NULL CHECK (status IN ('pending','approved','rejected','active','settled','defaulted')) DEFAULT 'pending',
  "applied_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW()),
  "approved_at" TIMESTAMPTZ
);

CREATE TABLE "collaterals" (
  "collateral_id" BIGSERIAL PRIMARY KEY,
  "loan_id" BIGINT NOT NULL,
  "asset_type" VARCHAR(50) NOT NULL,
  "estimated_value" NUMERIC(19,4) NOT NULL,
  "proof_document_url" VARCHAR(255),
  "status" VARCHAR(20) NOT NULL CHECK (status IN ('active','released','forfeited')) DEFAULT 'active'
);

CREATE TABLE "loan_repayments" (
  "repayment_id" BIGSERIAL PRIMARY KEY,
  "loan_id" BIGINT NOT NULL,
  "transaction_id" BIGINT NOT NULL,
  "amount_paid" NUMERIC(19,4) NOT NULL CHECK (amount_paid > 0),
  "payment_date" TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);

CREATE TABLE "card_types" (
  "card_type_id" SERIAL PRIMARY KEY,
  "network" VARCHAR(20) NOT NULL CHECK (network IN ('Visa','Mastercard')),
  "type_name" VARCHAR(20) NOT NULL CHECK (type_name IN ('debit','credit'))
);

CREATE TABLE "cards" (
  "card_id" BIGSERIAL PRIMARY KEY,
  "account_id" BIGINT NOT NULL,
  "card_type_id" INT NOT NULL,
  "card_number" CHAR(16) UNIQUE NOT NULL,
  "expiry_date" DATE NOT NULL,
  "cvv_hash" VARCHAR(255) NOT NULL,
  "is_frozen" BOOLEAN NOT NULL DEFAULT false,
  "issued_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);

CREATE TABLE "card_limits" (
  "limit_id" BIGSERIAL PRIMARY KEY,
  "card_id" BIGINT UNIQUE NOT NULL,
  "daily_limit" NUMERIC(19,4) NOT NULL DEFAULT 0,
  "monthly_limit" NUMERIC(19,4) NOT NULL DEFAULT 0,
  "allow_international" BOOLEAN NOT NULL DEFAULT false,
  "allow_online" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "card_status_history" (
  "history_id" BIGSERIAL PRIMARY KEY,
  "card_id" BIGINT NOT NULL,
  "changed_by_customer" BIGINT,
  "changed_by_admin" BIGINT,
  "old_status" VARCHAR(20) NOT NULL,
  "new_status" VARCHAR(20) NOT NULL,
  "reason" TEXT,
  "changed_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);

CREATE TABLE "audit_logs" (
  "log_id" BIGSERIAL PRIMARY KEY,
  "admin_id" BIGINT,
  "action_type" VARCHAR(50) NOT NULL,
  "table_affected" VARCHAR(50) NOT NULL,
  "record_id" BIGINT,
  "action_timestamp" TIMESTAMPTZ NOT NULL DEFAULT (NOW()),
  "description" TEXT
);

CREATE INDEX "idx_kyc_documents_customer" ON "kyc_documents" ("customer_id");

CREATE INDEX "idx_accounts_customer" ON "accounts" ("customer_id");

CREATE INDEX "idx_transactions_source" ON "transactions" ("source_account_id");

CREATE INDEX "idx_transactions_target" ON "transactions" ("target_account_id");

CREATE INDEX "idx_transactions_date" ON "transactions" ("transaction_date");

CREATE INDEX "idx_loans_customer" ON "loans" ("customer_id");

CREATE UNIQUE INDEX ON "card_types" ("network", "type_name");

CREATE INDEX "idx_cards_account" ON "cards" ("account_id");

CREATE INDEX "idx_audit_logs_admin" ON "audit_logs" ("admin_id");

ALTER TABLE "admin_users" ADD FOREIGN KEY ("role_id") REFERENCES "admin_roles" ("role_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "kyc_documents" ADD FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "kyc_reviews" ADD FOREIGN KEY ("document_id") REFERENCES "kyc_documents" ("document_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "kyc_reviews" ADD FOREIGN KEY ("admin_id") REFERENCES "admin_users" ("admin_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "accounts" ADD FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "accounts" ADD FOREIGN KEY ("account_type_id") REFERENCES "account_types" ("account_type_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "account_statements" ADD FOREIGN KEY ("account_id") REFERENCES "accounts" ("account_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transactions" ADD FOREIGN KEY ("type_id") REFERENCES "transaction_types" ("type_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transactions" ADD FOREIGN KEY ("category_id") REFERENCES "transaction_categories" ("category_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transactions" ADD FOREIGN KEY ("source_account_id") REFERENCES "accounts" ("account_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transactions" ADD FOREIGN KEY ("target_account_id") REFERENCES "accounts" ("account_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refunds" ADD FOREIGN KEY ("original_transaction_id") REFERENCES "transactions" ("transaction_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "loans" ADD FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "loans" ADD FOREIGN KEY ("loan_type_id") REFERENCES "loan_types" ("loan_type_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "loans" ADD FOREIGN KEY ("approved_by") REFERENCES "admin_users" ("admin_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "collaterals" ADD FOREIGN KEY ("loan_id") REFERENCES "loans" ("loan_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "loan_repayments" ADD FOREIGN KEY ("loan_id") REFERENCES "loans" ("loan_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "loan_repayments" ADD FOREIGN KEY ("transaction_id") REFERENCES "transactions" ("transaction_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cards" ADD FOREIGN KEY ("account_id") REFERENCES "accounts" ("account_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cards" ADD FOREIGN KEY ("card_type_id") REFERENCES "card_types" ("card_type_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "card_limits" ADD FOREIGN KEY ("card_id") REFERENCES "cards" ("card_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "card_status_history" ADD FOREIGN KEY ("card_id") REFERENCES "cards" ("card_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "card_status_history" ADD FOREIGN KEY ("changed_by_customer") REFERENCES "customers" ("customer_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "card_status_history" ADD FOREIGN KEY ("changed_by_admin") REFERENCES "admin_users" ("admin_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "audit_logs" ADD FOREIGN KEY ("admin_id") REFERENCES "admin_users" ("admin_id") DEFERRABLE INITIALLY IMMEDIATE;

INSERT INTO "admin_roles" ("role_name") VALUES ('ROLE_ADMIN');

INSERT INTO "admin_users" ("role_id", "first_name", "last_name", "email", "password_hash", "is_active")
VALUES (1, 'Admin', 'User', 'admin@equinox.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', true);

INSERT INTO "account_types" ("type_name", "interest_rate", "maintenance_fee") VALUES
('Savings', 0.0200, 0),
('Checking', 0.0000, 0),
('Fixed Deposit', 0.0450, 0);

INSERT INTO "transaction_types" ("type_name") VALUES
('deposit'),
('withdrawal'),
('transfer'),
('refund'),
('loan_repayment');

INSERT INTO "transaction_categories" ("category_name") VALUES
('Groceries'),
('Utilities'),
('Entertainment'),
('Others');

INSERT INTO "card_types" ("network", "type_name") VALUES
('Visa', 'debit'),
('Visa', 'credit'),
('Mastercard', 'debit'),
('Mastercard', 'credit');

INSERT INTO "loan_types" ("type_name", "base_interest_rate") VALUES
('Personal', 0.0650),
('Home', 0.0450),
('Auto', 0.0550),
('Education', 0.0500);
