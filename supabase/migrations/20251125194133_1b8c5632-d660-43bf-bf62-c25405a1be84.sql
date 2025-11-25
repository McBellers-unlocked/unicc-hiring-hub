-- Secure function for candidates to book an interview slot
CREATE OR REPLACE FUNCTION public.book_interview_slot(
  p_slot_id uuid,
  p_application_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slot panel_interview_time_slots%ROWTYPE;
  v_invitation panel_interview_invitations%ROWTYPE;
  v_candidate_id uuid;
  v_email text;
BEGIN
  -- Get email from JWT to avoid trusting client-passed identifiers
  v_email := auth.jwt()->>'email';

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify that the authenticated candidate owns this application
  SELECT c.id INTO v_candidate_id
  FROM public.applications a
  JOIN public.candidates c ON c.id = a.candidate_id
  WHERE a.id = p_application_id
    AND c.email = v_email;

  IF v_candidate_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get and lock the pending invitation for this application
  SELECT * INTO v_invitation
  FROM public.panel_interview_invitations
  WHERE application_id = p_application_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending invitation');
  END IF;

  -- Get and lock the slot, ensuring it belongs to the same job and is available
  SELECT * INTO v_slot
  FROM public.panel_interview_time_slots
  WHERE id = p_slot_id
    AND job_id = v_invitation.job_id
    AND status = 'available'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot not available');
  END IF;

  -- Mark the slot as booked for this application
  UPDATE public.panel_interview_time_slots
  SET status = 'booked',
      booked_by_application_id = p_application_id,
      updated_at = now()
  WHERE id = p_slot_id;

  -- Update the invitation to reflect the booked slot
  UPDATE public.panel_interview_invitations
  SET status = 'booked',
      booked_slot_id = p_slot_id,
      booked_at = now(),
      updated_at = now()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true);
END;
$function$;