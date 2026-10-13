ALTER TABLE card_types ADD COLUMN IF NOT EXISTS default_apr NUMERIC(5,4);
ALTER TABLE card_types ADD COLUMN IF NOT EXISTS late_fee NUMERIC(19,4) NOT NULL DEFAULT 0;

UPDATE card_types SET default_apr = 0.2299 WHERE type_name = 'credit' AND default_apr IS NULL;
