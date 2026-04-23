

## Import: Skip Rows Matching Decommissioned Units

### Change — `src/pages/UnitsAndDivisions.tsx` (`handleImportFile`)

Currently, if an imported `Unit` matches a record in the **Decommissioned** tab, the entire import is **rejected**. Update this behavior to instead **silently skip** those rows and continue importing the rest.

**New behavior**
- Build a lookup set of decommissioned `Unit` codes (case-insensitive, trimmed).
- While iterating imported rows, partition them into:
  - `skipped[]` — imported rows whose `Unit` exists in `decommissionedRows` (do not add, do not update, do not touch the decommissioned record).
  - `toMerge[]` — remaining rows, which proceed through the existing outer-join merge against `activeRows` (update if Unit matches active, add if new).
- Decommissioned rows remain untouched in all cases.

**Validation order (unchanged for the first two)**
1. Reject if any imported `Unit` is blank.
2. Reject if the imported file contains internal duplicate `Unit` values.
3. **(Replaces current rule)** Decommissioned collisions no longer abort the import — they are skipped.

**Result toast**
Update the summary to include skipped count:
`Imported: <added> added, <updated> updated, <skipped> skipped (decommissioned), <untouched> kept.`

If `skipped > 0`, also emit a secondary `toast.info` listing up to 5 skipped Unit codes:
`Skipped decommissioned units: <code1>, <code2>… Restore them first to update.`

### Notes
- Pre-flight validation still runs before any state mutation.
- No schema changes; purely client-side.
- Decommission/restore flow, CSV parser, and template download are unchanged.

