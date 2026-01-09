-- Add last_updated_at column for detecting stalled jobs
ALTER TABLE batch_scoring_jobs 
ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT now();

-- Update existing processing jobs to have a last_updated_at value
UPDATE batch_scoring_jobs 
SET last_updated_at = COALESCE(created_at, now())
WHERE last_updated_at IS NULL;