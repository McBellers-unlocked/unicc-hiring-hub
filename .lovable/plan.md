

# Add "Lyon" as a Duty Station

## Overview
Add "Lyon" to all duty station dropdown fields across the application. There is a central `LOCATIONS` constant, but several files have their own hardcoded lists that also need updating.

## Files to Modify

### 1. `src/lib/organizationConstants.ts` (central constant)
Add `'Lyon'` to the `LOCATIONS` array (alphabetically, between `'Geneva'` and `'New York'`).

### 2. `src/pages/JobRequisitionForm.tsx` (~line 1453)
The `baseStations` array is hardcoded: `['Brindisi', 'Geneva', 'New York', 'Rome', 'Valencia']`. Add `'Lyon'` to this list.

### 3. `src/components/JobEmailAlert.tsx` (~line 19)
The `ALL_LOCATIONS` array is hardcoded: `['Brindisi', 'Geneva', 'New York', 'Rome', 'Valencia']`. Add `'Lyon'`.

### 4. `src/components/talent-pool/TalentSearchFilters.tsx` (~line 33)
The `DUTY_STATIONS` array is hardcoded: `["Valencia", "Brindisi", "Geneva", "New York", "Rome"]`. Add `"Lyon"`.

## Files That Already Work (no changes needed)
The following files dynamically derive duty stations from database data or import from `LOCATIONS`, so they will automatically pick up "Lyon" once it appears in any record:
- `TransferForm.tsx` -- uses `LOCATIONS` from organizationConstants
- `STDAFilters.tsx`, `TransferFilters.tsx`, `SeparationFilters.tsx` -- receive `dutyStations` as a prop derived from existing data
- `Separations.tsx`, `STDAs.tsx`, `Transfers.tsx` -- compute duty stations from DB records
- `AppointmentForm.tsx`, `STDAForm.tsx`, `SeparationForm.tsx` -- use `LOCATIONS` import

## Summary
4 files need a one-line addition each. No database changes required.
