-- Delete duplicate desirable criteria created at the later timestamp
DELETE FROM job_requirements
WHERE job_id = '9deaea12-c2c5-4c17-8899-a07cf938b0ba'
AND category = 'Desirable Criteria'
AND created_at = '2025-11-13 07:26:48.359021+00';