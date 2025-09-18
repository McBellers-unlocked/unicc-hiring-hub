-- Update all jobs created from the specific requisition with properly formatted competencies
UPDATE jobs 
SET competencies = CONCAT(
  '# Core Competencies', E'\n\n',
  '- Setting an example', E'\n',
  '- Moving forward in a changing environment', E'\n\n',
  '# Management Competencies', E'\n\n',
  '- Building and promoting partnerships'
)
WHERE notice_no = 'REQ-2509-001-JOB' AND (competencies IS NULL OR competencies = '' OR competencies = 'No specific competencies defined');