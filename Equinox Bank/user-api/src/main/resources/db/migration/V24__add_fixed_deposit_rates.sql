CREATE TABLE IF NOT EXISTS fixed_deposit_rates (
    rate_id SERIAL PRIMARY KEY,
    term_months INT NOT NULL UNIQUE,
    interest_rate NUMERIC(5,4) NOT NULL
);

INSERT INTO fixed_deposit_rates (term_months, interest_rate) VALUES
    (3, 0.0350),
    (6, 0.0400),
    (12, 0.0450),
    (24, 0.0525),
    (36, 0.0600)
ON CONFLICT (term_months) DO NOTHING;
