-- Fix the Dynamics job requisition that is stuck in wrong state
-- Reset chief_hr_reviewed so HR can edit it normally
UPDATE job_requisitions 
SET 
  chief_hr_reviewed = false,
  hr_internal_status = 'pending_initial_review'
WHERE position_title ILIKE '%dynamics%' 
  AND status = 'hr_review'
  AND chief_hr_reviewed = true;