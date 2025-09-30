-- Add Chief HR internal workflow fields to job_requisitions table
ALTER TABLE public.job_requisitions 
ADD COLUMN chief_hr_reviewed boolean DEFAULT false,
ADD COLUMN chief_hr_reviewed_by uuid,
ADD COLUMN chief_hr_reviewed_at timestamp with time zone,
ADD COLUMN chief_hr_comments text,
ADD COLUMN hr_internal_status text DEFAULT 'pending_initial_review';

-- Add comment for clarity
COMMENT ON COLUMN public.job_requisitions.hr_internal_status IS 'Internal HR workflow status: pending_initial_review, pending_chief_review, ready_for_manager';