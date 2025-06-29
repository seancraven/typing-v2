-- Add migration script here
--
CREATE TABLE IF NOT EXISTS langauges (
    id INTEGER PRIMARY KEY NOT NULL,
    lang VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_languages (
    id INTEGER PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL,
    lang_id INTEGER NOT NULL
);

INSERT INTO langauges (lang) SELECT DISTINCT lang FROM topics;

CREATE TABLE topics_new (
    id INTEGER PRIMARY KEY NOT NULL,
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    topic_text TEXT NOT NULL,
    text_len INTEGER NOT NULL,
    lang_id INTEGER NOT NULL,
    CONSTRAINT fk_languages FOREIGN KEY (lang_id)
    REFERENCES langauges (id)
);

INSERT INTO topics_new (id, topic, title, topic_text, text_len, lang_id)
SELECT t.id, t.topic, t.title, t.topic_text, t.text_len, l.id FROM topics AS t INNER JOIN langauges AS l
    ON t.lang = l.lang;


DROP TABLE topics;
ALTER TABLE topics_new RENAME TO topics;
