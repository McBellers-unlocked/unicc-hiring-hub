UPDATE users 
SET role = 'Admin'::user_role, 
    updated_at = now()
WHERE email = 'laval@unicc.org';