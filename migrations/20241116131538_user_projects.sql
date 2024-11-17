CREATE TABLE user_progress  (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL,
    user_id UUID NOT NULL,
    final_idx INTEGER NOT NULL,
    CONSTRAINT fk_topic
      FOREIGN KEY (topic_id)
        REFERENCES topics (id),
    CONSTRAINT fk_progress_users
        FOREIGN KEY (user_id)
            REFERENCES users (id)
);
