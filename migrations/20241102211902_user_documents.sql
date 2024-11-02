-- Add migration script here
CREATE TABLE user_documents (
    id SERIAL PRIMARY KEY NOT NULL,
    body TEXT NOT NULL
);
