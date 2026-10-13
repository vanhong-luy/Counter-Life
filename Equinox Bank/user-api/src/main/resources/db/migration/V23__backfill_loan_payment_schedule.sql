UPDATE "loans"
SET "monthly_payment_amount" = ROUND(
      CASE WHEN (interest_rate / 1200) = 0 THEN principal_amount / loan_term_months
      ELSE principal_amount * (interest_rate / 1200) * POWER(1 + interest_rate / 1200, loan_term_months)
           / (POWER(1 + interest_rate / 1200, loan_term_months) - 1)
      END, 2),
    "next_payment_due_date" = CURRENT_DATE + INTERVAL '1 month'
WHERE status IN ('approved', 'active') AND monthly_payment_amount IS NULL;
