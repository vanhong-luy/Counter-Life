ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "monthly_payment_amount" NUMERIC(19,4);
ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "next_payment_due_date" DATE;
