-- Add 'converted' to the allowed status values for job_requisitions
ALTER TABLE job_requisitions 
DROP CONSTRAINT IF EXISTS job_requisitions_status_check;

ALTER TABLE job_requisitions 
ADD CONSTRAINT job_requisitions_status_check 
CHECK (status IN (
  'draft',
  'submitted',
  'hr_review',
  'hr_amendments',
  'hiring_manager_review',
  'chief_division_review',
  'director_review',
  'approved',
  'rejected',
  'converted'
));