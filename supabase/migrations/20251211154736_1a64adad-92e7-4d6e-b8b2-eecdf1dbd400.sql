-- Mark existing staff candidate profiles as Internal and set UN experience
UPDATE candidates 
SET candidate_type = 'Internal',
    un_experience = true
WHERE email IN (
  SELECT c.email FROM candidates c
  JOIN users u ON LOWER(c.email) = LOWER(u.email)
  WHERE u.role != 'Candidate'
);