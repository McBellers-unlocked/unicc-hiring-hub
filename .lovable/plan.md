## Fix: Deduplicate Owner Dropdown

The Supabase `.or()` filter **is working correctly** — it only returns users matching LAVAL, NEGYESI, VALENTE, ARISTA, LEHTINEN. However, there are **duplicate entries** in the database (e.g., 3× "Matt Valente", 2× "Matthew Valente"), which makes the dropdown look like it's showing "everyone." Just [valente@unicc.org](mailto:valente@unicc.org) - just [unicc.org](http://unicc.org) addresses

&nbsp;

### Plan

**File**: `src/pages/StrategyTracker.tsx`

1. **Deduplicate by name** — After fetching, filter to unique names so each person appears once. Use a `Map` or `Set` on the `name` field.
2. **Normalize names** — Pick one canonical entry per person (e.g., first occurrence alphabetically) to avoid "Matt Valente" vs "Matthew Valente" duplicates. Alternatively, hardcode the 5 display names and match by surname pattern.

Given the messy data, the cleanest approach: keep the Supabase query for validation but deduplicate client-side by surname, showing only one entry per person.