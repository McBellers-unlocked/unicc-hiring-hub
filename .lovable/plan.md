

## Update Units and Divisions Table

### Changes — `src/pages/UnitsAndDivisions.tsx`

**1. Column restructure (6 columns total):**
| Unit full name | Unit | Parent Section | Division full name | Division | Manager |

- **Division full name**: renamed from current "Division". Same `Select` showing the full label (e.g. "Cybersecurity division (CS)"), bound to the division code.
- **Division** (new): read-only text cell showing only the 2-letter acronym (CS, DD, DS, DO, MS, OP), derived automatically from the selected Division full name. Updates reactively when Division full name changes.

**2. Parent Section — convert to searchable dropdown:**
- Replace the free-text `Input` with a `Combobox` (Popover + Command pattern, same as `StaffSearchCombobox`).
- Options: every "Unit full name" from the same `DIVISION_UNITS` flattened list (~50 entries), alphabetically sorted, with a "— None —" option to clear.
- Includes built-in search filter via `CommandInput`.

**3. Manager — convert to staff search combobox:**
- Replace the free-text `Input` with a reuse of `StaffSearchCombobox` (`src/components/operations/StaffSearchCombobox.tsx`), which already queries the `users` table with debounced search, name/email filtering, and grade badges.
- On select, store the staff member's `name` in `row.manager`. Display the selected name in the trigger button.
- Add a small "Clear" affordance (X button) to remove a selection.

**4. State model update (`UnitRow`):**
- Keep `division` (the code) as the source of truth.
- `parentSection` continues to hold the full unit name string (now picked from a list).
- `manager` continues to hold a string (the staff member's name).
- No new fields needed — the "Division" acronym column is purely derived.

**5. Layout:**
- Adjust column widths to fit 6 columns: e.g. `24% / 10% / 18% / 18% / 8% / 22%`.
- Table remains inside the existing `Card` with the same Save/Reset buttons (still UI-only, toast feedback).

### Notes
- No backend/schema changes — page remains client-side state with toast on Save.
- `StaffSearchCombobox` is reused as-is; no edits to that component.
- Permission gating unchanged (Analytics dropdown / `hasAdminAccess`).

