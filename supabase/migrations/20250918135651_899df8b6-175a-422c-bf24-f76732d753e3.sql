-- Fix the log_permission_change function to properly handle UUID
CREATE OR REPLACE FUNCTION public.log_permission_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, before, after)
    VALUES (
      auth.uid(),
      'PERMISSION_CHANGE',
      'users',
      NEW.id,  -- Remove the ::text cast since entity_id is already UUID
      json_build_object('role', OLD.role),
      json_build_object('role', NEW.role)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Now update the user role
UPDATE users SET role = 'Hiring Manager' WHERE email = 'valente@unicc.org';