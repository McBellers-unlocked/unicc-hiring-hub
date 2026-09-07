import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { AssessmentWorkspace } from '@/components/ApplicationScoring';
import { assessmentDemo } from '@/lib/assessmentDemo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Scenario = 'clear' | 'missing' | 'gap';
export default function AssessmentWorkspaceDemo() {
  const [scenario, setScenario] = useState<Scenario>('missing');
  const [reason, setReason] = useState(''), [decision, setDecision] = useState('Needs clarification');
  const [events, setEvents] = useState<{ scenario: Scenario; decision: string; reason: string; at: string }[]>([]);
  const data = assessmentDemo(scenario), history = events.filter(event => event.scenario === scenario);
  return <main className="min-h-screen bg-background">
    <header className="border-b bg-slate-950 px-6 py-4 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs uppercase tracking-widest text-slate-400">UNICC · Hiring workspace</p><h1 className="mt-1 text-lg font-semibold">Assessment walkthrough</h1></div>
        <Link to="/" className="flex items-center gap-2 text-sm text-slate-300"><ArrowLeft className="h-4 w-4" />Back to platform</Link>
      </div>
    </header>
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
        <p><strong>Synthetic examples.</strong> No real candidate data. Decisions remain in this demo until the page is refreshed.</p>
        <Badge variant="outline">No messages sent</Badge>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs text-muted-foreground">Role</p><h2 className="text-xl font-semibold">HR Programme Specialist</h2></div>
        <div className="flex flex-wrap gap-2" aria-label="Demo scenarios">
          {([['clear', 'Clear evidence'], ['missing', 'Missing evidence'], ['gap', 'Confirmed gap']] as const).map(([value, label]) => <Button key={value} variant={scenario === value ? 'default' : 'outline'} onClick={() => { setScenario(value); setReason(''); setDecision('Needs clarification'); }}>{label}</Button>)}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <span className="font-medium">Applicant {scenario === 'clear' ? 'A' : scenario === 'missing' ? 'B' : 'C'} · illustrative application</span>
        <span className="text-sm"><strong>Human decision:</strong> {history[history.length - 1]?.decision || 'Not reviewed'}</span>
      </div>
      <AssessmentWorkspace key={scenario} data={data} />
      <section className="rounded-xl border p-5" aria-label="Demo recruiter decision">
        <h2 className="flex items-center gap-2 font-semibold"><ClipboardCheck className="h-5 w-5" />Record your decision</h2>
        <p className="mt-1 text-sm text-muted-foreground">Inspect the highlighted evidence, then explain your decision. The original AI assessment remains visible above.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Decision<select aria-label="Recruiter decision" value={decision} onChange={event => setDecision(event.target.value)} className="mt-1 block w-full rounded border bg-background p-2">{['Needs clarification', 'Included in longlist', 'Excluded'].map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="text-sm sm:col-span-2">Reason and evidence<textarea aria-label="Decision rationale" value={reason} onChange={event => setReason(event.target.value)} className="mt-1 block min-h-20 w-full rounded border bg-background p-2" placeholder="Explain the finding, the evidence checked and any disagreement with the AI." /></label>
        </div>
        <Button className="mt-3" disabled={!reason.trim()} onClick={() => { setEvents(previous => [...previous, { scenario, decision, reason: reason.trim(), at: new Date().toLocaleTimeString() }]); setReason(''); }}>Record demo decision</Button>
        {history.length > 0 && <ol className="mt-5 space-y-3 border-t pt-4" aria-label="Demo decision history">{history.map((event, index) => <li key={index} className="rounded border bg-muted/20 p-3 text-sm"><p><strong>{event.decision}</strong> · Demo reviewer · {event.at}</p><p className="mt-1 whitespace-pre-wrap">{event.reason}</p><p className="mt-1 text-xs text-muted-foreground">Linked to preserved assessment {data.assessmentId}. Original AI finding unchanged.</p></li>)}</ol>}
      </section>
    </div>
  </main>;
}
