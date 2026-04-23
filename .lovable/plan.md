

## Preview Changes Before Confirming Userbase Import

Add a diff/preview step between **Parse Data** and **Save to Database** so the user can see exactly which rows will be inserted, updated, or left unchanged — and for updates, which specific column values will change.

### 1. New stage in the import flow (`src/pages/ImportUserbase.tsx`)

Today the flow is: pick files → **Parse Data** (in-memory merge) → **Save to Database** (upsert). The merged preview table only shows the new merged rows; it does not compare them against what is already in `users_clean`.

New flow:
1. Pick files → **Parse Data** (unchanged: GSM + Samsaran in-memory outer join).
2. After parsing, immediately fetch the existing `users_clean` rows and compute a **change set**.
3. Render a **"Review changes"** panel above the existing merged preview.
4. **Save to Database** is disabled until the user has seen the change set; button label becomes **"Confirm and save N changes"**.

### 2. Change-set computation (client-side, in a new helper `computeChangeSet`)

Inputs: `merged` rows (from parse) + all existing `users_clean` rows (fetched in 1000-row chunks, same pattern as the Headcount page, selecting only the columns we map on import).

For each merged row, find its existing counterpart using the same matching logic the import will use (staff number first, then email, lower/trim) — so the preview matches the actual upsert behavior. Classify into:

- **New** — no existing row matches. Show all non-empty incoming values.
- **Updated** — existing row found AND at least one mapped column differs (after trim, case-insensitive for emails). Record per-column `{ column, before, after }`.
- **Unchanged** — existing row found, all mapped columns identical. Hidden by default.

Columns compared = the union of columns the importer writes (the existing `MAPPED_COLUMNS` list in `ImportUserbase.tsx`, excluding `imported_at`, `match_key`, `source` which are bookkeeping).

A small summary at the top: `X new · Y updated · Z unchanged · W fields will change`.

### 3. UI — `src/components/userbase/ImportChangePreview.tsx` (new)

Card titled **"Review changes before saving"** with:

**Toolbar**
- Tabs / segmented control: `All changes (X+Y)` · `New (X)` · `Updated (Y)` · `Unchanged (Z)` (last one collapsed by default).
- Search box (filters by name / email / staff number).
- "Show only changed columns" toggle (on by default for Updated rows).

**Table** (compact, sticky header, `max-h-[55vh] overflow-auto`)
- Columns: `Status` (badge: New / Updated), `Name`, `Email`, `Staff #`, `Source`, `Changes`.
- The `Changes` column for **Updated** rows shows a stack of small chips, one per changed field: `Division: "ICT" → "DPC"`. Long values truncate with a tooltip showing the full before/after.
- The `Changes` column for **New** rows shows a single chip `+ N fields populated` and expands on click to a key→value list.
- Row click opens a side panel (`Sheet`) with full per-field diff for that record using the existing `InlineTrackChanges` component already in the project — reuse, don't reinvent.

**Footer**
- `Cancel` (returns to file pick) · `Confirm and save N changes` (primary). The confirm button is disabled if `X + Y === 0` and shows "Nothing to save".

### 4. Save flow changes
- `handleSave` (existing) is unchanged in mechanics but only runs after explicit confirmation from the new panel.
- After save, the success toast already shown gains a one-line breakdown: `N new, M updated`.

### 5. Performance
- The change-set fetch reuses the chunked pattern (1000 rows per `.range()` call). The dataset is small (a few thousand rows) so doing this entirely client-side is fine and avoids any new edge function.
- Computation memoized with `useMemo` keyed on `(merged, existingRows)`.

### Technical notes
- All logic is client-side; no schema changes, no edge functions, no SQL migration.
- Reuses `InlineTrackChanges` (`src/components/InlineTrackChanges.tsx`) for the per-row deep view.
- Keys for matching mirror the importer's `keyOf` exactly — when the upcoming two-pass match fix lands, this preview must use the same matcher (single source of truth: extract `keyOf` / `matchExisting` into `src/lib/userbaseMatching.ts` and import it from both the importer and the preview).

### Out of scope
- Letting the user edit individual proposed values before saving (they can already edit any cell post-save on the Userbase page).
- Per-row opt-out (skip just one row from the import). Can be added later if needed.
- Diffing rows that exist in DB but are absent from the new files (i.e. flagging "stale" rows) — current import already preserves them; surfacing them is a separate feature.

