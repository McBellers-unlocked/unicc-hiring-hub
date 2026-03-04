
-- 1. Create a SECURITY DEFINER function to get current user's division (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_division()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT division FROM public.users WHERE id = auth.uid()
$$;

-- 2. Drop the overly broad Director policy (currently gives access to ALL users)
DROP POLICY IF EXISTS "Directors can view users" ON public.users;

-- 3. Recreate: Directors can view users in their own division + their own profile
CREATE POLICY "Directors can view division users"
ON public.users
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'Director'::user_role)
  AND (
    id = auth.uid()
    OR division = get_current_user_division()
  )
);

-- 4. Drop the overly broad Division chiefs policy (currently gives access to ALL users)
DROP POLICY IF EXISTS "Division chiefs can view users" ON public.users;

-- 5. Recreate: Division chiefs can view users in their own division
CREATE POLICY "Division chiefs can view division users"
ON public.users
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email'::text) IN (
    'soni@unicc.org', 'liuzzi@unicc.org', 'sethi@unicc.org',
    'negyesi@unicc.org', 'grecuccio@unicc.org'
  )
  AND (
    id = auth.uid()
    OR division = get_current_user_division()
  )
);

-- 6. Add policy: Staff can view co-panelists on jobs they're involved with
CREATE POLICY "Staff can view job panel co-members"
ON public.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM job_interview_panel_members pm1
    JOIN job_interview_panel_members pm2 ON pm1.job_id = pm2.job_id
    WHERE pm1.user_id = auth.uid()
      AND pm2.user_id = users.id
  )
);
