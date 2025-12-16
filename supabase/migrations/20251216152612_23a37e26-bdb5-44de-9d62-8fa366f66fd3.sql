-- Allow staff to view their supervisors via workplan relationships
CREATE POLICY "Staff can view their supervisors"
ON public.users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workplans w
    WHERE w.staff_id = auth.uid()
    AND (w.supervisor1_id = users.id OR w.supervisor2_id = users.id)
  )
);