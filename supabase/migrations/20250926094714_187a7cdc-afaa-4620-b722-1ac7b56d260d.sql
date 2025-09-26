-- Update the gender for Alberto Navas to 'Male' (the only male applicant so far)
UPDATE candidates 
SET gender = 'Male' 
WHERE name = 'Alberto Navas';

-- Update all other candidates in the Associate Policy Legal Officer applications to 'Female'
UPDATE candidates 
SET gender = 'Female' 
WHERE id IN (
  SELECT DISTINCT c.id 
  FROM candidates c
  JOIN applications a ON c.id = a.candidate_id
  JOIN jobs j ON a.job_id = j.id
  WHERE j.title LIKE '%Associate Policy (Legal) Officer%'
  AND c.name != 'Alberto Navas'
);