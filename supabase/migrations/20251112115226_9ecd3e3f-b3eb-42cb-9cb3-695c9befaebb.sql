-- Add new columns to job_requisitions table for Initial Request workflow
ALTER TABLE public.job_requisitions
ADD COLUMN IF NOT EXISTS initial_request_submitted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS initial_request_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS initial_request_approved_by uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS initial_request_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS funding_status text,
ADD COLUMN IF NOT EXISTS funding_comments text,
ADD COLUMN IF NOT EXISTS brief_outline text,
ADD COLUMN IF NOT EXISTS consultant_duration text;

-- Add comment for clarity
COMMENT ON COLUMN public.job_requisitions.funding_status IS 'Funding status: totally funded, critical for service, partially funded, or upcoming agreement';
COMMENT ON COLUMN public.job_requisitions.consultant_duration IS 'Duration for consultant contracts: 6 months or 11 months';
COMMENT ON COLUMN public.job_requisitions.brief_outline IS 'Brief role description for initial request stage';