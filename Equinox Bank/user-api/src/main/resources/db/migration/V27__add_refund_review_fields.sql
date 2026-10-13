ALTER TABLE refunds ADD COLUMN IF NOT EXISTS user_comment TEXT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS admin_remarks TEXT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS admin_id BIGINT REFERENCES admin_users(admin_id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_status_check;
ALTER TABLE refunds ADD CONSTRAINT refunds_status_check
  CHECK (status IN ('pending','completed','failed','rejected'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_refund_original_transaction'
  ) THEN
    ALTER TABLE refunds ADD CONSTRAINT uq_refund_original_transaction UNIQUE (original_transaction_id);
  END IF;
END $$;
