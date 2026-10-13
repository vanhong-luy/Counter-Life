-- =============================================================================
-- MASS DATA SEED — realistic test data at database-native speed
--
-- RUN:
--   docker cp <this_file> adv-db-postgres-1:/seed.sql
--   docker exec -i adv-db-postgres-1 psql -U joelchan -d bank -f /seed.sql
--
-- TUNING: search for "COUNT:" comments to adjust row counts
-- =============================================================================

SELECT 'STARTING MASS SEED' AS status, now() AS time;

-- Clear existing seed data for clean re-runs
TRUNCATE refunds, transactions, loans, card_limits, card_transactions, card_statements, cards, accounts, customers RESTART IDENTITY CASCADE;
ALTER SEQUENCE transactions_transaction_id_seq RESTART WITH 1;

-- =============================================================================
-- 1a. ADMIN USERS — COUNT: 109 new + 1 existing = 110 total
--     admin_id 1 = admin@equinox.com (ROLE_SUPER_ADMIN, seeded in V1/V11)
--     admin_ids 2-110 = seeded here (ON CONFLICT email = re-runnable)
--     Distribution: 9 new + 1 existing ROLE_SUPER_ADMIN,
--     30 ROLE_ADMIN, 25 ROLE_KYC_OFFICER, 25 ROLE_LOAN_OFFICER, 20 ROLE_AUDITOR
-- =============================================================================
SELECT 'Generating admin users...' AS status;

WITH data(role_id, first_name, last_name, email, employee_id, department_role, work_focus) AS (
  VALUES
    -- ROLE_SUPER_ADMIN (role_id=5) — 9 new, admin_ids 2-10
    (5, 'Alice',    'Marshall', 'alice.marshall@equinox.admin',  'EMP-SUP-001', 'Director',  'Executive Oversight'),
    (5, 'Bob',      'Kowalski', 'bob.kowalski@equinox.admin',    'EMP-SUP-002', 'Director',  'Strategic Planning'),
    (5, 'Carol',    'Vance',    'carol.vance@equinox.admin',     'EMP-SUP-003', 'Director',  'Risk Management'),
    (5, 'David',    'Park',     'david.park@equinox.admin',      'EMP-SUP-004', 'VP',        'Compliance'),
    (5, 'Elena',    'Rossi',    'elena.rossi@equinox.admin',     'EMP-SUP-005', 'VP',        'Operations'),
    (5, 'Frank',    'Nguyen',   'frank.nguyen@equinox.admin',    'EMP-SUP-006', 'VP',        'Technology Strategy'),
    (5, 'Grace',    'Kim',      'grace.kim@equinox.admin',       'EMP-SUP-007', 'Director',  'Financial Control'),
    (5, 'Henry',    'Okafor',   'henry.okafor@equinox.admin',    'EMP-SUP-008', 'VP',        'Audit & Compliance'),
    (5, 'Isabella', 'Chen',     'isabella.chen@equinox.admin',   'EMP-SUP-009', 'VP',        'Product Strategy'),
    -- ROLE_ADMIN (role_id=1) — 30 users, admin_ids 11-40
    (1, 'Jack',     'Thompson', 'jack.thompson@equinox.admin',   'EMP-ADM-001', 'Manager',  'Customer Operations'),
    (1, 'Karen',    'Davis',    'karen.davis@equinox.admin',     'EMP-ADM-002', 'Manager',  'Account Management'),
    (1, 'Leo',      'Martinez', 'leo.martinez@equinox.admin',    'EMP-ADM-003', 'Manager',  'Transaction Monitoring'),
    (1, 'Mia',      'Johnson',  'mia.johnson@equinox.admin',     'EMP-ADM-004', 'Manager',  'Card Services'),
    (1, 'Noah',     'Williams', 'noah.williams@equinox.admin',   'EMP-ADM-005', 'Manager',  'Customer Support'),
    (1, 'Olivia',   'Brown',    'olivia.brown@equinox.admin',    'EMP-ADM-006', 'Manager',  'Account Operations'),
    (1, 'Patrick',  'Garcia',   'patrick.garcia@equinox.admin',  'EMP-ADM-007', 'Manager',  'Risk Assessment'),
    (1, 'Quinn',    'Miller',   'quinn.miller@equinox.admin',    'EMP-ADM-008', 'Manager',  'Document Verification'),
    (1, 'Rachel',   'Wilson',   'rachel.wilson@equinox.admin',   'EMP-ADM-009', 'Manager',  'Data Management'),
    (1, 'Samuel',   'Taylor',   'samuel.taylor@equinox.admin',   'EMP-ADM-010', 'Manager',  'Fraud Prevention'),
    (1, 'Tina',     'Anderson', 'tina.anderson@equinox.admin',   'EMP-ADM-011', 'Manager',  'Reporting'),
    (1, 'Uma',      'Thomas',   'uma.thomas@equinox.admin',      'EMP-ADM-012', 'Manager',  'Quality Assurance'),
    (1, 'Victor',   'Jackson',  'victor.jackson@equinox.admin',  'EMP-ADM-013', 'Manager',  'System Administration'),
    (1, 'Wendy',    'White',    'wendy.white@equinox.admin',     'EMP-ADM-014', 'Manager',  'User Management'),
    (1, 'Xander',   'Harris',   'xander.harris@equinox.admin',   'EMP-ADM-015', 'Manager',  'Security'),
    (1, 'Yara',     'Martin',   'yara.martin@equinox.admin',     'EMP-ADM-016', 'Manager',  'Banking Operations'),
    (1, 'Zane',     'Lee',      'zane.lee@equinox.admin',        'EMP-ADM-017', 'Manager',  'Customer Relations'),
    (1, 'Aaron',    'Walker',   'aaron.walker@equinox.admin',    'EMP-ADM-018', 'Manager',  'Transaction Processing'),
    (1, 'Bella',    'Hall',     'bella.hall@equinox.admin',      'EMP-ADM-019', 'Manager',  'Account Services'),
    (1, 'Carter',   'Allen',    'carter.allen@equinox.admin',    'EMP-ADM-020', 'Manager',  'Customer Verification'),
    (1, 'Diana',    'Young',    'diana.young@equinox.admin',     'EMP-ADM-021', 'Manager',  'Compliance Support'),
    (1, 'Ethan',    'King',     'ethan.king@equinox.admin',      'EMP-ADM-022', 'Manager',  'Branch Operations'),
    (1, 'Fiona',    'Wright',   'fiona.wright@equinox.admin',    'EMP-ADM-023', 'Manager',  'Service Desk'),
    (1, 'George',   'Scott',    'george.scott@equinox.admin',    'EMP-ADM-024', 'Manager',  'Records Management'),
    (1, 'Hannah',   'Green',    'hannah.green@equinox.admin',    'EMP-ADM-025', 'Manager',  'Settlement Processing'),
    (1, 'Ivan',     'Baker',    'ivan.baker@equinox.admin',      'EMP-ADM-026', 'Manager',  'Reconciliation'),
    (1, 'Julia',    'Adams',    'julia.adams@equinox.admin',     'EMP-ADM-027', 'Manager',  'Dispute Resolution'),
    (1, 'Kevin',    'Nelson',   'kevin.nelson@equinox.admin',    'EMP-ADM-028', 'Manager',  'Payment Operations'),
    (1, 'Laura',    'Carter',   'laura.carter@equinox.admin',    'EMP-ADM-029', 'Manager',  'Customer Onboarding'),
    (1, 'Marcus',   'Hill',     'marcus.hill@equinox.admin',     'EMP-ADM-030', 'Manager',  'Fee Management'),
    -- ROLE_KYC_OFFICER (role_id=2) — 25 users, admin_ids 41-65
    (2, 'Nina',     'Wright',   'nina.wright@equinox.admin',     'EMP-KYC-001', 'Officer',  'KYC Document Review'),
    (2, 'Oscar',    'Smith',    'oscar.smith@equinox.admin',     'EMP-KYC-002', 'Officer',  'Identity Verification'),
    (2, 'Penelope', 'Jones',    'penelope.jones@equinox.admin',  'EMP-KYC-003', 'Officer',  'Document Validation'),
    (2, 'Randy',    'Davis',    'randy.davis@equinox.admin',     'EMP-KYC-004', 'Officer',  'KYC Screening'),
    (2, 'Sierra',   'Miller',   'sierra.miller@equinox.admin',   'EMP-KYC-005', 'Officer',  'Compliance Check'),
    (2, 'Tyler',    'Wilson',   'tyler.wilson@equinox.admin',    'EMP-KYC-006', 'Officer',  'Customer Due Diligence'),
    (2, 'Violet',   'Moore',    'violet.moore@equinox.admin',    'EMP-KYC-007', 'Officer',  'Risk Assessment'),
    (2, 'Wesley',   'Taylor',   'wesley.taylor@equinox.admin',   'EMP-KYC-008', 'Officer',  'Enhanced Due Diligence'),
    (2, 'Aria',     'Anderson', 'aria.anderson@equinox.admin',   'EMP-KYC-009', 'Officer',  'Sanctions Screening'),
    (2, 'Blake',    'Thomas',   'blake.thomas@equinox.admin',    'EMP-KYC-010', 'Officer',  'PEP Check'),
    (2, 'Chloe',    'Jackson',  'chloe.jackson@equinox.admin',   'EMP-KYC-011', 'Officer',  'Document Authentication'),
    (2, 'Derek',    'White',    'derek.white@equinox.admin',     'EMP-KYC-012', 'Officer',  'Background Verification'),
    (2, 'Eliza',    'Harris',   'eliza.harris@equinox.admin',    'EMP-KYC-013', 'Officer',  'KYC Data Entry'),
    (2, 'Felix',    'Martin',   'felix.martin@equinox.admin',    'EMP-KYC-014', 'Officer',  'Address Verification'),
    (2, 'Gianna',   'Thompson', 'gianna.thompson@equinox.admin', 'EMP-KYC-015', 'Officer',  'Identity Confirmation'),
    (2, 'Harper',   'Garcia',   'harper.garcia@equinox.admin',   'EMP-KYC-016', 'Officer',  'Source of Funds Check'),
    (2, 'Isaiah',   'Martinez', 'isaiah.martinez@equinox.admin', 'EMP-KYC-017', 'Officer',  'Ongoing Monitoring'),
    (2, 'Jade',     'Robinson', 'jade.robinson@equinox.admin',   'EMP-KYC-018', 'Officer',  'Periodic Review'),
    (2, 'Kai',      'Clark',    'kai.clark@equinox.admin',       'EMP-KYC-019', 'Officer',  'Trigger Event Review'),
    (2, 'Liam',     'Lewis',    'liam.lewis@equinox.admin',      'EMP-KYC-020', 'Officer',  'KYC Exemption Review'),
    (2, 'Maya',     'Walker',   'maya.walker@equinox.admin',     'EMP-KYC-021', 'Officer',  'Business KYC Review'),
    (2, 'Nathan',   'Hall',     'nathan.hall@equinox.admin',     'EMP-KYC-022', 'Officer',  'Individual KYC Review'),
    (2, 'Ophelia',  'Allen',    'ophelia.allen@equinox.admin',   'EMP-KYC-023', 'Officer',  'Trust KYC Review'),
    (2, 'Preston',  'Young',    'preston.young@equinox.admin',   'EMP-KYC-024', 'Officer',  'Corporate KYC Review'),
    (2, 'Riley',    'King',     'riley.king@equinox.admin',      'EMP-KYC-025', 'Officer',  'Non-Profit KYC Review'),
    -- ROLE_LOAN_OFFICER (role_id=3) — 25 users, admin_ids 66-90
    (3, 'Sean',     'Wright',   'sean.wright@equinox.admin',     'EMP-LOAN-001', 'Officer', 'Loan Application Review'),
    (3, 'Taylor',   'Adams',    'taylor.adams@equinox.admin',    'EMP-LOAN-002', 'Officer', 'Credit Assessment'),
    (3, 'Ulysses',  'Baker',    'ulysses.baker@equinox.admin',   'EMP-LOAN-003', 'Officer', 'Collateral Evaluation'),
    (3, 'Valerie',  'Carter',   'valerie.carter@equinox.admin',  'EMP-LOAN-004', 'Officer', 'Income Verification'),
    (3, 'Willow',   'Collins',  'willow.collins@equinox.admin',  'EMP-LOAN-005', 'Officer', 'Debt-to-Income Analysis'),
    (3, 'Xavier',   'Cooper',   'xavier.cooper@equinox.admin',   'EMP-LOAN-006', 'Officer', 'Loan Structuring'),
    (3, 'Zoe',      'Cox',      'zoe.cox@equinox.admin',         'EMP-LOAN-007', 'Officer', 'Risk Grading'),
    (3, 'Adrian',   'Diaz',     'adrian.diaz@equinox.admin',     'EMP-LOAN-008', 'Officer', 'Approval Authority'),
    (3, 'Brooke',   'Evans',    'brooke.evans@equinox.admin',    'EMP-LOAN-009', 'Officer', 'Loan Disbursement'),
    (3, 'Cody',     'Fisher',   'cody.fisher@equinox.admin',     'EMP-LOAN-010', 'Officer', 'Loan Monitoring'),
    (3, 'Daisy',    'Flores',   'daisy.flores@equinox.admin',    'EMP-LOAN-011', 'Officer', 'Loan Servicing'),
    (3, 'Evan',     'Foster',   'evan.foster@equinox.admin',     'EMP-LOAN-012', 'Officer', 'Restructuring Review'),
    (3, 'Faith',    'Gomez',    'faith.gomez@equinox.admin',     'EMP-LOAN-013', 'Officer', 'Loan Modification'),
    (3, 'Gavin',    'Green',    'gavin.green@equinox.admin',     'EMP-LOAN-014', 'Officer', 'Collection Review'),
    (3, 'Holly',    'Hayes',    'holly.hayes@equinox.admin',     'EMP-LOAN-015', 'Officer', 'Foreclosure Prevention'),
    (3, 'Ian',      'Hughes',   'ian.hughes@equinox.admin',      'EMP-LOAN-016', 'Officer', 'Underwriting Support'),
    (3, 'Jasmine',  'Jenkins',  'jasmine.jenkins@equinox.admin', 'EMP-LOAN-017', 'Officer', 'Document Verification'),
    (3, 'Kyle',     'Kelly',    'kyle.kelly@equinox.admin',      'EMP-LOAN-018', 'Officer', 'Appraisal Review'),
    (3, 'Luna',     'Lang',     'luna.lang@equinox.admin',       'EMP-LOAN-019', 'Officer', 'Title Search Review'),
    (3, 'Morgan',   'Lee',      'morgan.lee@equinox.admin',      'EMP-LOAN-020', 'Officer', 'Insurance Verification'),
    (3, 'Nolan',    'Long',     'nolan.long@equinox.admin',      'EMP-LOAN-021', 'Officer', 'Compliance Check'),
    (3, 'Paisley',  'Mitchell', 'paisley.mitchell@equinox.admin','EMP-LOAN-022', 'Officer', 'Regulatory Review'),
    (3, 'Reed',     'Morgan',   'reed.morgan@equinox.admin',     'EMP-LOAN-023', 'Officer', 'Loan Committee Prep'),
    (3, 'Skylar',   'Murphy',   'skylar.murphy@equinox.admin',   'EMP-LOAN-024', 'Officer', 'Post-Approval Audit'),
    (3, 'Tristan',  'Nelson',   'tristan.nelson@equinox.admin',  'EMP-LOAN-025', 'Officer', 'Loan Portfolio Review'),
    -- ROLE_AUDITOR (role_id=4) — 20 users, admin_ids 91-110
    (4, 'Una',      'Ortiz',    'una.ortiz@equinox.admin',       'EMP-AUD-001', 'Analyst', 'Transaction Audit'),
    (4, 'Vince',    'Parker',   'vince.parker@equinox.admin',    'EMP-AUD-002', 'Analyst', 'Compliance Audit'),
    (4, 'Wade',     'Perez',    'wade.perez@equinox.admin',      'EMP-AUD-003', 'Analyst', 'Fraud Investigation'),
    (4, 'Ali',      'Peterson', 'ali.peterson@equinox.admin',    'EMP-AUD-004', 'Analyst', 'Internal Controls'),
    (4, 'Bianca',   'Reed',     'bianca.reed@equinox.admin',     'EMP-AUD-005', 'Analyst', 'Operational Audit'),
    (4, 'Cole',     'Rivera',   'cole.rivera@equinox.admin',     'EMP-AUD-006', 'Analyst', 'Financial Audit'),
    (4, 'Delilah',  'Roberts',  'delilah.roberts@equinox.admin', 'EMP-AUD-007', 'Analyst', 'Risk Audit'),
    (4, 'Ezra',     'Robinson', 'ezra.robinson@equinox.admin',   'EMP-AUD-008', 'Analyst', 'System Audit'),
    (4, 'Faye',     'Rodriguez','faye.rodriguez@equinox.admin',  'EMP-AUD-009', 'Analyst', 'Regulatory Reporting'),
    (4, 'Grant',    'Rogers',   'grant.rogers@equinox.admin',    'EMP-AUD-010', 'Analyst', 'Data Integrity Audit'),
    (4, 'Hazel',    'Ross',     'hazel.ross@equinox.admin',      'EMP-AUD-011', 'Analyst', 'Process Review'),
    (4, 'Ivy',      'Sanchez',  'ivy.sanchez@equinox.admin',     'EMP-AUD-012', 'Analyst', 'Control Testing'),
    (4, 'Jace',     'Sanders',  'jace.sanders@equinox.admin',    'EMP-AUD-013', 'Analyst', 'Vendor Audit'),
    (4, 'Kira',     'Scott',    'kira.scott@equinox.admin',      'EMP-AUD-014', 'Analyst', 'AML Audit'),
    (4, 'Landon',   'Stewart',  'landon.stewart@equinox.admin',  'EMP-AUD-015', 'Analyst', 'KYC Audit'),
    (4, 'Marilyn',  'Torres',   'marilyn.torres@equinox.admin',  'EMP-AUD-016', 'Analyst', 'Loan Portfolio Audit'),
    (4, 'Nico',     'Turner',   'nico.turner@equinox.admin',     'EMP-AUD-017', 'Analyst', 'Card Operations Audit'),
    (4, 'Opal',     'Walker',   'opal.walker@equinox.admin',     'EMP-AUD-018', 'Analyst', 'Treasury Audit'),
    (4, 'Quade',    'Ward',     'quade.ward@equinox.admin',      'EMP-AUD-019', 'Analyst', 'IT Security Audit'),
    (4, 'Ruth',     'Watson',   'ruth.watson@equinox.admin',     'EMP-AUD-020', 'Analyst', 'External Audit Liaison')
)
INSERT INTO admin_users (role_id, first_name, last_name, email, password_hash, is_active, employee_id, department_role, work_focus, created_at)
SELECT role_id, first_name, last_name, email,
  '$2a$10$m/9YSa5ptF5nl62cFG0y1esAYanfdGPwJ49.OjjnQ7PF.QLtr1j2W',
  true, employee_id, department_role, work_focus,
  now() - (random() * interval '730 days')
FROM data
ON CONFLICT (email) DO NOTHING;

SELECT '  admin_users:' AS label, count(*) FROM admin_users;

-- =============================================================================
-- 1. CUSTOMERS — COUNT: 200,000
-- =============================================================================
SELECT 'Generating customers...' AS status;

INSERT INTO customers (first_name, last_name, email, phone_number, password_hash,
                       date_of_birth, address, kyc_status, credit_score, created_at)
WITH
first_names AS (
  SELECT unnest(ARRAY[
    'James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda',
    'David','Elizabeth','William','Barbara','Richard','Susan','Joseph','Jessica',
    'Thomas','Sarah','Christopher','Karen','Charles','Lisa','Daniel','Nancy',
    'Matthew','Betty','Anthony','Margaret','Mark','Sandra','Donald','Ashley',
    'Steven','Dorothy','Paul','Kimberly','Andrew','Emily','Joshua','Donna',
    'Kenneth','Michelle','Kevin','Carol','Brian','Amanda','George','Melissa',
    'Timothy','Deborah','Ronald','Stephanie','Edward','Rebecca','Jason','Sharon',
    'Jeffrey','Laura','Ryan','Cynthia','Jacob','Kathleen','Gary','Amy',
    'Nicholas','Angela','Eric','Shirley','Jonathan','Anna','Stephen','Brenda',
    'Larry','Pamela','Justin','Emma','Scott','Nicole','Brandon','Helen',
    'Benjamin','Samantha','Samuel','Katherine','Raymond','Christine','Gregory',
    'Debra','Frank','Rachel','Alexander','Carolyn','Patrick','Janet'
  ]) AS name
),
last_names AS (
  SELECT unnest(ARRAY[
    'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
    'Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson',
    'Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson',
    'White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker',
    'Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
    'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell',
    'Carter','Roberts','Gomez','Phillips','Evans','Turner','Diaz','Parker',
    'Cruz','Edwards','Collins','Reyes','Stewart','Morris','Morales','Murphy',
    'Cook','Rogers','Gutierrez','Ortiz','Morgan','Cooper','Peterson','Bailey',
    'Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson','Watson',
    'Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza','Ruiz','Hughes'
  ]) AS name
)
SELECT
  fn.name,
  ln.name,
  lower(fn.name || '.' || ln.name || s.i) || '@seed.local',
  '+1-555-' || LPAD((s.i % 100000)::text, 5, '0'),
  '$2a$10$m/9YSa5ptF5nl62cFG0y1esAYanfdGPwJ49.OjjnQ7PF.QLtr1j2W',
  date '1965-01-01' + (random() * 15000)::int,
  (ARRAY[
    'New York, NY','Los Angeles, CA','Chicago, IL','Houston, TX',
    'Phoenix, AZ','Philadelphia, PA','San Antonio, TX','San Diego, CA',
    'Dallas, TX','San Jose, CA','Austin, TX','Jacksonville, FL',
    'Fort Worth, TX','Columbus, OH','Charlotte, NC','Indianapolis, IN',
    'San Francisco, CA','Seattle, WA','Denver, CO','Nashville, TN',
    'Portland, OR','Memphis, TN','Louisville, KY','Baltimore, MD',
    'Milwaukee, WI','Albuquerque, NM','Tucson, AZ','Fresno, CA',
    'Sacramento, CA','Mesa, AZ','Atlanta, GA','Kansas City, MO',
    'Omaha, NE','Colorado Springs, CO','Raleigh, NC','Virginia Beach, VA',
    'Miami, FL','Oakland, CA','Minneapolis, MN','Tulsa, OK'
  ])[1 + (random() * 40)::int],
  CASE WHEN random() < 0.55 THEN 'approved'
       WHEN random() < 0.75 THEN 'pending'
       ELSE 'rejected' END,
  300 + (random() * 550)::int,
  now() - (random() * interval '730 days')
FROM first_names fn, last_names ln, generate_series(1, 6) s(i)  -- COUNT: 91*91*6 = 49,686
ON CONFLICT (email) DO NOTHING;

SELECT '  customers:' AS label, count(*) FROM customers;

-- =============================================================================
-- 2. ACCOUNTS — 1-3 per customer, avg ~2
-- =============================================================================
SELECT 'Generating accounts...' AS status;

-- First pass: create Checking (type_id=2) and Savings (type_id=1) accounts only
INSERT INTO accounts (customer_id, account_type_id, account_number, balance, name,
                      currency, status, is_primary, created_at)
SELECT
  c.customer_id,
  CASE WHEN a.num = 1 THEN 2 ELSE 1 END,
  'ACC' || LPAD(c.customer_id::text, 10, '0') || '-' || a.num,
  CASE WHEN a.num = 1 THEN (random() * 20000 + 500)::numeric(19,4)
       ELSE (random() * 80000 + 500)::numeric(19,4) END,
  CASE WHEN a.num = 1 THEN 'Everyday Checking' ELSE 'High Yield Savings' END,
  'USD', 'active', a.num = 1,
  c.created_at + (random() * interval '90 days')
FROM customers c
CROSS JOIN generate_series(1, 2 + (random() * 2)::int) a(num)
WHERE (SELECT count(*) FROM accounts) < (SELECT count(*) FROM customers) * 2;

-- Second pass: create Fixed Deposit accounts for approved customers
-- Matches AccountService.createAccount logic: sets source_account_id, term_months,
-- maturity_date, principal_disposition, and creates a funding transaction
INSERT INTO accounts (customer_id, account_type_id, account_number, balance, name,
                      currency, status, is_primary, created_at,
                      source_account_id, term_months, maturity_date, principal_disposition)
SELECT
  c.customer_id,
  3,
  'ACC' || LPAD(c.customer_id::text, 10, '0') || '-FD',
  (random() * 50000 + 1000)::numeric(19,4),
  'Fixed Deposit',
  'USD', 'active', false,
  c.created_at + (random() * interval '90 days'),
  src.account_id,
  fdr.term_months,
  ((c.created_at + (random() * interval '90 days'))::date + (fdr.term_months || ' months')::interval)::date,
  CASE WHEN random() < 0.5 THEN 'REINVEST' ELSE 'TRANSFER_TO_PRIMARY' END
FROM customers c
CROSS JOIN LATERAL (
  SELECT acc.account_id FROM accounts acc
  WHERE acc.customer_id = c.customer_id AND acc.account_type_id = 2 AND acc.status = 'active'
  ORDER BY acc.created_at LIMIT 1
) src
CROSS JOIN LATERAL (
  SELECT term_months FROM fixed_deposit_rates ORDER BY random() LIMIT 1
) fdr
WHERE random() < 0.35
  AND c.kyc_status = 'approved'
  AND (SELECT count(*) FROM accounts WHERE account_type_id = 3) < (SELECT count(*) FROM customers WHERE kyc_status = 'approved') * 0.35;

-- Debit source accounts for FD funding (matching service: sourceAccount.setBalance(balance - amount))
UPDATE accounts src
SET balance = src.balance - fd.balance
FROM accounts fd
WHERE fd.account_type_id = 3
  AND fd.source_account_id = src.account_id
  AND src.balance >= fd.balance;

-- Create FD funding transactions (matching service: creates a 'transfer' transaction)
INSERT INTO transactions (reference_number, type_id, source_account_id, target_account_id,
                          amount, currency, status, description, transaction_date)
SELECT
  'FD-' || a.account_id,
  (SELECT type_id FROM transaction_types WHERE type_name = 'transfer'),
  a.source_account_id, a.account_id, a.balance,
  'USD', 'completed', 'Fixed Deposit funding', a.created_at
FROM accounts a
WHERE a.account_type_id = 3 AND a.source_account_id IS NOT NULL
ON CONFLICT (reference_number) DO NOTHING;

SELECT '  accounts:' AS label, count(*) FROM accounts;

-- =============================================================================
-- 3. CARDS — one debit per checking account; credit for high-score
--     Matches CardService.issueCard(): credit fields from credit_score_tiers,
--     is_frozen=false, expiry=issued_at+4yrs, statement/due for credit only
-- =============================================================================
SELECT 'Generating cards...' AS status;

WITH card_data AS (
  SELECT
    a.account_id,
    a.created_at + (random() * interval '60 days') AS issued_at,
    CASE WHEN cst.credit_limit IS NOT NULL AND random() < 0.45 THEN
           CASE WHEN random() < 0.5 THEN 2 ELSE 4 END
         ELSE
           CASE WHEN random() < 0.5 THEN 1 ELSE 3 END
    END AS card_type_id,
    CASE WHEN cst.credit_limit IS NOT NULL AND random() < 0.45 THEN cst.credit_limit ELSE NULL END AS credit_limit,
    CASE WHEN cst.credit_limit IS NOT NULL AND random() < 0.45 THEN cst.apr ELSE NULL END AS apr
  FROM accounts a
  JOIN customers c ON c.customer_id = a.customer_id
  LEFT JOIN LATERAL (
    SELECT credit_limit, apr FROM credit_score_tiers
    WHERE c.credit_score BETWEEN min_score AND max_score
    LIMIT 1
  ) cst ON true
  WHERE a.account_type_id = 2
    AND a.status = 'active'
    AND random() < 0.7
)
INSERT INTO cards (account_id, card_type_id, card_number, expiry_date, cvv_hash,
                   is_frozen, issued_at, credit_limit, outstanding_balance, apr,
                   statement_date, due_date)
SELECT
  account_id,
  card_type_id,
  '4' || LPAD((random() * 999999999999999)::bigint::text, 15, '0'),
  (issued_at + interval '4 years')::date,
  LPAD((random() * 999)::int::text, 3, '0'),
  false,
  issued_at,
  credit_limit,
  0::numeric(19,4),
  apr,
  CASE WHEN credit_limit IS NOT NULL THEN (issued_at + interval '1 month')::date ELSE NULL END,
  CASE WHEN credit_limit IS NOT NULL THEN (issued_at + interval '1 month' + interval '21 days')::date ELSE NULL END
FROM card_data;

SELECT '  cards:' AS label, count(*) FROM cards;

-- =============================================================================
-- 4. CARD LIMITS — one per card (matching CardService.issueCard defaults)
-- =============================================================================
SELECT 'Generating card limits...' AS status;

INSERT INTO card_limits (card_id, daily_limit, monthly_limit, allow_international, allow_online)
SELECT c.card_id, 1000, 10000, false, true
FROM cards c
WHERE NOT EXISTS (SELECT 1 FROM card_limits cl WHERE cl.card_id = c.card_id);

SELECT '  card_limits:' AS label, count(*) FROM card_limits;

-- =============================================================================
-- 4a. ENSURE PURCHASE TRANSACTION TYPES EXIST (needed by sections 4b & 13)
-- =============================================================================
INSERT INTO transaction_types (type_name) VALUES
  ('debit_purchase'), ('credit_purchase'), ('interest'), ('loan_interest'), ('interest_charge')
ON CONFLICT (type_name) DO NOTHING;

-- =============================================================================
-- 4b. CREDIT CARD PURCHASES — matching CreditCardService.purchase()
--      Creates Transaction (type=credit_purchase) + CardTransaction linked via transaction_id
--      Updates card.outstanding_balance
-- =============================================================================
SELECT 'Generating credit card purchases...' AS status;

WITH purchase_data AS (
  SELECT
    c.card_id,
    'CRD-' || c.card_id || '-' || s.i AS ref,
    ((random() * 500 + 20)::numeric(19,4)) AS amount,
    (ARRAY['Amazon','Walmart','Target','Best Buy','Starbucks','Uber','Netflix','Home Depot','Whole Foods','DoorDash','Macy''s','Best Buy'])[1 + (random() * 12)::int] AS merchant,
    now() - (random() * interval '180 days') AS txn_date
  FROM cards c
  CROSS JOIN generate_series(1, 3) s(i)
  WHERE c.credit_limit IS NOT NULL AND random() < 0.5
),
inserted_txns AS (
  INSERT INTO transactions (reference_number, type_id, category_id, source_account_id, amount, currency, status, description, transaction_date)
  SELECT
    pd.ref,
    (SELECT type_id FROM transaction_types WHERE type_name = 'credit_purchase'),
    (SELECT category_id FROM transaction_categories WHERE category_name = 'Card Payment'),
    c.account_id, pd.amount, 'USD', 'completed', pd.merchant, pd.txn_date
  FROM purchase_data pd
  JOIN cards c ON c.card_id = pd.card_id
  ON CONFLICT (reference_number) DO NOTHING
  RETURNING reference_number, transaction_id
)
INSERT INTO card_transactions (card_id, amount, merchant, description, transaction_date, transaction_id)
SELECT pd.card_id, pd.amount, pd.merchant, 'Purchase', pd.txn_date, i.transaction_id
FROM purchase_data pd
JOIN inserted_txns i ON i.reference_number = pd.ref;

UPDATE cards c
SET outstanding_balance = COALESCE((
  SELECT SUM(t.amount) FROM transactions t
  WHERE t.reference_number LIKE 'CRD-' || c.card_id || '-%'
), 0)
WHERE c.credit_limit IS NOT NULL;

SELECT '  credit card purchases:' AS label, count(*) FROM card_transactions WHERE transaction_id IS NOT NULL;

-- =============================================================================
-- 5. LOANS — COUNT: 40,000 (20% of eligible customers)
--     Matches LoanService.applyForLoan() creation + AdminService.reviewLoan() approval
-- =============================================================================
SELECT 'Generating loans...' AS status;

INSERT INTO loans (customer_id, loan_type_id, approved_by, principal_amount,
                   outstanding_balance, interest_rate, loan_term_months, status,
                   applied_at, approved_at, remarks, purpose,
                   monthly_payment_amount, next_payment_due_date, last_interest_date)
WITH loan_data AS (
  SELECT
    c.customer_id,
    (1 + floor(random() * 4)::int) AS loan_type_id,
    (1000 + random() * 50000)::numeric(19,4) AS principal_amount,
    (3.5 + random() * 6)::numeric(5,4) AS interest_rate,
    (12 + (random() * 48)::int) AS loan_term_months,
    now() - (random() * interval '400 days') AS applied_at,
    CASE WHEN random() < 0.35 THEN 'approved'
         WHEN random() < 0.30 THEN 'active'
         WHEN random() < 0.15 THEN 'settled'
         ELSE 'pending' END AS status,
    (ARRAY['Debt consolidation','Home renovation','Emergency expenses',
           'Education','Business investment','Major purchase','Vacation',
           'Medical expenses','Vehicle purchase'])[1 + (random() * 9)::int] AS purpose
  FROM customers c
  WHERE c.credit_score >= 620
    AND random() < 0.35
    AND c.kyc_status = 'approved'
)
SELECT
  customer_id,
  loan_type_id,
  CASE WHEN status IN ('approved', 'active', 'settled') THEN 1 ELSE NULL END AS approved_by,
  principal_amount,
  CASE
    WHEN status = 'settled' THEN 0::numeric(19,4)
    WHEN status = 'active' THEN (principal_amount * (0.3 + random() * 0.6))::numeric(19,4)
    ELSE principal_amount
  END AS outstanding_balance,
  interest_rate,
  loan_term_months,
  status,
  applied_at,
  CASE WHEN status IN ('approved', 'active', 'settled')
       THEN applied_at + interval '7 days'
       ELSE NULL END AS approved_at,
  CASE WHEN random() < 0.3 THEN 'Standard online application' ELSE NULL END AS remarks,
  purpose,
  CASE WHEN status IN ('approved', 'active')
       THEN ROUND(
         (principal_amount * (interest_rate / 1200) *
          power(1 + (interest_rate / 1200), loan_term_months)) /
         (power(1 + (interest_rate / 1200), loan_term_months) - 1)
       , 2)
       ELSE NULL END AS monthly_payment_amount,
  CASE WHEN status IN ('approved', 'active')
       THEN ((applied_at + interval '7 days' + interval '1 month')::date)
       ELSE NULL END AS next_payment_due_date,
  CASE WHEN status IN ('approved', 'active')
       THEN (applied_at + interval '7 days')::date
       ELSE NULL END AS last_interest_date
FROM loan_data;

SELECT '  loans:' AS label, count(*) FROM loans;

-- =============================================================================
-- 6. TRANSACTION CATEGORIES
-- =============================================================================
SELECT 'Seeding transaction categories...' AS status;

INSERT INTO transaction_categories (category_name) VALUES
  ('Groceries'), ('Utilities'), ('Entertainment'), ('Others'),
  ('Dining'), ('Shopping'), ('Transportation'), ('Health'),
  ('Rent'), ('Insurance'), ('Subscription'), ('Income')
ON CONFLICT (category_name) DO NOTHING;

-- =============================================================================
-- 8a. TRANSACTIONS: INCOME (deposits) — COUNT: ~1.2M
--     1 deposit per cycle per sampled account
-- =============================================================================
SELECT 'Generating income transactions...' AS status;

INSERT INTO transactions (reference_number, type_id, category_id,
                          source_account_id, target_account_id, amount,
                          currency, status, description, transaction_date)
WITH
accts AS (
  SELECT account_id FROM accounts
  WHERE status = 'active' AND random() < 0.12     -- COUNT: ~12% of accounts
  LIMIT (SELECT (count(*) * 0.12)::int FROM accounts WHERE status = 'active')
),
inc_names AS (
  SELECT ARRAY[
    'Payroll Deposit','Direct Deposit','Freelance Payment',
    'Client Invoice Payment','Tax Refund','Bonus Payment',
    'Dividend Payment','Gig Economy Pay','Reimbursement',
    'Consulting Fee'
  ] AS names
)
SELECT
  'INC-' || a.account_id || '-' || s.i,
  1,                                         -- type: deposit
  (SELECT category_id FROM transaction_categories WHERE category_name = 'Income'),
  NULL,
  a.account_id,
  ((random() * 8000 + 200)::numeric(19,4)),  -- $200-$8200
  'USD',
  'completed',
  (SELECT names[1 + (random() * (array_length(names, 1) - 1))::int] FROM inc_names),
  now() - (random() * interval '730 days')   -- past 2 years
FROM accts a,
     generate_series(1, 24) s(i)             -- 24 deposits per account
ON CONFLICT (reference_number) DO NOTHING;

SELECT '  income tx:' AS label, count(*) FROM transactions WHERE type_id = 1;

-- =============================================================================
-- 8b. TRANSACTIONS: EXPENSES (transfers) — COUNT: ~2.5M
--     One random merchant per account-series slot, O(1) per row
-- =============================================================================
SELECT 'Generating expense transactions...' AS status;

INSERT INTO transactions (reference_number, type_id, category_id,
                          source_account_id, target_account_id, amount,
                          currency, status, description, transaction_date)
WITH
accts AS (
  SELECT account_id FROM accounts
  WHERE status = 'active' AND random() < 0.10     -- COUNT: ~10% of accounts
  LIMIT (SELECT (count(*) * 0.10)::int FROM accounts WHERE status = 'active')
),
cats AS (
  SELECT category_id, category_name FROM transaction_categories
),
merchants AS (
  SELECT
    ARRAY[
      'Walmart','Costco','Kroger','Trader Joe''s','Whole Foods','Safeway','Aldi','Publix',
      'Comcast','Verizon','AT&T','PG&E','Water District','Waste Mgmt',
      'Netflix','Spotify','Disney+','HBO Max','AMC Theatres','Steam','Apple TV','YouTube Premium',
      'Starbucks','Chipotle','McDonald''s','Pizza Hut','Subway','Panera Bread','Olive Garden','Cheesecake Factory',
      'Amazon','Target','Best Buy','Home Depot','Nike','Macy''s','IKEA','Costco',
      'Uber','Lyft','Shell','Exxon','Chevron','BP',
      'CVS Pharmacy','Walgreens','Gym Membership','Kaiser','Dental Clinic',
      'Property Mgmt Co','Landlord Payment',
      'State Farm','Geico','Progressive',
      'Dog Walker','Hair Salon','Dry Cleaner','Pet Store'
    ] AS names,
    ARRAY[
      'Groceries','Groceries','Groceries','Groceries','Groceries','Groceries','Groceries','Groceries',
      'Utilities','Utilities','Utilities','Utilities','Utilities','Utilities',
      'Entertainment','Entertainment','Entertainment','Entertainment','Entertainment','Entertainment','Entertainment','Entertainment',
      'Dining','Dining','Dining','Dining','Dining','Dining','Dining','Dining',
      'Shopping','Shopping','Shopping','Shopping','Shopping','Shopping','Shopping','Shopping',
      'Transportation','Transportation','Transportation','Transportation','Transportation','Transportation',
      'Health','Health','Health','Health','Health',
      'Rent','Rent',
      'Insurance','Insurance','Insurance',
      'Others','Others','Others','Others'
    ] AS cats
)
SELECT
  'TXN-' || a.account_id || '-' || tx.i,
  3,                                          -- type: transfer
  (SELECT category_id FROM cats c WHERE c.category_name = m.cats[idx]),
  a.account_id,
  NULL,
  ((CASE m.cats[idx]
         WHEN 'Rent' THEN (random() * 1000 + 800)::numeric(19,4)
         WHEN 'Insurance' THEN (random() * 200 + 50)::numeric(19,4)
         WHEN 'Health' THEN (random() * 300 + 10)::numeric(19,4)
         WHEN 'Shopping' THEN (random() * 400 + 5)::numeric(19,4)
         WHEN 'Transportation' THEN (random() * 80 + 5)::numeric(19,4)
         WHEN 'Utilities' THEN (random() * 150 + 30)::numeric(19,4)
         ELSE (random() * 120 + 3)::numeric(19,4) END)),
  'USD',
  'completed',
  m.names[idx],
  now() - (random() * interval '730 days')    -- past 2 years
FROM accts a,
     generate_series(1, 40) tx(i),             -- COUNT: 40 per account
     merchants m,
     LATERAL (SELECT 1 + (random() * (array_length(m.names, 1) - 1))::int AS idx) r
ON CONFLICT (reference_number) DO NOTHING;

SELECT '  expense tx:' AS label, count(*) FROM transactions WHERE type_id = 3;

-- =============================================================================
-- 9. TRANSACTIONS: MIXED (withdrawals, refunds, interest) — add variety
-- =============================================================================
SELECT 'Generating withdrawal transactions...' AS status;

INSERT INTO transactions (reference_number, type_id, category_id,
                          source_account_id, target_account_id, amount,
                          currency, status, description, transaction_date)
WITH accts AS (
  SELECT account_id FROM accounts
  WHERE status = 'active' AND random() < 0.05
  LIMIT (SELECT (count(*) * 0.05)::int FROM accounts WHERE status = 'active')
)
SELECT
  'WDL-' || a.account_id || '-' || s.i,
  2,                                         -- type: withdrawal
  NULL,
  a.account_id,
  NULL,
  ((random() * 500 + 20)::numeric(19,4)),
  'USD',
  'completed',
  'ATM Withdrawal',
  now() - (random() * interval '365 days')
FROM accts a,
     generate_series(1, 10) s(i)             -- 10 withdrawals per account
ON CONFLICT (reference_number) DO NOTHING;

-- =============================================================================
-- 10. CUSTOMER BILLS — 1-3 per customer, including utilities & subscriptions
-- =============================================================================
SELECT 'Generating customer bills...' AS status;

INSERT INTO customer_bills (customer_id, biller_name, bill_type, amount, due_date, frequency, auto_pay, source_account_id, status, created_at)
SELECT
  c.customer_id,
  billers.biller_name,
  billers.bill_type,
  billers.amount,
  (CURRENT_DATE + (random() * 30)::int)::date,
  CASE WHEN random() < 0.7 THEN 'MONTHLY' ELSE 'ONE_TIME' END,
  random() < 0.2,
  (SELECT a.account_id FROM accounts a WHERE a.customer_id = c.customer_id AND a.is_primary = TRUE LIMIT 1),
  'ACTIVE',
  now() - (random() * interval '180 days')
FROM customers c
CROSS JOIN LATERAL (
  SELECT * FROM (VALUES
    ('Pacific Gas & Electric', 'Utilities', (random() * 200 + 80)::numeric(19,4)),
    ('Comcast Xfinity', 'Internet', (random() * 60 + 40)::numeric(19,4)),
    ('Netflix', 'Subscription', 19.99::numeric(19,4)),
    ('Equinox Gym', 'Membership', (random() * 100 + 150)::numeric(19,4)),
    ('Spotify', 'Subscription', 11.99::numeric(19,4)),
    ('AT&T Wireless', 'Utilities', (random() * 80 + 40)::numeric(19,4)),
    ('Water District', 'Utilities', (random() * 60 + 20)::numeric(19,4)),
    ('Disney+', 'Subscription', 13.99::numeric(19,4))
  ) AS t(biller_name, bill_type, amount)
  WHERE random() < 0.35
  LIMIT 1 + (random() * 2)::int
) billers
WHERE (SELECT count(*) FROM customer_bills) < (SELECT count(*) FROM customers) * 2;

SELECT '  customer_bills:' AS label, count(*) FROM customer_bills;

-- =============================================================================
-- 11. ENSURE ALL NEEDED TRANSACTION TYPES EXIST
-- =============================================================================
SELECT 'Ensuring transaction types...' AS status;
INSERT INTO transaction_types (type_name) VALUES
  ('deposit'), ('withdrawal'), ('transfer'), ('fee'), ('payment')
ON CONFLICT (type_name) DO NOTHING;

-- =============================================================================
-- 12A. EXPAND INCOME COVERAGE — target ~30% of active accounts (+18%)
--      3-5 deposits per account
-- =============================================================================
SELECT 'Generating extra income transactions...' AS status;

INSERT INTO transactions (reference_number, type_id, category_id,
                          source_account_id, target_account_id, amount,
                          currency, status, description, transaction_date)
WITH accts AS (
  SELECT account_id, customer_id FROM accounts
  WHERE status = 'active' AND random() < 0.18
  LIMIT (SELECT (count(*) * 0.18)::int FROM accounts WHERE status = 'active')
)
SELECT
  'INC2-' || a.account_id || '-' || s.i,
  (SELECT type_id FROM transaction_types WHERE type_name = 'deposit'),
  (SELECT category_id FROM transaction_categories WHERE category_name = 'Income'),
  NULL,
  a.account_id,
  ((random() * 6000 + 200)::numeric(19,4)),
  'USD',
  'completed',
  (ARRAY['Payroll Deposit','Direct Deposit','Freelance Payment','Client Invoice','Dividend Payment','Gig Economy Pay','Consulting Fee'])[1 + (random() * 7)::int],
  now() - (random() * interval '365 days')
FROM accts a,
     generate_series(1, 3 + (random() * 2)::int) s(i)
ON CONFLICT (reference_number) DO NOTHING;

SELECT '  extra income tx:' AS label, count(*) FROM transactions WHERE type_id = (SELECT type_id FROM transaction_types WHERE type_name = 'deposit');

-- =============================================================================
-- 12B. EXPAND EXPENSE COVERAGE — target ~30% of active accounts (+18%)
--      5-10 expenses per account
-- =============================================================================
SELECT 'Generating extra expense transactions...' AS status;

INSERT INTO transactions (reference_number, type_id, category_id,
                          source_account_id, target_account_id, amount,
                          currency, status, description, transaction_date)
WITH accts AS (
  SELECT account_id FROM accounts
  WHERE status = 'active' AND random() < 0.18
  LIMIT (SELECT (count(*) * 0.18)::int FROM accounts WHERE status = 'active')
),
cats AS (
  SELECT category_id, category_name FROM transaction_categories
),
merchants(cat, name) AS (
  VALUES
    ('Groceries', 'Walmart'), ('Groceries', 'Costco'), ('Groceries', 'Kroger'), ('Groceries', 'Trader Joe''s'),
    ('Utilities', 'Comcast'), ('Utilities', 'Verizon'), ('Utilities', 'PG&E'), ('Utilities', 'Water District'),
    ('Entertainment', 'Netflix'), ('Entertainment', 'Spotify'), ('Entertainment', 'Disney+'), ('Entertainment', 'HBO Max'),
    ('Dining', 'Starbucks'), ('Dining', 'Chipotle'), ('Dining', 'McDonald''s'), ('Dining', 'Pizza Hut'),
    ('Shopping', 'Amazon'), ('Shopping', 'Target'), ('Shopping', 'Best Buy'), ('Shopping', 'Home Depot'),
    ('Transportation', 'Uber'), ('Transportation', 'Shell'), ('Transportation', 'Exxon'), ('Transportation', 'Lyft'),
    ('Health', 'CVS Pharmacy'), ('Health', 'Walgreens'), ('Health', 'Kaiser'), ('Health', 'Dental Clinic'),
    ('Rent', 'Property Mgmt Co'), ('Rent', 'Landlord Payment'),
    ('Insurance', 'State Farm'), ('Insurance', 'Geico'), ('Insurance', 'Progressive'),
    ('Others', 'Hair Salon'), ('Others', 'Dry Cleaner'), ('Others', 'Pet Store')
),
sorted AS (
  SELECT m.*, row_number() OVER () AS rn FROM merchants m
)
SELECT
  'EXP2-' || a.account_id || '-' || s.i,
  (SELECT type_id FROM transaction_types WHERE type_name = 'transfer'),
  (SELECT c.category_id FROM cats c WHERE c.category_name = m.cat),
  a.account_id,
  NULL,
  (CASE m.cat
     WHEN 'Rent' THEN (random() * 1000 + 800)::numeric(19,4)
     WHEN 'Insurance' THEN (random() * 200 + 50)::numeric(19,4)
     WHEN 'Health' THEN (random() * 300 + 10)::numeric(19,4)
     WHEN 'Shopping' THEN (random() * 400 + 5)::numeric(19,4)
     WHEN 'Transportation' THEN (random() * 80 + 5)::numeric(19,4)
     WHEN 'Utilities' THEN (random() * 150 + 30)::numeric(19,4)
     WHEN 'Entertainment' THEN (random() * 30 + 10)::numeric(19,4)
     WHEN 'Dining' THEN (random() * 40 + 8)::numeric(19,4)
     WHEN 'Groceries' THEN (random() * 120 + 20)::numeric(19,4)
     ELSE (random() * 120 + 3)::numeric(19,4) END),
  'USD',
  'completed',
  m.name,
  now() - (random() * interval '365 days')
FROM accts a,
     generate_series(1, 5 + (random() * 5)::int) s(i),
     sorted m
WHERE m.rn = 1 + (s.i % 36)
ON CONFLICT (reference_number) DO NOTHING;

SELECT '  extra expense tx:' AS label, count(*) FROM transactions WHERE type_id = (SELECT type_id FROM transaction_types WHERE type_name = 'transfer');

-- =============================================================================
-- 13. DEBIT CARD PURCHASES — matching CardService.debitPurchase()
--      Creates Transaction (type=debit_purchase) + CardTransaction linked via transaction_id
--      Deducts from account balance
-- =============================================================================
SELECT 'Generating debit card purchases...' AS status;

WITH purchase_data AS (
  SELECT
    c.card_id,
    c.account_id,
    'DBT-' || c.card_id || '-' || s.i AS ref,
    ((random() * 150 + 5)::numeric(19,4)) AS amount,
    (ARRAY['Amazon','Walmart','Target','Starbucks','Uber','Netflix','Shell Gas','Best Buy','Kroger','Whole Foods','DoorDash','CVS'])[1 + (random() * 12)::int] AS merchant,
    now() - (random() * interval '180 days') AS txn_date
  FROM cards c
  CROSS JOIN generate_series(1, 3) s(i)
  WHERE c.credit_limit IS NULL
    AND c.card_id IN (SELECT card_id FROM cards WHERE credit_limit IS NULL ORDER BY random() LIMIT 80000)
),
inserted_txns AS (
  INSERT INTO transactions (reference_number, type_id, category_id, source_account_id, amount, currency, status, description, transaction_date)
  SELECT
    pd.ref,
    (SELECT type_id FROM transaction_types WHERE type_name = 'debit_purchase'),
    (SELECT category_id FROM transaction_categories WHERE category_name = 'Card Payment'),
    pd.account_id, pd.amount, 'USD', 'completed', pd.merchant, pd.txn_date
  FROM purchase_data pd
  ON CONFLICT (reference_number) DO NOTHING
  RETURNING reference_number, transaction_id
)
INSERT INTO card_transactions (card_id, amount, merchant, description, transaction_date, transaction_id)
SELECT pd.card_id, pd.amount, pd.merchant, 'Purchase', pd.txn_date, i.transaction_id
FROM purchase_data pd
JOIN inserted_txns i ON i.reference_number = pd.ref;

UPDATE accounts a
SET balance = GREATEST(0, a.balance - sub.total_spent)
FROM (
  SELECT c.account_id, COALESCE(SUM(t.amount), 0) AS total_spent
  FROM cards c
  JOIN transactions t ON t.source_account_id = c.account_id
  WHERE c.credit_limit IS NULL
    AND t.type_id = (SELECT type_id FROM transaction_types WHERE type_name = 'debit_purchase')
    AND t.status = 'completed'
  GROUP BY c.account_id
) sub
WHERE a.account_id = sub.account_id AND sub.total_spent > 0;

SELECT '  debit card purchases:' AS label, count(*) FROM card_transactions WHERE transaction_id IS NOT NULL;

-- =============================================================================
-- 14. INTEREST + MAINTENANCE FEES — 1 month backfill for all active accounts
--     Uses account_type rates; skips Fixed Deposit for interest (matching app logic)
-- =============================================================================
SELECT 'Generating interest & fee transactions...' AS status;

-- Interest credits
INSERT INTO transactions (reference_number, type_id, category_id,
                          source_account_id, target_account_id, amount,
                          currency, status, description, transaction_date)
SELECT
  'INT-' || a.account_id,
  (SELECT type_id FROM transaction_types WHERE type_name = 'interest'),
  (SELECT category_id FROM transaction_categories WHERE category_name = 'Interest Payment'),
  NULL,
  a.account_id,
  GREATEST(
    (a.balance * COALESCE(at.interest_rate, 0) / 12 / 100)::numeric(19,4),
    0.01::numeric(19,4)
  ),
  'USD',
  'completed',
  'Monthly Interest Payment (' || COALESCE(at.type_name, 'Account') || ')',
  date_trunc('month', now()) - interval '1 day'
FROM accounts a
LEFT JOIN account_types at ON at.account_type_id = a.account_type_id
WHERE a.status = 'active'
  AND a.balance > 0
  AND COALESCE(at.interest_rate, 0) > 0
  AND (at.type_name IS NULL OR at.type_name != 'Fixed Deposit')
  AND random() < 0.95
ON CONFLICT (reference_number) DO NOTHING;

-- Maintenance fee debits
INSERT INTO transactions (reference_number, type_id, category_id,
                          source_account_id, target_account_id, amount,
                          currency, status, description, transaction_date)
SELECT
  'FEE-' || a.account_id,
  (SELECT type_id FROM transaction_types WHERE type_name = 'fee'),
  (SELECT category_id FROM transaction_categories WHERE category_name = 'Others'),
  a.account_id,
  NULL,
  GREATEST(COALESCE(at.maintenance_fee, 0)::numeric(19,4), 0.01::numeric(19,4)),
  'USD',
  'completed',
  'Monthly Maintenance Fee (' || COALESCE(at.type_name, 'Account') || ')',
  date_trunc('month', now()) - interval '1 day'
FROM accounts a
LEFT JOIN account_types at ON at.account_type_id = a.account_type_id
WHERE a.status = 'active'
  AND COALESCE(at.maintenance_fee, 0) > 0
  AND a.balance >= COALESCE(at.maintenance_fee, 0)
  AND random() < 0.95
ON CONFLICT (reference_number) DO NOTHING;

SELECT '  interest tx:' AS label, count(*) FROM transactions WHERE type_id = (SELECT type_id FROM transaction_types WHERE type_name = 'interest');
SELECT '  fee tx:' AS label, count(*) FROM transactions WHERE type_id = (SELECT type_id FROM transaction_types WHERE type_name = 'fee');

-- =============================================================================
-- 15. LOAN REPAYMENTS — matching LoanService.repayLoan()
--      Creates Transaction (type=loan_repayment), LoanRepayment record,
--      deducts from account, updates loan outstanding + due_date + status
-- =============================================================================
SELECT 'Generating loan repayments...' AS status;

WITH inserted_txns AS (
  INSERT INTO transactions (reference_number, type_id, category_id,
                            source_account_id, target_account_id, amount,
                            currency, status, description, transaction_date)
  SELECT
    'REP-' || l.loan_id || '-' || s.i,
    (SELECT type_id FROM transaction_types WHERE type_name = 'loan_repayment'),
    (SELECT category_id FROM transaction_categories WHERE category_name = 'Others'),
    (SELECT a.account_id FROM accounts a WHERE a.customer_id = l.customer_id AND a.is_primary = TRUE LIMIT 1),
    NULL,
    GREATEST(
      (l.monthly_payment_amount * (0.8 + random() * 0.4))::numeric(19,4),
      1.00::numeric(19,4)
    ),
    'USD', 'completed',
    'Loan Repayment: ' || COALESCE(lt.type_name, 'Loan') || ' (#' || l.loan_id || ')',
    now() - ((4 - s.i) * interval '1 month')
  FROM loans l
  LEFT JOIN loan_types lt ON lt.loan_type_id = l.loan_type_id
  CROSS JOIN generate_series(1, 3) s(i)
  WHERE lower(l.status) IN ('approved', 'active')
    AND l.outstanding_balance > 0
    AND l.monthly_payment_amount IS NOT NULL
    AND l.monthly_payment_amount > 0
    AND random() < 0.5
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

SELECT '  loan repayments:' AS label, count(*) FROM loan_repayments;

-- Deduct from source accounts (matching service: account.setBalance(balance - amountPaid))
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

-- Update loan balances + status + due dates (matching LoanService.repayLoan logic)
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

-- =============================================================================
-- 16. BILL PAYMENTS — pay 1 month for ~40% of bills
-- =============================================================================
SELECT 'Generating bill payment history...' AS status;

INSERT INTO transactions (reference_number, type_id, category_id,
                          source_account_id, target_account_id, amount,
                          currency, status, description, transaction_date)
SELECT
  'BPAY-' || b.bill_id,
  (SELECT type_id FROM transaction_types WHERE type_name = 'transfer'),
  (SELECT category_id FROM transaction_categories WHERE category_name =
     CASE b.bill_type
       WHEN 'Internet' THEN 'Utilities'
       WHEN 'Subscription' THEN 'Entertainment'
       WHEN 'Membership' THEN 'Others'
       ELSE b.bill_type END),
  b.source_account_id,
  NULL,
  b.amount,
  'USD',
  'completed',
  'Bill Payment — ' || b.biller_name,
  now() - (random() * interval '90 days')
FROM customer_bills b
WHERE b.status = 'ACTIVE'
  AND b.source_account_id IS NOT NULL
  AND b.amount > 0
  AND random() < 0.4
ON CONFLICT (reference_number) DO NOTHING;

-- Marry the transaction back to the bill
UPDATE customer_bills b
SET last_paid_at = (
  SELECT t.transaction_date AT TIME ZONE 'UTC'
  FROM transactions t
  WHERE t.reference_number = 'BPAY-' || b.bill_id
  LIMIT 1
)
WHERE b.status = 'ACTIVE'
  AND EXISTS (SELECT 1 FROM transactions t WHERE t.reference_number = 'BPAY-' || b.bill_id);

SELECT '  bill payments:' AS label, count(*) FROM transactions WHERE reference_number LIKE 'BPAY-%';

-- =============================================================================
-- 17. CARD STATEMENTS — matching CreditCardService.generateStatementsForDate()
--      Generates 1 statement per credit card with balance:
--      - Captures starting_balance (pre-interest)
--      - Applies interest to outstanding_balance + card + creates CardTransaction + Transaction
--      - Sets ending_balance (post-interest), minimum_payment (2% or full if < 25)
--      - Links period CardTransactions via statement_id
--      - Updates card.statement_date + card.due_date
-- =============================================================================
SELECT 'Generating card statements...' AS status;

-- Calculate interest for cards with APR > 0 (capture pre-interest balance + computed interest)
CREATE TEMP TABLE _card_interest AS
SELECT
  card_id,
  outstanding_balance AS balance_before_interest,
  ROUND((outstanding_balance * apr / 365 * 30)::numeric, 4) AS interest_amount
FROM cards
WHERE credit_limit IS NOT NULL
  AND outstanding_balance > 0
  AND apr IS NOT NULL AND apr > 0;

-- Add interest to card.outstanding_balance (matches: card.setOutstandingBalance(balance + interest))
UPDATE cards c
SET outstanding_balance = c.outstanding_balance + ci.interest_amount
FROM _card_interest ci
WHERE c.card_id = ci.card_id;

-- Create interest CardTransactions (matches: interestCxn with merchant='Interest Charge')
INSERT INTO card_transactions (card_id, amount, merchant, description, transaction_date)
SELECT card_id, interest_amount, 'Interest Charge', 'Interest Charge',
  (date_trunc('month', now()) - interval '1 month')::date
FROM _card_interest;

-- Create interest Transactions (matches: intTxn with type='interest_charge', ref='INT-CRD-{card_id}')
INSERT INTO transactions (reference_number, type_id, source_account_id, amount, currency, status, description, transaction_date)
SELECT
  'INT-CRD-' || ci.card_id,
  (SELECT type_id FROM transaction_types WHERE type_name = 'interest_charge'),
  c.account_id, ci.interest_amount, 'USD', 'completed',
  'Interest Charge on credit card', now()
FROM _card_interest ci
JOIN cards c ON c.card_id = ci.card_id
ON CONFLICT (reference_number) DO NOTHING;

-- Insert card_statements (matches: periodStart=now-1month/1st, periodEnd=last day prev month, dueDate=now+21d)
INSERT INTO card_statements (card_id, period_start, period_end, due_date,
                             starting_balance, ending_balance, minimum_payment, paid, created_at)
SELECT
  c.card_id,
  (date_trunc('month', now()) - interval '1 month')::date,
  (date_trunc('month', now()) - interval '1 day')::date,
  now()::date + 21,
  COALESCE(ci.balance_before_interest, c.outstanding_balance),
  c.outstanding_balance,
  CASE
    WHEN c.outstanding_balance * 0.02 < 25 THEN c.outstanding_balance
    ELSE ROUND((c.outstanding_balance * 0.02)::numeric, 4)
  END,
  false,
  now()
FROM cards c
LEFT JOIN _card_interest ci ON ci.card_id = c.card_id
WHERE c.credit_limit IS NOT NULL
  AND c.outstanding_balance > 0
  AND random() < 0.7;

-- Link period CardTransactions to the statement (matches: setStatementId on period txns)
UPDATE card_transactions ct
SET statement_id = cs.statement_id
FROM card_statements cs
WHERE ct.card_id = cs.card_id
  AND ct.transaction_date >= cs.period_start
  AND ct.transaction_date < cs.period_end + interval '1 day'
  AND ct.statement_id IS NULL;

-- Update card statement_date and due_date (matches: card.setStatementDate(now), setDueDate(dueDate))
UPDATE cards c
SET statement_date = now()::date,
    due_date = now()::date + 21
FROM card_statements cs
WHERE c.card_id = cs.card_id;

DROP TABLE IF EXISTS _card_interest;

SELECT '  card_statements:' AS label, count(*) FROM card_statements;

-- =============================================================================
-- 18. REFUNDS — 5K refunds on recent expense transactions
-- =============================================================================
SELECT 'Generating refunds...' AS status;

INSERT INTO refunds (original_transaction_id, refund_amount, reason, status, processed_at, admin_id)
SELECT
  t.transaction_id,
  (t.amount * (0.5 + random() * 0.5))::numeric(19,4),
  (ARRAY['Customer requested refund','Item returned','Service cancelled','Duplicate charge','Product defective'])[1 + (random() * 5)::int],
  (CASE WHEN random() < 0.4 THEN 'completed' WHEN random() < 0.6 THEN 'rejected' ELSE 'pending' END),
  now() - (random() * interval '60 days'),
  CASE
    WHEN random() < 0.5 THEN 91 + ((random() * 20)::int % 20)     -- AUDITOR
    WHEN random() < 0.8 THEN 11 + ((random() * 30)::int % 30)     -- ADMIN
    ELSE 1 + ((random() * 10)::int % 10)                            -- SUPER_ADMIN
  END
FROM transactions t
WHERE t.type_id = (SELECT type_id FROM transaction_types WHERE type_name = 'transfer')
  AND t.amount >= 10
  AND random() < 0.02
  AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.original_transaction_id = t.transaction_id)
LIMIT 20000;

SELECT '  refunds:' AS label, count(*) FROM refunds;

-- =============================================================================
-- RESULT
-- =============================================================================
SELECT '  -- MASS SEED COMPLETE --' AS status;
SELECT 'Customers' AS entity, count(*) AS rows FROM customers
UNION ALL SELECT 'Accounts', count(*) FROM accounts
UNION ALL SELECT 'Cards', count(*) FROM cards
UNION ALL SELECT 'Card Limits', count(*) FROM card_limits
UNION ALL SELECT 'Card Transactions', count(*) FROM card_transactions
UNION ALL SELECT 'Card Statements', count(*) FROM card_statements
UNION ALL SELECT 'Loans', count(*) FROM loans
UNION ALL SELECT 'Transactions', count(*) FROM transactions
UNION ALL SELECT 'Tx Categories', count(*) FROM transaction_categories
UNION ALL SELECT 'Customer Bills', count(*) FROM customer_bills
UNION ALL SELECT 'Refunds', count(*) FROM refunds
ORDER BY entity;
