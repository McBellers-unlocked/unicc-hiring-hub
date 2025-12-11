-- Delete orphan candidate records for staff users (who have no applications)
-- This cleans up duplicates where staff accidentally created candidate profiles
DELETE FROM candidates 
WHERE email IN (
  SELECT c.email 
  FROM candidates c
  JOIN users u ON LOWER(c.email) = LOWER(u.email)
  WHERE u.role != 'Candidate'
)
AND id NOT IN (
  SELECT DISTINCT candidate_id 
  FROM applications 
  WHERE candidate_id IS NOT NULL
);