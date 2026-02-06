
# STDA (Short-Term Duty Assignment) Management System

## Overview
Build a comprehensive STDA tracking page in HR Operations, following the patterns established in Appointments and Separations. STDAs are temporary internal role changes where staff members take on a different position with a new grade and title for a fixed period.

---

## Spreadsheet Analysis

From the uploaded spreadsheet, the key fields tracked are:

| Field | Purpose |
|-------|---------|
| Last Name / First Name | Staff identification |
| Operation Type | STDA, OIC (Officer-in-Charge), Transfer, Reassignment |
| Status | Follow-up status (1-7 scale) |
| Job Title | The temporary position title |
| Comments | Detailed tracking notes |
| Actions in HR Plan Administrator | Administrative actions |
| Tentative Start Date | When the STDA begins |
| End Date | When the STDA ends |
| Main HR Focal Point | Assigned HR admin |
| Staff Number | Employee identifier |
| Grade | New grade during STDA (P2, P3, P4, etc.) |
| Contract Type | Fixed-Term, etc. |
| Duty Station | Valencia, Geneva, Rome, NY, etc. |
| Old PD / New PD | Position description numbers |
| Vacancy | Vacancy reference number |
| Supervisor | New supervisor during STDA |
| Section/Unit | Organizational placement |

---

## Database Design

### New Table: `hr_stdas`

```sql
CREATE TABLE hr_stdas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Staff identification (linked to users table)
  user_id UUID REFERENCES users(id),
  staff_number TEXT,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  email TEXT,
  
  -- STDA details
  operation_type TEXT NOT NULL DEFAULT 'STDA', -- STDA, OIC, Reassignment
  status TEXT DEFAULT 'Not started',
  
  -- Position details (new role)
  job_title TEXT,
  grade TEXT,
  contract_type TEXT,
  duty_station TEXT,
  section_unit TEXT,
  supervisor TEXT,
  supervisor_staff_number TEXT,
  
  -- Position references
  old_pd TEXT,
  new_pd TEXT,
  vacancy_reference TEXT,
  
  -- Dates
  start_date DATE,
  end_date DATE,
  
  -- HR Management
  main_hr_focal_point TEXT,
  comments TEXT,
  actions_in_hr_plan TEXT,
  
  -- Original position backup (to restore after STDA ends)
  original_job_title TEXT,
  original_grade TEXT,
  original_unit TEXT,
  
  -- Linking to selection system
  source_requisition_id UUID REFERENCES job_requisitions(id),
  source_application_id UUID REFERENCES applications(id),
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### User Table Enhancement

Add a field to track STDA status on the user record:

```sql
ALTER TABLE users 
  ADD COLUMN current_stda_id UUID REFERENCES hr_stdas(id),
  ADD COLUMN stda_job_title TEXT,
  ADD COLUMN stda_grade TEXT;
```

---

## Core Features

### 1. STDA Tracking Page (`/operations/stdas`)

Similar to Appointments page with:

**Stats Cards:**
- Active STDAs
- Ending This Month
- Ending in 8 Weeks (alert)
- Starting This Week
- By Operation Type (STDA, OIC, Transfer)

**Table View with:**
- Expandable rows for details
- Staff search and autofill (like Appointments)
- Threaded comments
- Link to user profile
- Visual indicator for STDAs ending within 8 weeks (warning)

**Filters:**
- Search by name
- Operation type (STDA, OIC, Reassignment)
- Status
- Duty Station
- HR Focal Point
- Date range

### 2. STDA Form Component

**Form Fields:**
```
+----------------------------------------------------------+
|  STDA FORM                                               |
|  --------------------------------------------------------|
|  [Search existing staff...] or enter manually            |
|  --------------------------------------------------------|
|                                                          |
|  STAFF DETAILS                                           |
|  Last Name*    [ BAHILO         ]                        |
|  First Name*   [ Paloma         ]                        |
|  Email         [ bahilo@unicc.org]                       |
|  Staff Number  [ S123456        ]                        |
|                                                          |
|  ASSIGNMENT DETAILS                                      |
|  Operation Type*  [STDA / OIC / Reassignment]            |
|  Status*          [1-7 Follow-up / Completed]            |
|  Start Date*      [ 2025-09-03   ]                       |
|  End Date*        [ 2026-06-02   ]                       |
|                                                          |
|  NEW POSITION                                            |
|  Job Title*       [ Business Relationship Officer ]     |
|  Grade*           [ P3            ]                      |
|  Section/Unit     [ DBR           ]                      |
|  Supervisor       [ P. Nieto      ]                      |
|  Duty Station     [ Valencia      ]                      |
|                                                          |
|  POSITION REFERENCES                                     |
|  Old PD           [ 417395        ]                      |
|  New PD           [ 423004        ]                      |
|  Vacancy Reference[ STDA-25-VAL-3 ]                      |
|                                                          |
|  HR MANAGEMENT                                           |
|  HR Focal Point   [ HERRERO Esther]                      |
|  Comments         [ Detailed notes...]                   |
|  Actions in HR    [ Action items...]                     |
+----------------------------------------------------------+
```

### 3. Dashboard Alerts

Update `HROperationsDashboard.tsx` to include:

**New Stats Card:**
- "STDAs Ending Soon" - Count of STDAs ending within 8 weeks

**Alert Section:**
- List STDAs ending within 8 weeks with staff name, end date, and days remaining
- Color-coded urgency (red for < 2 weeks, orange for 2-4 weeks, yellow for 4-8 weeks)

### 4. User Profile Integration

When a staff member is on an active STDA:

**Visual Indicator:**
- Show "STDA" pill/badge next to their name in listings
- Example: "Paloma BAHILO **[STDA]**" or colored badge

**Profile Display:**
- Show temporary job title with "(STDA)" suffix
- Show both original grade and STDA grade
- Display STDA end date prominently

**Users Table Display:**
- When listing staff, if `current_stda_id` is set, show their `stda_job_title` and `stda_grade` with visual indicator

### 5. Automation from Selection System

When a candidate is approved for an STDA vacancy (from job_requisitions where nature_of_position = 'STDA'):

1. Auto-create `hr_stdas` record with:
   - Link to requisition (`source_requisition_id`)
   - Link to successful application (`source_application_id`)
   - Staff details from application/user record
   - Position details from requisition
   
2. Update the staff member's user record:
   - Set `current_stda_id`
   - Set `stda_job_title` and `stda_grade`
   - Store original job_title and grade in the STDA record

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/operations/STDAs.tsx` | Main page (rewrite placeholder) |
| `src/components/operations/STDAForm.tsx` | Create/Edit form with staff search |
| `src/components/operations/STDAFilters.tsx` | Filter controls |
| `src/components/operations/STDAStatusBadge.tsx` | Status badges and indicators |
| `src/components/operations/STDAComments.tsx` | Threaded comments component |
| `src/components/operations/ImportSTDAsDialog.tsx` | CSV import dialog |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[timestamp].sql` | Create hr_stdas table, alter users table |
| `src/pages/operations/HROperationsDashboard.tsx` | Add STDA stats and 8-week alerts |
| `src/components/operations/UpcomingEventsTable.tsx` | Add STDA category |
| `src/components/dashboard/HRAdminDashboard.tsx` | Add STDA alerts |

---

## Status Workflow

Based on the spreadsheet, status appears to be a numbered follow-up system (1-7):

| Status | Meaning |
|--------|---------|
| 1 | Initial request |
| 2 | In progress |
| 3 | Documentation sent |
| 4 | Awaiting signature |
| 5 | Signed/Confirmed |
| 6 | Action submitted |
| 7 | Follow-up (active) |
| Completed | STDA finished |

---

## Dashboard Alert Logic (8 Weeks)

```typescript
// In HROperationsDashboard.tsx
const eightWeeksFromNow = addWeeks(today, 8);

const stdaEndingSoon = stdas.filter(s => 
  s.status !== 'Completed' &&
  s.end_date &&
  parseISO(s.end_date) >= today &&
  parseISO(s.end_date) <= eightWeeksFromNow
);

// Alert categories
const critical = stdaEndingSoon.filter(s => 
  differenceInWeeks(parseISO(s.end_date), today) <= 2
); // Red
const warning = stdaEndingSoon.filter(s => 
  differenceInWeeks(parseISO(s.end_date), today) > 2 &&
  differenceInWeeks(parseISO(s.end_date), today) <= 4
); // Orange
const attention = stdaEndingSoon.filter(s => 
  differenceInWeeks(parseISO(s.end_date), today) > 4
); // Yellow
```

---

## User Profile Visual Indicator

When displaying a staff member who is on STDA:

```tsx
// In staff lists/tables
<div className="flex items-center gap-2">
  <span>{user.name}</span>
  {user.current_stda_id && (
    <Badge className="bg-purple-100 text-purple-800">STDA</Badge>
  )}
</div>

// Job title display
<p>
  {user.current_stda_id 
    ? `${user.stda_job_title} (STDA)` 
    : user.job_title}
</p>
```

---

## Future: Selection System Integration

When implementing automatic population from selection:

1. When application status changes to "Offer Accepted" for an STDA position:
   - Trigger function creates hr_stdas record
   - Links to requisition and application
   - Copies staff details from application/user
   - Copies position details from requisition

2. Database trigger or edge function:
```sql
CREATE OR REPLACE FUNCTION create_stda_from_selection()
RETURNS TRIGGER AS $$
BEGIN
  -- When application for STDA position is approved
  IF NEW.status = 'Offer Accepted' THEN
    -- Check if this is an STDA position
    IF EXISTS (
      SELECT 1 FROM job_requisitions 
      WHERE id = NEW.job_id AND nature_of_position = 'STDA'
    ) THEN
      -- Create STDA record
      INSERT INTO hr_stdas (...)
      SELECT ... FROM applications, job_requisitions, users
      WHERE ...;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Implementation Phases

**Phase 1: Core STDA Page** (this implementation)
- Database table creation
- STDA management page with full CRUD
- Staff autofill integration
- Filters and search
- CSV import capability

**Phase 2: Dashboard Alerts**
- 8-week ending alerts in HR Operations Dashboard
- STDA stats card
- Add to HRAdminDashboard

**Phase 3: User Profile Integration**
- Add STDA badge to user records
- Display temporary job title/grade
- Visual indicators in staff listings

**Phase 4: Selection System Integration** (future)
- Auto-create STDA records from approved selections
- Link between selection and operations systems
