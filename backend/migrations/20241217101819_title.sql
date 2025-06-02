-- Add migration script here
ALTER TABLE topics ADD COLUMN title TEXT NOT NULL DEFAULT '';
