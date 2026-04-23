

## Editable Userbase Table + Missing-Values Warning Panel

### 1. Inline editing — `src/pages/Userbase.tsx`

**Interaction model**
- Double-click any cell (or single click a small pencil affordance on hover) to enter edit mode for that cell.
- The cell becomes a focused input/textarea (`<Input>` for short text, `<Textarea>` for fields like `reporting_lines`/`line_manager`).
- `Enter` or blur → save. `Esc` → cancel without saving.
- Keyboard navigation: `Tab` moves to the next visible cell in the row.

**Save flow**
- On commit, fire an optimistic update of the React Query cache for `['users_clean', …]` so the new value is immediately visible.
- Issue `supabase.from('users_clean').update({ [column]: newValue, imported_at: now() }).eq('id', row.id)`.
- On success: tiny toast "Saved" (debounced — only show on first save in a 3s window to avoid noise).
- On failure: revert cache, show destructive toast with the Postgres error message.
- Date columns (`first_incumbency_start_date`, `entry_on_duty_date_who`) — use a date input; empty string → write `null`.
- Text columns: trim; empty string → write `null` so warning panel picks it up.

**Permissions**
- RLS already grants `UPDATE` to `Admin` and `HR Assistant`. For other roles the cell stays read-only (cursor `default`, no edit affordance). Detect role via existing `useAuth`/`useUserRole` pattern used elsewhere in the app (look up the actual hook during implementation; fall back to checking role via a one-shot `users` lookup if no hook exists).

**No schema change required** — `users_clean` columns are already nullable text/date.

### 2. Missing-values warning panel — new section below the table

A second card titled **"Rows with missing values"** sits under the main table inside the same page container.

**What it shows**
- For each row in `users_clean` that has at least one blank/null value in a configurable set of "required" columns, display:
  - Full Name (or staff number / email if name missing)
  - Source (`gsm` / `samsaran` / `both`) as a badge
  - Worker type
  - A list of missing field labels rendered as small destructive-tinted badges (e.g. `Division`, `Unit`, `Job Title`).
- Required columns checked (chosen as the operationally important set):
  `full_name, samsaran_email_address, gsm_email_address, division, unit, job_title, worker_type, office_location, line_manager, category`.
  A row is flagged if **any** of these are null/empty.

**Toolbar**
- A `Worker type` filter (`Select` with options derived from distinct `worker_type` values + an "All" option). Filters the warning list only.
- Count badge: "N rows need attention".
- Optional small "Export missing" button → CSV of the warning rows (id, name, email, worker_type, missing_fields joined with `;`). Reuses the existing SheetJS export helper.

**Data fetching**
- Separate React Query: `['users_clean:missing', { workerType }]`.
- Query selects only the columns needed for the check + display, with `.or()` predicate covering `is null` for each required column (e.g. `full_name.is.null,division.is.null,…`). Plus `worker_type.eq.<value>` when a filter is active.
- For empty-string detection (since some fields may be `''` rather than `null`), apply a client-side filter after fetch on the same row set — cheap because the query already narrows to flagged rows.
- Pagination: simple "Show 50 / 100 / all" select; default 50. Server-side `.range()` mirroring the main table pattern.
- Invalidate this query after any cell save so warnings update live.

**Layout**
- Card with header (title + filter + count), then a compact `Table` (Name, Source, Worker Type, Missing Fields). Sticky header inside `max-h-[40vh] overflow-auto` to keep the page scrollable.

### 3. Small UX touches
- Edited cells briefly flash a subtle background (`bg-success/10` 600ms) on successful save.
- Cells in the "required" set that are blank get a thin destructive left border in the main table — visual link to the warnings panel.
- Subtitle in page header gains "· editable" tag so users know rows are mutable.

### Technical notes
- All edits go through `supabase.from('users_clean').update(...).eq('id', id)` — no edge function needed.
- `imported_at` is touched on each edit so the page subtitle ("last imported …") reflects manual updates too.
- React Query invalidations: after a save, invalidate both `['users_clean', …]` (current page) and `['users_clean:missing', …]` (warning panel). Distinct-value queries (`['users_clean:distinct', col]`) are also invalidated when the edited column is one of the filter columns (`division`, `unit`, `worker_type`, `category`, `source`, `office_location`).
- Column show/hide, sort, server-side filters, pagination, and CSV export already in place are unchanged.

### Out of scope
- Bulk edit / multi-row selection.
- Field-level validation rules (e.g. enforcing date format) — relying on Postgres column types.
- Audit log of who changed what (could later be wired into `audit_logs` via a trigger if desired).

