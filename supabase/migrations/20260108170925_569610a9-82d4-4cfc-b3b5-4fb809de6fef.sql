-- Add closure columns to job_requisitions
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS closed_status TEXT;
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(id);
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS closure_reason TEXT;
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS postponed_until DATE;

COMMENT ON COLUMN job_requisitions.closed_status IS 'cancelled = permanently closed, postponed = temporarily paused';
COMMENT ON COLUMN job_requisitions.postponed_until IS 'Date when postponed requisition should be reviewed for reactivation';