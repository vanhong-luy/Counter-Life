-- =============================================================================
-- MASS DATA SEED — POST-PROCESS (scale up + collaterals for all loans)
--
-- Populates tables not covered by seed_mass.sql using real sample files
-- uploaded to seed-samples/ S3 prefix via seed_upload_samples.py.
--
-- Safe to re-run (TRUNCATE + RESTART IDENTITY at top).
-- =============================================================================

SELECT 'STARTING POST-SEED' AS status, now() AS time;

TRUNCATE kyc_documents, collaterals, card_status_history,
         credit_limit_requests, savings_goals, loan_repayments
         RESTART IDENTITY CASCADE;

-- =============================================================================
-- 1. ADDITIONAL LOANS — 10K+ from existing customers
--    Same logic as seed_mass.sql but faster (no random sampling for every row)
-- =============================================================================
SELECT 'Generating additional loans...' AS status;

INSERT INTO loans (customer_id, loan_type_id, approved_by, principal_amount,
                   outstanding_balance, interest_rate, loan_term_months, status,
                   applied_at, approved_at, remarks, purpose,
                   monthly_payment_amount, next_payment_due_date, last_interest_date)
WITH loan_data AS (
  SELECT
    c.customer_id,
    (1 + ((random() * 4)::int % 4)) AS loan_type_id,
    (1000 + random() * 50000)::numeric(19,4) AS principal_amount,
    (3.5 + random() * 6)::numeric(5,4) AS interest_rate,
    (12 + ((random() * 48)::int % 48)) AS loan_term_months,
    now() - (random() * interval '400 days') AS applied_at,
    CASE WHEN random() < 0.35 THEN 'approved'
         WHEN random() < 0.65 THEN 'active'
         WHEN random() < 0.80 THEN 'settled'
         ELSE 'pending' END AS status,
    (ARRAY['Debt consolidation','Home renovation','Emergency expenses',
           'Education','Business investment','Major purchase','Vacation',
           'Medical expenses','Vehicle purchase'])[1 + ((random() * 9)::int % 9)] AS purpose
  FROM customers c
  WHERE c.kyc_status = 'approved'
    AND c.customer_id NOT IN (SELECT DISTINCT customer_id FROM loans)
)
SELECT
  customer_id, loan_type_id,
  CASE WHEN status IN ('approved', 'active', 'settled')
       THEN 11 + ((random() * 30)::int % 30) ELSE NULL END AS approved_by,
  principal_amount,
  CASE WHEN status = 'settled' THEN 0::numeric(19,4)
       WHEN status = 'active' THEN (principal_amount * (0.3 + random() * 0.6))::numeric(19,4)
       ELSE principal_amount END AS outstanding_balance,
  interest_rate, loan_term_months, status, applied_at,
  CASE WHEN status IN ('approved', 'active', 'settled')
       THEN applied_at + interval '7 days' ELSE NULL END AS approved_at,
  NULL AS remarks, purpose,
  CASE WHEN status IN ('approved', 'active')
       THEN ROUND(
         (principal_amount * (interest_rate / 1200) *
          power(1 + (interest_rate / 1200), loan_term_months)) /
         (power(1 + (interest_rate / 1200), loan_term_months) - 1), 2)
       ELSE NULL END AS monthly_payment_amount,
  CASE WHEN status IN ('approved', 'active')
       THEN ((applied_at + interval '7 days' + interval '1 month')::date)
       ELSE NULL END AS next_payment_due_date,
  CASE WHEN status IN ('approved', 'active')
       THEN (applied_at + interval '7 days')::date
       ELSE NULL END AS last_interest_date
FROM loan_data
LIMIT 30000;

SELECT '  total loans:' AS label, count(*) FROM loans;

-- =============================================================================
-- 2. LOAN REPAYMENTS — 3-6 per active/approved loan
--    Mirrors LoanService.repayLoan(): creates Transaction + LoanRepayment record
-- =============================================================================
SELECT 'Generating loan repayments...' AS status;

WITH inserted_txns AS (
  INSERT INTO transactions (reference_number, type_id, source_account_id, amount,
                            currency, status, description, transaction_date)
  SELECT
    'REP-' || l.loan_id || '-' || s.i,
    (SELECT type_id FROM transaction_types WHERE type_name = 'loan_repayment'),
    (SELECT a.account_id FROM accounts a WHERE a.customer_id = l.customer_id AND a.is_primary = TRUE LIMIT 1),
    GREATEST((l.monthly_payment_amount * (0.8 + random() * 0.4))::numeric(19,4), 1.00::numeric(19,4)),
    'USD', 'completed',
    'Loan Repayment: Loan #' || l.loan_id || ' - Payment ' || s.i,
    now() - ((4 - s.i) * interval '1 month')
  FROM loans l
  CROSS JOIN generate_series(1, 5 + ((random() * 3)::int % 3)) s(i)
  WHERE lower(l.status) IN ('approved', 'active')
    AND l.outstanding_balance > 0
    AND l.monthly_payment_amount IS NOT NULL
    AND l.monthly_payment_amount > 0
  ON CONFLICT (reference_number) DO NOTHING
  RETURNING transaction_id, reference_number, source_account_id, amount, transaction_date
)
INSERT INTO loan_repayments (loan_id, transaction_id, amount_paid, interest_paid, principal_paid, payment_date)
WITH split AS (
  SELECT i.*, (0.15 + random() * 0.25) AS frac FROM inserted_txns i
)
SELECT
  (REGEXP_MATCHES(s.reference_number, '^REP-(\d+)-\d+$'))[1]::bigint,
  s.transaction_id, s.amount,
  (s.amount * s.frac)::numeric(19,4),
  (s.amount * (1 - s.frac))::numeric(19,4),
  s.transaction_date
FROM split s;

-- Deduct from source accounts
UPDATE accounts a
SET balance = a.balance - sub.total_repaid
FROM (
  SELECT t.source_account_id, COALESCE(SUM(t.amount), 0) AS total_repaid
  FROM transactions t
  WHERE t.reference_number LIKE 'REP-%'
    AND t.type_id = (SELECT type_id FROM transaction_types WHERE type_name = 'loan_repayment')
  GROUP BY t.source_account_id
) sub
WHERE a.account_id = sub.source_account_id AND a.balance >= sub.total_repaid;

-- Update loan balances + status
UPDATE loans l
SET
  outstanding_balance = GREATEST(0, l.outstanding_balance - sub.total_paid),
  status = CASE WHEN l.outstanding_balance - sub.total_paid <= 0 THEN 'settled' ELSE l.status END,
  next_payment_due_date = CASE
    WHEN l.outstanding_balance - sub.total_paid <= 0 THEN NULL
    WHEN l.next_payment_due_date IS NOT NULL THEN l.next_payment_due_date + interval '3 months'
    ELSE NULL END,
  last_interest_date = CASE
    WHEN l.outstanding_balance - sub.total_paid <= 0 THEN l.last_interest_date
    ELSE (SELECT MAX(lr.payment_date)::date FROM loan_repayments lr WHERE lr.loan_id = l.loan_id)
    END
FROM (
  SELECT lr.loan_id, COALESCE(SUM(t.amount), 0) AS total_paid
  FROM loan_repayments lr
  JOIN transactions t ON t.transaction_id = lr.transaction_id
  WHERE t.type_id = (SELECT type_id FROM transaction_types WHERE type_name = 'loan_repayment')
  GROUP BY lr.loan_id
) sub
WHERE l.loan_id = sub.loan_id AND sub.total_paid > 0;

SELECT '  loan_repayments:' AS label, count(*) FROM loan_repayments;

-- =============================================================================
-- 3. COLLATERALS — EVERY loan gets a collateral (100% coverage)
--    Mirrors LoanController.addCollateral() payload
-- =============================================================================
SELECT 'Generating collaterals for ALL loans...' AS status;

WITH coll_files AS (
  SELECT ARRAY[
    'seed-samples/collateral/images.jpg',
    'seed-samples/collateral/images (1).jpg',
    'seed-samples/collateral/images (2).jpg',
    'seed-samples/collateral/images (3).jpg',
    'seed-samples/collateral/images (4).jpg',
    'seed-samples/collateral/images (5).jpg',
    'seed-samples/collateral/images (6).jpg',
    'seed-samples/collateral/SJ136W.png'
  ] AS files
)
INSERT INTO collaterals (loan_id, asset_type, estimated_value, proof_document_url, status)
SELECT
  l.loan_id,
  CASE lt.type_name
    WHEN 'Home' THEN
      (ARRAY['Real Estate','Real Estate','Real Estate','Property'])[1 + ((random() * 4)::int % 4)]
    WHEN 'Auto' THEN
      (ARRAY['Vehicle','Vehicle','Vehicle','Motorcycle'])[1 + ((random() * 4)::int % 4)]
    WHEN 'Education' THEN
      (ARRAY['Education Bond','Investment Account','Savings Account','Other'])[1 + ((random() * 4)::int % 4)]
    ELSE
      (ARRAY['Equipment','Inventory','Accounts Receivable','Other'])[1 + ((random() * 4)::int % 4)]
  END,
  CASE lt.type_name
    WHEN 'Home' THEN (random() * 450000 + 150000)::numeric(19,4)
    WHEN 'Auto' THEN (random() * 45000 + 5000)::numeric(19,4)
    WHEN 'Education' THEN (random() * 30000 + 5000)::numeric(19,4)
    ELSE (random() * 50000 + 1000)::numeric(19,4) END,
  (SELECT files[1 + ((l.loan_id - 1) % 8)] FROM coll_files),
  CASE WHEN random() < 0.8 THEN 'active'
       WHEN random() < 0.95 THEN 'released'
       ELSE 'forfeited' END
FROM loans l
JOIN loan_types lt ON lt.loan_type_id = l.loan_type_id;

SELECT '  collaterals:' AS label, count(*) FROM collaterals;

-- =============================================================================
-- 4. REFUNDS — 50K+ refunds on expense transactions
--    Uses distributed admin IDs instead of always admin_id=1
-- =============================================================================
SELECT 'Generating refunds...' AS status;

INSERT INTO refunds (original_transaction_id, refund_amount, reason, user_comment, status, processed_at, admin_remarks, reviewed_at, admin_id)
SELECT
  t.transaction_id,
  (t.amount * (0.5 + random() * 0.5))::numeric(19,4),
  (ARRAY['Customer requested refund','Item returned','Service cancelled',
         'Duplicate charge','Product defective','Incorrect amount charged',
         'Subscription cancelled','Delivery not received'])[1 + ((random() * 8)::int % 8)],
  (ARRAY['I want my money back please','This charge was not mine',
         'Item never arrived','Was charged twice for same order',
         'Product was damaged on arrival','Billed after cancellation',
         'Refund for returned item','Overcharged for service'])[1 + ((random() * 8)::int % 8)],
  (CASE WHEN random() < 0.4 THEN 'completed'
        WHEN random() < 0.6 THEN 'rejected'
        ELSE 'pending' END),
  now() - (random() * interval '60 days'),
  CASE
    WHEN random() < 0.4 THEN 'Refund processed successfully'
    WHEN random() < 0.6 THEN 'Policy violation — refund denied'
    WHEN random() < 0.8 THEN 'Partial refund approved'
    ELSE NULL END,
  CASE
    WHEN random() < 0.4 THEN now() - (random() * interval '55 days')
    WHEN random() < 0.6 THEN now() - (random() * interval '55 days')
    ELSE NULL END,
  CASE
    WHEN random() < 0.5 THEN 91 + ((random() * 20)::int % 20)     -- AUDITOR
    WHEN random() < 0.8 THEN 11 + ((random() * 30)::int % 30)     -- ADMIN
    ELSE 1 + ((random() * 10)::int % 10)                            -- SUPER_ADMIN
  END
FROM transactions t
WHERE t.type_id = (SELECT type_id FROM transaction_types WHERE type_name = 'transfer')
  AND t.amount >= 10
  AND random() < 0.15
  AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.original_transaction_id = t.transaction_id)
LIMIT 120000;

SELECT '  refunds:' AS label, count(*) FROM refunds;

-- =============================================================================
-- 5. KYC DOCUMENTS — 1 per customer with kyc_status approved/rejected
-- =============================================================================
SELECT 'Generating KYC documents...' AS status;

INSERT INTO kyc_documents (customer_id, document_type, document_url, document_url_back, status, remarks, uploaded_at)
SELECT
  c.customer_id,
  CASE WHEN c.customer_id % 2 = 0 THEN 'Passport' ELSE 'National ID' END,
  CASE WHEN c.customer_id % 2 = 0
       THEN 'seed-samples/kyc/passport/us_passport_front.jpg'
       ELSE 'seed-samples/kyc/national_id/mykad_front.jpg' END,
  CASE WHEN c.customer_id % 2 = 0
       THEN 'seed-samples/kyc/passport/us_passport_back.jpg'
       ELSE 'seed-samples/kyc/national_id/mykad_back.jpg' END,
  c.kyc_status,
  CASE
    WHEN c.kyc_status = 'approved' THEN 'All documents verified successfully'
    WHEN c.kyc_status = 'rejected' THEN
      (ARRAY['Document image unclear','Expired document','Name mismatch',
             'Address does not match proof of residence'])[1 + ((random() * 4)::int % 4)]
    ELSE NULL END,
  c.created_at + (random() * interval '30 days')
FROM customers c
WHERE c.kyc_status IN ('approved', 'rejected')
  AND random() < 0.95;

SELECT '  kyc_documents:' AS label, count(*) FROM kyc_documents;

-- =============================================================================
-- 5b. PROFILE PHOTOS — EVERY customer gets a sample photo (deterministic cycle
--     over the 10 photos uploaded to seed-samples/profile-photos/)
--     R2 has: images.jpg, images (1).jpg .. images (9).jpg  (NO images (10).jpg)
-- =============================================================================
SELECT 'Updating profile photos...' AS status;

UPDATE customers
SET profile_photo_url = CASE WHEN ((customer_id - 1) % 10 + 1) = 10
                             THEN 'seed-samples/profile-photos/images.jpg'
                             ELSE 'seed-samples/profile-photos/images (' || ((customer_id - 1) % 10 + 1) || ').jpg'
                        END;

SELECT '  profile_photos:' AS label, count(*) FROM customers WHERE profile_photo_url IS NOT NULL;

-- =============================================================================
-- 6. CARD STATUS HISTORY — realistic lifecycle
-- =============================================================================
SELECT 'Generating card status history...' AS status;

INSERT INTO card_status_history (card_id, changed_by_customer, changed_by_admin,
                                  old_status, new_status, reason, changed_at)
SELECT c.card_id, acct.customer_id, NULL, 'inactive', 'active',
       'Card issued successfully', c.issued_at
FROM cards c
JOIN accounts acct ON acct.account_id = c.account_id;

INSERT INTO card_status_history (card_id, changed_by_customer, changed_by_admin,
                                  old_status, new_status, reason, changed_at)
SELECT c.card_id, acct.customer_id, NULL, 'active', 'frozen',
       (ARRAY['Lost card','Suspected fraud','Security reasons','Travel hold'])[1 + ((random() * 4)::int % 4)],
       c.issued_at + (random() * interval '180 days')
FROM cards c
JOIN accounts acct ON acct.account_id = c.account_id
WHERE random() < 0.15;

INSERT INTO card_status_history (card_id, changed_by_customer, changed_by_admin,
                                  old_status, new_status, reason, changed_at)
SELECT f.card_id, NULL, 11 + ((random() * 30)::int % 30), 'frozen', 'active',
       (ARRAY['Identity verified','Fraud resolved','Card found','Review completed'])[1 + ((random() * 4)::int % 4)],
       f.changed_at + (random() * interval '7 days')
FROM card_status_history f
WHERE f.new_status = 'frozen'
  AND random() < 0.6;

SELECT '  card_status_history:' AS label, count(*) FROM card_status_history;

-- =============================================================================
-- 7. CREDIT LIMIT REQUESTS — for ~15% of credit cards
-- =============================================================================
SELECT 'Generating credit limit requests...' AS status;

WITH card_base AS (
  SELECT c.card_id, c.credit_limit AS current_limit,
    c.credit_limit * (1.25 + random() * 0.75) AS requested_limit,
    (ARRAY['Need higher limit for travel','Monthly expenses exceed limit',
           'Planning large purchase','Emergency reserve needed',
           'Business expenses','Improved credit score',
           'Consolidating spending'])[1 + ((random() * 7)::int % 7)] AS reason,
    (ARRAY['APPROVED','APPROVED','APPROVED','REJECTED','PENDING'])[1 + ((random() * 5)::int % 5)] AS status
  FROM cards c
  WHERE c.credit_limit IS NOT NULL AND random() < 0.45
)
INSERT INTO credit_limit_requests (card_id, current_limit, requested_limit, reason,
                                    status, admin_id, admin_notes, created_at, reviewed_at)
SELECT card_id, current_limit, (requested_limit)::numeric(19,4), reason, status,
  CASE status
    WHEN 'APPROVED' THEN 91 + ((random() * 20)::int % 20)
    WHEN 'REJECTED' THEN 11 + ((random() * 30)::int % 30)
    ELSE NULL END,
  CASE
    WHEN status = 'APPROVED' THEN
      (ARRAY['Credit score qualifies','Good payment history','Income verified'])[1 + ((random() * 3)::int % 3)]
    WHEN status = 'REJECTED' THEN
      (ARRAY['Insufficient credit history','Debt-to-income too high','Recent delinquency'])[1 + ((random() * 3)::int % 3)]
    ELSE NULL END,
  now() - (random() * interval '90 days'),
  CASE WHEN status IN ('APPROVED', 'REJECTED') THEN now() - (random() * interval '30 days') ELSE NULL END
FROM card_base;

SELECT '  credit_limit_requests:' AS label, count(*) FROM credit_limit_requests;

-- =============================================================================
-- 8. SAVINGS GOALS — for ~15% of customers
-- =============================================================================
SELECT 'Generating savings goals...' AS status;

INSERT INTO savings_goals (customer_id, account_id, goal_name, category,
                            target_amount, current_amount, target_date, status,
                            auto_release, created_at, updated_at)
WITH goal_data AS (
  SELECT c.customer_id, sa.account_id,
    (ARRAY['Emergency Fund','Vacation 2026','New Car Fund','Home Down Payment',
           'Education Savings','Rainy Day Fund','Retirement Nest Egg',
           'Home Renovation','Wedding Fund','Baby Fund','Tech Upgrade',
           'Christmas Shopping','Summer Trip'])[1 + ((random() * 13)::int % 13)] AS goal_name,
    (ARRAY['Emergency','Travel','Vehicle','Real Estate','Education',
           'Emergency','Retirement','Real Estate','Other','Other',
           'Other','Other','Travel'])[1 + ((random() * 13)::int % 13)] AS category,
    ((random() * 20000 + 500)::numeric(19,4)) AS target_amount,
    CASE WHEN random() < 0.6
         THEN ((random() * 0.9)::numeric(19,4)) * (random() * 20000 + 500)::numeric(19,4)
         ELSE 0::numeric(19,4) END AS current_amount_accrued,
    CASE WHEN random() < 0.15 THEN 'COMPLETED' ELSE 'ACTIVE' END AS goal_status,
    random() < 0.3 AS auto_release,
    now() - (random() * interval '365 days') AS created
  FROM customers c
  JOIN accounts sa ON sa.customer_id = c.customer_id
    AND sa.account_type_id = 1 AND sa.status = 'active'
  WHERE random() < 0.45
)
SELECT customer_id, account_id, goal_name, category, target_amount,
  CASE WHEN goal_status = 'COMPLETED' THEN target_amount
       ELSE LEAST(current_amount_accrued, target_amount * 0.95) END,
  (CURRENT_DATE + (random() * 730)::int)::date,
  goal_status, auto_release, created, now()
FROM goal_data;

SELECT '  savings_goals:' AS label, count(*) FROM savings_goals;

-- =============================================================================
-- RESULT
-- =============================================================================
SELECT '  -- POST-SEED COMPLETE --' AS status;
SELECT 'Loans' AS entity, count(*) AS rows FROM loans
UNION ALL SELECT 'Loan Repayments', count(*) FROM loan_repayments
UNION ALL SELECT 'Collaterals', count(*) FROM collaterals
UNION ALL SELECT 'Refunds', count(*) FROM refunds
UNION ALL SELECT 'KYC Documents', count(*) FROM kyc_documents
UNION ALL SELECT 'Card Status History', count(*) FROM card_status_history
UNION ALL SELECT 'Credit Limit Requests', count(*) FROM credit_limit_requests
UNION ALL SELECT 'Savings Goals', count(*) FROM savings_goals
ORDER BY entity;
