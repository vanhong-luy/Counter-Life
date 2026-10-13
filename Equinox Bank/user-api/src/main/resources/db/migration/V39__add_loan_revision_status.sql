ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_status_check;
ALTER TABLE loans ADD CONSTRAINT loans_status_check
  CHECK (status IN ('pending','approved','rejected','active','settled','defaulted','revision'));
