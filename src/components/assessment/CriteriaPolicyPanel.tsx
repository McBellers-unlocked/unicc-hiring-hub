import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { assessmentClient, approveAssessmentPolicy, defaultAssessmentMode, requirementClassification, reviewErrorMessage, type RequirementPolicy } from '@/lib/assessmentReview';

const EMPTY_REQUIREMENTS: RequirementPolicy[] = [];

export interface CriteriaPolicyPanelProps { jobId: string; onPolicyChanged?: () => void }

export function CriteriaPolicyPanel({ jobId, onPolicyChanged }: CriteriaPolicyPanelProps) {
  const queryClient = useQueryClient();
  const [choices, setChoices] = useState<Record<string, { mode: 'gate' | 'weighted'; weight: number; classification: 'essential' | 'desirable' | '' }>>({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { data: requirements = EMPTY_REQUIREMENTS, isLoading, error: loadError } = useQuery({
    queryKey: ['assessment-criterion-policy', jobId],
    queryFn: async () => {
      const { data, error } = await assessmentClient.from('job_requirements').select('*').eq('job_id', jobId).order('order_index');
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
  });
  const { data: approvals = [] } = useQuery({
    queryKey: ['assessment-policy-approvals', jobId],
    queryFn: async () => {
      const { data, error } = await assessmentClient.from('job_assessment_policy_events').select('*').eq('job_id', jobId).order('created_at', { ascending: false }).limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
  });
  const { data: job } = useQuery({
    queryKey: ['assessment-job-education', jobId],
    queryFn: async () => {
      const { data, error } = await assessmentClient.from('jobs').select('essential_education_level').eq('id', jobId).single();
      if (error) throw error;
      return data;
    }, enabled: !!jobId,
  });
  const hasEducationCriterion = requirements.some(requirement => requirementClassification(requirement) === 'essential' && /education|degree|university|bachelor|master|phd/i.test(`${requirement.category} ${requirement.title} ${requirement.description || ''}`));

  useEffect(() => {
    setChoices(Object.fromEntries(requirements.map(requirement => [requirement.id, {
      mode: defaultAssessmentMode(requirement), weight: Number(requirement.assessment_weight) || 1, classification: requirementClassification(requirement),
    }])));
  }, [requirements]);

  useEffect(() => { setReason(''); setError(''); setNotice(''); }, [jobId]);

  const approved = requirements.length > 0 && requirements.every(requirement => !!requirement.policy_approved_at && !!requirement.policy_approved_by);
  const valid = requirements.length > 0 && requirements.every(requirement => {
    const choice = choices[requirement.id];
    return choice && !!choice.classification && Number.isFinite(choice.weight) && choice.weight > 0 && choice.weight <= 100;
  });
  const changed = requirements.some(requirement => {
    const choice = choices[requirement.id];
    return choice && (choice.mode !== requirement.assessment_mode || choice.weight !== Number(requirement.assessment_weight) || choice.classification !== requirementClassification(requirement));
  });

  const approve = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      await approveAssessmentPolicy(jobId, requirements.map(requirement => ({ requirement, ...choices[requirement.id] })), reason);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assessment-criterion-policy', jobId] }),
        queryClient.invalidateQueries({ queryKey: ['assessment-policy-approvals', jobId] }),
      ]);
      setReason(''); setNotice('Criterion policy approved. Run a new assessment to apply this approved policy.');
      onPolicyChanged?.();
    } catch (err) { setError(reviewErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const addEducation = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      const { error } = await assessmentClient.rpc('add_assessment_education_criterion', { p_job_id: jobId });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['assessment-criterion-policy', jobId] });
      setNotice('Education requirement added. Review and approve the complete criterion policy.');
      onPolicyChanged?.();
    } catch (err) { setError(reviewErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return <Card>
    <CardHeader>
      <CardTitle className="flex flex-wrap items-center gap-2"><ClipboardCheck className="h-5 w-5" />Criterion policy <Badge variant={approved && !changed ? 'default' : 'secondary'}>{approved && !changed ? 'Approved' : 'Approval needed'}</Badge></CardTitle>
      <p className="text-sm text-muted-foreground">Agree how each criterion affects assessment before reviewing applicants. Editing a criterion invalidates approval of the complete set.</p>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm"><strong>Gate:</strong> evidence must support this requirement for a positive assessment. Missing evidence stays open for clarification. <strong>Weighted evidence:</strong> contributes to the evidence summary at the chosen weight; it does not replace an unmet gate.</p>
      {(error || loadError) && <Alert variant="destructive"><AlertDescription>{error || reviewErrorMessage(loadError)}</AlertDescription></Alert>}
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      {job?.essential_education_level && !hasEducationCriterion && <Alert><AlertDescription>
        <p>The job separately requires {job.essential_education_level}. Add it to the criterion set so its evidence treatment can be approved.</p>
        <Button className="mt-2" variant="outline" disabled={saving} onClick={addEducation}>Add job education requirement</Button>
      </AlertDescription></Alert>}
      {isLoading ? <p className="text-sm">Loading criteria…</p> : requirements.length === 0 ? <p className="text-sm text-muted-foreground">Add the job’s criteria before approving an assessment policy.</p> :
        <div className="space-y-3">{requirements.map(requirement => {
          const choice = choices[requirement.id] || { mode: defaultAssessmentMode(requirement), weight: 1, classification: requirementClassification(requirement) };
          return <div key={requirement.id} className="rounded-md border p-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_9rem_12rem_6rem]">
            <div className="space-y-1">
              <p className="text-sm font-medium">{requirement.description || requirement.title}</p>
              <Badge variant="outline">{requirement.category.replace(/_/g, ' ')}{requirement.must_have ? ' · essential' : ''}</Badge>
              {requirement.policy_approved_at && <p className="text-xs text-muted-foreground">Approved {new Date(requirement.policy_approved_at).toLocaleString()}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor={`classification-${requirement.id}`}>Classification</label>
              <Select value={choice.classification} onValueChange={classification => setChoices(previous => ({ ...previous, [requirement.id]: { ...choice, classification: classification as 'essential' | 'desirable' } }))} disabled={saving}>
                <SelectTrigger id={`classification-${requirement.id}`} aria-label={`Classification for ${requirement.title}`}><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent><SelectItem value="essential">Essential</SelectItem><SelectItem value="desirable">Desirable</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor={`mode-${requirement.id}`}>Treatment</label>
              <Select value={choice.mode} onValueChange={mode => setChoices(previous => ({ ...previous, [requirement.id]: { ...choice, mode: mode as 'gate' | 'weighted' } }))} disabled={saving}>
                <SelectTrigger id={`mode-${requirement.id}`} aria-label={`Treatment for ${requirement.title}`}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="gate">Gate</SelectItem><SelectItem value="weighted">Weighted evidence</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor={`weight-${requirement.id}`}>Weight</label>
              <Input id={`weight-${requirement.id}`} aria-label={`Weight for ${requirement.title}`} type="number" min="0.1" max="100" step="0.1" value={Number.isFinite(choice.weight) ? choice.weight : ''} disabled={saving || choice.mode === 'gate'} onChange={event => setChoices(previous => ({ ...previous, [requirement.id]: { ...choice, weight: event.target.value === '' ? NaN : Number(event.target.value) } }))} />
            </div>
          </div>;
        })}</div>}
      <Textarea aria-label="Criterion policy approval rationale" value={reason} disabled={saving || !!loadError || requirements.length === 0} onChange={event => setReason(event.target.value)} placeholder="Explain why these gates and evidence weights are appropriate for this role. Required." />
      <Button onClick={approve} disabled={saving || isLoading || !!loadError || !valid || !reason.trim()}>{saving ? 'Approving…' : 'Approve complete criterion policy'}</Button>
      {approvals.length > 0 && <details className="border-t pt-3">
        <summary className="cursor-pointer text-sm font-medium">Previous approvals</summary>
        <ol className="mt-3 space-y-3">{approvals.map(approval => <li key={approval.id} className="text-sm space-y-1">
          <p className="font-medium">{approval.approved_by_name} · {new Date(approval.created_at).toLocaleString()}</p>
          <p className="whitespace-pre-wrap">{approval.rationale}</p>
        </li>)}</ol>
      </details>}
    </CardContent>
  </Card>;
}
