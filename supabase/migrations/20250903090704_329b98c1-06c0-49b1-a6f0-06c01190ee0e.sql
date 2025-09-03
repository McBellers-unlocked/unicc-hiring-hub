-- Enhanced audit logging for stage changes, emails, and permissions

-- Create function to log stage changes
CREATE OR REPLACE FUNCTION public.log_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, before, after)
  VALUES (
    auth.uid(),
    'STAGE_CHANGE',
    'applications',
    NEW.application_id::text,
    json_build_object('stage', OLD.from_stage),
    json_build_object('stage', NEW.to_stage, 'reason', NEW.reason)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for stage changes
CREATE TRIGGER stage_change_audit_trigger
  AFTER INSERT ON public.stage_events
  FOR EACH ROW
  EXECUTE FUNCTION public.log_stage_change();

-- Create function to log email sends
CREATE OR REPLACE FUNCTION public.log_email_sent(
  p_actor_id UUID,
  p_recipient TEXT,
  p_subject TEXT,
  p_template TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, after)
  VALUES (
    p_actor_id,
    'EMAIL_SENT',
    'email_communications',
    gen_random_uuid()::text,
    json_build_object(
      'recipient', p_recipient,
      'subject', p_subject,
      'template', p_template
    )
  );
END;
$$;

-- Create function to log permission changes
CREATE OR REPLACE FUNCTION public.log_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, before, after)
    VALUES (
      auth.uid(),
      'PERMISSION_CHANGE',
      'users',
      NEW.id::text,
      json_build_object('role', OLD.role),
      json_build_object('role', NEW.role)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for permission changes
CREATE TRIGGER permission_change_audit_trigger
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_permission_change();

-- Add metadata column to audit_logs if it doesn't exist
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_at ON public.audit_logs(at DESC);