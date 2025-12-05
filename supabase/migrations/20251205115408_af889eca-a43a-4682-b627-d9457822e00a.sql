-- Allow managers to view their direct reports
CREATE POLICY "Managers can view their direct reports" 
ON public.users
FOR SELECT
USING (
  -- User's line_manager matches the current user's name
  line_manager = (SELECT name FROM public.users WHERE id = auth.uid())
);