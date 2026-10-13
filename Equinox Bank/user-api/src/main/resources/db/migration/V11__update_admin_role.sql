INSERT INTO admin_roles (role_name, permissions)
VALUES ('ROLE_SUPER_ADMIN', 'dashboard,transactions,kyc,loans,users,settings')
ON CONFLICT (role_name) DO NOTHING;

UPDATE admin_users
SET role_id = (SELECT role_id FROM admin_roles WHERE role_name = 'ROLE_SUPER_ADMIN')
WHERE email = 'admin@equinox.com'
  AND EXISTS (SELECT 1 FROM admin_roles WHERE role_name = 'ROLE_SUPER_ADMIN');
