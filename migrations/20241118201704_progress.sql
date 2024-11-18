-- Add migration script here
ALTER TABLE topics ADD COLUMN text TEXT;
UPDATE topics as t SET text = tx.body FROM
(SELECT body, topic_id FROM texts GROUP BY topic_id, body) tx WHERE tx.topic_id  = t.id;
DELETE FROM topics WHERE text IS NULL;
ALTER TABLE topics ALTER COLUMN text SET NOT NULL;
