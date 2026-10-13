ALTER TABLE loan_types ADD COLUMN IF NOT EXISTS late_fee NUMERIC(19,4) NOT NULL DEFAULT 25.00;

UPDATE loan_types SET late_fee = 35.00 WHERE type_name = 'Personal';
UPDATE loan_types SET late_fee = 50.00 WHERE type_name = 'Home';
UPDATE loan_types SET late_fee = 25.00 WHERE type_name = 'Auto';
UPDATE loan_types SET late_fee = 20.00 WHERE type_name = 'Education';
