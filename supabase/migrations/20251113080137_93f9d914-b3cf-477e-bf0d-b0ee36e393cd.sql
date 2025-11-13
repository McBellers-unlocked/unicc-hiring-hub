-- Add "Overall Assessment" category to job_requirements
ALTER TABLE job_requirements 
DROP CONSTRAINT IF EXISTS job_requirements_category_check;

ALTER TABLE job_requirements 
ADD CONSTRAINT job_requirements_category_check 
CHECK (category IN (
  'Essential Criteria', 
  'Desirable Criteria', 
  'Essential Education', 
  'Desirable Education',
  'Overall Assessment'
));