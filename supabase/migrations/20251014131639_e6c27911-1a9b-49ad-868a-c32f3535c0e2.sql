-- Link the approved requisition to the correct published job
UPDATE job_requisitions 
SET 
  converted_to_job_id = '0d163431-012f-428d-98c0-9d0e09426833',
  status = 'converted'
WHERE id = 'ce06b5d9-5a68-41d3-876d-07fd4e152601';