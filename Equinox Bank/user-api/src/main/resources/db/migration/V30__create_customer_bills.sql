CREATE TABLE IF NOT EXISTS customer_bills (
    bill_id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    biller_name VARCHAR(255) NOT NULL,
    bill_type VARCHAR(50) NOT NULL,
    amount NUMERIC(19,4),
    due_date DATE,
    frequency VARCHAR(20),
    auto_pay BOOLEAN NOT NULL DEFAULT FALSE,
    source_account_id BIGINT REFERENCES accounts(account_id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_paid_at TIMESTAMP
);

CREATE INDEX idx_customer_bills_customer_id ON customer_bills(customer_id);
CREATE INDEX idx_customer_bills_status ON customer_bills(status);
