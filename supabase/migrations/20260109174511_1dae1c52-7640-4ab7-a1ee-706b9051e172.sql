-- Create batch scoring jobs table for progress tracking
CREATE TABLE public.batch_scoring_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_applications INTEGER NOT NULL DEFAULT 0,
  scored_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.batch_scoring_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view batch scoring jobs
CREATE POLICY "Authenticated users can view batch scoring jobs" 
ON public.batch_scoring_jobs 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow service role to insert/update (edge functions use service role)
CREATE POLICY "Service role can manage batch scoring jobs"
ON public.batch_scoring_jobs
FOR ALL
USING (true)
WITH CHECK (true);

-- Add index for faster lookups by job_id
CREATE INDEX idx_batch_scoring_jobs_job_id ON public.batch_scoring_jobs(job_id);

-- Add index for finding active jobs
CREATE INDEX idx_batch_scoring_jobs_status ON public.batch_scoring_jobs(status) WHERE status IN ('pending', 'processing');