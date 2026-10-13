CREATE TABLE IF NOT EXISTS credit_score_tiers (
    tier_id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL UNIQUE,
    min_score INT NOT NULL,
    max_score INT NOT NULL,
    credit_limit NUMERIC(19,4) NOT NULL,
    apr NUMERIC(5,4) NOT NULL
);

INSERT INTO credit_score_tiers (tier_name, min_score, max_score, credit_limit, apr) VALUES
    ('Poor', 300, 579, 500, 0.2999),
    ('Fair', 580, 669, 2000, 0.2699),
    ('Good', 670, 739, 5000, 0.2299),
    ('Very Good', 740, 799, 7500, 0.1899),
    ('Exceptional', 800, 850, 10000, 0.1599)
ON CONFLICT (tier_name) DO NOTHING;
