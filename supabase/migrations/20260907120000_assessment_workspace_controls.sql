-- Retain each assessment and each human decision separately. No historical
-- screening_scores or scoring_review_feedback rows are rewritten by this migration.
BEGIN;

CREATE TABLE public.assessment_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id),
  rubric_breakdown jsonb NOT NULL,
  pipeline_version text NOT NULL,
  prompt_version text NOT NULL,
  model_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, application_id)
);
CREATE INDEX assessment_runs_application_created ON public.assessment_runs(application_id, created_at DESC, id DESC);
CREATE FUNCTION public.lock_assessment_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  PERFORM 1 FROM public.applications WHERE id = NEW.application_id FOR UPDATE;
  NEW.created_at := clock_timestamp();
  RETURN NEW;
END; $$;
CREATE TRIGGER lock_assessment_application BEFORE INSERT ON public.assessment_runs
  FOR EACH ROW EXECUTE FUNCTION public.lock_assessment_application();
ALTER TABLE public.screening_scores ADD COLUMN assessment_run_id uuid;
ALTER TABLE public.screening_scores ADD CONSTRAINT screening_scores_assessment_run_application_fk
  FOREIGN KEY (assessment_run_id, application_id) REFERENCES public.assessment_runs(id, application_id);

CREATE TABLE public.assessment_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id),
  assessment_run_id uuid NOT NULL,
  criterion_id text,
  criterion_text text,
  event_type text NOT NULL CHECK (event_type IN ('correction', 'disagreement', 'resolution', 'application_decision')),
  decision text NOT NULL CHECK (decision IN ('supported', 'contradicted', 'insufficient_evidence', 'assessment_unavailable', 'included', 'excluded', 'needs_clarification')),
  rationale text NOT NULL CHECK (length(btrim(rationale)) > 0),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence) = 'array'),
  reviewer_id uuid NOT NULL REFERENCES public.users(id),
  reviewer_name text NOT NULL,
  resolves_event_id uuid REFERENCES public.assessment_review_events(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  transaction_id bigint NOT NULL DEFAULT txid_current(),
  FOREIGN KEY (assessment_run_id, application_id) REFERENCES public.assessment_runs(id, application_id),
  CHECK ((event_type = 'application_decision' AND criterion_id IS NULL AND decision IN ('included', 'excluded', 'needs_clarification'))
    OR (event_type <> 'application_decision' AND criterion_id IS NOT NULL AND decision IN ('supported', 'contradicted', 'insufficient_evidence', 'assessment_unavailable'))),
  CHECK ((event_type = 'resolution') = (resolves_event_id IS NOT NULL))
);
CREATE INDEX assessment_review_events_application ON public.assessment_review_events(application_id, created_at DESC);
CREATE UNIQUE INDEX assessment_review_events_one_resolution ON public.assessment_review_events(resolves_event_id) WHERE resolves_event_id IS NOT NULL;
ALTER TABLE public.applications ADD COLUMN human_decision_event_id uuid REFERENCES public.assessment_review_events(id);

CREATE FUNCTION public.can_review_assessment(p_application_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.applications a WHERE a.id = p_application_id AND (
      public.has_role(auth.uid(), 'Admin'::public.user_role)
      OR public.has_role(auth.uid(), 'HR Assistant'::public.user_role)
      OR public.has_role(auth.uid(), 'Chief of HR'::public.user_role)
      OR public.is_job_hiring_manager(auth.uid(), a.job_id)
      OR EXISTS (SELECT 1 FROM public.job_interview_panel_members pm WHERE pm.job_id = a.job_id AND pm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.job_review_committee_members cm WHERE cm.job_id = a.job_id AND cm.user_id = auth.uid())
    )
  );
$$;

CREATE FUNCTION public.is_assessment_decision_maker()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'Admin'::public.user_role)
    OR public.has_role(auth.uid(), 'HR Assistant'::public.user_role)
    OR public.has_role(auth.uid(), 'Chief of HR'::public.user_role)
  );
$$;

ALTER TABLE public.assessment_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_review_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assigned reviewers read assessment runs" ON public.assessment_runs
  FOR SELECT TO authenticated USING (public.can_review_assessment(application_id));
CREATE POLICY "Assigned reviewers read assessment decisions" ON public.assessment_review_events
  FOR SELECT TO authenticated USING (public.can_review_assessment(application_id));
REVOKE ALL ON public.assessment_runs, public.assessment_review_events FROM anon, authenticated;
REVOKE ALL ON public.assessment_runs, public.assessment_review_events FROM service_role;
GRANT SELECT ON public.assessment_runs, public.assessment_review_events TO authenticated;
GRANT SELECT ON public.assessment_runs TO service_role;
GRANT SELECT ON public.assessment_review_events TO service_role;

CREATE FUNCTION public.prevent_assessment_history_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN
  RAISE EXCEPTION 'Assessment history is append-only. Record a new event instead.' USING ERRCODE = '55000';
END; $$;
CREATE TRIGGER assessment_runs_immutable BEFORE UPDATE OR DELETE ON public.assessment_runs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_assessment_history_mutation();
CREATE TRIGGER assessment_review_events_immutable BEFORE UPDATE OR DELETE ON public.assessment_review_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_assessment_history_mutation();

-- Browser offsets are UTF-16 code units; PostgreSQL substring positions count
-- Unicode characters. Reject an offset that splits a surrogate pair.
CREATE FUNCTION public.assessment_utf16_slice(p_text text, p_start integer, p_end integer)
RETURNS text LANGUAGE plpgsql IMMUTABLE STRICT SET search_path = public
AS $$
DECLARE v_units integer := 0; v_start integer; v_end integer; i integer;
BEGIN
  IF p_start < 0 OR p_end <= p_start THEN RETURN NULL; END IF;
  FOR i IN 1..char_length(p_text) + 1 LOOP
    IF v_units = p_start THEN v_start := i; END IF;
    IF v_units = p_end THEN v_end := i; EXIT; END IF;
    IF i <= char_length(p_text) THEN
      v_units := v_units + CASE WHEN ascii(substring(p_text FROM i FOR 1)) > 65535 THEN 2 ELSE 1 END;
    END IF;
  END LOOP;
  IF v_start IS NULL OR v_end IS NULL THEN RETURN NULL; END IF;
  RETURN substring(p_text FROM v_start FOR v_end - v_start);
END; $$;

CREATE FUNCTION public.record_assessment_review(
  p_application_id uuid, p_assessment_run_id uuid, p_criterion_id text,
  p_decision text, p_reason text, p_event_type text DEFAULT 'correction',
  p_resolves_event_id uuid DEFAULT NULL, p_evidence jsonb DEFAULT '[]'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_run public.assessment_runs%ROWTYPE;
  v_event public.assessment_review_events%ROWTYPE;
  v_id uuid;
  v_name text;
  v_criterion_text text;
  v_evidence jsonb;
  v_source_text text;
BEGIN
  IF NOT public.can_review_assessment(p_application_id) THEN
    RAISE EXCEPTION 'You are not authorized to review this application.' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A rationale is required for every review.' USING ERRCODE = '22023';
  END IF;
  IF p_event_type NOT IN ('correction', 'disagreement', 'resolution') OR p_event_type IS NULL
    OR p_decision NOT IN ('supported', 'contradicted', 'insufficient_evidence', 'assessment_unavailable') OR p_decision IS NULL THEN
    RAISE EXCEPTION 'Invalid review action or finding.' USING ERRCODE = '22023';
  END IF;
  -- Serialize decisions/reviews for this application, including two resolutions.
  PERFORM 1 FROM public.applications WHERE id = p_application_id FOR UPDATE;
  SELECT * INTO v_run FROM public.assessment_runs WHERE id = p_assessment_run_id AND application_id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The assessment does not belong to this application.' USING ERRCODE = '22023';
  END IF;
  IF p_assessment_run_id IS DISTINCT FROM (SELECT id FROM public.assessment_runs WHERE application_id = p_application_id ORDER BY created_at DESC, id DESC LIMIT 1) THEN
    RAISE EXCEPTION 'A newer assessment is available. Reload before recording a review.' USING ERRCODE = '40001';
  END IF;
  SELECT c->>'criterionText' INTO v_criterion_text FROM jsonb_array_elements(COALESCE(v_run.rubric_breakdown->'allCriteria', v_run.rubric_breakdown->'criteria', '[]'::jsonb)) c
    WHERE c->>'criterionId' = p_criterion_id LIMIT 1;
  IF NOT FOUND AND p_event_type <> 'resolution' THEN
    RAISE EXCEPTION 'The criterion does not belong to this assessment.' USING ERRCODE = '22023';
  END IF;
  IF p_event_type = 'resolution' THEN
    SELECT * INTO v_event FROM public.assessment_review_events WHERE id = p_resolves_event_id;
    IF NOT FOUND OR v_event.event_type <> 'disagreement' OR v_event.application_id <> p_application_id
      OR v_event.criterion_id <> p_criterion_id THEN
      RAISE EXCEPTION 'Select an open disagreement for this criterion and assessment.' USING ERRCODE = '22023';
    END IF;
    IF NOT public.is_assessment_decision_maker() AND NOT EXISTS (
      SELECT 1 FROM public.applications a WHERE a.id = p_application_id AND public.is_job_hiring_manager(auth.uid(), a.job_id)
    ) THEN
      RAISE EXCEPTION 'HR or the assigned hiring manager must resolve a disagreement.' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.assessment_review_events WHERE resolves_event_id = p_resolves_event_id) THEN
      RAISE EXCEPTION 'This disagreement has already been resolved. Reload the review.' USING ERRCODE = '40001';
    END IF;
    v_criterion_text := COALESCE(v_criterion_text, v_event.criterion_text);
  ELSIF p_resolves_event_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only a resolution may link a disagreement.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_evidence) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Evidence must be source references.' USING ERRCODE = '22023'; END IF;
  IF p_decision IN ('supported','contradicted') AND jsonb_array_length(p_evidence) = 0 THEN
    RAISE EXCEPTION 'Select exact source evidence for a supported or contradicted finding, or record that more evidence is needed.' USING ERRCODE = '22023';
  END IF;
  FOR v_evidence IN SELECT value FROM jsonb_array_elements(p_evidence) LOOP
    SELECT s->>'text' INTO v_source_text FROM jsonb_array_elements(COALESCE(v_run.rubric_breakdown->'sources','[]'::jsonb)) s WHERE s->>'id' = v_evidence->>'sourceId' LIMIT 1;
    IF NOT FOUND OR jsonb_typeof(v_evidence->'sourceId') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_evidence->'quote') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_evidence->'startOffset') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_evidence->'endOffset') IS DISTINCT FROM 'number'
      OR (v_evidence->>'startOffset')::numeric <> trunc((v_evidence->>'startOffset')::numeric)
      OR (v_evidence->>'endOffset')::numeric <> trunc((v_evidence->>'endOffset')::numeric)
      OR COALESCE(length(v_evidence->>'quote'),0) = 0
      OR public.assessment_utf16_slice(v_source_text,(v_evidence->>'startOffset')::integer,(v_evidence->>'endOffset')::integer) IS DISTINCT FROM (v_evidence->>'quote') THEN
      RAISE EXCEPTION 'The evidence does not match an exact source passage in this assessment.' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  SELECT name INTO v_name FROM public.users WHERE id = auth.uid();
  INSERT INTO public.assessment_review_events(application_id, assessment_run_id, criterion_id, criterion_text, event_type, decision, rationale, reviewer_id, reviewer_name, resolves_event_id, evidence)
  VALUES (p_application_id, p_assessment_run_id, p_criterion_id, v_criterion_text, p_event_type, p_decision, btrim(p_reason), auth.uid(), COALESCE(v_name, 'Reviewer'), p_resolves_event_id, p_evidence)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE FUNCTION public.record_application_decision(
  p_application_id uuid, p_decision text, p_reason text,
  p_assessment_run_id uuid, p_rating text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_application public.applications%ROWTYPE;
  v_status public.application_status;
  v_id uuid;
  v_name text;
  v_run_id uuid := p_assessment_run_id;
BEGIN
  IF NOT public.is_assessment_decision_maker() THEN
    RAISE EXCEPTION 'Only HR may record a longlisting decision.' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A rationale is required for every inclusion, exclusion or clarification decision.' USING ERRCODE = '22023';
  END IF;
  IF p_decision NOT IN ('included', 'excluded', 'needs_clarification') OR p_decision IS NULL THEN
    RAISE EXCEPTION 'Invalid application decision.' USING ERRCODE = '22023';
  END IF;
  IF p_rating IS NOT NULL AND p_rating NOT IN ('eligible', 'tier_1', 'tier_2') THEN
    RAISE EXCEPTION 'Invalid longlist rating.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_application FROM public.applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found.' USING ERRCODE = '22023'; END IF;
  PERFORM 1 FROM public.jobs WHERE id = v_application.job_id FOR UPDATE;
  PERFORM 1 FROM public.job_requirements WHERE job_id = v_application.job_id FOR SHARE;
  IF v_application.status::text NOT IN ('Application', 'Screening', 'Longlist', 'Rejected') THEN
    RAISE EXCEPTION 'Use the current recruitment stage workflow for this application.' USING ERRCODE = '22023';
  END IF;
  IF v_run_id IS NULL THEN
    -- A human can decide when AI has never produced an assessment. A caller
    -- who omitted an existing AI run must reload, rather than silently use it.
    IF EXISTS (SELECT 1 FROM public.assessment_runs WHERE application_id = p_application_id AND pipeline_version <> 'manual-1') THEN
      RAISE EXCEPTION 'An AI assessment is available. Reload it before recording a decision.' USING ERRCODE = '40001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.assessment_runs WHERE application_id = p_application_id) THEN
      RAISE EXCEPTION 'A manual review snapshot is available. Reload and inspect it before recording a decision.' USING ERRCODE = '40001';
    END IF;
    v_run_id := public.create_manual_assessment_run(p_application_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.assessment_runs WHERE id = v_run_id AND application_id = p_application_id) THEN
    RAISE EXCEPTION 'A saved assessment for this application is required. Run an assessment first.' USING ERRCODE = '22023';
  END IF;
  IF v_run_id IS DISTINCT FROM (SELECT id FROM public.assessment_runs WHERE application_id = p_application_id ORDER BY created_at DESC, id DESC LIMIT 1) THEN
    RAISE EXCEPTION 'A newer assessment is available. Reload before recording a decision.' USING ERRCODE = '40001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.assessment_runs r WHERE r.id = v_run_id AND r.pipeline_version = 'manual-1'
    AND NOT public.assessment_inputs_match(p_application_id,r.rubric_breakdown)) THEN
    RAISE EXCEPTION 'The submitted application or criterion policy changed. Prepare and inspect a fresh manual review snapshot before deciding.' USING ERRCODE = '40001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.assessment_runs r WHERE r.id = v_run_id AND r.pipeline_version <> 'manual-1'
    AND NOT public.assessment_inputs_match(p_application_id, r.rubric_breakdown)) THEN
    RAISE EXCEPTION 'The application or criterion policy changed after this assessment. Assess the current version before deciding.' USING ERRCODE = '40001';
  END IF;
  IF p_decision <> 'needs_clarification' AND EXISTS (
    SELECT 1 FROM public.assessment_review_events e WHERE e.application_id = p_application_id
      AND e.event_type = 'disagreement'
      AND NOT EXISTS (SELECT 1 FROM public.assessment_review_events r WHERE r.resolves_event_id = e.id)
  ) THEN
    RAISE EXCEPTION 'Resolve the open reviewer disagreements or request clarification before deciding.' USING ERRCODE = '22023';
  END IF;
  v_status := CASE p_decision WHEN 'included' THEN 'Longlist'::public.application_status
    WHEN 'excluded' THEN 'Rejected'::public.application_status ELSE 'Application'::public.application_status END;
  SELECT name INTO v_name FROM public.users WHERE id = auth.uid();
  INSERT INTO public.assessment_review_events(application_id, assessment_run_id, event_type, decision, rationale, reviewer_id, reviewer_name)
  VALUES (p_application_id, v_run_id, 'application_decision', p_decision, btrim(p_reason), auth.uid(), COALESCE(v_name, 'Reviewer'))
  RETURNING id INTO v_id;
  UPDATE public.applications SET status = v_status,
    longlist_rating = CASE WHEN p_decision = 'included' THEN p_rating ELSE NULL END,
    human_decision_event_id = v_id
  WHERE id = p_application_id;
  INSERT INTO public.stage_events(application_id, from_stage, to_stage, by_user, reason)
  VALUES (p_application_id, v_application.status, v_status, auth.uid(), btrim(p_reason));
  RETURN v_id;
END; $$;

-- Existing clients cannot silently bypass the rationale/run linkage for an
-- early-stage include/exclude/reopen. Later interview workflows are unchanged.
CREATE FUNCTION public.guard_assessment_stage_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.status::text IN ('Application', 'Screening', 'Longlist', 'Rejected')
    AND NEW.status::text IN ('Application', 'Longlist', 'Rejected')
    AND NEW.status IS DISTINCT FROM OLD.status
    OR NEW.human_decision_event_id IS DISTINCT FROM OLD.human_decision_event_id THEN
    IF NEW.human_decision_event_id IS NULL OR NEW.human_decision_event_id IS NOT DISTINCT FROM OLD.human_decision_event_id
      OR NOT EXISTS (
        SELECT 1 FROM public.assessment_review_events e WHERE e.id = NEW.human_decision_event_id
          AND e.application_id = NEW.id AND e.event_type = 'application_decision'
          AND e.reviewer_id = auth.uid() AND e.transaction_id = txid_current()
          AND e.decision = CASE NEW.status::text WHEN 'Longlist' THEN 'included' WHEN 'Rejected' THEN 'excluded' ELSE 'needs_clarification' END
      ) THEN
      RAISE EXCEPTION 'Record this decision with a rationale against the latest assessment.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER guard_assessment_stage_decision BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_assessment_stage_decision();

ALTER TABLE public.job_requirements
  ADD COLUMN assessment_mode text CHECK (assessment_mode IN ('gate', 'weighted')),
  ADD COLUMN assessment_weight numeric NOT NULL DEFAULT 1 CHECK (assessment_weight > 0 AND assessment_weight <= 100),
  ADD COLUMN policy_approved_at timestamptz,
  ADD COLUMN policy_approved_by uuid REFERENCES public.users(id);

CREATE TABLE public.job_assessment_policy_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  criterion_snapshot jsonb NOT NULL,
  approved_by uuid NOT NULL REFERENCES public.users(id),
  approved_by_name text NOT NULL,
  rationale text NOT NULL CHECK (length(btrim(rationale)) > 0),
  transaction_id bigint NOT NULL DEFAULT txid_current(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_requirements ADD COLUMN policy_approval_event_id uuid REFERENCES public.job_assessment_policy_events(id);
ALTER TABLE public.job_assessment_policy_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assigned staff read criterion approvals" ON public.job_assessment_policy_events FOR SELECT TO authenticated
  USING (public.is_assessment_decision_maker() OR public.is_job_hiring_manager(auth.uid(), job_id));
REVOKE ALL ON public.job_assessment_policy_events FROM anon, authenticated;
REVOKE ALL ON public.job_assessment_policy_events FROM service_role;
GRANT SELECT ON public.job_assessment_policy_events TO authenticated;
GRANT SELECT ON public.job_assessment_policy_events TO service_role;
CREATE TRIGGER job_assessment_policy_events_immutable BEFORE UPDATE OR DELETE ON public.job_assessment_policy_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_assessment_history_mutation();

-- Any material criterion edit invalidates approval of the whole criterion set.
CREATE FUNCTION public.invalidate_assessment_policy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_job_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) - ARRAY['policy_approved_at','policy_approved_by','policy_approval_event_id']) = (to_jsonb(OLD) - ARRAY['policy_approved_at','policy_approved_by','policy_approval_event_id']) THEN
    RETURN NEW;
  END IF;
  v_job_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.job_id ELSE NEW.job_id END;
  UPDATE public.job_requirements SET policy_approved_at = NULL, policy_approved_by = NULL, policy_approval_event_id = NULL
    WHERE job_id = v_job_id AND (policy_approved_at IS NOT NULL OR policy_approved_by IS NOT NULL);
  IF TG_OP = 'UPDATE' AND OLD.job_id IS DISTINCT FROM NEW.job_id THEN
    UPDATE public.job_requirements SET policy_approved_at = NULL, policy_approved_by = NULL, policy_approval_event_id = NULL WHERE job_id = OLD.job_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER invalidate_assessment_policy AFTER INSERT OR UPDATE OR DELETE ON public.job_requirements
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_assessment_policy();

CREATE FUNCTION public.guard_assessment_policy_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  IF NEW.policy_approved_at IS NOT NULL AND (TG_OP = 'INSERT'
    OR NEW.policy_approved_at IS DISTINCT FROM OLD.policy_approved_at
    OR NEW.policy_approved_by IS DISTINCT FROM OLD.policy_approved_by
    OR NEW.policy_approval_event_id IS DISTINCT FROM OLD.policy_approval_event_id) THEN
    IF NEW.policy_approved_by IS DISTINCT FROM auth.uid() OR NOT EXISTS (
      SELECT 1 FROM public.job_assessment_policy_events e WHERE e.id = NEW.policy_approval_event_id
        AND e.job_id = NEW.job_id AND e.approved_by = auth.uid() AND e.transaction_id = txid_current()
    ) THEN RAISE EXCEPTION 'Approve the complete criterion policy with a rationale.' USING ERRCODE = '42501'; END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER guard_assessment_policy_approval BEFORE INSERT OR UPDATE ON public.job_requirements
  FOR EACH ROW EXECUTE FUNCTION public.guard_assessment_policy_approval();

CREATE FUNCTION public.approve_assessment_policy(p_job_id uuid, p_policies jsonb, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_item jsonb; v_req public.job_requirements%ROWTYPE; v_id uuid; v_now timestamptz := clock_timestamp(); v_name text;
BEGIN
  IF NOT public.is_assessment_decision_maker() AND NOT public.is_job_hiring_manager(auth.uid(), p_job_id) THEN
    RAISE EXCEPTION 'Only HR or the assigned hiring manager may approve these criteria.' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN RAISE EXCEPTION 'Explain the assessment policy before approving it.' USING ERRCODE = '22023'; END IF;
  IF jsonb_typeof(p_policies) IS DISTINCT FROM 'array' OR jsonb_array_length(p_policies) = 0 THEN
    RAISE EXCEPTION 'Select a nonempty complete criterion set.' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  PERFORM 1 FROM public.job_requirements WHERE job_id = p_job_id FOR UPDATE;
  IF (SELECT count(*) FROM public.job_requirements WHERE job_id = p_job_id) <> jsonb_array_length(p_policies)
    OR (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p_policies)) <> jsonb_array_length(p_policies) THEN
    RAISE EXCEPTION 'The criterion set changed. Reload it before approval.' USING ERRCODE = '40001';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_policies) LOOP
    SELECT * INTO v_req FROM public.job_requirements WHERE id = (v_item->>'id')::uuid AND job_id = p_job_id;
    IF NOT FOUND OR v_item->'expected' IS DISTINCT FROM jsonb_build_object(
      'title', v_req.title, 'description', v_req.description, 'category', v_req.category,
      'must_have', v_req.must_have, 'params', v_req.params, 'validator', v_req.validator, 'weight', v_req.weight, 'order_index', v_req.order_index,
      'assessment_mode', v_req.assessment_mode, 'assessment_weight', v_req.assessment_weight
    ) THEN RAISE EXCEPTION 'A criterion changed. Reload it before approval.' USING ERRCODE = '40001'; END IF;
    IF v_item->>'classification' NOT IN ('essential', 'desirable') OR v_item->>'classification' IS NULL
      OR v_item->>'assessment_mode' NOT IN ('gate', 'weighted') OR v_item->>'assessment_mode' IS NULL
      OR (v_item->>'assessment_weight')::numeric IS NULL OR (v_item->>'assessment_weight')::numeric <= 0 OR (v_item->>'assessment_weight')::numeric > 100 THEN
      RAISE EXCEPTION 'Every criterion needs a gate/weighted policy and a weight from 1 to 100.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.job_requirements SET assessment_mode = v_item->>'assessment_mode', assessment_weight = (v_item->>'assessment_weight')::numeric,
      category = CASE v_item->>'classification' WHEN 'essential' THEN 'Essential Criteria' ELSE 'Desirable Criteria' END,
      must_have = (v_item->>'classification' = 'essential') WHERE id = v_req.id;
  END LOOP;
  SELECT name INTO v_name FROM public.users WHERE id = auth.uid();
  INSERT INTO public.job_assessment_policy_events(job_id, criterion_snapshot, approved_by, approved_by_name, rationale)
  SELECT p_job_id, jsonb_agg(to_jsonb(r) || jsonb_build_object('policy_approved_at', v_now, 'policy_approved_by', auth.uid()) ORDER BY r.order_index, r.id), auth.uid(), COALESCE(v_name, 'Reviewer'), btrim(p_reason)
  FROM public.job_requirements r WHERE r.job_id = p_job_id RETURNING id INTO v_id;
  -- Approve only after all policy edits (which invalidate the prior set) finish.
  UPDATE public.job_requirements SET policy_approved_at = v_now, policy_approved_by = auth.uid(), policy_approval_event_id = v_id WHERE job_id = p_job_id;
  RETURN v_id;
END; $$;

CREATE FUNCTION public.add_assessment_education_criterion(p_job_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_level text; v_id uuid;
BEGIN
  IF NOT public.is_assessment_decision_maker() AND NOT public.is_job_hiring_manager(auth.uid(), p_job_id) THEN
    RAISE EXCEPTION 'Only HR or the assigned hiring manager may structure these criteria.' USING ERRCODE = '42501';
  END IF;
  SELECT essential_education_level INTO v_level FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(length(btrim(v_level)),0) = 0 THEN RAISE EXCEPTION 'This job has no separate education requirement.' USING ERRCODE = '22023'; END IF;
  SELECT id INTO v_id FROM public.job_requirements WHERE job_id = p_job_id AND params->>'assessment_source' = 'job_education_level' LIMIT 1;
  IF FOUND THEN RETURN v_id; END IF;
  INSERT INTO public.job_requirements(job_id,title,description,category,must_have,params,order_index)
  VALUES(p_job_id,'Education requirement','Required education: ' || v_level,'Essential Education',true,
    jsonb_build_object('assessment_source','job_education_level'),COALESCE((SELECT max(order_index)+1 FROM public.job_requirements WHERE job_id=p_job_id),0)) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE FUNCTION public.invalidate_job_education_policy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  IF NEW.essential_education_level IS DISTINCT FROM OLD.essential_education_level THEN
    UPDATE public.job_requirements SET description = 'Required education: ' || COALESCE(NEW.essential_education_level, 'Not specified')
      WHERE job_id = NEW.id AND params->>'assessment_source' = 'job_education_level';
    UPDATE public.job_requirements SET policy_approved_at = NULL, policy_approved_by = NULL, policy_approval_event_id = NULL WHERE job_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER invalidate_job_education_policy AFTER UPDATE OF essential_education_level ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_job_education_policy();

CREATE FUNCTION public.assessment_inputs_match(p_application_id uuid, p_rubric jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_app public.applications%ROWTYPE; v_snapshot jsonb; v_requirement public.job_requirements%ROWTYPE; v_job_level text;
BEGIN
  SELECT * INTO v_app FROM public.applications WHERE id = p_application_id;
  IF NOT FOUND OR p_rubric->>'jobId' IS DISTINCT FROM v_app.job_id::text
    OR jsonb_typeof(p_rubric->'rawCriteriaSnapshot') IS DISTINCT FROM 'array'
    OR ((p_rubric->'rawApplicationSnapshot') - 'submitted_at') IS DISTINCT FROM jsonb_build_object('phf_data',v_app.phf_data,'answers',v_app.answers,'phf_completed',COALESCE(v_app.phf_completed,false))
    OR (p_rubric #>> '{rawApplicationSnapshot,submitted_at}')::timestamptz IS DISTINCT FROM v_app.submitted_at THEN RETURN false; END IF;
  SELECT essential_education_level INTO v_job_level FROM public.jobs WHERE id = v_app.job_id;
  IF p_rubric->>'rawJobEducationLevel' IS DISTINCT FROM v_job_level THEN RETURN false; END IF;
  IF jsonb_array_length(p_rubric->'rawCriteriaSnapshot') <> (SELECT count(*) FROM public.job_requirements WHERE job_id = v_app.job_id)
    OR jsonb_array_length(p_rubric->'rawCriteriaSnapshot') <> (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p_rubric->'rawCriteriaSnapshot')) THEN RETURN false; END IF;
  FOR v_snapshot IN SELECT value FROM jsonb_array_elements(p_rubric->'rawCriteriaSnapshot') LOOP
    SELECT * INTO v_requirement FROM public.job_requirements WHERE job_id = v_app.job_id AND id::text = v_snapshot->>'id';
    IF NOT FOUND OR (v_snapshot - 'policy_approved_at') IS DISTINCT FROM jsonb_build_object(
      'id',v_requirement.id,'title',v_requirement.title,'description',v_requirement.description,'category',v_requirement.category,
      'must_have',v_requirement.must_have,'params',v_requirement.params,'validator',v_requirement.validator,'weight',v_requirement.weight,
      'order_index',v_requirement.order_index,'assessment_mode',v_requirement.assessment_mode,'assessment_weight',v_requirement.assessment_weight,
      'policy_approved_by',v_requirement.policy_approved_by
    ) OR (v_snapshot->>'policy_approved_at')::timestamptz IS DISTINCT FROM v_requirement.policy_approved_at THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END; $$;

CREATE FUNCTION public.create_manual_assessment_run(p_application_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid := gen_random_uuid(); v_app public.applications%ROWTYPE; v_raw jsonb; v_criteria jsonb; v_inputs jsonb; v_level text;
BEGIN
  SELECT * INTO v_app FROM public.applications WHERE id = p_application_id FOR UPDATE;
  SELECT essential_education_level INTO v_level FROM public.jobs WHERE id = v_app.job_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id',r.id,'title',r.title,'description',r.description,'category',r.category,'must_have',r.must_have,
      'params',r.params,'validator',r.validator,'weight',r.weight,'order_index',r.order_index,
      'assessment_mode',r.assessment_mode,'assessment_weight',r.assessment_weight,'policy_approved_at',r.policy_approved_at,'policy_approved_by',r.policy_approved_by
    ) ORDER BY r.order_index,r.id),'[]'::jsonb),
    COALESCE(jsonb_agg(jsonb_build_object('criterionId',r.id::text,'criterionText',COALESCE(NULLIF(r.description,''),r.title),
      'status','assessment_unavailable','category',CASE WHEN r.must_have OR lower(r.category) LIKE 'essential%' THEN 'essential' ELSE 'desirable' END,
      'assessmentMode',COALESCE(r.assessment_mode,CASE WHEN r.must_have OR lower(r.category) LIKE 'essential%' THEN 'gate' ELSE 'weighted' END),
      'assessmentWeight',r.assessment_weight,'subrequirements','[]'::jsonb
    ) ORDER BY r.order_index,r.id),'[]'::jsonb)
    INTO v_raw,v_criteria FROM public.job_requirements r WHERE r.job_id=v_app.job_id;
  v_inputs:=jsonb_build_object('phf_data',v_app.phf_data,'answers',v_app.answers,'phf_completed',COALESCE(v_app.phf_completed,false),'submitted_at',v_app.submitted_at);
  INSERT INTO public.assessment_runs(id,application_id,rubric_breakdown,pipeline_version,prompt_version,model_version)
  VALUES(v_id,p_application_id,jsonb_build_object(
    'assessmentId',v_id,'assessment_kind','manual','analysisVersion','manual-1','pipeline_version','manual-1','prompt_version','not-applicable','model_version','none',
    'recommendation','review','assessment_status','unassessed','summary','Human review only. No AI assessment was performed.',
    'allCriteria',v_criteria,'criteria',v_criteria,'rawCriteriaSnapshot',v_raw,'rawApplicationSnapshot',v_inputs,'rawJobEducationLevel',v_level,'jobId',v_app.job_id,
    'sources',jsonb_build_array(jsonb_build_object('id','submitted-application','kind','application','label','Submitted application snapshot (structured fields)','text',jsonb_pretty(v_inputs))),
    'scope',jsonb_build_object('assessedSourceIds','[]'::jsonb,'limitations',jsonb_build_array('No AI assessment was performed. The saved structured application is available for human review.','Candidate claims have not been independently verified.'))
  ),'manual-1','not-applicable','none');
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_manual_assessment_run(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.prepare_manual_assessment_snapshot(p_application_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_application public.applications%ROWTYPE; v_latest public.assessment_runs%ROWTYPE;
BEGIN
  IF NOT public.can_review_assessment(p_application_id) THEN
    RAISE EXCEPTION 'You are not authorized to review this application.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_application FROM public.applications WHERE id=p_application_id FOR UPDATE;
  PERFORM 1 FROM public.jobs WHERE id=v_application.job_id FOR UPDATE;
  PERFORM 1 FROM public.job_requirements WHERE job_id=v_application.job_id FOR SHARE;
  IF EXISTS(SELECT 1 FROM public.assessment_runs WHERE application_id=p_application_id AND pipeline_version<>'manual-1') THEN
    RAISE EXCEPTION 'An AI assessment exists for this application. Assess the current version before deciding.' USING ERRCODE = '40001';
  END IF;
  SELECT * INTO v_latest FROM public.assessment_runs WHERE application_id=p_application_id ORDER BY created_at DESC,id DESC LIMIT 1;
  IF FOUND AND public.assessment_inputs_match(p_application_id,v_latest.rubric_breakdown) THEN RETURN v_latest.id; END IF;
  RETURN public.create_manual_assessment_run(p_application_id);
END; $$;
REVOKE ALL ON FUNCTION public.prepare_manual_assessment_snapshot(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_manual_assessment_snapshot(uuid) TO authenticated;

-- The service persists the immutable run and latest-score projection in one
-- transaction, serializing against human decisions and other assessment saves.
CREATE FUNCTION public.save_assessment_run(p_application_id uuid, p_rubric_breakdown jsonb,
  p_pipeline_version text, p_prompt_version text, p_model_version text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid := COALESCE((p_rubric_breakdown->>'assessmentId')::uuid, gen_random_uuid()); v_rubric jsonb; v_created timestamptz;
BEGIN
  PERFORM 1 FROM public.applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found.' USING ERRCODE = '22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.applications WHERE id=p_application_id AND (status::text='Draft' OR phf_completed IS DISTINCT FROM true)) THEN
    RAISE EXCEPTION 'Only a submitted, completed application can receive an AI assessment.' USING ERRCODE = '22023';
  END IF;
  -- Lock the job row/criteria so a concurrent policy approval or insert cannot
  -- slip between input validation and persistence.
  PERFORM 1 FROM public.jobs WHERE id = (SELECT job_id FROM public.applications WHERE id = p_application_id) FOR UPDATE;
  PERFORM 1 FROM public.job_requirements WHERE job_id = (SELECT job_id FROM public.applications WHERE id = p_application_id) FOR SHARE;
  IF NOT public.assessment_inputs_match(p_application_id,p_rubric_breakdown) THEN
    RAISE EXCEPTION 'Assessment inputs changed during analysis. Reload and assess the current version.' USING ERRCODE = '40001';
  END IF;
  v_rubric := p_rubric_breakdown || jsonb_build_object('assessmentId',v_id);
  INSERT INTO public.assessment_runs(id,application_id,rubric_breakdown,pipeline_version,prompt_version,model_version)
    VALUES(v_id,p_application_id,v_rubric,p_pipeline_version,p_prompt_version,p_model_version) RETURNING created_at INTO v_created;
  INSERT INTO public.screening_scores(application_id,rubric_breakdown,ai_score,version,pipeline_version,model_version,prompt_version,created_at,assessment_run_id)
    VALUES(p_application_id,v_rubric,greatest(0,least(100,COALESCE((v_rubric->>'overallScore')::numeric,0))),p_pipeline_version,p_pipeline_version,p_model_version,p_prompt_version,v_created,v_id)
    ON CONFLICT(application_id,pipeline_version) DO UPDATE SET rubric_breakdown=EXCLUDED.rubric_breakdown,
      ai_score=EXCLUDED.ai_score,version=EXCLUDED.version,model_version=EXCLUDED.model_version,prompt_version=EXCLUDED.prompt_version,
      created_at=EXCLUDED.created_at,assessment_run_id=EXCLUDED.assessment_run_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.assessment_inputs_match(uuid,jsonb), public.save_assessment_run(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_assessment_run(uuid,jsonb,text,text,text) TO service_role;

-- Progress and score projections are written only by the backend. Earlier
-- policies named "System"/"Service role" were not actually role-scoped.
REVOKE INSERT, UPDATE, DELETE ON public.screening_scores FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.screening_scores TO service_role;
DROP POLICY IF EXISTS "System can create screening scores" ON public.screening_scores;
ALTER TABLE public.batch_scoring_jobs DROP CONSTRAINT IF EXISTS batch_scoring_jobs_status_check;
ALTER TABLE public.batch_scoring_jobs ADD CONSTRAINT batch_scoring_jobs_status_check CHECK(status IN ('pending','processing','completed','incomplete','failed'));
DROP POLICY IF EXISTS "Service role can manage batch scoring jobs" ON public.batch_scoring_jobs;
DROP POLICY IF EXISTS "Authenticated users can view batch scoring jobs" ON public.batch_scoring_jobs;
CREATE POLICY "Assigned staff read assessment progress" ON public.batch_scoring_jobs FOR SELECT TO authenticated
  USING(public.is_assessment_decision_maker() OR public.is_job_hiring_manager(auth.uid(),job_id));
REVOKE ALL ON public.batch_scoring_jobs FROM anon,authenticated;
GRANT SELECT ON public.batch_scoring_jobs TO authenticated;
GRANT ALL ON public.batch_scoring_jobs TO service_role;

REVOKE ALL ON FUNCTION public.can_review_assessment(uuid), public.is_assessment_decision_maker(),
  public.record_assessment_review(uuid,uuid,text,text,text,text,uuid,jsonb), public.record_application_decision(uuid,text,text,uuid,text),
  public.approve_assessment_policy(uuid,jsonb,text), public.add_assessment_education_criterion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review_assessment(uuid), public.is_assessment_decision_maker(),
  public.record_assessment_review(uuid,uuid,text,text,text,text,uuid,jsonb), public.record_application_decision(uuid,text,text,uuid,text),
  public.approve_assessment_policy(uuid,jsonb,text), public.add_assessment_education_criterion(uuid) TO authenticated;

COMMIT;
