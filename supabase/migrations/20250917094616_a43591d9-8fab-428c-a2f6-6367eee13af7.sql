-- Add temporary_duration column to job_requisitions table
ALTER TABLE public.job_requisitions 
ADD COLUMN temporary_duration text;

-- Add eligible_grades column for STDA positions
ALTER TABLE public.job_requisitions 
ADD COLUMN eligible_grades text;