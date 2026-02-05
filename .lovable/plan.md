

## Updated Plan: HR Appointments Tracker with Users Table Integration

### Overview
Build the `/operations/appointments` page as a workflow tracker that **links to but doesn't duplicate** the `users` table data. The appointments table tracks the onboarding process before and during staff arrival.

---

### Data Model Clarification

| Table | Purpose |
|-------|---------|
| `users` | Master staff directory (populated by CSV imports) |
| `hr_appointments` | Workflow tracker for onboarding new/returning staff |

**Relationship:** Optional link via `user_id` + lookup by `email`

---

### Database Schema

```sql
CREATE TABLE hr_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Person identification (may not be in users table yet)
  email TEXT,                    -- For lookup/linking
  user_id UUID REFERENCES users(id),  -- Linked after arrival (optional)
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  
  -- Operation tracking
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'Appointment', 'Appointment (CB)', 'Direct Appointment'
  )),
  status TEXT DEFAULT 'In progress' CHECK (status IN (
    'In progress', 'Completed', 'On hold', 'Cancelled'
  )),
  
  -- Dates
  tentative_date DATE,           -- Expected start
  effective_date DATE,           -- Actual start
  
  -- Position details (from spreadsheet, may differ from users table during transition)
  job_title TEXT,
  grade TEXT,
  contract_type TEXT,
  duty_station TEXT,
  section_unit TEXT,
  supervisor TEXT,
  old_po TEXT,
  new_po TEXT,
  vacancy_reference TEXT,
  
  -- HR tracking
  main_hr_focal_point TEXT,
  recruitment_type TEXT DEFAULT 'Newcomer',
  is_international BOOLEAN DEFAULT FALSE,
  notice_days_required INTEGER DEFAULT 30,
  
  -- Notes & comments
  comments TEXT,
  onboarding_comments TEXT,
  actions_in_hr_plan TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE hr_appointments ENABLE ROW LEVEL SECURITY;

-- Policy for HR access
CREATE POLICY "HR users can manage appointments" ON hr_appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR')
    )
  );

-- Index for email lookups
CREATE INDEX idx_hr_appointments_email ON hr_appointments(email);
```

---

### User Linking Logic

**When creating an appointment:**
```typescript
// Check if user already exists (for CB returns)
const { data: existingUser } = await supabase
  .from('users')
  .select('id, name')
  .eq('email', appointmentEmail)
  .maybeSingle();

// If found, link it
if (existingUser) {
  appointmentData.user_id = existingUser.id;
}
```

**In the UI:**
- If `user_id` exists → Show "View Profile" link
- If not → Show "Not yet in system" badge

---

### UI Features

**1. Profile Linking Indicator**
```text
| Name             | In System? | ... |
|------------------|------------|-----|
| BURSIK Nikola    | ✓ Linked   | ... | ← Click opens profile
| VILLA SOSPEDRA   | ○ Pending  | ... | ← No link yet
```

**2. Auto-Link Option**
- Button to "Link to existing user" if email match found
- Automatic linking when `effective_date` passes and user appears in `users`

**3. Data Comparison (for CB returns)**
- Show current `users` data vs appointment data
- Highlight differences (e.g., new position, new grade)

---

### Workflow Integration

**Import Staff → Appointments sync:**
1. After staff import, run a query to find appointments with matching emails
2. Auto-link `user_id` for any matches
3. Optionally mark as "Completed" if past effective date

**This keeps operations tracking separate from master data while allowing visibility.**

---

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_create_hr_appointments.sql` | Database table with user link |
| `src/components/operations/AppointmentForm.tsx` | Add/Edit form with user lookup |
| `src/components/operations/AppointmentStatusBadge.tsx` | Status + user link indicator |
| `src/components/operations/AppointmentFilters.tsx` | Filter controls |

### Files to Modify

| File | Purpose |
|------|---------|
| `src/pages/operations/Appointments.tsx` | Main page with table, user linking |

---

### Benefits of This Approach

1. **No data duplication** - `users` remains the source of truth for staff data
2. **Pre-arrival tracking** - Track people before they exist in the system
3. **Audit trail** - Keep history of onboarding process separate from profile
4. **CB return visibility** - See historical appointments for returning staff
5. **Works with existing imports** - No changes needed to import functions

