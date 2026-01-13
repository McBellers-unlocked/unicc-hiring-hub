-- Add columns to users table for affiliate personnel management
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS personnel_type TEXT DEFAULT 'Staff',
  ADD COLUMN IF NOT EXISTS affiliate_type TEXT,
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS staff_number TEXT;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_users_personnel_type ON users(personnel_type);
CREATE INDEX IF NOT EXISTS idx_users_affiliate_type ON users(affiliate_type);
CREATE INDEX IF NOT EXISTS idx_users_contract_end_date ON users(contract_end_date);

-- Add comment for documentation
COMMENT ON COLUMN users.personnel_type IS 'Main classification: Staff or Affiliate';
COMMENT ON COLUMN users.affiliate_type IS 'Sub-type for affiliates: IC, Intern, UNV';
COMMENT ON COLUMN users.contract_start_date IS 'Contract start date for affiliate personnel';
COMMENT ON COLUMN users.contract_end_date IS 'Contract end date for affiliate personnel';