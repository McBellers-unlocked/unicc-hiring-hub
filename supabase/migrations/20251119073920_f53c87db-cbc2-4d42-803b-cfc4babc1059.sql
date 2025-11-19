-- Allow Director role to view and approve job requisitions

-- Update SELECT policy so Directors can see requisitions
ALTER POLICY "Staff can view requisitions" ON public.job_requisitions
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Hiring Manager'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR has_role(auth.uid(), 'Director'::user_role)
);

-- Update UPDATE policy so Directors can approve/reject requisitions
ALTER POLICY "Creators and approvers can update" ON public.job_requisitions
USING (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR has_role(auth.uid(), 'Director'::user_role)
  OR can_approve_as_chief(auth.uid(), id)
);
