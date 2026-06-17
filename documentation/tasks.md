# Tasks — Recommendation model v4.3

Branch `scoring-v4-3-recommendation`, one commit, PR at the end. Before writing code: confirm the guardrails in `design.md` and list the files you'll touch.

## Engine — `supabase/functions/score-application/index.ts`

- [ ] Add constant `MAX_ESSENTIAL_MISSES = 1` (single source, commented as the policy lever).
- [ ] In the aggregation/recommendation block, compute `essentialTotal`, `essentialMet`, `essentialMisses`, `coverageRatio`, and `matchStrengthOnMet` (weighted average over **passed criteria only**; null/0 if none passed).
- [ ] Replace the verdict with the three-state model from `design.md`: `reject` if `!corePass`; `recommend` if `corePass && essentialMisses <= MAX_ESSENTIAL_MISSES`; otherwise `review`. **Remove** the `overallScore >= 60` condition from the verdict.
- [ ] Build `recommendation_reason` per the wording in `design.md`, naming the actual missed criteria.
- [ ] Persist additions to `rubric_breakdown`: `recommendation`, `recommendation_reason`, `essentialMet`, `essentialTotal`, `coverageRatio`, `matchStrengthOnMet`. Keep `overallScore` and all existing fields untouched.
- [ ] Set `applications.suggested_for_longlist = (recommendation === "recommend")`.
- [ ] Bump `pipeline_version` to `'4.3'`.

## Types — `src/lib/criterionScoring.ts`

- [ ] Extend the client contract with the new fields (the `recommendation` enum + the coverage/strength fields + reason). Additions only.

## UI — candidate-fit card (grep to locate)

- [ ] Drive the verdict badge from `recommendation` (Recommend / Review / Reject), not from a percentage.
- [ ] Lead with coverage: "Meets {essentialMet} of {essentialTotal} essential criteria."
- [ ] Show `matchStrengthOnMet` as a clearly-labelled secondary metric (e.g. "Match strength on met criteria: X%") — never a bare "%" that reads as overall fit.
- [ ] Surface `recommendation_reason` near the badge.
- [ ] Keep the existing per-criterion ✓/✗ list — it shows the real gaps and is a strength.

## Verify before merge

- [ ] Anomaly candidate now shows **Review** (not Recommend); reason names the four missed criteria.
- [ ] A strong candidate still shows **Recommend**.
- [ ] `matchStrengthOnMet` is unaffected by failed criteria.
- [ ] Type-check + tests pass. Open PR; do not merge until clean.
