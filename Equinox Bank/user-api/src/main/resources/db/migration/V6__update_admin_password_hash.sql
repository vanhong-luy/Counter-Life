-- Update admin@equinox.com password hash to BCrypt hash of "admin"
UPDATE admin_users 
SET password_hash = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQvq4aO' 
WHERE email = 'admin@equinox.com';
