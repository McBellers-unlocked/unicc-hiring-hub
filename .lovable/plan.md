

## Add "Decommissioned Units and Divisions" Tab

### What
Convert the Units and Divisions page into a two-tab layout:
1. **Active Units and Divisions** (current table + new "Decommission" action column)
2. **Decommissioned Units and Divisions** (same columns + "Restore" action column)

Decommissioning moves a row from the active list to the decommissioned list via a confirmation dialog.

### Changes — `src/pages/UnitsAndDivisions.tsx`

**1. Tabs layout**
- Wrap the table in shadcn `Tabs` (`src/components/ui/tabs.tsx`):
  - `TabsList` with two triggers: "Active" and "Decommissioned" (with a count badge, e.g. `Decommissioned (3)`).
  - `TabsContent` for each, each rendering its own table.
- Header buttons (Download template, Import, Reset, Save) stay above the tabs and continue to act on the **active** rows (Import replaces active; template exports active rows; Reset restores defaults for active and clears decommissioned).

**2. State model**
- Split state into two arrays:
  - `activeRows: UnitRow[]` (current `rows`)
  - `decommissionedRows: UnitRow[]` (initially empty)
- `handleReset` resets both: `activeRows = buildInitialRows()`, `decommissionedRows = []`.

**3. Active table — new "Actions" column**
- Append a final `TableHead` "Actions" (min-w ~120px, right-aligned).
- Each row gets a destructive-outline `Button` with `Archive` (lucide) icon + "Decommission" label.
- Clicking opens an `AlertDialog` (shadcn — already in project): title "Decommission this unit?", description "This will move the unit to the Decommissioned tab. You can restore it later.", actions Cancel / Confirm.
- On confirm: remove row from `activeRows`, prepend to `decommissionedRows`, toast success.

**4. Decommissioned table**
- Same 6 data columns as active, all read-only (plain text cells; no inputs/comboboxes) to make intent clear.
- Final "Actions" column with a "Restore" button (`Undo2` icon, outline). On click: remove from `decommissionedRows`, append to `activeRows`, toast success. (No confirmation dialog needed for restore — it's reversible.)
- Empty state: when `decommissionedRows.length === 0`, render a centered muted message "No decommissioned units." instead of an empty table.

**5. Confirmation dialog**
- Use a single shared `AlertDialog` controlled by `pendingDecommissionId: string | null` state, rather than one dialog per row, to keep the DOM light.

**6. Imports added**
- `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
- `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle` from `@/components/ui/alert-dialog`
- `Archive, Undo2` from `lucide-react`

### Notes
- Still UI-only / client state — no DB schema changes. A future migration can add an `is_decommissioned` flag if persistence is required.
- CSV import/export and Save scope stay limited to active rows (decommissioned units are intentionally excluded from the working set).
- Permissions unchanged.

