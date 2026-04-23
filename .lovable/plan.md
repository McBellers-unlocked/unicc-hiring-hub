

## Switch Userbase Import from Wipe-and-Replace to Upsert (Outer Join)

### Problem
Current `handleParse` in `src/pages/ImportUserbase.tsx` deletes all rows in `users_clean` before inserting the new batch. This destroys historical rows that aren't present in the latest GSM/Samsaran extracts.

### Goal
Each new import should **outer-join into `users_clean`**: existing rows matched by `match_key` are updated in place; new rows are inserted; rows already in `users_clean` that aren't in the new import are left untouched.

---

### 1. Database — add unique constraint on `match_key`

`upsert(..., { onConflict: 'match_key' })` requires a unique index. Migration:

```sql
-- Drop rows with null/empty match_key (cannot be uniquely matched)
delete from public.users_clean where match_key is null or match_key = '';

-- Enforce uniqueness so upsert can target it
alter table public.users_clean
  add constraint users_clean_match_key_unique unique (match_key);
```

The existing non-unique `users_clean_match_key_idx` stays (Postgres uses the new unique index for lookups too; the old one is harmless but can be dropped in the same migration to keep things clean).

### 2. `src/pages/ImportUserbase.tsx` — replace delete+insert with upsert

**Remove**
- The `supabase.from('users_clean').delete().not('id', 'is', null)` block.

**Change**
- Filter out merged rows whose `match_key` is empty (no staff number AND no email) before persisting — they cannot be deduped and would otherwise accumulate as duplicates on every import.
- Replace the chunked `.insert(batch)` loop with a chunked `.upsert(batch, { onConflict: 'match_key', ignoreDuplicates: false })` loop. Chunk size stays 500.
- Keep `imported_at` as `default now()` so each upsert refreshes the timestamp on touched rows (existing column default already handles inserts; for updates we explicitly set `imported_at: new Date().toISOString()` in `toDbRow` so refreshed rows surface as "recently imported"). Add `imported_at` to the mapped payload.
- Toast copy updates: `"Saving to database…"` → `"Merging into userbase…"`; success toast becomes `"Userbase updated — {n} records merged (existing rows refreshed, new rows added)."`

**Keep**
- All parsing, transformation, outer-join, and `match_key` derivation logic (`sn:<staff>` / `em:<email>`) exactly as is — that key is what makes upsert behave as an outer join against `users_clean`.
- `sessionStorage` cache + navigate to `/admin/userbase`.

### 3. `src/pages/Userbase.tsx` — no changes required

Server-side queries, filters, sort, pagination, and CSV export already read whatever is in `users_clean` and continue to work. Subtitle "last imported …" naturally reflects the most recent `imported_at` from upserted rows.

---

### Technical notes
- **Conflict target**: `match_key` (now unique). For a row appearing in both extracts the key is `sn:<staff_number>`; rows with only an email use `em:<email>`. Empty-key rows are dropped pre-upsert.
- **Behavior**:
  - Same person appears in new import → row updated in place (all 35 mapped columns overwritten, `imported_at` refreshed, `imported_by` updated).
  - New person → inserted with a fresh UUID.
  - Person no longer in latest extract → untouched (no deletion).
- No RLS changes needed — `Admin` / `HR Assistant` already have UPDATE on `users_clean` per the existing migration.
- One-time data hygiene: the migration deletes any pre-existing rows with null/empty `match_key` so the unique constraint can be created. These rows cannot be re-matched anyway.

### Out of scope
- Soft-delete / archival of stale rows (e.g. people who left). Can be added later as a `last_seen_in_import_at` column + filter.
- Per-column merge strategy (e.g. preserving Samsaran fields when only GSM is re-imported). Current behavior overwrites all mapped columns from the new merged row.

