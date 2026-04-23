

## Import: Duplicate Check + Outer Join Merge

### Changes — `src/pages/UnitsAndDivisions.tsx` (`handleImportFile`)

**1. Duplicate check on the imported file**
Before merging, scan the parsed rows for duplicate values in the `Unit` column (case-insensitive, trimmed). Empty `Unit` values are also rejected since the field is the primary key.

- If any `Unit` is blank → `toast.error("Import failed: every row must have a 'Unit' value (primary key).")` and abort (no state change).
- If duplicates are found → `toast.error("Import failed: duplicate Unit values found: <code1>, <code2>…")` (list up to 5), and abort.

**2. Outer-join merge against current active rows**
Replace the current "replace all active rows" behavior with an outer join keyed on `Unit` (case-insensitive):

- For each imported row:
  - If a matching `Unit` exists in `activeRows` → **update** that row in place with imported values (`fullName`, `parentSection`, `division`, `manager`, and `unit` normalized to the imported casing). Keep its existing `id` so React keys / selection remain stable.
  - If no match → **add** as a new row with a fresh id (`imp-<timestamp>-<idx>`).
- Active rows whose `Unit` is **not** present in the imported file are **kept as-is** (outer join — no deletions).
- Decommissioned rows are untouched. However, also reject the import if any imported `Unit` collides with a `Unit` already in `decommissionedRows` — toast: `"Import failed: Unit '<code>' exists in Decommissioned. Restore it first or change the code."` (prevents two rows sharing the same primary key across tabs).

**3. Result toast**
After a successful merge, show a summary: `Imported: <added> added, <updated> updated, <untouched> kept.`

### Notes
- All checks are pre-flight: state is only mutated once every validation passes, so a failed import leaves the table unchanged.
- No schema changes; behavior is purely client-side.
- CSV parser, template download, and decommission flow are unchanged.

