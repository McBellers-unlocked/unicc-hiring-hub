-- Update petkov@unicc.org and garciaz@unicc.org to be Hiring Managers
UPDATE public.users 
SET role = 'Hiring Manager'::user_role 
WHERE email IN ('petkov@unicc.org', 'garciaz@unicc.org');