UPDATE admin_roles SET permissions = 'dashboard,transactions,kyc,loans,users,settings,cards' WHERE role_name = 'ROLE_SUPER_ADMIN';
UPDATE admin_roles SET permissions = 'dashboard,transactions,kyc,loans,users,cards' WHERE role_name = 'ROLE_ADMIN';
