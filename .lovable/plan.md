## Add unmatched GSM/Samsaran comparison tab

In `/admin/import-userbase`, add another tab inside “Review changes before saving” that lists source rows that do not match between GSM and Samsaran.

### 1. Compute unmatched extract rows during parse

After parsing both files:

- Build match keys using the same logic as the merge process:
  - email  first,
  - staff number fallback,
  - ignore blank/anonymous fallback rows for meaningful cross-file matching.
- Compare:
  - GSM rows against Samsaran rows where `Worker type === 'Staff'` only.
  - Samsaran Staff rows against GSM rows.
- Exclude Samsaran rows with `Worker type === 'Affiliate'` from this comparison only.

Result categories:

- `GSM only`: exists in GSM, no matching Samsaran Staff row.
- `Samsaran Staff only`: exists in Samsaran as Staff, no matching GSM row.

### 2. Add a new tab in the review component

Update `ImportChangePreview` tabs to include:

```text
All changes | New | Updated | Unchanged | Unmatched extracts
```

The new tab will show a table with:

- Source: `GSM only` or `Samsaran Staff only`
- Name
- Email
- Staff number
- Worker type, for Samsaran rows

This tab is informational and does not require approve/reject controls.

### 3. Preserve current save behavior

- Do not change the existing merge/save rules from the previous update.
- Rejected rows remain skipped.
- Service-time-only updates remain auto-approved.
- The unmatched tab does not block saving and does not create separate database actions.

### Files to update

- `src/pages/ImportUserbase.tsx`
  - compute unmatched GSM/Samsaran Staff rows during parse.
  - store and pass them into the preview component.
  - clear unmatched state when cancelling/resetting preview.
- `src/components/userbase/ImportChangePreview.tsx`
  - add `unmatchedRows` prop/type.
  - add the “Unmatched extracts” tab and render the informational table.

### Out of scope

- Changing how rows are merged into `users_clean`.
- Excluding Affiliates from import/save generally; Affiliates are excluded only from this unmatched comparison, as requested.