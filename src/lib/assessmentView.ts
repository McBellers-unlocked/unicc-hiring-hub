export type AssessmentState = 'recommend' | 'review' | 'reject' | 'legacy' | 'unassessed';

export function latestAssessment<T extends { created_at?: string; id?: string }>(rows: T[] | T | null | undefined): T | null {
  if (!rows) return null;
  if (!Array.isArray(rows)) return rows;
  return [...rows].sort((a, b) => {
    const dateA = Date.parse(a.created_at || '') || 0;
    const dateB = Date.parse(b.created_at || '') || 0;
    return dateB - dateA || String(b.id || '').localeCompare(String(a.id || ''));
  })[0] || null;
}

export function assessmentCriteria(rubric: any): any[] {
  const rows = Array.isArray(rubric?.allCriteria) ? rubric.allCriteria : [
    ...(Array.isArray(rubric?.criteria) ? rubric.criteria : []),
    ...(Array.isArray(rubric?.educationScores) ? rubric.educationScores : rubric?.educationScore ? [rubric.educationScore] : []),
  ];
  const seen = new Set<string>();
  return rows.filter((row: any) => {
    if (!row) return false;
    const key = String(row.criterionId || `${row.category || 'essential'}:${row.criterionText}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Immutable runs are authoritative even if updating screening_scores failed. */
export function latestApplicationAssessment(application: any): any | null {
  const runs = Array.isArray(application?.assessment_runs) ? application.assessment_runs : [];
  if (runs.length) {
    const run = latestAssessment<any>(runs);
    return { ...run, assessment_run_id: run.id };
  }
  return latestAssessment<any>(application?.screening_scores);
}

const labels: Record<AssessmentState, string> = {
  recommend: 'AI: evidence supports inclusion',
  review: 'AI: review needed',
  reject: 'AI: gate not met',
  legacy: 'Reassessment required',
  unassessed: 'Not assessed',
};

export function getAssessmentView(score: any) {
  const selected = latestAssessment<any>(score);
  const rubric = selected?.rubric_breakdown;
  const criteria = assessmentCriteria(rubric);
  const assessmentId = selected?.assessment_run_id || rubric?.assessmentId || null;
  const version = String(rubric?.pipeline_version || selected?.pipeline_version || rubric?.analysisVersion || '');
  const manual = version === 'manual-1' || rubric?.assessment_kind === 'manual';
  const current = Number.parseInt(version, 10) >= 5 && !!assessmentId;
  const state: AssessmentState = !selected || manual ? 'unassessed' : !current ? 'legacy' :
    ['recommend', 'review', 'reject'].includes(rubric?.recommendation) ? rubric.recommendation : 'review';
  const unresolved = criteria.filter((c: any) => c.status === 'insufficient_evidence' || c.status === 'assessment_unavailable').length;
  return {
    score: selected, rubric, criteria, assessmentId, state, current, manual,
    label: manual ? 'Manual review · no AI recommendation' : labels[state], unresolved,
    badgeClass: state === 'recommend' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
      state === 'reject' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-amber-50 text-amber-900 border-amber-200',
  };
}

export function reviewPriority(score: any): number {
  const state = getAssessmentView(score).state;
  return { review: 0, legacy: 1, unassessed: 2, reject: 3, recommend: 4 }[state];
}

export const EVIDENCE_STATUS_LABELS: Record<string, string> = {
  supported: 'Evidence supports requirement',
  contradicted: 'Evidence contradicts requirement',
  insufficient_evidence: 'More evidence needed',
  assessment_unavailable: 'Assessment unavailable',
};
