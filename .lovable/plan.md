
# Separations Management Page

## Overview
Build a full-featured Separations management page following the same UX patterns as the Appointments page, with expandable rows, comments, status tracking, and a rich dashboard for HR teams.

---

## Data Analysis from Spreadsheet

### Separation Types Identified
| Type | Description |
|------|-------------|
| **Separation (CB)** | Contract Break - temporary break, staff returns later |
| **Separation** | Permanent separation (abolition, non-renewal) |
| **Resignation** | Voluntary departure |
| **Separation - Retirement** | Voluntary retirement |
| **Individual Consultancy (CB)** | Consultant contract break |
| **Individual Consultancy Separation** | Consultant exit |
| **Individual Consultancy Extension** | Extension ending |
| **Internship Separation** | Intern departure |
| **UNV - Separation** | UNV volunteer departure |
| **Canceled** | Separation was cancelled |

### Status Values
1. Not started
2. In progress  
3. Completed (mapped from "6. Completed")
4. Cancelled (mapped from "5. Cancelled")

### Reason Types
- **Voluntary**: Resignation, Retirement
- **Non voluntary**: Contract not renewed, Abolition, Contract break

### Event Types
- **Exit**: Permanent departure
- **ContractBreak**: Temporary, staff returns

---

## Database Design

### New Table: `hr_separations`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Link to users table (nullable) |
| email | TEXT | Staff email |
| last_name | TEXT | Required |
| first_name | TEXT | Required |
| operation_type | TEXT | Separation type (Separation, Separation (CB), Resignation, etc.) |
| reason | TEXT | Voluntary / Non voluntary |
| status | TEXT | Not started, In progress, Completed, Cancelled |
| job_title | TEXT | Position held |
| grade | TEXT | G3, G4, P2, P3, etc. |
| contract_type | TEXT | Temporary, Continuing, Fixed term, Intern, UNV |
| duty_station | TEXT | Valencia, Brindisi, New York, Remote, etc. |
| pd_number | TEXT | Position Description number |
| supervisor | TEXT | Supervisor name |
| section_unit | TEXT | Department/unit |
| supervisor_staff_number | TEXT | Supervisor ID |
| separation_type | TEXT | Exit or ContractBreak |
| event_type | TEXT | Exit or ContractBreak |
| tentative_date | DATE | Planned last working day |
| effective_date | DATE | Actual separation date |
| is_international | BOOLEAN | International vs local staff |
| notice_days_required | INTEGER | 30 or 45 or 90 days |
| staff_number | TEXT | Employee ID (S123456) |
| main_hr_focal_point | TEXT | Assigned HR person |
| comments | TEXT | General notes |
| actions_in_hr_plan | TEXT | Actions taken/planned |
| clearance_status | TEXT | Clearance progress tracking |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### New Table: `hr_separation_comments`
Same structure as `hr_appointment_comments` for threaded comments.

---

## UI Design

### Dashboard Header with Stats Cards

```text
+------------------+------------------+------------------+------------------+
|    Total: 145    |  In Progress: 8  |   Overdue: 12    |  Completed: 120  |
|                  |                  |   (past due)     |                  |
+------------------+------------------+------------------+------------------+
```

### Filters Bar

```text
[ Search by name... ] [ Operation Type v ] [ Status v ] [ Duty Station v ] [ HR Focal Point v ] [ Clear ]
                                                                            [ + Add Separation ] [ Import ]
```

### Main Table with Expandable Rows

```text
| > | Name           | Type          | Reason      | Date       | Status      | HR Focal  | Comments |
|---|----------------|---------------|-------------|------------|-------------|-----------|----------|
| v | AIELLO Ilaria  | Separation CB | Non vol.    | 30 Sep 26  | Not started | L. Rodenas| 2        |
|   +----------------+---------------+-------------+------------+-------------+-----------+----------+
|   | Comments (2)                                                                                    |
|   | - Staff needs break after parental leave. Extended due to TA.                                   |
|   | - [Add new comment...]                                                                          |
|   +------------------------------------------------------------------------------------------------+
| > | SROUR Mohamed  | Separation CB | Non vol.    | 07 Jul 26  | Not started |           | 0        |
| > | PUIG Enrique   | Resignation   | Non vol.    | 07 Jan 26  | In progress | L. Rodenas| 1        |
```

### Row Actions Dropdown
- Edit separation
- Link to user (if not linked)
- Mark as completed
- Mark as cancelled
- Delete

### Expanded Row Content
- **Comments section** with add new comment capability
- **Clearance checklist** (future enhancement)
- **Timeline of actions** from "Actions In HR Plan" field

---

## Key Features

### 1. Status-Based Badges with Overdue Calculation
Same logic as Appointments - calculate days until/since effective date:
- Past date + "In progress" = "Xd overdue" (red, pulsing)
- Future date within 7 days = "Xd remaining" (yellow)
- Otherwise show status

### 2. Separation Type Color Coding
| Type | Color |
|------|-------|
| Resignation | Blue |
| Retirement | Purple |
| Contract Break | Orange |
| Separation (permanent) | Red |
| Internship | Green |
| Cancelled | Gray |

### 3. Import from Excel
Reuse same import pattern as Appointments:
- Upload XLSX/CSV
- Auto-detect headers
- Map columns
- Validate data
- Show warnings for issues

### 4. Comments System
- Expandable row shows all comments
- Last comment preview in table
- Add new comment inline
- Author + timestamp display

### 5. User Linking
- "Link to User" action to connect separation to staff member in system
- Search by name functionality

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_create_separations.sql` | Database tables |
| `src/pages/operations/Separations.tsx` | Main page (replace placeholder) |
| `src/components/operations/SeparationForm.tsx` | Add/edit form dialog |
| `src/components/operations/SeparationFilters.tsx` | Filter controls |
| `src/components/operations/SeparationStatusBadge.tsx` | Status + type badges |
| `src/components/operations/SeparationComments.tsx` | Comments component |
| `src/components/operations/ImportSeparationsDialog.tsx` | Import dialog |
| `supabase/functions/import-separations/index.ts` | Import edge function |

---

## Files to Reuse/Extend

| File | What to Reuse |
|------|---------------|
| `src/components/operations/LinkUserDialog.tsx` | Reuse directly |
| `src/components/operations/AppointmentStatusBadge.tsx` | Pattern for overdue calculation |

---

## Implementation Order

1. **Database migration** - Create `hr_separations` and `hr_separation_comments` tables
2. **Status badge component** - Separation-specific styling
3. **Filters component** - With separation-specific options
4. **Form component** - Add/edit separation dialog
5. **Comments component** - Based on Appointments pattern
6. **Main page** - Replace placeholder with full implementation
7. **Import function** - Edge function for Excel import
8. **Import dialog** - UI for uploading files

---

## Technical Notes

### Status Mapping from Spreadsheet
The spreadsheet uses numbered statuses like "1. Not started", "2. In progress", etc. The import function should strip the number prefix.

### Date Parsing
Same Excel serial date handling as Appointments import - values like `45210` need to be converted.

### Separation vs Exit
- **separation_type = "ContractBreak"**: Staff will return (temporary)
- **separation_type = "Exit"**: Staff leaves permanently

This affects which clearance steps are required.

