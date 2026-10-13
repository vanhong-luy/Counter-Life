ALTER TABLE admin_roles ADD COLUMN IF NOT EXISTS permissions VARCHAR(255) NOT NULL DEFAULT 'dashboard,transactions,kyc,loans,users,settings';

UPDATE admin_roles SET permissions = 'dashboard,transactions,kyc,loans,users,settings' WHERE role_name = 'ROLE_SUPER_ADMIN';
UPDATE admin_roles SET permissions = 'dashboard,transactions,kyc,loans,users' WHERE role_name = 'ROLE_ADMIN';

INSERT INTO admin_roles (role_name, permissions) VALUES ('ROLE_KYC_OFFICER', 'dashboard,kyc') ON CONFLICT (role_name) DO NOTHING;
INSERT INTO admin_roles (role_name, permissions) VALUES ('ROLE_LOAN_OFFICER', 'dashboard,loans') ON CONFLICT (role_name) DO NOTHING;
INSERT INTO admin_roles (role_name, permissions) VALUES ('ROLE_AUDITOR', 'dashboard,transactions') ON CONFLICT (role_name) DO NOTHING;
