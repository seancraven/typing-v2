-- Add migration script here
ALTER TABLE users ADD COLUMN email VARCHAR(100) NOT NULL;
