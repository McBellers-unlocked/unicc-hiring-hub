

# Supervisor Staff Search with Auto-Population

## Overview
Replace the plain text Supervisor input with a `StaffSearchCombobox` across all three HR Operations forms (Appointments, Separations, STDAs). When a supervisor is selected, automatically populate the Division and Section/Unit fields from the supervisor's record.

## How It Works
1. The Supervisor field becomes a searchable staff lookup (same component already used for the "Person" tab)
2. When a supervisor is selected:
   - The `supervisor` form field is set to the supervisor's name
   - The `section_unit` field is auto-filled from the supervisor's unit
   - The Division dropdown is auto-detected from the supervisor's unit (using existing `detectDivisionFromUnit`)
   - The `duty_station` field is auto-filled from the supervisor's duty station
3. The user can still override Division, Section/Unit, and Duty Station after auto-population if needed

## Files Modified

### 1. `src/components/operations/AppointmentForm.tsx`
- Replace the Supervisor `<Input>` (line ~487) with `<StaffSearchCombobox>`
- Add a `handleSupervisorSelect` callback that:
  - Sets `supervisor` to the selected staff member's name
  - Sets `section_unit` from the supervisor's `section_unit`
  - Sets `duty_station` from the supervisor's `duty_station`
  - Auto-detects and sets `selectedDivision` via `detectDivisionFromUnit`
- Add state for `supervisorStaffName` to show the selected supervisor's name in the combobox

### 2. `src/components/operations/SeparationForm.tsx`
- Same change: replace Supervisor `<Input>` with `<StaffSearchCombobox>`
- Add `handleSupervisorSelect` with same auto-population logic
- Note: Separations also have `supervisor_staff_number` -- this will be auto-filled from the selected supervisor's `staff_number`

### 3. `src/components/operations/STDAForm.tsx`
- Same change: replace "New Supervisor" `<Input>` with `<StaffSearchCombobox>`
- Add `handleSupervisorSelect` with same auto-population logic
- For STDAs, the supervisor's unit represents the new assignment location, which aligns with the "New Supervisor" label

## Technical Notes
- The `StaffSearchCombobox` component is already imported in all three forms (used for the Person search on the first tab)
- The supervisor's name (string) is what gets stored in the database `supervisor` column -- the combobox just provides a better lookup experience
- On edit/load, the existing supervisor name text will display in the combobox trigger
- Division and Section/Unit auto-fill only triggers when a supervisor is actively selected, not when loading existing data (existing load logic already handles that)

