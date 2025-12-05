-- Drop the problematic policy that causes recursive RLS issues
DROP POLICY IF EXISTS "Managers can view their direct reports" ON public.users;

-- Create a SECURITY DEFINER function to safely get the current user's name
-- This bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_name()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name FROM public.users WHERE id = auth.uid()
$$;

-- Recreate the policy using the safe function
CREATE POLICY "Managers can view their direct reports" 
ON public.users
FOR SELECT
USING (
  line_manager = public.get_current_user_name()
);