-- Add role column to users table.
-- Valid roles: 'general' (default) and 'admin'.
alter table users
  add column if not exists role text not null default 'general'
    check (role in ('general', 'admin'));

-- Seed known admin account.
update users set role = 'admin' where email = 'gilbertjanderson@gmail.com';
