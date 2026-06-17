import React from 'react';
import { Check, X, Minus, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getFitTier } from '@/lib/fitTier';

/** v4.3 verdict → badge styling. The headline is the recommendation, not a %. */
const RECOMMENDATION_BADGE: Record<'recommend' | 'review' | 'reject', { label: string; badgeClass: string }> = {
  recommend: { label: 'Recommend', badgeClass: 'bg-green-100 text-green-800' },
  review: { label: 'Review', badgeClass: 'bg-amber-100 text-amber-800' },
  reject: { label: 'Reject', badgeClass: 'bg-red-100 text-red-800' },
};

interface CandidateFitSummaryProps {
  application: any;
}

interface CriterionRow {
  text: string;
  passed: boolean | null; // null = not assessed
  evidence?: string;
}

/** Parse "Desirable …" sections from a job's requirements_md into bullets. */
function parseDesirableBullets(requirementsMd: string | null | undefined): string[] {
  if (!requirementsMd) return [];
  const lines = requirementsMd.split('\n');
  const bullets: string[] = [];
  let inDesirable = false;
  for (const raw of lines) {
    const line = raw.trim();
    // Heading detection (markdown #, ##, ### …)
    const headingMatch = line.match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      inDesirable = /desirable/i.test(headingMatch[1]);
      continue;
    }
    if (!inDesirable) continue;
    if (
      line.startsWith('- ') || line.startsWith('• ') || line.startsWith('· ') ||
      line.startsWith('* ') || line.startsWith('– ') || line.startsWith('— ') ||
      line.match(/^\d+\.\s/) || line.match(/^[·•\-\*–—]\s*\S/)
    ) {
      const cleaned = line
        .replace(/^[·•\-\*–—]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .trim();
      if (cleaned) bullets.push(cleaned);
    } else if (line.length > 0 && bullets.length === 0) {
      // Allow a single non-bullet paragraph under a Desirable heading
      bullets.push(line);
    }
  }
  return bullets;
}

const StatusIcon: React.FC<{ passed: boolean | null }> = ({ passed }) => {
  if (passed === true) {
    return (
      <span className="inline-flex w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center flex-shrink-0">
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
    );
  }
  if (passed === false) {
    return (
      <span className="inline-flex w-4 h-4 rounded-full bg-red-100 text-red-700 items-center justify-center flex-shrink-0">
        <X className="w-3 h-3" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="inline-flex w-4 h-4 rounded-full bg-muted text-muted-foreground items-center justify-center flex-shrink-0">
      <Minus className="w-3 h-3" strokeWidth={3} />
    </span>
  );
};

const CriterionList: React.FC<{ rows: CriterionRow[]; emptyLabel: string }> = ({ rows, emptyLabel }) => {
  if (rows.length === 0) {
    return <div className="text-xs text-muted-foreground italic">{emptyLabel}</div>;
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((row, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5"><StatusIcon passed={row.passed} /></span>
          <span
            className={cn(
              'leading-snug line-clamp-2',
              row.passed === false && 'text-foreground',
              row.passed === null && 'text-muted-foreground'
            )}
            title={row.evidence ? `${row.text}\n\n${row.evidence}` : row.text}
          >
            {row.text}
          </span>
        </li>
      ))}
    </ul>
  );
};

export const CandidateFitSummary: React.FC<CandidateFitSummaryProps> = ({ application }) => {
  const screeningScore = application.screening_scores;
  const aiScore: number | null | undefined = screeningScore?.ai_score;
  const rubric = screeningScore?.rubric_breakdown;
  const fitTierInfo = getFitTier(aiScore);

  // Essential criteria from rubric (already AI-scored)
  const essentialRaw: any[] = Array.isArray(rubric?.criteria) ? rubric.criteria : [];
  const eduScore = rubric?.educationScore;
  const essentialAll: any[] = eduScore ? [...essentialRaw, eduScore] : essentialRaw;

  const essentialRows: CriterionRow[] = essentialAll.map((c) => {
    const evidenceQuote =
      c?.subrequirements?.[0]?.evidence?.[0]?.quote ||
      c?.subrequirements?.[0]?.missing ||
      undefined;
    return {
      text: String(c?.criterionText || 'Criterion').replace(/\s+/g, ' ').trim(),
      passed: typeof c?.passed === 'boolean' ? c.passed : null,
      evidence: evidenceQuote,
    };
  });

  const essentialMet = essentialRows.filter((r) => r.passed === true).length;
  const essentialTotal = essentialRows.length;

  // Must-haves pill (mirrors scorer's corePass logic)
  const coreCriteria = essentialAll.filter(
    (c) => c?.type === 'years_experience' || c?.type === 'education'
  );
  const mustHavesPassed = coreCriteria.length > 0 && coreCriteria.every((c) => c?.passed === true);
  const hasMustHaves = coreCriteria.length > 0;

  // Desirable criteria from job.requirements_md (not AI-scored yet)
  const desirableBullets = parseDesirableBullets(application?.jobs?.requirements_md);
  const desirableRows: CriterionRow[] = desirableBullets.map((b) => ({
    text: b,
    passed: null,
  }));
  const desirableMet = 0;
  const desirableTotal = desirableRows.length;

  const hasAnyScoring = essentialRows.length > 0;

  // v4.3 verdict fields — prefer engine-emitted values; fall back for legacy rows.
  const rec =
    rubric?.recommendation === 'recommend' ||
    rubric?.recommendation === 'review' ||
    rubric?.recommendation === 'reject'
      ? (rubric.recommendation as 'recommend' | 'review' | 'reject')
      : undefined;
  const recBadge = rec ? RECOMMENDATION_BADGE[rec] : undefined;
  const recReason: string | undefined =
    typeof rubric?.recommendation_reason === 'string' ? rubric.recommendation_reason : undefined;
  const matchStrength: number | null =
    typeof rubric?.matchStrengthOnMet === 'number' ? rubric.matchStrengthOnMet : null;
  const shownEssentialMet = typeof rubric?.essentialMet === 'number' ? rubric.essentialMet : essentialMet;
  const shownEssentialTotal =
    typeof rubric?.essentialTotal === 'number' ? rubric.essentialTotal : essentialTotal;

  return (
    <div className="rounded-lg border border-border bg-card my-4">
      {/* Header — lead with the verdict (recommendation), not a percentage */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Candidate Fit</span>
        </div>
        {recBadge ? (
          <Badge className={cn('font-semibold', recBadge.badgeClass)}>{recBadge.label}</Badge>
        ) : (
          <Badge className={cn('font-semibold', fitTierInfo.badgeClass)}>
            {fitTierInfo.shortLabel}
            {typeof aiScore === 'number' ? ` · ${aiScore}%` : ''}
          </Badge>
        )}
      </div>

      {/* Verdict summary — coverage first, the reason, and a clearly-labelled secondary strength */}
      {hasAnyScoring && (
        <div className="px-4 py-3 border-b border-border space-y-1">
          <div className="text-sm font-medium">
            Meets {shownEssentialMet} of {shownEssentialTotal} essential criteria
            {typeof matchStrength === 'number' && (
              <span className="font-normal text-muted-foreground">
                {' · '}Match strength on met criteria: {matchStrength}%
              </span>
            )}
          </div>
          {recReason && <div className="text-xs text-muted-foreground">{recReason}</div>}
        </div>
      )}

      {!hasAnyScoring ? (
        <div className="px-4 py-3 text-sm text-muted-foreground italic">
          Awaiting AI scoring
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Essential column */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Essential criteria
              </span>
              {hasMustHaves && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0',
                    mustHavesPassed
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  )}
                >
                  Must-haves {mustHavesPassed ? '✓' : '✗'}
                </Badge>
              )}
            </div>
            <CriterionList rows={essentialRows} emptyLabel="No essential criteria scored" />
            {shownEssentialTotal > 0 && (
              <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                {shownEssentialMet} of {shownEssentialTotal} met
              </div>
            )}
          </div>

          {/* Desirable column */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Desirable criteria
              </span>
            </div>
            <CriterionList
              rows={desirableRows}
              emptyLabel="No desirable criteria listed"
            />
            {desirableTotal > 0 && (
              <>
                <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                  {desirableMet} of {desirableTotal} met
                </div>
                <div className="text-[11px] text-muted-foreground italic">
                  Desirable criteria not yet AI-scored
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
