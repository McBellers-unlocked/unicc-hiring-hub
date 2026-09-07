import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { FINDING_LABELS, type AssessmentEvidence } from '@/lib/assessmentEvidence';

export type AssessmentFinding = 'supported' | 'contradicted' | 'insufficient_evidence' | 'assessment_unavailable';
export type ApplicationDecision = 'included' | 'excluded' | 'needs_clarification';
export type ReviewEventType = 'correction' | 'disagreement' | 'resolution' | 'application_decision';

export const assessmentFindingLabels: Record<AssessmentFinding, string> = FINDING_LABELS;
export const applicationDecisionLabels: Record<ApplicationDecision, string> = {
  included: 'Include in longlist',
  excluded: 'Exclude from longlist',
  needs_clarification: 'Needs clarification',
};

export type AssessmentReviewEvent = {
  id: string;
  application_id: string;
  assessment_run_id: string;
  criterion_id: string | null;
  criterion_text: string | null;
  event_type: ReviewEventType;
  decision: AssessmentFinding | ApplicationDecision;
  rationale: string;
  evidence: AssessmentEvidence[];
  reviewer_id: string;
  reviewer_name: string;
  resolves_event_id: string | null;
  created_at: string;
  transaction_id: number;
}

export type AssessmentRun = {
  id: string;
  application_id: string;
  rubric_breakdown: Json;
  pipeline_version: string;
  prompt_version: string;
  model_version: string;
  created_at: string;
}

export type RequirementPolicy = Database['public']['Tables']['job_requirements']['Row'] & {
  assessment_mode: 'gate' | 'weighted' | null;
  assessment_weight: number;
  policy_approved_at: string | null;
  policy_approved_by: string | null;
  policy_approval_event_id: string | null;
}

export type PolicyApprovalEvent = {
  id: string;
  job_id: string;
  criterion_snapshot: Json;
  approved_by: string;
  approved_by_name: string;
  rationale: string;
  transaction_id: number;
  created_at: string;
}

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
// Keep the generated schema intact; this extension covers the new migration until
// the project's Supabase types are next regenerated.
type AssessmentDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables' | 'Functions'> & {
    Tables: Omit<Database['public']['Tables'], 'job_requirements'> & {
      job_requirements: Table<RequirementPolicy>;
      assessment_runs: Table<AssessmentRun>;
      assessment_review_events: Table<AssessmentReviewEvent>;
      job_assessment_policy_events: Table<PolicyApprovalEvent>;
    };
    Functions: Database['public']['Functions'] & {
      record_assessment_review: {
        Args: { p_application_id: string; p_assessment_run_id: string; p_criterion_id: string; p_decision: AssessmentFinding; p_reason: string; p_event_type: Exclude<ReviewEventType, 'application_decision'>; p_resolves_event_id?: string | null; p_evidence?: Json };
        Returns: string;
      };
      record_application_decision: {
        Args: { p_application_id: string; p_decision: ApplicationDecision; p_reason: string; p_assessment_run_id: string | null; p_rating?: string | null };
        Returns: string;
      };
      approve_assessment_policy: {
        Args: { p_job_id: string; p_policies: Json; p_reason: string };
        Returns: string;
      };
      add_assessment_education_criterion: { Args: { p_job_id: string }; Returns: string };
      prepare_manual_assessment_snapshot: { Args: { p_application_id: string }; Returns: string };
    };
  };
};

export const assessmentClient = supabase as unknown as SupabaseClient<AssessmentDatabase>;

export function reviewErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'The review could not be saved. Please try again.';
}

export async function loadAssessmentReviewEvents(applicationId: string) {
  const { data, error } = await assessmentClient.from('assessment_review_events')
    .select('*').eq('application_id', applicationId).order('created_at', { ascending: false }).order('id', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getLatestAssessmentRunId(applicationId: string): Promise<string | null> {
  const { data, error } = await assessmentClient.from('assessment_runs').select('id')
    .eq('application_id', applicationId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

export async function recordAssessmentReview(input: {
  applicationId: string; assessmentRunId: string; criterionId: string;
  decision: AssessmentFinding; reason: string;
  eventType: Exclude<ReviewEventType, 'application_decision'>; resolvesEventId?: string | null;
  evidence?: AssessmentEvidence[];
}) {
  if (!input.reason.trim()) throw new Error('Explain the evidence behind your finding.');
  const { data, error } = await assessmentClient.rpc('record_assessment_review', {
    p_application_id: input.applicationId, p_assessment_run_id: input.assessmentRunId,
    p_criterion_id: input.criterionId, p_decision: input.decision, p_reason: input.reason.trim(),
    p_event_type: input.eventType, p_resolves_event_id: input.resolvesEventId || null,
    p_evidence: (input.evidence || []).map(item => ({ sourceId: item.sourceId, startOffset: item.startOffset, endOffset: item.endOffset, quote: item.quote })) as Json,
  });
  if (error) throw error;
  return data;
}

export async function recordApplicationDecision(input: {
  applicationId: string; decision: ApplicationDecision; reason: string;
  assessmentRunId: string | null | undefined; rating?: string | null;
}) {
  if (!input.reason.trim()) throw new Error('A rationale is required for every decision.');
  const { data, error } = await assessmentClient.rpc('record_application_decision', {
    p_application_id: input.applicationId, p_decision: input.decision,
    p_reason: input.reason.trim(), p_assessment_run_id: input.assessmentRunId || null, p_rating: input.rating || null,
  });
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('application-decision-recorded', { detail: { applicationId: input.applicationId } }));
  return data;
}

export async function prepareManualAssessmentSnapshot(applicationId: string): Promise<string> {
  const { data, error } = await assessmentClient.rpc('prepare_manual_assessment_snapshot', { p_application_id: applicationId });
  if (error) throw error;
  return data;
}

export function openDisagreements(events: AssessmentReviewEvent[], assessmentId?: string) {
  const resolved = new Set(events.filter(e => e.event_type === 'resolution').map(e => e.resolves_event_id));
  return events.filter(e => e.event_type === 'disagreement' && !resolved.has(e.id));
}

export function defaultAssessmentMode(requirement: Pick<RequirementPolicy, 'category' | 'must_have' | 'assessment_mode'>): 'gate' | 'weighted' {
  if (requirement.assessment_mode) return requirement.assessment_mode;
  const category = requirement.category.toLowerCase().trim().replace(/[_-]/g, ' ').replace(/\s+/g, ' ');
  return !requirement.must_have && ['desirable', 'desirable criteria', 'desirable education', 'desirable experience'].includes(category) ? 'weighted' : 'gate';
}

export function requirementClassification(requirement: Pick<RequirementPolicy, 'category' | 'must_have'>): 'essential' | 'desirable' | '' {
  if (requirement.must_have) return 'essential';
  const category = requirement.category.toLowerCase().trim().replace(/[_-]/g, ' ').replace(/\s+/g, ' ');
  if (['essential', 'essential criteria', 'essential education', 'essential experience'].includes(category)) return 'essential';
  if (['desirable', 'desirable criteria', 'desirable education', 'desirable experience'].includes(category)) return 'desirable';
  return '';
}

export async function approveAssessmentPolicy(jobId: string, policies: Array<{
  requirement: RequirementPolicy; mode: 'gate' | 'weighted'; weight: number; classification: 'essential' | 'desirable' | '';
}>, reason: string) {
  if (!reason.trim()) throw new Error('Explain the assessment policy before approving it.');
  const payload = policies.map(({ requirement: r, mode, weight, classification }) => ({
    id: r.id, assessment_mode: mode, assessment_weight: weight, classification,
    expected: {
      title: r.title, description: r.description, category: r.category, must_have: r.must_have,
      params: r.params, validator: r.validator, weight: r.weight, order_index: r.order_index,
      assessment_mode: r.assessment_mode, assessment_weight: Number(r.assessment_weight),
    },
  }));
  const { data, error } = await assessmentClient.rpc('approve_assessment_policy', { p_job_id: jobId, p_policies: payload as Json, p_reason: reason.trim() });
  if (error) throw error;
  return data;
}
