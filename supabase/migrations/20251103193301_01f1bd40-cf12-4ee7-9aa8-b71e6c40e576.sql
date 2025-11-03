-- Add essential_education_level column to jobs table
ALTER TABLE jobs ADD COLUMN essential_education_level text;

COMMENT ON COLUMN jobs.essential_education_level IS 'Structured education requirement: Secondary, First Level University, Advanced University, or Professional';