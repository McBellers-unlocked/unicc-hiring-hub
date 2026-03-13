

## Add Owners & Show First Names

### Changes to `src/pages/StrategyTracker.tsx`

1. **Add ROMANO and GUARDENO to the query filter** (line 116): append `name.ilike.%ROMANO%,name.ilike.%GUARDENO%` to the `.or()` clause.

2. **Add to surnames dedup array** (line 119): `["LAVAL", "NEGYESI", "VALENTE", "ARISTA", "LEHTINEN", "ROMANO", "GUARDENO"]`.

3. **Show first names instead of surnames** (line 302): Change `o.split(" ").pop()` to `o.split(" ")[0]` so the trigger button displays first names (e.g. "Frederic, Anna" instead of "LAVAL, NEGYESI-MOUYSSET").

### Files modified
- `src/pages/StrategyTracker.tsx` only

