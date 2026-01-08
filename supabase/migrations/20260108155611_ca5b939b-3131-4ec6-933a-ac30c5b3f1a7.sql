-- Add pd_submitted_at column to track when full PD is submitted for HR review
ALTER TABLE public.job_requisitions 
ADD COLUMN IF NOT EXISTS pd_submitted_at TIMESTAMP WITH TIME ZONE;