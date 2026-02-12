

# Create /operations/transfers Page

## Overview
Add a new "Transfers" page under HR Operations, following the exact same architecture as the existing STDAs and Separations pages. This page tracks staff reassignments, STDAs, OICs, transfers, and their extensions.

## Database Changes

### New table: `hr_transfers`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (nullable) | Link to users table |
| last_name | text (required) | Staff last name |
| first_name | text (required) | Staff first name |
| email | text | Staff email |
| staff_number | text | Staff number |
| operation_type | text (required) | Reassignment, STDA, STDA Extension, OIC, OIC Extension, Transfer |
| status | text (required, default "Not started") | Not started, In progress, Pending action (UNICC), Pending Action (External), Cancelled, Completed, Follow up |
| start_date | date | Transfer start date |
| end_date | date | Transfer end date |
| job_title | text | Auto-filled from staff |
| grade | text | Auto-filled from staff |
| contract_type | text | Auto-filled from staff |
| duty_station | text | Auto-filled from staff |
| section_unit | text | Auto-filled from staff |
| supervisor | text | Auto-filled from staff |
| main_hr_focal_point | text | HR focal point |
| comments | text | General comments |
| created_at | timestamptz | Record creation time |
| updated_at | timestamptz | Auto-updated |

RLS: Authenticated users can SELECT, INSERT, UPDATE, DELETE (same pattern as `hr_stdas`).

### New table: `hr_transfer_comments`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| transfer_id | uuid (FK to hr_transfers) | Parent record |
| comment_text | text (required) | Comment body (supports @mentions) |
| author_id | uuid | Comment author |
| created_at | timestamptz | Timestamp |

RLS: Same as other comment tables -- authenticated users can read/write.

## New Files

### 1. `src/pages/operations/Transfers.tsx`
Main page component following the STDAs page pattern:
- Header with icon and "Add Transfer" button
- Stats cards: Total, In Progress, Pending, Completed, Cancelled, Follow Up
- Filters bar (search, operation type, status, duty station, HR focal point)
- Expandable table with columns: Name, Type, Start Date, End Date, Status, Location, HR Focal Point, Actions
- Expanded row shows: grade, contract type, unit, supervisor, comments thread
- Row actions: Edit, Mark Complete, Delete
- Staff link badge showing whether record is linked to a user profile

### 2. `src/components/operations/TransferForm.tsx`
Dialog form with two tabs (Person, Details):
- **Person tab**: Staff search combobox (auto-fills all fields), last name, first name, email, staff number, operation type dropdown, status dropdown
- **Details tab**: Job title, grade, contract type, duty station, division/unit cascading selectors, supervisor search, start date, end date, HR focal point, comments
- Auto-fills supervisor, unit, division, duty station from staff data (same logic as Separations)

### 3. `src/components/operations/TransferFilters.tsx`
Filter bar component with: search input, operation type dropdown, status dropdown, duty station dropdown, HR focal point dropdown, clear button.

### 4. `src/components/operations/TransferStatusBadge.tsx`
Status badge component with color coding:
- Not started: outline
- In progress: blue
- Pending action (UNICC): amber
- Pending Action (External): orange
- Cancelled: muted outline
- Completed: green
- Follow up: purple

Operation type badges with distinct colors for each type (Reassignment, STDA, STDA Extension, OIC, OIC Extension, Transfer).

### 5. `src/components/operations/TransferComments.tsx`
Threaded comments with @mention support, following the STDAComments pattern exactly.

## Modified Files

### `src/App.tsx`
- Import and add route: `/operations/transfers` mapped to `Transfers` component

### `src/components/Layout.tsx`
- Add "Transfers" link to the HR Operations dropdown menu (after "STDAs")

## Technical Notes

- The `StaffSearchCombobox` component is reused for staff and supervisor search
- `detectDivisionFromUnit` is used for the cascading division/unit UI logic
- `HR_FOCAL_POINTS` from `src/lib/hrFocalPoints.ts` is used for the focal point dropdown
- `GRADES`, `CONTRACT_TYPES`, `LOCATIONS`, `DIVISIONS`, `DIVISION_UNITS` from `organizationConstants.ts` are reused
- The `selectedUserId` pattern from Separations/STDAs is followed for staff link persistence
- Comments use the `MentionableTextarea` component for @mention support

