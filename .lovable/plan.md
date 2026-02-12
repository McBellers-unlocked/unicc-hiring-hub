
# Local Admin Operations Dashboard

## Overview
Create a new read-only dashboard at `/operations/admin` tailored for local administrators who handle onboarding/offboarding logistics, protocol services, and need a date-centric view of staff movements -- all filterable by Duty Station.

## What it shows

The dashboard pulls from the existing `hr_separations` and `hr_appointments` tables (no database changes needed) and presents four sections:

### 1. Contract Breaks (Departure + Return on the same row)
- Pairs each `Separation (CB)` record with its linked `Appointment (CB)` record (via `linked_appointment_id` / `linked_separation_id`)
- Columns: **Name**, **Grade**, **Section/Unit**, **Departure Date** (from separation), **Return Date** (from linked appointment), **Status**
- Sorted by departure date ascending

### 2. Transfers
- Shows appointments where `operation_type` is one of: `Transfer`, `Transfer (CB)`, `Reassignment`
- Columns: **Name**, **Grade**, **Type**, **Date**, **Section/Unit**, **Duty Station**, **Status**
- Sorted by date ascending

### 3. Departures (All other separations, excluding CB)
- Filters out contract break types to show exits, end of contract, etc.
- Columns: **Name**, **Grade**, **Type** (operation_type), **Departure Date**, **Section/Unit**, **Status**
- Sorted by date ascending

### 4. Arrivals (All other appointments, excluding CB and transfers)
- Shows newcomers, direct appointments, etc.
- Columns: **Name**, **Grade**, **Type**, **Arrival Date**, **Section/Unit**, **Status**
- Sorted by date ascending

### Filtering
- A prominent **Duty Station** dropdown filter at the top (populated from both tables)
- A **search by name** field
- Both filters apply across all four sections simultaneously

### Stats summary row
- Four compact cards at the top showing counts: **Contract Breaks**, **Transfers**, **Departures**, **Arrivals** (filtered counts)

## Technical details

### New file
- `src/pages/operations/LocalAdminDashboard.tsx` -- single-page component that:
  - Fetches from `hr_separations` and `hr_appointments` (active/in-progress records)
  - Groups data into the four categories
  - Renders filtered tables with date-formatted columns
  - Uses existing UI components (Layout, Card, Table, Badge, Select, Input)

### Route registration
- Add to `src/App.tsx`: `<Route path="/operations/admin" element={<LocalAdminDashboard />} />`

### Navigation
- Add a link in the Layout sidebar/nav under Operations if applicable

### No database changes required
All data already exists in `hr_separations` and `hr_appointments`. The contract break pairing uses the existing `linked_appointment_id` foreign key.
