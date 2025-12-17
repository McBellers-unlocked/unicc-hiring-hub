-- Add intern_duration column to job_requisitions table
ALTER TABLE public.job_requisitions 
ADD COLUMN intern_duration TEXT;