-- Add resubmission flag to track composition changes after approval
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS review_committee_is_resubmission boolean DEFAULT false;