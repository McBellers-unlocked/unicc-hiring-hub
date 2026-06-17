# Design — Recommendation model v4.3

## Stack

Unchanged. Engine: `supabase/functions/score-application/index.ts` (the aggregation/recommendation block + persistence). Client types: `src/lib/criterionScoring.ts`. UI: the candidate-fit card component — **locate it by grepping for the existing badge or the "of 8 met" / coverage string; do not guess the path.**

## The model

```
corePass        = years_experience AND education criteria all passed   // hard floor, unchanged
essentialTotal  = count(essential criteria)        // all criteria are essential today
essentialMet    = count(passed)
essentialMisses = essentialTotal - essentialMet
coverageRatio   = essentialMet / essentialTotal

recommendation =
  !corePass                                            -> "reject"     // missing a non-negotiable floor
  corePass && essentialMisses <= MAX_ESSENTIAL_MISSES  -> "recommend"
  otherwise (corePass but too many misses)             -> "review"     // clears floor, misses too many must-haves

matchStrengthOnMet = weighted average of per-criterion score over PASSED criteria only
                     (existing weights; null/0 if none passed)
```

The verdict no longer references `overallScore`. `overallScore` stays in `rubric_breakdown` unchanged for continuity, but it is not the headline and does not drive the badge.

## Data-model deltas

- `rubric_breakdown` JSON — **additions only**: `recommendation` (enum `reject|review|recommend`), `recommendation_reason` (string), `essentialMet`, `essentialTotal`, `coverageRatio`, `matchStrengthOnMet`. Keep `overallScore` and every existing field.
- `applications.suggested_for_longlist` — set true only when `recommendation === "recommend"` (Review and Reject are false). If you want the three-state preserved in the table, add a nullable `recommendation` column; otherwise the boolean is enough for now.
- `pipeline_version` → `'4.3'`.

## recommendation_reason wording

- **recommend:** "Meets core requirements and N of M essential criteria."
- **review:** "Clears core requirements but misses K essential criteria: &lt;names&gt;. Flagged for human review."
- **reject:** "Does not meet a core requirement: &lt;missing years and/or education&gt;."

Name the actual missed criteria (short label), not just counts — that is what makes the verdict defensible and demo-legible.

## Assumptions

- All criteria currently shown are essential (the UI labels them so).
- `corePass` already exists and correctly identifies the years + education criteria.
- Per-criterion `passed`, `score`, and `weight` are available at the aggregation step.

## Guardrails — the agent MUST NOT

- Touch the per-criterion scoring formula (`60 + 40·r·c` / `20 + 40·r·c`), the evaluator, the verifier, decomposition, caching, or the rate limiter. This change is recommendation/aggregation + display **only**.
- "Tidy," rescale, or otherwise alter `overallScore` or any existing `rubric_breakdown` field. Additions only.
- Set `MAX_ESSENTIAL_MISSES` above 1, or scatter it — one named constant, single source of truth.
- Collapse the three states unprompted — keep `reject`/`review`/`recommend` distinct in the data, even if the UI styles Review and Reject similarly.
- Guess the UI component path — grep for the existing badge / coverage string and edit the real component.
- Push to `main`. Branch `scoring-v4-3-recommendation`, one commit, PR. Do not edit the project in Lovable while the branch is open (see the v4.2 change-set README for the sync rule).

## Verification

- Re-score the anomaly candidate: verdict is no longer "recommend" (should be "review" at `MAX_ESSENTIAL_MISSES = 1`); `recommendation_reason` names the four missed criteria.
- Re-score a strong candidate (≥ M−1 of M essentials): still "recommend".
- Unit-check `matchStrengthOnMet`: a failed criterion does not change it; with zero passes it is null/0 and the verdict is reject (via corePass) or review.
- Type-check + tests pass.
