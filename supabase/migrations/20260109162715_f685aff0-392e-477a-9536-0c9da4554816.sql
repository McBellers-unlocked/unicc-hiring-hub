-- Add unique constraint on application_id for upsert support
ALTER TABLE screening_scores 
ADD CONSTRAINT screening_scores_application_id_key UNIQUE (application_id);