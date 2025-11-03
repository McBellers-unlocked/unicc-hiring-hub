-- Add essential_education_level column to job_requisitions table
ALTER TABLE job_requisitions ADD COLUMN essential_education_level text;

COMMENT ON COLUMN job_requisitions.essential_education_level IS 'Structured education requirement: Secondary, First Level University, Advanced University, or Professional';