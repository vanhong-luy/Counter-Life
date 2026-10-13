CREATE TABLE IF NOT EXISTS credit_limit_requests (
    request_id BIGSERIAL PRIMARY KEY,
    card_id BIGINT NOT NULL REFERENCES cards(card_id) DEFERRABLE INITIALLY IMMEDIATE,
    current_limit NUMERIC(19,4) NOT NULL,
    requested_limit NUMERIC(19,4) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    admin_id BIGINT REFERENCES admin_users(admin_id) DEFERRABLE INITIALLY IMMEDIATE,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);
