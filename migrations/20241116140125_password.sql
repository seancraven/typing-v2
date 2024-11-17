-- Add migration script here
ALTER TABLE users ADD COLUMN password VARCHAR(50) NOT NULL;
