-- Add migration script here
-- Add migration script here
ALTER TABLE texts ADD COLUMN length INTEGER NOT NULL DEFAULT 100;
ALTER TABLE texts ALTER COLUMN length DROP DEFAULT;
