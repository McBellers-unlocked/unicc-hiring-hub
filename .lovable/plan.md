## Investigation: Why Some GSM↔Samsaran Records Aren't Joining

### What I found in `users_clean`

- `alberca@unicc.org` exists as **two rows**:
  - GSM row → `match_key = sn:s305687` (staff number `S305687`, no Samsaran data)
  - Samsaran row → `match_key = em:alberca@unicc.org` (no staff number, same email)
- This pattern is widespread, not isolated:
  - **335** distinct emails appear on more than one row.
  - **332 of 341** Samsaran-only rows have a blank `samsaran_staff_number`.
  - GSM rows almost always have a staff number; Samsaran rows almost never do.

### Root cause

In `src/pages/ImportUserbase.tsx`, `keyOf()` builds the merge key with **staff number first, email as fallback**:

```ts
if (sn) return `sn:${sn}`;
if (em) return `em:${em}`;
```

So for someone like Alberca:

- GSM extract has staff number → key becomes `sn:s305687`
- Samsaran extract has **no staff number** (Samsaran simply doesn't carry it for most workers) → key falls back to `em:alberca@unicc.org`

The two keys never collide, so `outerJoin()` writes **two separate rows**, and on persistence the unique constraint on `match_key` happily keeps both. The "outer join" is actually keying each side on a different column whenever Samsaran is missing the staff number — which is the norm, not an exception.

A second, smaller contributor: case/whitespace. `keyOf` already lowercases and trims, so that's fine — the dominant cause is the asymmetric key strategy above.

### Fix plan (two parts)

**1. Two-pass match in `outerJoin()` (`src/pages/ImportUserbase.tsx`)**

Replace the current single-key approach with an index that lets a Samsaran row find its GSM partner by **either** staff number **or** email, and vice-versa. Email matching should be prioritized.

- Build the GSM map first, indexing each GSM row under **both** keys it owns: `sn:<staff>` *and* `em:<email>` (whichever exist).
- For each Samsaran row, look up by `sn:<staff>` first, then by `em:<email>`. If either hits, merge into that GSM row and mark `source = 'both'`.
- Only if neither lookup hits, insert a new Samsaran-only row.
- Pick a **canonical** `match_key` per merged row, preferring `sn:` when available, else `em:`. This becomes the upsert conflict target.

**2. Reconcile the existing duplicates already in `users_clean**`

A one-time SQL migration that, for every email present in both a GSM-only row and a Samsaran-only row:

- Copies the Samsaran columns onto the GSM row (`first_name`, `last_name`, `search_name`, `samsaran_gender`, `samsaran_staff_number`, `samsaran_email_address`, `worker_type`, `intern`, `unit`, `job_title`, `line_manager`, `office_location`, `division`).
- Sets that row's `source = 'both'` and refreshes `imported_at`.
- Deletes the now-redundant Samsaran-only row.

Match on `LOWER(TRIM(gsm_email_address)) = LOWER(TRIM(samsaran_email_address))`. Only collapse pairs where the GSM row's `samsaran_email_address` is currently null/empty (i.e. genuinely unmerged), to avoid touching rows that were intentionally separate.

### Out of scope

- Changing the unique constraint shape (still keyed on `match_key`, just chosen more robustly).
- Cross-import fuzzy matching on names — staff number + email is sufficient to fix the observed cases.