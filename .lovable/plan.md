

## Add Two Contract Break KPI Cards

### Overview
Add two new KPI cards next to the existing ones on the Affiliate Contract History page.

### KPI Definitions

1. **Contract Break Starting On** -- If `daysInIteration` equals 220 (i.e. the iteration is exactly complete), display the day after the most recent `end_date` among all contract records. Otherwise, display "—" (blank).

2. **Contract Break Ending On** -- If "Contract Break Starting On" has a value, add 31 calendar days to it and display that date. Otherwise, display "—" (blank).

### Changes (single file: `src/pages/AffiliateContractHistory.tsx`)

1. **Add a `useMemo` block** to compute `contractBreakStart`:
   - If `daysInIteration === 220` (which is equivalent to `totalDaysWorked > 0 && totalDaysWorked % 220 === 0`), find the most recent `end_date` across all rows, then add 1 day.
   - Otherwise, return `null`.

2. **Add a `useMemo` block** to compute `contractBreakEnd`:
   - If `contractBreakStart` is set, add 31 days.
   - Otherwise, return `null`.

3. **Update the grid** from `grid-cols-2` to `grid-cols-4` and add two new Card components displaying the computed dates (formatted via `toLocaleDateString()`) or "—" when null.

### Note on iteration edge case
When `totalDaysWorked % 220 === 0` and `totalDaysWorked > 0`, the current `daysInIteration` shows `0` (not `220`). The logic will treat this as the completed-iteration trigger (i.e., check `totalDaysWorked > 0 && totalDaysWorked % 220 === 0`) rather than checking for exactly `220`.

