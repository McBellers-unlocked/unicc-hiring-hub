-- Add verification token column for secure access (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_email_alerts' AND column_name = 'verification_token') THEN
        ALTER TABLE job_email_alerts ADD COLUMN verification_token TEXT DEFAULT encode(gen_random_bytes(32), 'base64url');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_email_alerts' AND column_name = 'verified') THEN
        ALTER TABLE job_email_alerts ADD COLUMN verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_job_email_alerts_verification_token ON job_email_alerts(verification_token);

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create email alerts" ON job_email_alerts;
DROP POLICY IF EXISTS "Anyone can delete their own alerts" ON job_email_alerts;
DROP POLICY IF EXISTS "Anyone can update their own alerts" ON job_email_alerts;
DROP POLICY IF EXISTS "Anyone can view their own alerts by email" ON job_email_alerts;

-- Create secure RLS policies

-- Allow creating alerts (but they start unverified)
CREATE POLICY "Allow creating email alerts"
ON job_email_alerts
FOR INSERT
WITH CHECK (true);

-- Only allow staff to view all alerts for management purposes
CREATE POLICY "Staff can view all alerts"
ON job_email_alerts
FOR SELECT
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role)
);

-- Only allow staff to update alerts
CREATE POLICY "Staff can update alerts"
ON job_email_alerts
FOR UPDATE
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role)
);

-- Only allow staff to delete alerts
CREATE POLICY "Staff can delete alerts"
ON job_email_alerts
FOR DELETE
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role)
);