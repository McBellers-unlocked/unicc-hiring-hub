-- Create email_send_log table for tracking all sent emails
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_slug TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_by UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  requisition_id UUID REFERENCES public.job_requisitions(id),
  application_id UUID REFERENCES public.applications(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

-- Admin and HR can view all email logs
CREATE POLICY "Admin and HR can view email logs"
  ON public.email_send_log
  FOR SELECT
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR 
    has_role(auth.uid(), 'HR Assistant'::user_role) OR 
    has_role(auth.uid(), 'Chief of HR'::user_role)
  );

-- System can insert email logs
CREATE POLICY "System can insert email logs"
  ON public.email_send_log
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_email_send_log_requisition ON public.email_send_log(requisition_id);
CREATE INDEX idx_email_send_log_application ON public.email_send_log(application_id);
CREATE INDEX idx_email_send_log_template ON public.email_send_log(template_slug);

-- Insert default PD reminder email template into existing system_settings table
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'email_template_pd_reminder',
  '{"subject": "Action Required: Complete Position Description for {{positionTitle}}", "from_email": "hr@unicconnect.org", "from_name": "UNICC Human Resources", "html_body": "<html><body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\"><div style=\"background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;\"><h1 style=\"color: white; margin: 0; font-size: 24px;\">UNICC Human Resources</h1></div><div style=\"background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;\"><p style=\"font-size: 16px; margin-bottom: 20px;\">Dear {{hiringManagerName}},</p><p style=\"margin-bottom: 20px;\">Your initial request for the following position has been approved:</p><div style=\"background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;\"><p style=\"margin: 5px 0;\"><strong>📋 Position:</strong> {{positionTitle}}</p><p style=\"margin: 5px 0;\"><strong>📌 Reference:</strong> {{referenceNumber}}</p><p style=\"margin: 5px 0;\"><strong>✅ Approved:</strong> {{approvalDate}}</p></div><p style=\"margin: 20px 0;\">The next step is to complete the full Position Description (PD). Please click below to continue:</p><div style=\"text-align: center; margin: 30px 0;\"><a href=\"{{pdLink}}\" style=\"background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;\">Continue Position Description →</a></div><p style=\"color: #666; font-size: 14px; margin-top: 30px;\">If you have any questions about completing the PD, please contact the HR team.</p><p style=\"margin-top: 30px;\">Best regards,<br><strong>UNICC Human Resources</strong></p></div><div style=\"text-align: center; padding: 20px; color: #666; font-size: 12px;\"><p>This is an automated message from the UNICC Recruitment Platform</p></div></body></html>", "text_body": "Dear {{hiringManagerName}},\\n\\nYour initial request for the following position has been approved:\\n\\n📋 Position: {{positionTitle}}\\n📌 Reference: {{referenceNumber}}\\n✅ Approved: {{approvalDate}}\\n\\nThe next step is to complete the full Position Description (PD). Please visit the following link to continue:\\n\\n{{pdLink}}\\n\\nIf you have any questions about completing the PD, please contact the HR team.\\n\\nBest regards,\\nUNICC Human Resources"}',
  'Email template for reminding hiring managers to complete their position description after initial approval'
) ON CONFLICT (key) DO NOTHING;