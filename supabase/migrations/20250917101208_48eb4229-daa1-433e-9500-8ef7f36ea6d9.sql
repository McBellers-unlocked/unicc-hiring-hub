-- Add HR changes tracking to job_requisitions table
ALTER TABLE public.job_requisitions 
ADD COLUMN hr_original_data jsonb DEFAULT NULL,
ADD COLUMN hr_changes jsonb DEFAULT NULL,
ADD COLUMN hr_change_summary text DEFAULT NULL;