-- Add intern_modality column to job_requisitions table to store Full time/Part time selection
ALTER TABLE job_requisitions 
ADD COLUMN IF NOT EXISTS intern_modality TEXT;

COMMENT ON COLUMN job_requisitions.intern_modality IS 'Modality for intern positions: Full time or Part time';