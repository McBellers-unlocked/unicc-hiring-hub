-- Set pd_submitted_at for the 4 jobs that were submitted today
UPDATE job_requisitions 
SET pd_submitted_at = NOW() 
WHERE status = 'hr_review' 
  AND pd_submitted_at IS NULL;