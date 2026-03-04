

# Add Samsaran PR to Lifecycle Management Info Card

## Change
In `src/pages/AffiliateLifecycle.tsx`, add a "Samsaran PR" field between the "Record #" and "Start Date" items in the contract info grid. The `contract` object already contains `samsaran_pr` from the query. The grid will change from 4 columns to 5.

## Implementation
1. Change the grid from `md:grid-cols-4` to `md:grid-cols-5` (line 269)
2. Insert a new grid item after the Record # block (after line 276) showing `contract?.samsaran_pr || 'N/A'` with a `FileText` icon and "Samsaran PR" label

