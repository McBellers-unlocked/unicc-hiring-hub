-- Fix the audit log trigger to properly cast entity_id as UUID
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
    NEW.application_id, -- This is already a UUID, no need to cast to text
    json_build_object('stage', OLD.from_stage),
    json_build_object('stage', NEW.to_stage, 'reason', NEW.reason)
  );
  RETURN NEW;
END;
$$;