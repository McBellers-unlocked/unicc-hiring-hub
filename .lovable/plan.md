

## Automatic Scoring on Application Submission

### Current State

A trigger (`auto_score_application`) already exists on the `applications` table, but it has two problems preventing it from working:

1. **AFTER UPDATE only, not INSERT** — When a candidate applies and PHF data is imported (often as an INSERT with `phf_completed = true`), the trigger never fires because it only listens for UPDATE events.

2. **Stale version check** — The trigger checks `NOT EXISTS (... WHERE version = '2.0')`, but the current pipeline writes `version = '4.0'`. So even if the trigger fires on an update, it thinks no score exists (because it's looking for v2.0) and would re-score unnecessarily, or worse, the check doesn't prevent duplicates.

### Proposed Fix

One migration to replace the trigger function and re-create the trigger:

**1. Update `trigger_application_scoring()` function:**
- Add `AFTER INSERT` to the trigger (alongside `AFTER UPDATE`)
- For INSERT: fire when `phf_completed = true` at insert time
- For UPDATE: keep existing logic (fire when `phf_completed` flips to true or status changes to Application/Screening)
- Fix the duplicate check to look for `version = '4.0'` instead of `'2.0'`
- Keep the existing `net.http_post` call pattern (already working for individual scoring)

**2. Re-create the trigger:**
```sql
DROP TRIGGER IF EXISTS auto_score_application ON public.applications;
CREATE TRIGGER auto_score_application
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_application_scoring();
```

**3. Guard against batch overlap:**
- The per-application trigger will score individually as each application arrives
- Batch scoring remains available for bulk re-scoring
- The `onConflict: 'application_id,pipeline_version'` upsert in `score-application` already prevents duplicate scores if both trigger and batch run

### No edge function changes needed
The `score-application` function already handles single-application scoring. The trigger just needs to invoke it correctly.

### Expected result
- Candidate submits PHF → application row inserted/updated with `phf_completed = true` → trigger fires → `score-application` called automatically → score appears within ~45s
- No manual "Score All" needed for new applications
- Batch scoring still works for re-scoring existing applications

