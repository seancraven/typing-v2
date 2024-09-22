CREATE TABLE users (
  id UUID PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE texts (
  id SERIAL PRIMARY KEY,
  body TEXT NOT NULL
);
CREATE TABLE typing_run (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  wpm FLOAT NOT NULL,
  errors TEXT NOT NULL,
  text_id INTEGER NOT NULL,
  CONSTRAINT fk_users
    FOREIGN KEY (user_id)
      REFERENCES users (id),
  CONSTRAINT fk_texts 
    FOREIGN KEY (text_id)
      REFERENCES texts (id)
);
