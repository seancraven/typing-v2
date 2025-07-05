-- Add migration script here
CREATE TABLE IF NOT EXISTS users (
    id CHAR(32) PRIMARY KEY NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    user_password VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL,
    text_length_prefernce INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS user_goals (
    id INTEGER PRIMARY KEY NOT NULL,
    user_id VARCHAR(32) NOT NULL UNIQUE,
    accuracy FLOAT NOT NULL,
    wpm FLOAT NOT NULL,
    time_spent FLOAT NOT NULL,
    CONSTRAINT fk_users
    FOREIGN KEY (user_id)
    REFERENCES users (id)
);
CREATE INDEX index_user_goals_user_id ON user_goals (user_id);
CREATE TABLE IF NOT EXISTS user_progress (
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
CREATE TABLE IF NOT EXISTS user_runs (
    id INTEGER PRIMARY KEY NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    errors TEXT NOT NULL,
    finished BOOLEAN NOT NULL,
    start_index INTEGER NOT NULL,
    end_index INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    wpm FLOAT NOT NULL,
    type_time FLOAT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_topics
    FOREIGN KEY (topic_id)
    REFERENCES topics (id),
    CONSTRAINT fk_users
    FOREIGN KEY (user_id)
    REFERENCES users (id)
);
-- Core State of system, user wide. Populated constantly providing new topics for users to learn.
CREATE TABLE IF NOT EXISTS langauges (
    id INTEGER PRIMARY KEY NOT NULL,
    lang VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY NOT NULL,
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    topic_text TEXT NOT NULL,
    text_len INTEGER NOT NULL,
    lang_id INTEGER NOT NULL,
    CONSTRAINT fk_languages FOREIGN KEY (lang_id)
    REFERENCES langauges (id)
);
