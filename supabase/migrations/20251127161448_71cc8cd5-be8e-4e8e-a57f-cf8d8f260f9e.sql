-- Change hiring manager for 5 approved initial requests
-- From: hiringmanager@unicc.org (f7c6a2d4-eeab-4888-b014-b5d2e33a9db6)
-- To: arista@unicc.org (0020c65e-a2e0-4dac-a464-62a33f0477e0)

UPDATE job_requisitions
SET created_by = '0020c65e-a2e0-4dac-a464-62a33f0477e0'
WHERE created_by = 'f7c6a2d4-eeab-4888-b014-b5d2e33a9db6'
  AND initial_request_approved = true;