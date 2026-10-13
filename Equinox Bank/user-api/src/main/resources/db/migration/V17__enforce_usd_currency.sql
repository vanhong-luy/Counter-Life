UPDATE accounts SET currency = 'USD' WHERE currency <> 'USD';
UPDATE transactions SET currency = 'USD' WHERE currency <> 'USD';

ALTER TABLE accounts ADD CONSTRAINT chk_accounts_currency_usd CHECK (currency = 'USD');
ALTER TABLE transactions ADD CONSTRAINT chk_transactions_currency_usd CHECK (currency = 'USD');
