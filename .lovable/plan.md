

## Add Two KPI Cards to Affiliate Contract History

### Overview
Add two KPI cards at the top of the `/admin/affiliate-history/:id` page, between the page header and the Contract Records card.

### KPI Definitions

1. **Total Days Worked** -- Sum of all `days_worked` values across every contract record for this affiliate.
2. **Days Worked in This Iteration** -- The remainder after dividing the total by 220 (`total % 220`). Every time the cumulative total exceeds 220, the counter resets and starts counting again from 0.

### Changes (single file: `src/pages/AffiliateContractHistory.tsx`)

1. **Add a `useMemo` block** that computes both KPIs from the existing `rows` data:
   - `totalDaysWorked`: sum of all `row.days_worked` values (treating null as 0).
   - `daysInIteration`: `totalDaysWorked % 220`.

2. **Add two KPI cards** in a responsive grid (`grid grid-cols-2 gap-4`) placed between the page header and the Contract Records card. Each card will display a label and the computed number using the existing `Card`/`CardHeader`/`CardContent` components.

### No database or other file changes needed
All data is already available from the existing query.
