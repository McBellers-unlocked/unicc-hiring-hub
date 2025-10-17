-- Update valente@unicc.org to Hiring Manager role
UPDATE public.users 
SET role = 'Hiring Manager'::user_role,
    updated_at = now()
WHERE email = 'valente@unicc.org';