UPDATE screening_scores SET pipeline_version = '3.0' WHERE pipeline_version IS NULL;
ALTER TABLE screening_scores ALTER COLUMN pipeline_version SET NOT NULL;