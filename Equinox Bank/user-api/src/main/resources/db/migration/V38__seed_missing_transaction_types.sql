INSERT INTO "transaction_types" ("type_name") VALUES
('late_fee'),
('interest_charge'),
('payment')
ON CONFLICT ("type_name") DO NOTHING;
