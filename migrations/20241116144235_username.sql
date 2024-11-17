-- Add migration script here
ALTER TABLE users RENAME COLUMN first_name to username;
ALTER TABLE users DROP COLUMN last_name;
