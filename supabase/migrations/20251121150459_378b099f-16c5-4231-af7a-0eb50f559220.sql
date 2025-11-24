-- Add internal_only field to jobs table
ALTER TABLE public.jobs
ADD COLUMN internal_only boolean DEFAULT false;

-- Add internal_only field to job_requisitions table
ALTER TABLE public.job_requisitions
ADD COLUMN internal_only boolean DEFAULT false;

-- Create policy for internal-only jobs visible to UNICC staff
CREATE POLICY "Internal jobs visible to UNICC staff"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  internal_only = false 
  OR internal_only IS NULL 
  OR (auth.jwt()->>'email')::text LIKE '%@unicc.org'
);

-- Create policy for public jobs visible to everyone (anonymous users)
CREATE POLICY "Public jobs visible to everyone"
ON public.jobs
FOR SELECT
TO anon
USING (
  internal_only = false 
  OR internal_only IS NULL
);

-- Add comment to document the field
COMMENT ON COLUMN public.jobs.internal_only IS 'When true, job is only visible to authenticated users with @unicc.org email addresses';
COMMENT ON COLUMN public.job_requisitions.internal_only IS 'When true, job requisition is for an internal-only position';