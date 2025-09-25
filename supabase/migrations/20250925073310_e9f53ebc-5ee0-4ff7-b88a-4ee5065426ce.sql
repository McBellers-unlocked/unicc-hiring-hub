-- Update eherrero's role to Admin
UPDATE public.users 
SET role = 'Admin'::user_role 
WHERE email = 'eherrero@unicc.org';