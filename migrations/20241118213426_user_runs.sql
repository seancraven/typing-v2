-- Add migration script here
CREATE TABLE user_runs (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    errors TEXT NOT NULL,
    finished BOOLEAN NOT NULL,
    start_index INTEGER NOT NULL,
    end_index INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    wpm FLOAT NOT NULL,
    type_time FLOAT NOT NULL,
    CONSTRAINT fk_topics
      FOREIGN KEY (topic_id)
        REFERENCES topics (id),
    CONSTRAINT fk_users
        FOREIGN KEY (user_id)
            REFERENCES users (id)
);
