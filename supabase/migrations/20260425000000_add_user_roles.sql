-- Add role column to users table.
-- Valid roles: 'general' (default) and 'admin'.
alter table users
  add column if not exists role text not null default 'general'
    check (role in ('general', 'admin'));

-- Optionally promote an admin account using a deployment-supplied setting.
-- Example: set app.admin_email = 'admin@example.com';
update users
set role = 'admin'
where email = nullif(current_setting('app.admin_email', true), '');
