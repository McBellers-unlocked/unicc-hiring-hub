

# Show hr_transfers Records on the Local Admin Dashboard

## Problem
The Local Admin Dashboard (`/operations/admin`) only queries `hr_separations` and `hr_appointments`. It does not query the `hr_transfers` table at all. The two transfer/reassignment records (ENSTONE, SHUMBA) were created in `hr_transfers`, so they never appear on this dashboard.

## Solution
Add a third data source by querying `hr_transfers` and merging those records into the **Transfers** section of the dashboard.

## Changes (1 file)

### `src/pages/operations/LocalAdminDashboard.tsx`

1. **Add a new interface** `HrTransfer` with the relevant fields from the `hr_transfers` table (`id`, `last_name`, `first_name`, `operation_type`, `status`, `start_date`, `grade`, `duty_station`, `section_unit`, `change_types`, `new_duty_station`, `new_section_unit`, `new_supervisor`).

2. **Add a new `useQuery` call** to fetch from `hr_transfers` where status is not "Completed", ordered by `start_date`.

3. **Update the Transfers section** to combine:
   - Existing appointment-based transfers (from `hr_appointments` with Transfer/Reassignment types)
   - Records from `hr_transfers` (mapped to the same row format)

4. **Update the stats card** count to include `hr_transfers` records.

5. **Update the duty stations** memo to also pull duty stations from `hr_transfers`.

6. **Update the loading state** to include the new query's loading status.

## What stays the same
- Contract Breaks, Departures, and Arrivals sections remain unchanged
- Filter logic (search, duty station) continues to work for the merged transfers list
- No database changes needed

