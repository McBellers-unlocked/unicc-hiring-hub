-- Add fields to track HR's final review after hiring manager changes
ALTER TABLE public.job_requisitions
ADD COLUMN IF NOT EXISTS hr_final_review_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hr_final_review_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS hr_final_review_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS hiring_manager_changes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS final_clean_version jsonb DEFAULT '{}'::jsonb;

-- Add comment to explain the workflow
COMMENT ON COLUMN public.job_requisitions.hr_final_review_completed IS 'True when HR has reviewed hiring manager changes and created final clean version';
COMMENT ON COLUMN public.job_requisitions.hiring_manager_changes IS 'Array of changes made by hiring manager after HR review';
COMMENT ON COLUMN public.job_requisitions.final_clean_version IS 'Clean version of all fields after HR final review, ready for Division Chief';