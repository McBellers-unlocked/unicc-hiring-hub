-- Update the user role to Admin for the specified email
-- This will be run after the user account is created in the Supabase dashboard
UPDATE public.users 
SET role = 'Admin'::user_role 
WHERE email = 'eherrero@unicc.org';