INSERT INTO "account_types" ("type_name", "interest_rate", "maintenance_fee")
VALUES ('Loan Disbursement', 0, 0)
ON CONFLICT (type_name) DO NOTHING;
