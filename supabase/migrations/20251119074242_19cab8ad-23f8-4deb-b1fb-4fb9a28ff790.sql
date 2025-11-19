-- Allow Directors to view users table (needed for creator info in requisitions)

CREATE POLICY "Directors can view users"
ON public.users
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'Director'::user_role)
  OR auth.uid() = id
);
