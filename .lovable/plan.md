

## Link Strategy Tracker Owners to Users Table

### What to do

**File**: `src/pages/StrategyTracker.tsx`

1. **Fetch users from Supabase** — Add a query to fetch users from the `users` table (id, name) to populate the Owner dropdown dynamically instead of using the hardcoded `OWNERS` array.

2. **Update Owner dropdown** — Replace the static `OWNERS.map()` with the fetched users list. Store the user's `name` as the owner value (keeping string-based storage in localStorage for simplicity). Filter to relevant users — likely those with `personnel_type = 'Staff'` or similar, sorted alphabetically.

3. **Remove hardcoded OWNERS constant** — Delete the static array since it's no longer needed.

### Technical Details

- Use `useQuery` from `@tanstack/react-query` (already a project dependency) to fetch users
- Query: `supabase.from('users').select('id, name').not('name', 'is', null).order('name')` — may want to filter by personnel_type or role to keep the list relevant
- The owner field continues to store the user's name string, so existing localStorage data remains compatible
- No database changes needed

