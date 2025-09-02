-- Update user role to Admin for mattvalente85@gmail.com
UPDATE public.users 
SET role = 'Admin' 
WHERE email = 'mattvalente85@gmail.com';