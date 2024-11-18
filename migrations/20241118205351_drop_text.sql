-- Add migration script here
ALTER TABLE topics ADD COLUMN length INTEGER;
UPDATE topics as t SET length = tx.length FROM texts as tx WHERE tx.body = t.text;
ALTER TABLE topics ALTER COLUMN length SET NOT NULL;
DROP TABLE typing_run;
DROP TABLE texts;
