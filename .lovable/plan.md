

## Show All Parsed Columns in Userbase Table

Make the Userbase table display every column produced by the GSM + Samsaran merge (the full `MAPPED_COLUMNS` list from `src/lib/userbaseChangeSet.ts`), instead of the current reduced subset.

### Change — `src/pages/Userbase.tsx`

1. **Column definitions**: Replace the current hand-picked `COLUMNS` array with the full set from `MAPPED_COLUMNS` (import from `@/lib/userbaseChangeSet`). Each entry maps DB column → human label, already aligned with what the importer writes.
2. **Default visibility**: All mapped columns visible by default. The existing column show/hide toggle (already in the page) keeps users in control if they want to narrow the view.
3. **Select query**: Update the Supabase `.select(...)` to request every DB column in the mapped list (plus `id`, `imported_at`, `source`, `match_key` for row identity / badges).
4. **Sort + filter columns**: Keep current sortable columns; sortability stays driven by the column definition. No change to server-side filter logic.
5. **CSV export**: Export now includes all visible columns automatically (existing logic already iterates over visible columns).
6. **Editable cells**: Inline edit continues to work for all text columns; date columns (`date_of_birth`, `apa_start_date`, contract dates, etc.) remain editable as plain text — Postgres column types enforce format, errors surface in the existing toast.

### Single source of truth
Both the importer preview and the Userbase table now read from `MAPPED_COLUMNS`, so any future column added to the import shows up in both places automatically.

### Out of scope
- Reordering columns by drag-and-drop.
- Per-column type-aware editors (date pickers, dropdowns) — text input remains.
- Adding bookkeeping columns (`imported_by`, `imported_at`) to the table; they stay hidden.

