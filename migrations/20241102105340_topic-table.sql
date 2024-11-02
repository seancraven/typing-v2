-- Add migration script here
CREATE table topics (
    id SERIAL PRIMARY KEY NOT NULL,
    topic TEXT NOT NULL
);
INSERT INTO topics (topic) VALUES
('Go parser'),
('CRM system CRUD endpoints'),
('Pokedex'),
('React components for a simple interactive ui.'),
('Pytorch code for a U-net.'),
('Jax code for a GAN.')
;
ALTER TABLE texts ADD COLUMN topic_id INTEGER NOT NULL;
ALTER TABLE texts ADD CONSTRAINT fk_topic FOREIGN KEY (topic_id) REFERENCES topics (id);
