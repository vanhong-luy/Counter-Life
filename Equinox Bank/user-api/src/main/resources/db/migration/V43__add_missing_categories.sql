INSERT INTO transaction_categories (category_name) VALUES
  ('Card Payment'),
  ('Interest Payment'),
  ('Rent'),
  ('Insurance'),
  ('Subscription'),
  ('Dining'),
  ('Shopping'),
  ('Transportation'),
  ('Health')
ON CONFLICT (category_name) DO NOTHING;
