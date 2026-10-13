ALTER TABLE cards ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(19,4);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(19,4) NOT NULL DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS apr NUMERIC(5,4);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS statement_date DATE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS due_date DATE;

CREATE TABLE IF NOT EXISTS card_statements (
    statement_id BIGSERIAL PRIMARY KEY,
    card_id BIGINT NOT NULL REFERENCES cards(card_id) DEFERRABLE INITIALLY IMMEDIATE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    starting_balance NUMERIC(19,4) NOT NULL,
    ending_balance NUMERIC(19,4) NOT NULL,
    minimum_payment NUMERIC(19,4) NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    payment_transaction_id BIGINT REFERENCES transactions(transaction_id) DEFERRABLE INITIALLY IMMEDIATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_transactions (
    cxn_id BIGSERIAL PRIMARY KEY,
    card_id BIGINT NOT NULL REFERENCES cards(card_id) DEFERRABLE INITIALLY IMMEDIATE,
    amount NUMERIC(19,4) NOT NULL,
    merchant VARCHAR(255),
    description TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    statement_id BIGINT REFERENCES card_statements(statement_id) DEFERRABLE INITIALLY IMMEDIATE
);
