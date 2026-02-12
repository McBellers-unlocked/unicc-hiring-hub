

# Local Admin Dashboard -- Duty Station Improvements

## Overview
Three changes to `src/pages/operations/LocalAdminDashboard.tsx`:

1. **Transfers table**: Show "From" and "To" duty station columns instead of a single "Duty Station" column
2. **Contract Breaks, Departures, Arrivals tables**: Add a "Duty Station" column (currently missing)
3. **Transfer filtering**: Match transfers if *either* `duty_station` OR `new_duty_station` matches the selected filter (so e.g. Cynthia appears when filtering by New York or Valencia)

## Technical Details

### 1. Duty station filter includes `new_duty_station` values
Update the `dutyStations` memo (line 133-139) to also add `t.new_duty_station` from hr_transfers, so destination duty stations appear in the dropdown.

### 2. Transfer filter logic matches on both old and new duty station
Update `filteredHrTransfers` (line 171-173) to use a custom filter instead of `matchesFilters`: a transfer matches if `duty_station === selected` OR `new_duty_station === selected`. The name search stays the same.

### 3. Transfers table -- split into "From" and "To" columns
Update the Transfers table header (line 316) to replace the single "Duty Station" column with two columns: "From Station" and "To Station". Update the `hr_transfers` rows (line 337-346) to show `duty_station` in one cell and `new_duty_station` in the other. For appointment-based transfers that lack a `new_duty_station` field, show duty_station in "From" and a dash in "To". Column count goes from 7 to 8; update `EmptyRow` accordingly.

### 4. Add "Duty Station" column to Contract Breaks, Departures, and Arrivals
- **Contract Breaks** (line 278-301): Add "Duty Station" header after "Section / Unit", display `sep.duty_station`. Column count 6 to 7.
- **Departures** (line 359-381): Add "Duty Station" header after "Section / Unit", display `s.duty_station`. Column count 6 to 7.
- **Arrivals** (line 399-412): Add "Duty Station" header after "Section / Unit", display `a.duty_station`. Column count 6 to 7.

## Files Modified
- `src/pages/operations/LocalAdminDashboard.tsx` (single file, all changes)

