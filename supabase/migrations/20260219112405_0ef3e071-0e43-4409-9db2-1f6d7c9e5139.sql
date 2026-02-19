
-- Drop the overly restrictive existing ALL policy
DROP POLICY IF EXISTS "HR users can manage appointments" ON public.hr_appointments;

-- Re-create: Admin/HR-only policy for mutations (INSERT, UPDATE, DELETE)
CREATE POLICY "HR staff can manage appointments"
  ON public.hr_appointments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = ANY (ARRAY['Admin'::user_role, 'HR Assistant'::user_role, 'Chief of HR'::user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = ANY (ARRAY['Admin'::user_role, 'HR Assistant'::user_role, 'Chief of HR'::user_role])
    )
  );

-- Broader SELECT policy: includes Hiring Manager and Director (mirrors hr_separations)
CREATE POLICY "HR and Hiring Managers can view appointments"
  ON public.hr_appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = ANY (ARRAY[
          'Admin'::user_role,
          'HR Assistant'::user_role,
          'Chief of HR'::user_role,
          'Hiring Manager'::user_role,
          'Director'::user_role
        ])
    )
  );
