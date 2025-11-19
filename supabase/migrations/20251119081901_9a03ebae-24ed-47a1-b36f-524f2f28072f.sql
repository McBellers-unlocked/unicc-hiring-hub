-- Fix stuck requisition: Move from hr_review to hiring_manager_review after chief HR approval
UPDATE job_requisitions 
SET status = 'hiring_manager_review'
WHERE id = '91d28b69-662d-483b-a923-5bf5e0090cf6' 
  AND status = 'hr_review' 
  AND chief_hr_reviewed = true;