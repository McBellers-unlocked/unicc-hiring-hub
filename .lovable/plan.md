

## Import Result Dialog — Show Added & Modified Units

### Change — `src/pages/UnitsAndDivisions.tsx`

Replace the post-import success toast with a modal dialog that lists exactly which units were added and which were updated, so the user can verify the outcome before continuing.

**1. Track per-unit outcomes during merge**
Inside `handleImportFile`, while iterating `toMerge`, push the imported `unit` code into one of two arrays:
- `addedUnits: string[]` — rows with no matching active `Unit` (newly inserted).
- `updatedUnits: string[]` — rows whose `Unit` matched an existing active row (overwritten in place).
- `skippedUnits` (existing) — rows matching a decommissioned `Unit`.

**2. New state + dialog**
- Add state: `importResult: { added: string[]; updated: string[]; skipped: string[] } | null` and `importResultOpen: boolean`.
- After a successful merge, set `importResult` and open the dialog (instead of the current `toast.success` summary). The secondary `toast.info` for skipped decommissioned units is removed since the dialog now covers it.

**3. Dialog UI (shadcn `Dialog`)**
- Title: `Import complete`
- Description: `<added> added · <updated> updated · <skipped> skipped · <untouched> kept`
- Body: three collapsible/scrollable sections, each only rendered when its list is non-empty:
  - **Added (N)** — green check icon, list of unit codes.
  - **Updated (N)** — blue refresh icon, list of unit codes.
  - **Skipped — decommissioned (N)** — amber archive icon, list of unit codes with helper text "Restore them first to update."
- Each list is rendered as a wrapping set of `Badge` chips inside a `max-h-48 overflow-y-auto` container so long imports remain scannable.
- Footer: single `Close` button.

**4. Validation errors unchanged**
Pre-flight failures (blank `Unit`, internal duplicates) continue to use `toast.error` and abort before opening the dialog.

**5. Imports to add**
- `Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter` from `@/components/ui/dialog`
- `Badge` from `@/components/ui/badge` (if not already imported)
- `CheckCircle2, RefreshCw, Archive` from `lucide-react` (Archive already imported)

### Notes
- Purely client-side; no schema or parser changes.
- Sorting, decommission/restore flow, and selection mode are untouched.

