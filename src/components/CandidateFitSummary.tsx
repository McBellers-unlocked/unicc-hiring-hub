import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EVIDENCE_STATUS_LABELS, getAssessmentView } from '@/lib/assessmentView';

export function CandidateFitSummary({ application }: { application: any }) {
  const assessment = getAssessmentView(application.screening_scores);
  const essential = assessment.criteria.filter(c => c.category !== 'desirable');
  const desirable = assessment.criteria.filter(c => c.category === 'desirable');
  return (
    <section className="rounded-lg border border-border bg-card my-4" aria-label="AI evidence assessment">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
        <span className="font-medium text-sm">AI evidence assessment</span>
        <Badge variant="outline" className={assessment.badgeClass}>{assessment.label}</Badge>
      </div>
      {!assessment.current ? (
        <div className="p-4 text-sm text-muted-foreground">
          {assessment.state === 'legacy'
            ? 'The earlier AI assessment needs reassessment before it can be used. You can still review the source evidence and record a human decision.'
            : assessment.manual ? 'A human review snapshot is recorded. There is no AI recommendation for this application.' : 'AI has not assessed this application. You can review its source evidence manually and record your decision.'}
        </div>
      ) : (
        <>
          <div className="px-4 py-3 border-b text-sm">
            <p>{essential.filter(c => c.status === 'supported').length} of {essential.length} essential criteria supported · {assessment.unresolved} requiring review</p>
            {assessment.rubric?.recommendation_reason && <p className="text-muted-foreground mt-1">{assessment.rubric.recommendation_reason}</p>}
          </div>
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
            {([['Essential criteria', essential], ['Desirable criteria', desirable]] as const).map(([heading, rows]) => (
              <div key={heading} className="p-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{heading}</h4>
                {rows.length === 0 ? <p className="text-xs text-muted-foreground">No criteria in this category were assessed.</p> : rows.map(c => (
                  <Link key={c.criterionId} to={`/admin/applications/${application.id}?tab=overview&criterion=${encodeURIComponent(c.criterionId)}`}
                    className="block rounded border p-2 hover:bg-muted/40 focus-visible:outline-primary">
                    <span className="block text-sm">{c.criterionText}</span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      {EVIDENCE_STATUS_LABELS[c.status] || 'Needs review'} · {c.assessmentMode === 'gate' ? 'Eligibility gate' : 'Weighted evidence'}
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="px-4 py-3 text-xs border-t flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">AI findings are provisional. The recruiter records the decision.</p>
        <Button asChild size="sm"><Link to={`/admin/applications/${application.id}?tab=overview`}>Review evidence</Link></Button>
      </div>
    </section>
  );
}
