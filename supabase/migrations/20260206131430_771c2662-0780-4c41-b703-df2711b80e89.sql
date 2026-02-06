-- Affiliate lifecycle checklists table
CREATE TABLE affiliate_lifecycle_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_cycle_start DATE,
  contract_cycle_end DATE,
  next_contract_start DATE,
  stage TEXT NOT NULL,
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, contract_cycle_end, stage, item_key)
);

-- Enable RLS
ALTER TABLE affiliate_lifecycle_checklists ENABLE ROW LEVEL SECURITY;

-- Allow HR roles to manage
CREATE POLICY "HR can manage affiliate checklists" ON affiliate_lifecycle_checklists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('Admin', 'HR Assistant', 'Chief of HR')
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_affiliate_lifecycle_user_id ON affiliate_lifecycle_checklists(user_id);
CREATE INDEX idx_affiliate_lifecycle_stage ON affiliate_lifecycle_checklists(stage);