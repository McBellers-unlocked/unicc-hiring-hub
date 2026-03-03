

## Diagnosis: Two Root Causes for Missing Scores

### Problem 1: Old edge function is still deployed
The logs show `"OpenAI API error: 401"` — but this string doesn't exist anywhere in the current `score-application/index.ts` source code. This means the **old version** (which calls OpenAI directly) is still running on Supabase, not the new v4.0 code that uses the Lovable AI Gateway. The edge function needs to be redeployed.

### Problem 2: Upsert fails with `42P10` — ON CONFLICT mismatch
The logs also show: `"there is no unique or exclusion constraint matching the ON CONFLICT specification"`. The unique constraint `(application_id, pipeline_version)` exists, but `pipeline_version` is **nullable** (default `'3.0'`). PostgreSQL's `ON CONFLICT` does not work reliably with nullable columns in unique constraints. The column must be `NOT NULL`.

### Fixes

**1. Database migration** — Make `pipeline_version` NOT NULL:
```sql
UPDATE screening_scores SET pipeline_version = '3.0' WHERE pipeline_version IS NULL;
ALTER TABLE screening_scores ALTER COLUMN pipeline_version SET NOT NULL;
```

**2. Redeploy the edge function** — The current source code in the repo is correct (uses Lovable AI Gateway), but it hasn't been deployed. Trigger a deploy of `score-application`.

**3. After both fixes** — Re-run scoring. The v4.0 pipeline will use the Lovable AI Gateway (no OpenAI key needed), save scores via upsert, and the UI will display them.

### Files to modify
| File | Change |
|---|---|
| Migration SQL | `ALTER TABLE screening_scores ALTER COLUMN pipeline_version SET NOT NULL` |
| `supabase/functions/score-application/index.ts` | Redeploy (no code change needed) |

