Plan:

1. Update `/admin/affiliate-history/:id` so the “Days Worked in This Iteration” KPI turns red when the iteration reaches the 220-day limit.
2. Treat both displayed states as threshold hits:
   - `daysInIteration >= 220`, if the value is ever shown directly as 220.
   - `totalDaysWorked > 0 && totalDaysWorked % 220 === 0`, because the current modulo logic displays `0 / 220` exactly when a 220-day cycle has been completed.
3. Apply red/destructive styling to the KPI value and `/ 220` suffix only when the threshold is reached, leaving the card layout unchanged.

Technical details:
- File to edit: `src/pages/AffiliateContractHistory.tsx`.
- Add a boolean such as `hasReachedIterationLimit` near the existing `daysInIteration` calculation.
- Use a conditional class on the `<h3>` for “Days Worked in This Iteration”, e.g. normal styling by default and `text-destructive` when the threshold is reached.