

## Fix Owner Selection to Show All 7 Team Members

### Problem
The owner dropdown queries the `users` table filtering by surname. ROMANO, GUARDENO, and LEHTINEN likely don't have matching records in the database, so only 4 users appear.

### Solution
Replace the Supabase query with a hardcoded list of team members. This guarantees all 7 owners always appear regardless of database state.

### Changes to `src/pages/StrategyTracker.tsx`

1. **Remove the `useQuery` hook** for fetching users from Supabase.

2. **Define a static `OWNERS` array** with all 7 team members:
   ```
   Frederic LAVAL
   Anna NEGYESI-MOUYSSET
   Matthew VALENTE
   Diego ARISTA VINAIXA
   Olga LEHTINEN
   Francesca ROMANO
   Isabel GUARDENO
   ```

3. **Update the owner dropdown** to use the static list instead of `users` from the query.

4. **Owner display** already shows first names via `o.split(" ")[0]` — no change needed there.

### Files modified
- `src/pages/StrategyTracker.tsx` only

