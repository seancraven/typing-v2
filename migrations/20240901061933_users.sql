CREATE TABLE users (
    id VARCHAR(32) PRIMARY KEY NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(50) NOT NULL,
    user_password VARCHAR(50) NOT NULL
);

CREATE TABLE topics (
    id INTEGER PRIMARY KEY NOT NULL,
    topic TEXT NOT NULL,
    topic_text TEXT NOT NULL,
    text_len INTEGER NOT NULL
);

CREATE TABLE user_progress (
    id INTEGER PRIMARY KEY NOT NULL,
    topic_id INTEGER NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    final_idx INTEGER NOT NULL,
    CONSTRAINT fk_topic
    FOREIGN KEY (topic_id)
    REFERENCES topics (id),
    CONSTRAINT fk_progress_users
    FOREIGN KEY (user_id)
    REFERENCES users (id)
);
CREATE TABLE user_documents (
    id INTEGER PRIMARY KEY NOT NULL,
    body TEXT NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    CONSTRAINT fk_users
    FOREIGN KEY (user_id)
    REFERENCES users (id)
);

CREATE TABLE user_runs (
    id INTEGER PRIMARY KEY NOT NULL,
    user_id VARCHAR(32) NOT NULL,
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
