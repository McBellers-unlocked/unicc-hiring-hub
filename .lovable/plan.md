

## Decommission Workflow → Bulk Selection Mode

### Changes — `src/pages/UnitsAndDivisions.tsx`

**1. Remove per-row Decommission button**
- Drop the trailing "Actions" column (and its header) from the **Active** table.
- Each row no longer has its own Decommission button.

**2. New header button: "Decommission"**
- Add a new button in the header toolbar, placed **between Reset and Save**, so the order becomes:
  `Download table | Import | Reset | Decommission | Save`
- Variant: `outline`, with `Archive` icon. Only visible/enabled on the **Active** tab.

**3. Selection mode (two-click flow)**
- New state: `selectionMode: boolean`, `selectedIds: Set<string>`.
- **First click on Decommission** → enters selection mode:
  - Button label changes to `Decommission selected (N)` and switches to `destructive` variant when N > 0.
  - A new "Cancel" button appears next to it to exit selection mode (clears `selectedIds`, `selectionMode = false`).
  - The Active table gains a leading checkbox column:
    - Header: a "select all" checkbox (indeterminate when partial) toggling every active row.
    - Each row: a `Checkbox` (shadcn `@/components/ui/checkbox`) bound to `selectedIds`.
  - Selected rows get a subtle `bg-muted/50` highlight.
  - Other header buttons (Download/Import/Reset/Save) remain visible but are disabled while in selection mode to avoid conflicting actions.
- **Second click on Decommission** (with ≥1 selected) → opens the existing `AlertDialog`:
  - Title: "Decommission selected units?"
  - Description: "This will move N unit(s) to the Decommissioned tab. You can restore them later." (N reflects current selection count.)
  - Confirm → move all selected rows from `activeRows` to `decommissionedRows` (prepended, preserving original order), clear selection, exit selection mode, toast `Decommissioned N unit(s)`.
  - Cancel → dialog closes; selection mode and selected rows are preserved so the user can adjust.
- If clicked with 0 selected → no dialog; show a small inline hint or toast: "Select at least one unit to decommission."

**4. State / dialog cleanup**
- Replace `pendingDecommissionId: string | null` with `confirmOpen: boolean`.
- Update `confirmDecommission` to operate on `selectedIds` instead of a single id.

**5. Tab behavior**
- Switching to the **Decommissioned** tab while in selection mode automatically exits selection mode and clears `selectedIds`.
- The Decommissioned tab is unchanged (still has per-row "Restore").

**6. Imports**
- Add `Checkbox` from `@/components/ui/checkbox`.
- Keep `Archive`, `Undo2`; add `XCircle` (or reuse `X`) for the Cancel-selection button.

### Notes
- Still UI-only state; no schema changes.
- Keyboard/a11y: select-all checkbox uses `aria-label="Select all units"`; row checkboxes use `aria-label={`Select ${row.fullName}`}`.

