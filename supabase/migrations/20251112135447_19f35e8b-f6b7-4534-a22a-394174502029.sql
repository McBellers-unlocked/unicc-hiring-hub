-- Drop the old check constraint
ALTER TABLE public.job_requisitions 
DROP CONSTRAINT IF EXISTS job_requisitions_status_check;

-- Add new check constraint with all workflow stages (including existing ones)
ALTER TABLE public.job_requisitions 
ADD CONSTRAINT job_requisitions_status_check 
CHECK (status IN (
  -- Initial Request stages
  'initial_request_draft',
  'initial_request_submitted',
  'initial_request_chief_review',
  'initial_request_approved',
  'initial_request_rejected',
  -- Full PD stages
  'pd_draft',
  'pd_submitted',
  'hr_review',
  'hiring_manager_review',
  'chief_of_division_review',
  'chief_division_review', -- Keep old naming
  'director_review',
  'approved',
  'rejected',
  'converted',
  'draft' -- Keep for backwards compatibility
));

-- Add comment explaining workflow stages
COMMENT ON COLUMN public.job_requisitions.status IS 
'Workflow stages:
Initial Request Phase:
- initial_request_draft: Hiring manager creating initial request
- initial_request_submitted: Initial request submitted, awaiting chief review
- initial_request_chief_review: Chief of division reviewing initial request
- initial_request_approved: Chief approved, hiring manager can now create full PD
- initial_request_rejected: Chief rejected initial request

Full Position Description Phase:
- pd_draft: Hiring manager creating full position description
- pd_submitted: Full PD submitted, awaiting HR review
- hr_review: HR reviewing and editing PD
- hiring_manager_review: Hiring manager reviewing HR changes
- chief_of_division_review: Chief reviewing final PD
- director_review: Director reviewing final PD

Final States:
- approved: Fully approved, ready to convert to job
- converted: Converted to active job posting
- rejected: Rejected at any stage';