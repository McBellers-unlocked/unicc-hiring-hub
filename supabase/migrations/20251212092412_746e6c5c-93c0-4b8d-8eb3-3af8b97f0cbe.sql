-- Add reply configuration columns to assessment_emails table
ALTER TABLE public.assessment_emails
ADD COLUMN reply_enabled boolean DEFAULT false,
ADD COLUMN reply_mode text DEFAULT 'ai' CHECK (reply_mode IN ('ai', 'pre_written')),
ADD COLUMN reply_style text DEFAULT 'clarification' CHECK (reply_style IN ('clarification', 'new_info', 'push_back', 'escalate', 'urgency')),
ADD COLUMN reply_ai_prompt text,
ADD COLUMN reply_pre_written text,
ADD COLUMN reply_delay_min integer DEFAULT 4,
ADD COLUMN reply_delay_max integer DEFAULT 8;

-- Create assessment_email_threads table for conversation threading
CREATE TABLE public.assessment_email_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id uuid NOT NULL REFERENCES public.assessment_slots(id) ON DELETE CASCADE,
  original_email_id uuid NOT NULL REFERENCES public.assessment_emails(id) ON DELETE CASCADE,
  parent_message_id uuid REFERENCES public.assessment_email_threads(id) ON DELETE SET NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('original', 'candidate', 'system_reply')),
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  scheduled_for timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.assessment_email_threads ENABLE ROW LEVEL SECURITY;

-- RLS policies for assessment_email_threads
CREATE POLICY "Admin and HR can manage email threads"
ON public.assessment_email_threads
FOR ALL
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

CREATE POLICY "Staff can view email threads"
ON public.assessment_email_threads
FOR SELECT
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role)
);

CREATE POLICY "Candidates can insert their responses"
ON public.assessment_email_threads
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Candidates can view threads for their slot"
ON public.assessment_email_threads
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_email_threads_slot_email ON public.assessment_email_threads(slot_id, original_email_id);
CREATE INDEX idx_email_threads_scheduled ON public.assessment_email_threads(scheduled_for) WHERE scheduled_for IS NOT NULL;