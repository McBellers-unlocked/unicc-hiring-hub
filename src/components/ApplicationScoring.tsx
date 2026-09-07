import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowUpRight, CheckCircle2, FileSearch, History, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AssessmentReviewPanel } from '@/components/assessment/AssessmentReviewPanel';
import { FINDING_LABELS, evidenceFromSelectedRange, findingStatus, locateEvidence, normalizeSources, type AssessmentEvidence } from '@/lib/assessmentEvidence';
import { assessmentCriteria, getAssessmentView } from '@/lib/assessmentView';
import { prepareManualAssessmentSnapshot, reviewErrorMessage } from '@/lib/assessmentReview';

type Rubric = Record<string, any>;
interface AssessmentRun { id: string; created_at: string; rubric_breakdown: Rubric; legacy?: boolean }
interface EvidenceSelection { criterionId: string; evidence: AssessmentEvidence }
interface EvidenceRequest extends EvidenceSelection { assessmentId: string; criterionText?: string }
const statusClasses = {
  supported: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  contradicted: 'bg-rose-50 text-rose-800 border-rose-200',
  insufficient_evidence: 'bg-amber-50 text-amber-900 border-amber-200',
  assessment_unavailable: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function AssessmentWorkspace({ data, historical = false, onEvidenceSelected, requestedEvidence }: {
  data: Rubric; historical?: boolean; onEvidenceSelected?: (selection: EvidenceSelection) => void; requestedEvidence?: EvidenceRequest | null;
}) {
  const criteria = assessmentCriteria(data), sources = normalizeSources(data.sources);
  const [selectedCriterion, setSelectedCriterion] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selection, setSelection] = useState<AssessmentEvidence | null>(null);
  const [pendingPassage, setPendingPassage] = useState<AssessmentEvidence | null>(null);
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);
  const sourceText = useRef<HTMLDivElement>(null);
  const sourcePane = useRef<HTMLElement>(null), highlight = useRef<HTMLElement>(null);
  const activeCriterion = selectedCriterion === null ? criteria[0] : criteria.find(c => c.criterionId === selectedCriterion);
  const earlierCriterionText = requestedEvidence?.assessmentId === data.assessmentId && requestedEvidence.criterionId === selectedCriterion
    ? requestedEvidence.criterionText : undefined;
  const missingCriterion = selectedCriterion !== null && !activeCriterion;
  const activeSource = sources.find(s => s.id === selectedSource) || sources[0];
  const location = selection ? locateEvidence(sources, selection) : null;
  const view = getAssessmentView({ rubric_breakdown: data });
  const legacy = !view.current;
  const manual = data.assessment_kind === 'manual';
  const recommendation = view.state;
  const essentials = criteria.filter(c => c.category !== 'desirable');
  const supported = essentials.filter(c => c.status === 'supported').length;
  const unresolved = essentials.filter(c => !['supported', 'contradicted'].includes(c.status)).length;
  const errors: string[] = data.scope?.processingErrors || [];
  const limitations: string[] = [...(data.scope?.limitations || []), ...errors,
    ...(data.scope?.excludedSources || []), ...(data.scope?.missingSources || []).map((s: string) => `Missing source: ${s}`)];

  useEffect(() => { setSelectedCriterion(new URLSearchParams(window.location.search).get('criterion')); setSelectedSource(null); setSelection(null); }, [data.assessmentId]);
  useEffect(() => {
    if (!requestedEvidence || requestedEvidence.assessmentId !== data.assessmentId) return;
    const found = locateEvidence(normalizeSources(data.sources), requestedEvidence.evidence);
    if (found) { setSelectedCriterion(requestedEvidence.criterionId); setSelectedSource(found.source.id); setSelection(requestedEvidence.evidence); setPendingPassage(null); setSourceNotice(null); }
  }, [requestedEvidence, data.assessmentId, data.sources]);
  useEffect(() => {
    if (selection) { sourcePane.current?.focus({ preventScroll: true }); highlight.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }, [selection]);
  useEffect(() => {
    setPendingPassage(null); setSourceNotice(null);
  }, [data.assessmentId, activeSource?.id, activeCriterion?.criterionId]);
  useEffect(() => {
    const capture = () => {
      const root = sourceText.current, selected = window.getSelection();
      if (!root || !activeSource || !activeCriterion || !selected || selected.isCollapsed || selected.rangeCount !== 1) return;
      const range = selected.getRangeAt(0);
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer) || root.textContent !== activeSource.text) {
        setPendingPassage(null); return;
      }
      try {
        // Range.toString().length uses the same UTF-16 indexing as saved offsets,
        // including a selection crossing an existing highlighted <mark>.
        const prefix = range.cloneRange();
        prefix.selectNodeContents(root);
        prefix.setEnd(range.startContainer, range.startOffset);
        const start = prefix.toString().length, quote = range.toString();
        setPendingPassage(evidenceFromSelectedRange(activeSource, start, start + quote.length, quote));
        setSourceNotice(null);
      } catch { setPendingPassage(null); }
    };
    document.addEventListener('selectionchange', capture);
    return () => document.removeEventListener('selectionchange', capture);
  }, [activeSource?.id, activeSource?.text, activeCriterion?.criterionId, data.assessmentId]);
  const useSelectedPassage = () => {
    if (!pendingPassage || !activeCriterion || historical || (onEvidenceSelected && legacy && !manual)) return;
    const found = locateEvidence(sources, pendingPassage);
    if (!found || found.source.id !== activeSource?.id) return;
    setSelection(pendingPassage);
    onEvidenceSelected?.({ criterionId: activeCriterion.criterionId, evidence: pendingPassage });
    setSourceNotice(onEvidenceSelected ? 'Exact source passage added to this criterion’s review evidence.' : 'Exact source passage highlighted.');
    setPendingPassage(null);
    window.getSelection()?.removeAllRanges();
  };
  const openEvidence = (evidence: AssessmentEvidence) => {
    const found = locateEvidence(sources, evidence);
    if (found && activeCriterion) { setSelectedSource(found.source.id); setSelection(evidence); setPendingPassage(null); setSourceNotice(null); onEvidenceSelected?.({ criterionId: activeCriterion.criterionId, evidence }); }
  };

  return <div className="space-y-5" aria-label="AI-assisted assessment workspace">
    <div className="rounded-xl border bg-slate-50/70 p-5 dark:bg-slate-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">AI-assisted assessment</p>
          <h2 className="mt-1 text-xl font-semibold">Evidence first. Your decision.</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">The AI checks submitted evidence against the role’s criteria. You verify findings, resolve questions and record the recruitment decision.</p>
        </div>
        <Badge variant="outline" className={`px-3 py-1.5 ${recommendation === 'recommend' ? statusClasses.supported : recommendation === 'reject' ? statusClasses.contradicted : statusClasses.insufficient_evidence}`}>
          {manual ? 'Manual record — no AI assessment' : view.label}
        </Badge>
      </div>
      <div className="mt-5 grid gap-4 text-sm md:grid-cols-3">
        <div><p className="flex items-center gap-1.5 font-semibold"><CheckCircle2 className="h-4 w-4" />Completed</p><p className="mt-1 text-muted-foreground">{manual ? 'An application snapshot was preserved for a human decision. No AI assessment was run.' : legacy ? 'Earlier scoring is available; a current evidence assessment is needed.' : `${sources.length} saved source records; ${supported} of ${essentials.length} essential criteria supported.`}</p></div>
        <div><p className="flex items-center gap-1.5 font-semibold"><FileSearch className="h-4 w-4" />Still to check</p><p className="mt-1 text-muted-foreground">{legacy ? 'Source locations and current criterion policy.' : `${unresolved} unresolved essential findings. Qualifications and candidate claims have not been independently verified.`}</p></div>
        <div><p className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-4 w-4" />Recruiter owns</p><p className="mt-1 text-muted-foreground">Inclusion, exclusion and requests for clarification. An AI recommendation does not change the application stage.</p></div>
      </div>
      <p className="mt-4 border-t pt-3 text-sm">{manual ? 'This is a manual decision record. The recruiter’s rationale is preserved below.' : legacy ? 'Legacy assessment: rerun against the approved criteria before relying on this AI result.' : data.recommendation_reason}</p>
    </div>

    {(historical || data.scope?.inputTruncated || data.scope?.policyApproved === false || errors.length > 0) && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <AlertCircle className="mr-2 inline h-4 w-4" />
      {historical && 'You are viewing a preserved earlier assessment. Review actions are available on the latest run. '}
      {data.scope?.policyApproved === false && 'Criteria policy requires recruiter approval. '}
      {data.scope?.inputTruncated && 'Some source text could not be assessed in full. '}
      {errors.length > 0 && `${errors.length} processing issue(s) require review. `}
    </div>}

    <div className="grid items-start gap-5 xl:grid-cols-12">
      <section className="rounded-xl border bg-card xl:col-span-5" aria-label="Criterion findings">
        <div className="border-b px-4 py-3"><h3 className="font-semibold">Criterion findings</h3><p className="text-xs text-muted-foreground">Select a finding, then inspect its evidence.</p></div>
        {missingCriterion && <div role="status" className="space-y-2 border-b bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">{earlierCriterionText ? 'Earlier criterion from review history' : 'Requested criterion unavailable'}</p>
          <p>{earlierCriterionText || `Criterion ${selectedCriterion}`}</p>
          <p className="text-xs">This criterion is not in this assessment’s criteria. {earlierCriterionText ? 'The saved passage remains available for reviewing the earlier finding. ' : ''}Select a listed criterion to attach new review evidence.</p>
        </div>}
        {!criteria.length && <p className="p-5 text-sm text-muted-foreground">No valid criteria were assessed. Configure and approve the role’s criteria before running assessment.</p>}
        {criteria.map((criterion, index) => {
          const status = findingStatus(criterion.status), selected = criterion === activeCriterion;
          return <div key={criterion.criterionId || index} className="border-b last:border-b-0">
            <button type="button" aria-expanded={selected} onClick={() => { setSelectedCriterion(criterion.criterionId); setSelection(null); }} className={`w-full px-4 py-4 text-left hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected ? 'bg-muted/30' : ''}`}>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{criterion.category === 'desirable' ? 'Desirable' : 'Essential'} · {criterion.assessmentMode === 'weighted' ? 'Supporting evidence' : 'Eligibility gate'}</span>
              <span className="block text-sm font-medium leading-relaxed">{criterion.criterionText}</span>
              <Badge variant="outline" className={`mt-2 font-normal ${statusClasses[status]}`}>{FINDING_LABELS[status]}</Badge>
            </button>
            {selected && <div className="space-y-4 px-4 pb-4 text-sm">
              {(criterion.subrequirements || []).map((sub: any, subIndex: number) => <div key={sub.id || subIndex} className="space-y-2 border-l-2 pl-3">
                <p className="font-medium">{sub.text}</p>
                <p className="text-xs text-muted-foreground">{FINDING_LABELS[findingStatus(sub.status)]}</p>
                {sub.calculation && <p className="rounded bg-muted p-2 text-xs"><strong>Calculation: </strong>{sub.calculation}</p>}
                {sub.missing && <p className="text-xs text-amber-900 dark:text-amber-200">{sub.missing}</p>}
                {(sub.evidence || []).map((evidence: AssessmentEvidence, evidenceIndex: number) => {
                  const found = locateEvidence(sources, evidence);
                  return <div key={evidenceIndex} className="rounded-md border bg-background p-3">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">“{evidence.quote}”</p>
                    {found ? <Button type="button" size="sm" variant="link" className="mt-1 h-auto whitespace-normal px-0 text-left text-xs" onClick={() => openEvidence(evidence)}>Open {found.source.label}<ArrowUpRight className="ml-1 h-3 w-3 shrink-0" /></Button> : <p className="mt-2 text-xs text-muted-foreground">Exact source location unavailable — this quotation has not been verified against a saved source.</p>}
                  </div>;
                })}
                {!sub.evidence?.length && <p className="text-xs text-muted-foreground">No supporting passage identified. This alone does not establish that the candidate lacks the requirement.</p>}
              </div>)}
              {!criterion.subrequirements?.length && <p className="text-muted-foreground">{criterion.evidence || 'No traceable subrequirement evidence is available for this finding.'}</p>}
            </div>}
          </div>;
        })}
      </section>
      <section ref={sourcePane} tabIndex={-1} className="rounded-xl border bg-card focus:outline-none xl:sticky xl:top-5 xl:col-span-7" aria-label="Saved application source">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold"><FileSearch className="h-4 w-4" />Saved application evidence</h3>
          <p className="mt-1 text-xs text-muted-foreground">The exact source text preserved with this assessment. Original uploads are not independently verified.</p>
          {sources.length > 0 && <select aria-label="Source record" value={activeSource?.id || ''} onChange={event => { setSelectedSource(event.target.value); setSelection(null); }} className="mt-3 w-full rounded-md border bg-background p-2 text-sm">{sources.map(source => <option key={source.id} value={source.id}>{source.label}</option>)}</select>}
        </div>
        {activeSource ? <div className="max-h-[640px] overflow-auto p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{activeSource.kind.replace(/_/g, ' ')}</p>
          <div ref={sourceText} className="whitespace-pre-wrap break-words text-sm leading-7">{location && location.source.id === activeSource.id ? <>{activeSource.text.slice(0, location.start)}<mark ref={highlight} className="rounded bg-yellow-200 px-0.5 text-slate-950">{activeSource.text.slice(location.start, location.end)}</mark>{activeSource.text.slice(location.end)}</> : activeSource.text}</div>
        </div> : <div className="p-8 text-sm text-muted-foreground">No saved source records are available in this assessment. Review the application and any missing inputs before relying on a finding.</div>}
        {activeSource && activeCriterion && <div className="space-y-2 border-t px-5 py-4 text-xs">
          <p className="text-muted-foreground">Select text in this saved source to cite a passage the AI may have overlooked.</p>
          {pendingPassage && <>
            <p className="whitespace-pre-wrap rounded border bg-muted/30 p-2">“{pendingPassage.quote}”</p>
            <Button type="button" size="sm" className="h-auto whitespace-normal text-left" disabled={historical || (!!onEvidenceSelected && legacy && !manual)} onClick={useSelectedPassage}>
              {onEvidenceSelected ? `Use selected passage for ${activeCriterion.criterionText}` : 'Highlight selected passage'}
            </Button>
            {historical && <p className="text-muted-foreground">This is a historical source. Select the latest assessment to record new review evidence.</p>}
            {!historical && legacy && !manual && onEvidenceSelected && <p className="text-muted-foreground">A current assessment or human review snapshot is needed to attach source evidence.</p>}
          </>}
          {sourceNotice && <p role="status">{sourceNotice}</p>}
        </div>}
      </section>
    </div>
    <details className="rounded-lg border px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium">Assessment scope and provenance</summary>
      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
        <div><dt className="font-semibold">Assessment run</dt><dd className="break-all text-muted-foreground">{data.assessmentId || 'Legacy result — no immutable run'}</dd></div>
        <div><dt className="font-semibold">Pipeline / prompt</dt><dd className="text-muted-foreground">{data.pipeline_version || data.analysisVersion || 'Unknown'} / {data.prompt_version || 'Not recorded'}</dd></div>
        <div><dt className="font-semibold">Models</dt><dd className="text-muted-foreground">{data.models_used?.join(', ') || data.model_version || 'Not recorded'}</dd></div>
        <div><dt className="font-semibold">Sources assessed</dt><dd className="text-muted-foreground">{data.scope?.assessedSourceIds?.length ?? sources.length} saved records</dd></div>
      </dl>
      {limitations.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{limitations.map((text, i) => <li key={i}>{text}</li>)}</ul>}
    </details>
  </div>;
}

export function ApplicationScoring({ applicationId }: { applicationId: string }) {
  const [runs, setRuns] = useState<AssessmentRun[]>([]), [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  const [reviewEvidence, setReviewEvidence] = useState<EvidenceSelection | undefined>();
  const [requestedEvidence, setRequestedEvidence] = useState<EvidenceRequest | null>(null);
  const [preparing, setPreparing] = useState(false), [manualError, setManualError] = useState('');
  const request = useRef(0);
  async function loadRuns() {
    const token = ++request.current;
    setLoading(true); setError(null);
    try {
      const result = await (supabase as any).from('assessment_runs').select('id,created_at,rubric_breakdown').eq('application_id', applicationId).order('created_at', { ascending: false }).order('id', { ascending: false });
      let available: AssessmentRun[] = result.data || [];
      if (result.error && !['42P01', 'PGRST205'].includes(result.error.code)) throw result.error;
      if (!available.length) {
        const legacy = await supabase.from('screening_scores').select('id,created_at,rubric_breakdown').eq('application_id', applicationId).order('created_at', { ascending: false }).order('id', { ascending: false });
        if (legacy.error) throw legacy.error;
        available = (legacy.data || []).map(row => ({ ...row, rubric_breakdown: row.rubric_breakdown as Rubric, legacy: true }));
      }
      if (token !== request.current) return;
      setRuns(available); setSelectedId(available[0]?.id || '');
    } catch (e) { if (token === request.current) { setRuns([]); setError(e instanceof Error ? e.message : 'Could not load the assessment history.'); } }
    finally { if (token === request.current) setLoading(false); }
  }
  useEffect(() => {
    setRuns([]); setSelectedId(''); setReviewEvidence(undefined); setPreparing(false); setManualError(''); void loadRuns();
    const refresh = (event: Event) => { if ((event as CustomEvent).detail?.applicationId === applicationId) void loadRuns(); };
    window.addEventListener('application-decision-recorded', refresh);
    return () => { request.current++; window.removeEventListener('application-decision-recorded', refresh); };
  }, [applicationId]);
  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<EvidenceRequest>).detail;
      if (!detail || !runs.some(run => run.id === detail.assessmentId)) return;
      setSelectedId(detail.assessmentId); setRequestedEvidence(detail); setReviewEvidence(undefined);
    };
    window.addEventListener('assessment-evidence-open', open);
    return () => window.removeEventListener('assessment-evidence-open', open);
  }, [runs]);
  useEffect(() => { setReviewEvidence(undefined); }, [selectedId]);
  const selected = runs.find(run => run.id === selectedId);
  const canPrepareManual = !error && !runs.some(run => !run.legacy && run.rubric_breakdown?.assessment_kind !== 'manual');
  async function prepareManual() {
    const token = request.current;
    setPreparing(true); setManualError('');
    try {
      await prepareManualAssessmentSnapshot(applicationId);
      if (token !== request.current) return;
      setPreparing(false);
      await loadRuns();
    } catch (err) { if (token === request.current) setManualError(reviewErrorMessage(err)); }
    finally { if (token === request.current) setPreparing(false); }
  }
  const manualButton = canPrepareManual && <Button variant="outline" size="sm" disabled={preparing} onClick={prepareManual}>{preparing ? 'Preserving application evidence…' : selected && !selected.legacy ? 'Prepare current manual review snapshot' : 'Prepare manual review snapshot'}</Button>;
  if (loading) return <Card><CardContent className="flex items-center gap-2 p-6"><RefreshCw className="h-4 w-4 animate-spin" />Loading assessment history…</CardContent></Card>;
  if (error || !selected) return <Card><CardContent className="space-y-3 p-6"><h2 className="font-semibold">AI-assisted assessment</h2><p className="text-sm text-muted-foreground">{error || 'No assessment is available yet. Prepare a saved application snapshot for human review, or approve the role’s criteria and run AI assessment from its application workspace.'}</p>{manualError && <p role="alert" className="text-sm text-destructive">{manualError}</p>}<div className="flex flex-wrap gap-2">{manualButton}<Button variant="outline" size="sm" disabled={preparing} onClick={loadRuns}>Refresh assessment</Button></div></CardContent></Card>;
  return <div className="space-y-4">
    {manualError && <p role="alert" className="text-sm text-destructive">{manualError}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex flex-wrap items-center gap-2 text-sm"><History className="h-4 w-4" />Assessment history<select aria-label="Assessment history" className="rounded border bg-background p-2 text-sm" value={selectedId} onChange={event => setSelectedId(event.target.value)}>{runs.map((run, i) => <option key={run.id} value={run.id}>{new Date(run.created_at).toLocaleString()}{i === 0 ? ' · latest' : ''}{run.legacy ? ' · legacy' : ''}</option>)}</select></label>
      <div className="flex flex-wrap gap-2">{manualButton}<Button variant="ghost" size="sm" disabled={preparing} onClick={loadRuns}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    </div>
    <AssessmentWorkspace key={selected.id} data={selected.legacy ? selected.rubric_breakdown : { ...selected.rubric_breakdown, assessmentId: selected.id }} historical={selected.id !== runs[0]?.id} onEvidenceSelected={setReviewEvidence} requestedEvidence={requestedEvidence} />
    {!selected.legacy && <AssessmentReviewPanel applicationId={applicationId} assessmentId={selected.id} criteria={assessmentCriteria(selected.rubric_breakdown)} readOnly={selected.id !== runs[0]?.id} evidenceSelection={reviewEvidence} />}
  </div>;
}
