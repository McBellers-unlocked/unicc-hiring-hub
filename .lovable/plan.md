

## Add Pillar Group Headers to HR Strategy Tracker View

### What
Add the same pillar section header rows that exist in the public/management view (`StrategyTrackerPublic.tsx`) to the main HR view (`StrategyTracker.tsx`).

### Implementation

**File: `src/pages/StrategyTracker.tsx`**

1. Track `lastPillar` before the sorted `.map()` call (using a closure variable, same pattern as the public page).
2. Inside the `.map()`, check if the current item's pillar differs from `lastPillar`. If so, render a full-width header row with the pillar name styled as `bg-primary/5` with uppercase tracking text.
3. Update `lastPillar` after the check.
4. The header row spans all 6 columns (`colSpan={6}`), matching the public view exactly.

This is a small change — roughly 10 lines added to the existing `.map()` block.

