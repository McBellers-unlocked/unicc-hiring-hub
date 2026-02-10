

# Replace Free-Text Inputs with Standardised Dropdowns

## Overview
Replace the plain text inputs for Grade, Contract Type, Duty Station, and Division/Section-Unit with structured dropdown selects across all three HR Operations forms (Appointments, Separations, STDAs). This aligns with the Job Wizard / PD Creator approach and ensures data consistency.

## What Changes

### Shared Constants (new)
Create a small constants block (or add to `organizationConstants.ts`) with:
- **GRADES**: `['G3', 'G4', 'G5', 'G6', 'G7', 'P1', 'P2', 'P3', 'P4', 'P5', 'D1']`
- **CONTRACT_TYPES**: `['Fixed Term', 'Temporary']`
- Reuse existing **LOCATIONS** from `organizationConstants.ts` for Duty Station
- Reuse existing **DIVISIONS** and **DIVISION_UNITS** from `organizationConstants.ts` for a cascading Division then Section/Unit picker

### Form Changes (applied to all three forms)

For each of these four fields, the current `<Input>` will be replaced with a `<Select>` dropdown:

| Field | Current | New |
|-------|---------|-----|
| Grade | Free text input | Dropdown: G3-G7, P1-P5, D1 |
| Contract Type | Free text input | Dropdown: Fixed Term, Temporary |
| Duty Station | Free text input | Dropdown: Valencia, Brindisi, New York, Geneva, Rome, Remote |
| Section/Unit | Free text input | Two-step: Division dropdown (auto-sets division code) then Section/Unit dropdown filtered by the selected division |

### Division / Section-Unit Cascading Logic
- Add a local `selectedDivision` state to each form
- When Division is selected, filter the Section/Unit dropdown to show only units for that division (from `DIVISION_UNITS`)
- On edit, derive the division from the existing `section_unit` value by matching it against `DIVISION_UNITS`
- When staff search auto-fills `section_unit`, also auto-detect and set the division

### Files Modified
1. **`src/lib/organizationConstants.ts`** -- Add `GRADES` and `CONTRACT_TYPES` arrays
2. **`src/components/operations/AppointmentForm.tsx`** -- Replace 4 Input fields with Select dropdowns, add division state and cascading logic
3. **`src/components/operations/SeparationForm.tsx`** -- Same changes
4. **`src/components/operations/STDAForm.tsx`** -- Same changes

### Technical Notes
- All Select dropdowns will use the existing Radix `Select` component already imported in each form
- The `value` prop (not `defaultValue`) will be used on the Select to ensure it stays in sync with `react-hook-form` state during edit mode
- Existing data with free-text values that don't match the new options will still display (the Select allows showing the current value even if not in the list, via `SelectValue`)
- The division field is a UI-only helper (not stored in the database) -- only `section_unit` is persisted

