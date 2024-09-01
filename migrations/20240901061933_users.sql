CREATE TABLE users (
  id UUID PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE typing_run (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  wpm FLOAT NOT NULL,
  errors TEXT NOT NULL,
  CONSTRAINT fk_users
    FOREIGN KEY (user_id)
      REFERENCES users (id)
);
