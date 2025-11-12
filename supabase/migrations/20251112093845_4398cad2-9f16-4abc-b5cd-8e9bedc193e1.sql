-- Add "Chief of HR" role to the user_role enum
-- This must be in its own transaction and committed before use
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Chief of HR';