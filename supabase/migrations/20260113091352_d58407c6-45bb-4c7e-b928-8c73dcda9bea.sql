-- Allow Directors to view committee members for jobs with pending committee approval
CREATE POLICY "Directors can view committee members for pending approvals"
ON public.job_review_committee_members
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'Director'::user_role)
  AND EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_review_committee_members.job_id
      AND j.review_committee_status = 'pending_approval'
  )
);