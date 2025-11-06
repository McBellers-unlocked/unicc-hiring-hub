-- Update arista@unicc.org to Admin role
UPDATE public.users 
SET role = 'Admin' 
WHERE email = 'arista@unicc.org';