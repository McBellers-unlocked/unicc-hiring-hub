## Candidate Fit Summary

Add a new panel inside `CandidateApplicationCard.tsx`, inserted between the "Languages / Skills / Certs" bordered block (ends at line ~400) and the "Experience" metric cards (starts at line ~402). It uses the already-stored AI scoring data, so no backend or schema changes.

### What it shows

A compact card titled **"Candidate Fit"** with the overall tier (Yes / Maybe / No from `fitTier.ts`) and two columns:

```text
┌─ Candidate Fit ─── [Yes · 82%] ─────────────────────────────┐
│  ESSENTIAL CRITERIA           DESIRABLE CRITERIA            │
│  ✓ Master's in Info Systems   ✓ UN system experience        │
│  ✓ 10+ yrs product mgmt       — French (working knowledge)  │
│  ✗ PMP certification          ✓ Digital payments exposure   │
│  3 of 4 met · must-haves ✓    2 of 3 met                    │
└─────────────────────────────────────────────────────────────┘
```

Each row = one criterion with:
- ✓ green if `passed === true`
- ✗ red if `passed === false`
- — muted if `score == null` / not assessed
- Truncated `criterionText` (one line, tooltip on hover with full text + evidence quote)

Footer per column: "X of Y met" and a small "must-haves ✓ / ✗" pill on the essential side.

If no AI scoring exists yet → render a single muted line "Awaiting AI scoring" and skip the columns.

### Data source

All from `application.screening_scores.rubric_breakdown` (already loaded for the existing Match badge):
- **Essential column**: `rubric_breakdown.criteria` (these are parsed from the "Essential Criteria" requirements) plus `educationScore` appended.
- **Must-haves pill**: derived from `criteria.filter(c => c.type === 'years_experience' || c.type === 'education').every(c => c.passed)` (same `corePass` logic the scorer uses).
- **Desirable column**: the current `score-application` function only evaluates essential criteria, so there is no AI-scored desirable data yet. For v1 the desirable column shows criteria parsed from the job's `requirements_md` "Desirable" sections as **— Not assessed** rows (read-only). A note "Desirable criteria not yet AI-scored" appears under the column. Wiring up AI scoring for desirables is out of scope here and can be a follow-up.

### Files touched

- `src/components/CandidateApplicationCard.tsx` — add the new panel block + a small helper to read desirable bullets from `application.jobs?.requirements_md` (parse "Desirable Experience" / "Desirable Education" sections with the same bullet-line regex the scorer uses). Reuse `getFitTier` for the header pill.
- `src/lib/fitTier.ts` — no change.
- No new files unless the panel grows beyond ~80 lines; in that case extract `CandidateFitSummary.tsx` in the same folder.

### Non-goals

- No DB / edge-function changes.
- No change to the existing Match badge, action row, or filters.
- No AI scoring of desirable criteria in this pass.

### Open question

Confirm placement: **between the Languages/Skills/Certs block and the Experience metric cards** (your suggestion). I'll keep it directly above Experience so it reads top-down as: profile → criteria fit → years summary.