-- Add review committee approval workflow fields to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS review_committee_status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS review_committee_sent_for_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS review_committee_sent_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS review_committee_approved BOOLEAN,
ADD COLUMN IF NOT EXISTS review_committee_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS review_committee_approved_by UUID REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_jobs_review_committee_status ON public.jobs(review_committee_status);

-- Add comment for clarity
COMMENT ON COLUMN public.jobs.review_committee_status IS 'Status of review committee: draft, pending_approval, approved, rejected';