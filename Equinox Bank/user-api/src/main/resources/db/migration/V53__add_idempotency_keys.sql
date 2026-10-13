-- Guards against duplicate submissions (e.g. a double-clicked "Open Account" button
-- or a client retry) creating more than one record for a single user intent.
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "idempotency_key" VARCHAR(100) PRIMARY KEY,
  "customer_id"     BIGINT NOT NULL REFERENCES "customers" ("customer_id") ON DELETE CASCADE,
  "operation"       VARCHAR(50) NOT NULL,
  "resource_id"     BIGINT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_idempotency_keys_customer"
  ON "idempotency_keys" ("customer_id", "operation");
