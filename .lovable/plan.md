## Update Import Userbase review controls

In `/admin/import-userbase`, adjust the “Review changes before saving” step so routine service-time-only updates do not clutter the review, and reviewers can reject individual rows before confirming.

### 1. Auto-approve service-time-only updates

- Treat rows whose only changed field is `Service time (Current Organization)` / `service_time_current_org` as auto-approved.
- Do not display those rows as “updated” in the default review list.
- Keep them included in the final save payload by default, so the incoming service time still overwrites the current Supabase value.
- Update counts/labels so the visible “Updated” count reflects rows that need review, while a small note can indicate how many service-time-only rows will be auto-approved.

### 2. Add per-row reject action

- Add a “Reject” button/action on each review row for `new` and reviewable `updated` records.
- When a row is rejected:
  - it is visually marked as rejected or removed from the pending save count,
  - it will not be included in the save operation,
  - for an existing Supabase row, the current Supabase row remains unchanged,
  - for a new row, no new row is inserted.
- Allow rejected rows to be restored before confirming, using an “Undo” / “Restore” action.

### 3. Save only approved rows without wiping rejected rows

Current save logic deletes all rows from `users_clean` and reinserts the full parsed dataset. That would overwrite rejected rows anyway, so it must change.

Implement save as a merge:

- Fetch/index existing rows before review and keep enough identity data to know whether a parsed row already exists.
- On confirm:
  - insert approved `new` rows,
  - update approved `updated` rows,
  - include auto-approved service-time-only updates,
  - skip rejected rows entirely.
- Do not delete the entire `users_clean` table during this flow.

### 4. Technical details

Files to update:

- `src/lib/userbaseChangeSet.ts`
  - add metadata to each `RowChange`, including whether it is service-time-only and the existing row `id` when matched.
  - keep existing matching by staff number/email.

- `src/components/userbase/ImportChangePreview.tsx`
  - add rejected row state/props or controlled rejected IDs from parent.
  - add per-row Reject/Restore buttons.
  - hide or de-emphasize service-time-only updates from the default review list.
  - adjust pending counts and confirm button text to exclude rejected rows.

- `src/pages/ImportUserbase.tsx`
  - keep track of rejected rows.
  - replace full delete/reinsert with insert/update operations for approved rows only.
  - pass rejection controls into `ImportChangePreview`.

### Out of scope

- New database tables or Supabase schema changes.
- Changing the CSV/GSM/Samsaran parsing rules.
- Editing individual field-level diffs inside the review screen; this request rejects or accepts an entire row.