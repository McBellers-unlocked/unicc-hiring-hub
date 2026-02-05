
## Plan: Enhanced HR Appointments with Comments & Status Updates

### Overview
Add a threaded comments system to HR Appointments with expandable rows, update the status values to match your workflow, and add ability to manually link appointments to users.

---

### Changes Required

#### 1. Database Changes

**Update status constraint** to replace "On hold" with "Not started":
```sql
-- Drop old constraint
ALTER TABLE hr_appointments DROP CONSTRAINT hr_appointments_status_check;

-- Add new constraint with updated values
ALTER TABLE hr_appointments ADD CONSTRAINT hr_appointments_status_check 
  CHECK (status = ANY (ARRAY['Not started', 'In progress', 'Completed', 'Cancelled']));

-- Update any existing 'On hold' records to 'Not started'
UPDATE hr_appointments SET status = 'Not started' WHERE status = 'On hold';
```

**Create comments table**:
```sql
CREATE TABLE hr_appointment_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES hr_appointments(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE hr_appointment_comments ENABLE ROW LEVEL SECURITY;

-- Policy for HR users
CREATE POLICY "HR users can manage appointment comments" ON hr_appointment_comments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Admin', 'HR Assistant', 'Chief of HR'))
  );

CREATE INDEX idx_appointment_comments_appointment ON hr_appointment_comments(appointment_id);
CREATE INDEX idx_appointment_comments_created ON hr_appointment_comments(created_at DESC);
```

---

#### 2. UI Changes - Expandable Rows with Comments

**Table row enhancement:**
- Add a chevron/arrow to expand each row
- When expanded, show:
  - All comments in chronological order (latest first)
  - "Add comment" textarea at the bottom
  - Last comment preview in the collapsed row

**Visual design:**
```text
┌─────────────────────────────────────────────────────────────────────┐
│ ▶ BURSIK Nikola   │ Appointment │ 15 Mar 2026 │ In progress │ ... │
├─────────────────────────────────────────────────────────────────────┤
│ ▼ VILLA SOSPEDRA  │ Appointment │ 10 Mar 2026 │ In progress │ ... │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Comments (3)                                                   ││
│  │ ─────────────────────────────────────────────────────────────  ││
│  │ 📝 Anna N. - 05 Feb 2026                                       ││
│  │    Medical clearance received. Waiting on visa.                ││
│  │                                                                 ││
│  │ 📝 Francesca R. - 03 Feb 2026                                   ││
│  │    Verifile check completed.                                   ││
│  │                                                                 ││
│  │ [Add new comment...]                                           ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**Collapsed row shows:**
- Comment count badge (e.g., "💬 3")
- Last comment preview (truncated to ~50 chars)

---

#### 3. User Linking Feature

Since many appointments were imported without emails, add:

**Manual link button** in the actions dropdown:
- "Link to User" option
- Opens a search dialog to find the user by name
- Case-insensitive name search against `users` table
- Updates `user_id` on the appointment

**Auto-link by name** (optional button):
- Searches for users where name matches `{first_name} {last_name}` or `{last_name}, {first_name}`
- Suggests matches for confirmation

---

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_add_appointment_comments.sql` | Database changes |
| `src/components/operations/AppointmentComments.tsx` | Expandable comments section |
| `src/components/operations/LinkUserDialog.tsx` | Manual user linking dialog |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/operations/Appointments.tsx` | Add expandable rows, comments display, link action |
| `src/components/operations/AppointmentForm.tsx` | Update status enum values |
| `src/components/operations/AppointmentStatusBadge.tsx` | Add "Not started" styling |
| `src/components/operations/AppointmentFilters.tsx` | Update status filter options |
| `supabase/functions/import-appointments/index.ts` | Add default status of "Not started" for new imports |

---

### Implementation Details

**Expandable Row Component:**
```typescript
// Track which rows are expanded
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

// Toggle expansion
const toggleRow = (id: string) => {
  setExpandedRows(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};
```

**Comments Query:**
```typescript
const { data: comments } = useQuery({
  queryKey: ['appointment-comments', appointmentId],
  queryFn: async () => {
    const { data } = await supabase
      .from('hr_appointment_comments')
      .select('*, author:author_id(name)')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false });
    return data;
  },
  enabled: isExpanded,
});
```

**User Search for Linking:**
```typescript
const searchUsers = async (term: string) => {
  const { data } = await supabase
    .from('users')
    .select('id, name, email')
    .ilike('name', `%${term}%`)
    .limit(10);
  return data;
};
```

---

### Technical Summary

| Feature | Implementation |
|---------|----------------|
| Comments table | New `hr_appointment_comments` with RLS |
| Status values | Update constraint: Not started, In progress, Completed, Cancelled |
| Expandable rows | Collapsible component with comment count badge |
| Last comment preview | Show in collapsed row (e.g., "Medical cleared - 2 days ago") |
| Add comment | Inline textarea in expanded section |
| User linking | Search dialog to find and link users by name |

---

### Benefits

1. **Comments visible at a glance** - Last comment shows in main table
2. **Full history accessible** - Expand to see all comments
3. **Status matches workflow** - "Not started" for new appointments
4. **Manual user linking** - Fix the "Pending" issue for imported records
