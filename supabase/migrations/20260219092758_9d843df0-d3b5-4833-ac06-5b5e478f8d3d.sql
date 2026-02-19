ALTER TABLE hr_transfers 
  ADD COLUMN IF NOT EXISTS new_job_title text,
  ADD COLUMN IF NOT EXISTS new_grade text,
  ADD COLUMN IF NOT EXISTS new_contract_type text;