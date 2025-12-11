-- Fix Matthew Valente's candidate record with correct name from users table
UPDATE candidates 
SET name = u.name
FROM users u
WHERE LOWER(candidates.email) = LOWER(u.email)
  AND candidates.email = 'valente@unicc.org';