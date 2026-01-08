-- Fix missing pd_submitted_at for Hyperautomation job
-- Use hr_reviewed_at as approximation since PD was submitted same day
UPDATE job_requisitions 
SET pd_submitted_at = hr_reviewed_at
WHERE position_title ILIKE '%hyperautomation%' 
  AND pd_submitted_at IS NULL
  AND hr_reviewed_at IS NOT NULL;