

## Unify Gender column in Userbase import

Currently the merge keeps two separate columns — `GSM Gender` (`gsm_gender`) and `Samsaran Gender` (`samsaran_gender`) — to avoid overwrites when both files disagree. This change collapses them into a single `Gender` column at parse time, with a clear precedence rule.

### Precedence rule
For each merged row:
1. If GSM gender is non-empty → use GSM value.
2. Else if Samsaran gender is non-empty → use Samsaran value.
3. Else → empty.

(So GSM always wins on conflict; either side fills in when the other is blank.)

Both inputs continue to flow through the existing `normalizeGender` helper (Female → Woman, Male → Man) before precedence is applied.

### Changes — `src/pages/ImportUserbase.tsx`

1. **Merge step (`outerJoin`)**: After both GSM and Samsaran values are written into the merged row, compute a unified `Gender` field using the rule above. Drop `GSM Gender` and `Samsaran Gender` from the output column list; replace with a single `Gender`.
2. **Column lists**:
   - Remove `Gender` from `OVERLAP_RENAMES` (no longer split).
   - `GSM_OUT_COLUMNS` keeps `Gender` (raw GSM gender stays under that label internally during transform).
   - `SAMSARAN_OUT_COLUMNS` keeps `Gender` (same).
   - Final merged columns expose **one** `Gender` column instead of two.
3. **DB mapping (`COLUMN_TO_DB`)**: Map the unified `Gender` → `gsm_gender` (reuse the existing column as the canonical store). Stop writing to `samsaran_gender` from the importer; the column stays in the table for now but receives `null` on every import going forward.
4. **Preview diff**: Because `MAPPED_COLUMNS` (in `src/lib/userbaseChangeSet.ts`) drives both the change preview and the Userbase table, update it to:
   - Replace the two gender entries with a single `{ label: 'Gender', db: 'gsm_gender' }`.
   - Remove the `samsaran_gender` entry.

### Changes — `src/pages/Userbase.tsx`
No code change needed: it reads columns from `MAPPED_COLUMNS`, so the unified `Gender` column appears automatically and `Samsaran Gender` disappears from the table view.

### Data already in DB
Existing rows keep their `gsm_gender` / `samsaran_gender` values until the next import. On the next successful import, `gsm_gender` is rewritten with the unified value (GSM-prevails), and `samsaran_gender` is set to null. No backfill migration is run; the data converges naturally on next parse + save.

### Out of scope
- Dropping the `samsaran_gender` column from the database schema.
- Backfilling historical rows that were imported before this change without re-running the import.
- Changing precedence for any other overlapping fields (Staff Number, Email) — those keep dual columns.

