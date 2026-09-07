export type FindingStatus = 'supported' | 'contradicted' | 'insufficient_evidence' | 'assessment_unavailable';
export interface AssessmentSource { id: string; kind: string; label: string; text: string; recordIndex?: number }
export interface AssessmentEvidence { source?: string; quote: string; sourceId?: string; startOffset?: number; endOffset?: number }
export const FINDING_LABELS: Record<FindingStatus, string> = {
  supported: 'Evidence supports requirement', contradicted: 'Evidence contradicts requirement',
  insufficient_evidence: 'More evidence needed', assessment_unavailable: 'Assessment unavailable',
};
export function findingStatus(value: unknown): FindingStatus {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(FINDING_LABELS, value) ? value as FindingStatus : 'assessment_unavailable';
}
// Only an exact quote at its saved location can open as highlighted evidence.
// Never substitute another document or the candidate's live profile.
export function locateEvidence(sources: AssessmentSource[], evidence: AssessmentEvidence) {
  const matchingSources = sources.filter(item => item.id === evidence.sourceId);
  const source = matchingSources.length === 1 ? matchingSources[0] : undefined;
  const start = evidence.startOffset, end = evidence.endOffset;
  if (!source || !evidence.quote || !Number.isInteger(start) || !Number.isInteger(end) ||
      start! < 0 || end! <= start! || end! > source.text.length || source.text.slice(start, end) !== evidence.quote) return null;
  return { source, start: start!, end: end! };
}
export function normalizeSources(value: unknown): AssessmentSource[] {
  if (!Array.isArray(value)) return [];
  const valid = value.filter((s): s is AssessmentSource => !!s && typeof s.id === 'string' && !!s.id && typeof s.text === 'string' && typeof s.label === 'string');
  return valid.filter(source => valid.filter(other => other.id === source.id).length === 1)
    .map(source => ({ ...source, kind: typeof source.kind === 'string' && source.kind ? source.kind : 'application' }));
}

export function evidenceFromSelectedRange(source: AssessmentSource, start: number, end: number, quote: string): AssessmentEvidence | null {
  if (!quote.trim()) return null;
  const evidence: AssessmentEvidence = { source: source.kind, sourceId: source.id, startOffset: start, endOffset: end, quote };
  return locateEvidence([source], evidence) ? evidence : null;
}
