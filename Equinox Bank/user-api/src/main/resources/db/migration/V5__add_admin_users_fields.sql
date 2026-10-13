-- Add missing admin_users columns required by admin-api JPA mapping
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS department_role VARCHAR(100);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS work_focus TEXT;
