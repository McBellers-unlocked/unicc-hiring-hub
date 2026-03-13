

## Filter Owner Dropdown to 5 Specific Users

**File**: `src/pages/StrategyTracker.tsx`

Add a filter to the Supabase query (or post-query filter) to only include users whose names contain: LAVAL, NEGYESI, VALENTE, ARISTA, LEHTINEN.

Use an `.or()` filter with `name.ilike` patterns, or filter client-side after fetch. This keeps the dropdown limited to exactly those 5 people.

