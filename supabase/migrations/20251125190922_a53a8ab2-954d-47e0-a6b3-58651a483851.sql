-- Create panel_interview_invitations table to track candidate invitations
CREATE TABLE panel_interview_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, booked, expired, cancelled
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline_at TIMESTAMPTZ,
  booked_slot_id UUID REFERENCES panel_interview_time_slots(id) ON DELETE SET NULL,
  booked_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(application_id) -- One invitation per application
);

-- Enable RLS
ALTER TABLE panel_interview_invitations ENABLE ROW LEVEL SECURITY;

-- Candidates can view their own invitations
CREATE POLICY "Candidates can view their own invitations" ON panel_interview_invitations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM applications a 
    JOIN candidates c ON c.id = a.candidate_id 
    WHERE a.id = application_id AND c.email = (auth.jwt() ->> 'email')
  )
);

-- Candidates can update their own invitations (for booking)
CREATE POLICY "Candidates can update their own invitations" ON panel_interview_invitations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM applications a 
    JOIN candidates c ON c.id = a.candidate_id 
    WHERE a.id = application_id AND c.email = (auth.jwt() ->> 'email')
  )
);

-- Staff can manage invitations
CREATE POLICY "Staff can manage invitations" ON panel_interview_invitations
FOR ALL USING (
  has_role(auth.uid(), 'Admin') OR 
  has_role(auth.uid(), 'HR Assistant') OR 
  has_role(auth.uid(), 'Chief of HR') OR
  has_role(auth.uid(), 'Hiring Manager')
);

-- Add trigger for updated_at
CREATE TRIGGER update_panel_interview_invitations_updated_at
BEFORE UPDATE ON panel_interview_invitations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();