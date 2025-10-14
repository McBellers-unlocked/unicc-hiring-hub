-- Link the approved requisition to the published job
UPDATE job_requisitions 
SET 
  converted_to_job_id = '60be231a-9c20-4a11-91b1-111810c34d89',
  status = 'converted'
WHERE id = 'ce06b5d9-5a68-41d3-876d-07fd4e152601';