UPDATE public.users 
SET role = 'Admin'::user_role, updated_at = now()
WHERE email = 'valente@unicc.org';