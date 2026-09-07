import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, History, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AssessmentEvidence } from '@/lib/assessmentEvidence';
import {
  assessmentFindingLabels, applicationDecisionLabels, loadAssessmentReviewEvents,
  openDisagreements, recordAssessmentReview, recordApplicationDecision, reviewErrorMessage,
  type AssessmentFinding, type ApplicationDecision,
} from '@/lib/assessmentReview';

interface ReviewCriterion { criterionId: string; criterionText: string; status?: string }
export interface AssessmentReviewPanelProps {
  applicationId: string;
  assessmentId: string | null | undefined;
  criteria: ReviewCriterion[];
  readOnly?: boolean;
  evidenceSelection?: { criterionId: string; evidence: AssessmentEvidence } | null;
  onDecisionRecorded?: () => void;
}

export function AssessmentReviewPanel({ applicationId, assessmentId, criteria, readOnly = false, evidenceSelection, onDecisionRecorded }: AssessmentReviewPanelProps) {
  const { userRoles } = useAuth();
  const queryClient = useQueryClient();
  const [criterionId, setCriterionId] = useState('');
  const [finding, setFinding] = useState<AssessmentFinding>('insufficient_evidence');
  const [action, setAction] = useState<'correction' | 'disagreement' | 'resolution'>('correction');
  const [resolvesId, setResolvesId] = useState('');
  const [rationale, setRationale] = useState('');
  const [decision, setDecision] = useState<ApplicationDecision>('needs_clarification');
  const [decisionReason, setDecisionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState<Record<string, AssessmentEvidence[]>>({});
  const { data: events = [], isLoading, error: loadError } = useQuery({
    queryKey: ['assessment-review-events', applicationId],
    queryFn: () => loadAssessmentReviewEvents(applicationId),
  });
  const currentEvents = events.filter(event => event.assessment_run_id === assessmentId);
  const unresolved = useMemo(() => openDisagreements(events, assessmentId || ''), [events, assessmentId]);
  const reviewCriteria = [...criteria];
  for (const event of unresolved) {
    if (event.criterion_id && !reviewCriteria.some(item => item.criterionId === event.criterion_id)) {
      reviewCriteria.push({ criterionId: event.criterion_id, criterionText: `Prior criterion: ${event.criterion_text || event.criterion_id}`, status: 'assessment_unavailable' });
    }
  }
  const criterion = reviewCriteria.find(item => item.criterionId === criterionId);
  const isPriorCriterion = !!criterionId && !criteria.some(item => item.criterionId === criterionId);
  const currentFinding = currentEvents.find(event => event.criterion_id === criterionId && ['correction', 'resolution'].includes(event.event_type));
  const finalDecision = currentEvents.find(event => event.event_type === 'application_decision');
  const canDecide = userRoles.some(role => ['Admin', 'HR Assistant', 'Chief of HR'].includes(role));
  const canResolve = canDecide || userRoles.includes('Hiring Manager');
  const disabled = readOnly || !assessmentId || saving || !!loadError;
  const decisionDisabled = readOnly || saving || !!loadError;
  const evidence = selectedEvidence[criterionId] || [];
  const evidenceRequired = finding === 'supported' || finding === 'contradicted';

  useEffect(() => {
    setCriterionId(''); setRationale(''); setResolvesId(''); setError(''); setNotice('');
    setDecisionReason(''); setAction('correction');
    setSelectedEvidence({});
  }, [assessmentId, applicationId]);

  useEffect(() => {
    if (!evidenceSelection || readOnly) return;
    const { criterionId: selectedCriterion, evidence: selected } = evidenceSelection;
    setCriterionId(selectedCriterion);
    setSelectedEvidence(previous => {
      const existing = previous[selectedCriterion] || [];
      if (existing.some(item => item.sourceId === selected.sourceId && item.startOffset === selected.startOffset && item.endOffset === selected.endOffset)) return previous;
      return { ...previous, [selectedCriterion]: [...existing, selected] };
    });
  }, [evidenceSelection, readOnly]);

  useEffect(() => {
    const refresh = (event: Event) => {
      if ((event as CustomEvent<{ applicationId: string }>).detail?.applicationId === applicationId) {
        void queryClient.invalidateQueries({ queryKey: ['assessment-review-events', applicationId] });
      }
    };
    window.addEventListener('application-decision-recorded', refresh);
    return () => window.removeEventListener('application-decision-recorded', refresh);
  }, [applicationId, queryClient]);

  const saveReview = async () => {
    if (!assessmentId || !criterionId || readOnly) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await recordAssessmentReview({ applicationId, assessmentRunId: assessmentId, criterionId,
        decision: finding, reason: rationale, eventType: action, resolvesEventId: action === 'resolution' ? resolvesId : null, evidence });
      await queryClient.invalidateQueries({ queryKey: ['assessment-review-events', applicationId] });
      setRationale(''); setNotice('Review saved. The original AI finding remains in the assessment history.');
      if (action === 'resolution') { setAction('correction'); setResolvesId(''); }
    } catch (err) { setError(reviewErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const saveDecision = async () => {
    if (readOnly) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await recordApplicationDecision({ applicationId, assessmentRunId: assessmentId, decision, reason: decisionReason });
      await queryClient.invalidateQueries({ queryKey: ['assessment-review-events', applicationId] });
      setDecisionReason(''); setNotice('Recruiter decision saved with its rationale and assessment version.');
      onDecisionRecorded?.();
    } catch (err) { setError(reviewErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Human review & decision</CardTitle>
      <p className="text-sm text-muted-foreground">Record your interpretation of the evidence, resolve disagreements, and explain the recruiter’s decision. Each entry keeps its author and assessment version.</p>
    </CardHeader>
    <CardContent className="space-y-6">
      {(readOnly || !assessmentId) && <Alert><AlertDescription>{readOnly ? 'You are viewing a historical assessment. Select the latest assessment to record a review or decision.' : 'An HR decision remains available without AI. Recording it preserves the application and criterion snapshot and labels the assessment as human review only.'}</AlertDescription></Alert>}
      {(error || loadError) && <Alert variant="destructive"><AlertDescription>{error || reviewErrorMessage(loadError)}</AlertDescription></Alert>}
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      {unresolved.length > 0 && <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>{unresolved.length} open reviewer disagreement{unresolved.length === 1 ? '' : 's'}, including earlier assessment versions. HR or the assigned hiring manager must resolve them before inclusion or exclusion.</AlertDescription></Alert>}

      <div className="space-y-3">
        <h3 className="font-medium">Review a criterion</h3>
        <Select value={criterionId} onValueChange={value => { setCriterionId(value); setResolvesId(''); setAction(criteria.some(item => item.criterionId === value) ? 'correction' : 'resolution'); }} disabled={disabled}>
          <SelectTrigger aria-label="Criterion to review"><SelectValue placeholder="Choose a criterion" /></SelectTrigger>
          <SelectContent>{reviewCriteria.map(item => <SelectItem key={item.criterionId} value={item.criterionId}>{item.criterionText}</SelectItem>)}</SelectContent>
        </Select>
        {criterion && <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
          <p><span className="font-medium">Original AI finding:</span> {assessmentFindingLabels[criterion.status as AssessmentFinding] || 'Not available'}</p>
          <p><span className="font-medium">Latest human finding:</span> {currentFinding ? `${assessmentFindingLabels[currentFinding.decision as AssessmentFinding]} — ${currentFinding.reviewer_name}` : 'Not reviewed yet'}</p>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={action} onValueChange={value => { setAction(value as typeof action); setResolvesId(''); }} disabled={disabled || !criterionId}>
            <SelectTrigger aria-label="Review action"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="correction" disabled={isPriorCriterion}>Record human finding</SelectItem>
              <SelectItem value="disagreement" disabled={isPriorCriterion}>Raise disagreement</SelectItem>
              {canResolve && <SelectItem value="resolution">Resolve disagreement</SelectItem>}
            </SelectContent>
          </Select>
          <Select value={finding} onValueChange={value => setFinding(value as AssessmentFinding)} disabled={disabled || !criterionId}>
            <SelectTrigger aria-label="Human evidence finding"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(assessmentFindingLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {action === 'resolution' && <Select value={resolvesId} onValueChange={setResolvesId} disabled={disabled}>
          <SelectTrigger aria-label="Disagreement to resolve"><SelectValue placeholder="Choose an open disagreement" /></SelectTrigger>
          <SelectContent>{unresolved.filter(event => event.criterion_id === criterionId).map(event => <SelectItem key={event.id} value={event.id}>{event.reviewer_name}: {event.rationale}</SelectItem>)}</SelectContent>
        </Select>}
        {isPriorCriterion && <p className="text-sm text-muted-foreground">This criterion has changed or was removed. Explain explicitly how the earlier disagreement is resolved or why it is superseded by the current criteria.</p>}
        <div className="rounded-md border p-3 space-y-2">
          <p className="text-sm font-medium">Source evidence selected for this review</p>
          {evidence.length === 0 ? <p className="text-sm text-muted-foreground">Open a source passage above and select it for this review. A supported or contradicted finding requires an exact source reference.</p> : evidence.map((item, index) => <div key={`${item.sourceId}-${item.startOffset}-${index}`} className="flex items-start gap-2">
            <blockquote className="flex-1 text-sm">“{item.quote}”</blockquote>
            <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setSelectedEvidence(previous => ({ ...previous, [criterionId]: evidence.filter((_, i) => i !== index) }))}>Remove</Button>
          </div>)}
        </div>
        <Textarea aria-label="Criterion review rationale" placeholder="Explain your finding and identify the supporting source passage or the clarification needed. Required." value={rationale} onChange={event => setRationale(event.target.value)} disabled={disabled || !criterionId} />
        <Button onClick={saveReview} disabled={disabled || !criterionId || !rationale.trim() || (evidenceRequired && evidence.length === 0) || (action === 'resolution' && !resolvesId)}>{saving ? 'Saving…' : 'Save review'}</Button>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="font-medium">Recruiter decision</h3>
        <p className="text-sm text-muted-foreground">{finalDecision ? `${applicationDecisionLabels[finalDecision.decision as ApplicationDecision]} — recorded by ${finalDecision.reviewer_name}` : 'No recruiter decision has been recorded against this assessment.'}</p>
        {finalDecision && <p className="text-sm">{finalDecision.rationale}</p>}
        {canDecide && !readOnly && <>
          <Select value={decision} onValueChange={value => setDecision(value as ApplicationDecision)} disabled={decisionDisabled}>
            <SelectTrigger aria-label="Recruiter decision"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(applicationDecisionLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea aria-label="Recruiter decision rationale" value={decisionReason} onChange={event => setDecisionReason(event.target.value)} disabled={decisionDisabled} placeholder="Explain why this applicant is included, excluded, or needs clarification. Required for every decision." />
          <Button onClick={saveDecision} disabled={decisionDisabled || !decisionReason.trim() || (unresolved.length > 0 && decision !== 'needs_clarification')}>Record recruiter decision</Button>
        </>}
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="font-medium flex items-center gap-2"><History className="h-4 w-4" />Review history</h3>
        <p className="text-xs text-muted-foreground">All assessment versions are retained below. Corrections add new entries; previous findings remain visible.</p>
        {isLoading ? <p className="text-sm">Loading review history…</p> : events.length === 0 ? <p className="text-sm text-muted-foreground">No reviews recorded yet.</p> :
          <ol className="max-h-96 overflow-y-auto space-y-3">
            {events.map(event => <li key={event.id} className="rounded-md border p-3 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{event.reviewer_name}</span>
                <Badge variant="outline">{event.event_type.replace(/_/g, ' ')}</Badge>
                {event.assessment_run_id !== assessmentId && <Badge variant="secondary">Another assessment version</Badge>}
                <time className="text-xs text-muted-foreground" dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
              </div>
              {event.criterion_id && <p className="text-xs text-muted-foreground">{event.criterion_text || criteria.find(item => item.criterionId === event.criterion_id)?.criterionText || `Criterion ${event.criterion_id}`}</p>}
              <p className="text-sm font-medium">{assessmentFindingLabels[event.decision as AssessmentFinding] || applicationDecisionLabels[event.decision as ApplicationDecision]}</p>
              <p className="text-sm whitespace-pre-wrap">{event.rationale}</p>
              {(event.evidence || []).map((item, index) => <Button key={`${event.id}-evidence-${index}`} variant="link" className="h-auto whitespace-normal p-0 text-left text-xs" onClick={() => window.dispatchEvent(new CustomEvent('assessment-evidence-open', { detail: { assessmentId: event.assessment_run_id, criterionId: event.criterion_id, criterionText: event.criterion_text, evidence: item } }))}>View source: “{item.quote}”</Button>)}
              {event.event_type === 'disagreement' && <p className="text-xs">{events.some(item => item.resolves_event_id === event.id) ? 'Resolved — see the linked resolution in this history.' : 'Open disagreement'}</p>}
              <p className="text-xs text-muted-foreground">Assessment {event.assessment_run_id.slice(0, 8)}</p>
            </li>)}
          </ol>}
      </div>
    </CardContent>
  </Card>;
}
