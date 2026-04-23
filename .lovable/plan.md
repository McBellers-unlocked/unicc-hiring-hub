

## Add "Units and Divisions" Page Under Analytics

### What
A new admin page listing every Unit/Section used in the Initial Position Request form, displayed as an editable 5-column table. Accessible from the Analytics dropdown, just below "Import Userbase".

### Source Data
Pre-fill rows from `DIVISION_UNITS` in `src/lib/organizationConstants.ts` (flattened across all 6 divisions — ~50 unit/section entries). Each entry like `"CISO Section (CISO)"` parses into:
- **Unit full name** (prefilled, read-only label): the original string, e.g. `"CISO Section (CISO)"`
- **Unit** (editable): the parenthetical code, e.g. `"CISO"`
- **Parent Section** (editable): blank by default
- **Division** (editable dropdown): prefilled with the division code (CS/DD/DS/DO/MS/OP) derived from which `DIVISION_UNITS` array the entry came from
- **Manager** (editable text): blank by default

### Files

**1. New page — `src/pages/UnitsAndDivisions.tsx`**
- Wrapped in `<Layout>` with a Back button and `Card` titled "Units and Divisions" + subtitle.
- Uses the existing shadcn `Table` component (`src/components/ui/table.tsx`).
- Columns: Unit full name | Unit | Parent Section | Division | Manager.
- "Unit full name" rendered as plain text (the canonical reference); the other 4 columns rendered as inline editable inputs (`Input` for text, `Select` for Division using the 6 division codes from `DIVISIONS`).
- Local React state (`useState`) holds the editable rows seeded from `DIVISION_UNITS`. Edits update local state immediately.
- A "Save" button at the top-right shows a success toast (placeholder — no backend persistence yet, mirroring the Import Userbase pattern). A "Reset" button restores the prefilled values.
- Sorted alphabetically by Unit full name within each division, divisions in `DIVISIONS` declaration order.

**2. Routing — `src/App.tsx`**
- Import `UnitsAndDivisions`.
- Add `<Route path="/admin/units-divisions" element={<UnitsAndDivisions />} />` above the catch-all.

**3. Top-bar navigation — `src/components/Layout.tsx`**
- In the Analytics dropdown, insert a new item directly **below "Import Userbase"** and above "Hiring Analytics":
  - Label: **Units and Divisions**
  - Path: `/admin/units-divisions`
  - Icon: `Building2` (lucide — semantically fits org structure; will be added to existing lucide imports)
- Final Analytics dropdown order:
  1. Import Userbase
  2. Units and Divisions
  3. Hiring Analytics
  4. Import Staff List

### Notes
- UI-only: edits are not persisted to the database in this step. A future migration can introduce a `units_divisions` table seeded from this same constant if persistence is required.
- Permission gating inherits from the Analytics dropdown (`hasAdminAccess`).

