-- Fix requisitions stuck at Chief of Division review but missing HR final review flag

-- 1) Ensure HR final review is marked completed for affected records
UPDATE job_requisitions
SET 
  hr_final_review_completed = true,
  hr_final_review_at = COALESCE(hr_final_review_at, hr_reviewed_at),
  hr_final_review_by = COALESCE(hr_final_review_by, hr_reviewed_by)
WHERE id IN ('91d28b69-662d-483b-a923-5bf5e0090cf6', '935ad222-bd6c-4f3b-b669-03b1c6051533')
  AND status IN ('chief_division_review', 'chief_of_division_review');

-- 2) For the Senior Cybersecurity Analyst requisition, reset Chief approval
-- so it can correctly appear as pending in the Chief of Division queue
UPDATE job_requisitions
SET 
  chief_of_division_approval = false,
  chief_of_division_approved_at = NULL,
  chief_of_division_approved_by = NULL
WHERE id = '91d28b69-662d-483b-a923-5bf5e0090cf6'
  AND status IN ('chief_division_review', 'chief_of_division_review');