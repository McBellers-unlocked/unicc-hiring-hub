# Add Yes / Maybe / No fit tiers for AI match scores

Introduce a simple "fit tier" derived from the AI match score, shown wherever candidates are listed in Application Management, plus a new filter and sort option.

## Tier definition

Single shared helper so the rule lives in one place:

- **Yes** — score ≥ 75% (green)
- **Maybe** — 50% ≤ score < 75% (amber)
- **No** — score < 50% (red) — does not meet education / essential experience
- **Not scored** — no AI score yet (neutral)

New file: `src/lib/fitTier.ts` exporting `getFitTier(score)` returning `{ tier, label, badgeClass, borderClass }`.

## UI changes

1. **`src/components/CandidateApplicationCard.tsx`**
   - Replace the existing 4-bucket `getScoreBadge` and `getCardBorderClass` with the shared helper.
   - Render the fit tier as a prominent pill (e.g. `Yes · 82%`) next to the existing match score, using the tier color.
   - Left border color follows the tier (green / amber / red / neutral).

2. **`src/pages/AdminApplications.tsx`**
   - Update `getScoreBadge` to use the shared helper so admin list, kanban cards, and any score chips render the same Yes/Maybe/No pill.
   - Add a new **Fit** filter (`yes` / `maybe` / `no` / `not_scored`) alongside the existing AI score filter, or replace the current `aiScoreFilter` thresholds with the new tier thresholds (recommended: replace, since tiers supersede the old 80/70 cutoffs). Filter options: All / Yes (≥75%) / Maybe (50–74%) / No (<50%) / Not scored.
   - Add a "Fit tier (Yes → No)" option to the sort dropdown.
   - When grouping by phase, optionally show small tier counters (e.g. `Yes 4 · Maybe 7 · No 12`) under the Applications and Longlist phase cards.

3. **Legend** — add a one-line legend above the application list explaining the thresholds so reviewers understand the cutoffs.

## Non-goals

- No DB schema change — tiers are derived from the existing `screening_scores.ai_score`.
- No change to the AI scoring pipeline, longlist tier_1/tier_2 ratings, or panel interview recommendation logic.
- No automated stage transitions based on tier (manual review still required).

## Open question

Thresholds proposed: **≥75 Yes, 50–74 Maybe, <50 No**. Confirm or adjust before implementation. WIPO's message said "above 75%" and "50% is Maybe" so this matches; flag if you want strict `>75` instead of `≥75`.
