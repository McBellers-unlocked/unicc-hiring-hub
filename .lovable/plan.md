

# Transfer/Reassignment: Change Type Selection with Current vs. New Details

## What Changes

When **Transfer** or **Reassignment** is selected as the operation type, the form will show a **"Change Type"** selector with options:
- Unit/Division Change
- Supervisor Change
- Duty Station Change
- Multiple selections allowed (e.g., a transfer could involve both a new unit and a new duty station)

Once a change type is selected, the form displays the **current values** (pulled from the staff search) as read-only labels, alongside editable fields for the **new values**. For other operation types (STDA, OIC, etc.), the form behaves as it does today.

## Database Changes

Add three new columns to `hr_transfers` to store the "new" values:
- `change_types` (text[] / array) -- which aspects are changing
- `new_duty_station` (text, nullable)
- `new_section_unit` (text, nullable)
- `new_supervisor` (text, nullable)

The existing `duty_station`, `section_unit`, and `supervisor` columns continue to hold the **current** (original) values from the staff profile.

## UI Changes (TransferForm.tsx only)

### Details Tab Updates

1. **When operation_type is "Transfer" or "Reassignment":**
   - Show a checkbox group: "What is changing?" with options: Unit/Division, Supervisor, Duty Station
   - Below, show a "Current Details" read-only summary (unit, division, supervisor, duty station -- all pulled from staff search)
   - For each checked change type, show the corresponding "New" field:
     - **Unit/Division Change**: New Division dropdown + New Unit dropdown (cascading)
     - **Supervisor Change**: New Supervisor staff search combobox
     - **Duty Station Change**: New Duty Station dropdown
   - The existing fields (duty_station, section_unit, supervisor) remain populated with the current/original values and are shown as read-only context

2. **When operation_type is anything else (STDA, OIC, etc.):**
   - Form works exactly as it does today (no change type selector, fields remain directly editable)

### Schema Updates
- Add `change_types`, `new_duty_station`, `new_section_unit`, `new_supervisor` to the Zod schema
- These fields are optional and only relevant for Transfer/Reassignment

## Expanded Row (Transfers.tsx)

When viewing a Transfer/Reassignment record in the expanded table row, show the changes clearly:
- "Change Type: Unit/Division Change, Supervisor Change" (badges)
- Current vs. New values displayed side by side where applicable (e.g., "Unit: Current Unit -> New Unit")

## Technical Details

- **Migration**: `ALTER TABLE hr_transfers ADD COLUMN change_types text[], ADD COLUMN new_duty_station text, ADD COLUMN new_section_unit text, ADD COLUMN new_supervisor text;`
- The `change_types` array stores values like `['unit_division', 'supervisor', 'duty_station']`
- The checkbox group uses Radix Checkbox components already available in the project
- The `StaffSearchCombobox` is reused for the "New Supervisor" field
- `DIVISIONS`, `DIVISION_UNITS`, `LOCATIONS` constants are reused for the new dropdowns
- Form watches `operation_type` to conditionally render the change type section
- Current values are displayed using simple text/badges -- not editable inputs -- to make the distinction clear

