-- Create job_review_committee_members table
CREATE TABLE IF NOT EXISTS public.job_review_committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, user_id)
);

-- Enable RLS
ALTER TABLE public.job_review_committee_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "HR and Admin can manage review committee members"
ON public.job_review_committee_members
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

CREATE POLICY "Review committee members can view their assignments"
ON public.job_review_committee_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create function to check if user is review committee member
CREATE OR REPLACE FUNCTION public.is_review_committee_member(_user_id UUID, _job_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.job_review_committee_members
    WHERE user_id = _user_id
      AND job_id = _job_id
  )
$$;

-- Create updated_at trigger
CREATE TRIGGER update_job_review_committee_members_updated_at
BEFORE UPDATE ON public.job_review_committee_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_job_review_committee_members_job_id ON public.job_review_committee_members(job_id);
CREATE INDEX idx_job_review_committee_members_user_id ON public.job_review_committee_members(user_id);