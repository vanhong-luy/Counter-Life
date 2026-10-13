UPDATE transactions
SET category_id = 4
WHERE category_id IS NULL
  AND description LIKE 'Bill Payment%';
