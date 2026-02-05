

# Staff Autofill + CB Workflow Automation

## Overview
Two connected enhancements to streamline HR operations:
1. **Staff Autofill** - Search and auto-populate form fields from the users table when creating separations/appointments
2. **CB Workflow Automation** - Auto-create linked Appointment (CB) when a Separation (CB) is created

---

## Feature 1: Staff Autofill Search

### How It Works
When HR starts typing in the form, a search dropdown appears with matching staff members from the users table. Selecting a staff member auto-fills all relevant fields and automatically links the record.

```
+------------------------------------------+
|  Search Staff  [Type to search...]       |
+------------------------------------------+
|  > Szilvia PETKOV                        |
|    P4 - MSL - Valencia                   |
|    petkov@unicc.org                       |
|  ----------------------------------------|
|  > Enrique AGUILAR RICO                  |
|    P3 - CSA - Valencia                   |
|    aguilar@unicc.org                      |
+------------------------------------------+
```

### Data Mapping (Users table to Form)

| Users Field | Separation Form Field | Appointment Form Field |
|-------------|----------------------|------------------------|
| `name` | Split to `last_name`, `first_name` | Split to `last_name`, `first_name` |
| `email` | `email` | `email` |
| `id` | `user_id` (auto-link) | `user_id` (auto-link) |
| `current_grade` | `grade` | `grade` |
| `job_title` | `job_title` | `job_title` |
| `duty_station` | `duty_station` | `duty_station` |
| `unit` | `section_unit` | `section_unit` |
| `line_manager` | `supervisor` | `supervisor` |
| `worker_type` | `is_international` (Staff = check grade) | `is_international` |
| `staff_number` | `staff_number` | - |

### Name Parsing Logic
The `name` field in users is stored as "First LAST" or "LAST, First". Logic:
```typescript
// "Szilvia PETKOV" -> last_name: "PETKOV", first_name: "Szilvia"
// "AGUILAR RICO Enrique" -> detect pattern
const words = name.split(' ');
const upperWords = words.filter(w => w === w.toUpperCase());
const lowerWords = words.filter(w => w !== w.toUpperCase());
// Usually last name is uppercase: PETKOV, AGUILAR RICO
```

### International Staff Detection
- Grade starts with "P" (P1-P5, D1-D2) = International
- Grade starts with "G" (G1-G7) = Local (General Service)

---

## Feature 2: CB Workflow Automation (from previous plan)

When `operation_type = "Separation (CB)"` or `"Individual Consultancy (CB)"`:
1. Calculate return date: separation date + 1 month
2. Create linked Appointment (CB) record
3. Show confirmation toast
4. Display link indicator on both records

---

## Database Changes

### New Columns for Linking

```sql
-- Add linking columns
ALTER TABLE hr_appointments 
  ADD COLUMN linked_separation_id UUID REFERENCES hr_separations(id);

ALTER TABLE hr_separations 
  ADD COLUMN linked_appointment_id UUID REFERENCES hr_appointments(id);
```

---

## UI Implementation

### New Component: StaffSearchCombobox

A reusable combobox that:
- Searches users table as you type (debounced)
- Shows name, grade, unit, email in dropdown
- Returns selected user data for form population

```
+----------------------------------------------------------+
|  SEPARATION FORM                                         |
|  --------------------------------------------------------|
|  [ Search existing staff... ] or enter manually          |
|  --------------------------------------------------------|
|                                                          |
|  Last Name *     [ PETKOV          ]  (auto-filled)      |
|  First Name *    [ Szilvia         ]  (auto-filled)      |
|  Email           [ petkov@unicc.org]  (auto-filled)      |
|  Staff Number    [ S123456         ]  (auto-filled)      |
|  Grade           [ P4              ]  (auto-filled)      |
|  ...                                                     |
|                                                          |
|  [ Linked to: Szilvia PETKOV (Staff) ]  <-- indicator    |
+----------------------------------------------------------+
```

### CB Type Info Banner
When "Separation (CB)" is selected:

```
+----------------------------------------------------------+
|  ℹ️ Contract Break Selected                               |
|  An Appointment (CB) will be automatically created       |
|  for this person's return, dated 1 month after the       |
|  separation date.                                        |
+----------------------------------------------------------+
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/operations/StaffSearchCombobox.tsx` | Reusable staff search component |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[timestamp].sql` | Add linking columns to both tables |
| `src/components/operations/SeparationForm.tsx` | Add staff search, CB info banner |
| `src/components/operations/AppointmentForm.tsx` | Add staff search |
| `src/pages/operations/Separations.tsx` | Add CB workflow automation logic |

---

## Implementation Details

### StaffSearchCombobox Component

```typescript
interface StaffSearchComboboxProps {
  onSelect: (user: {
    id: string;
    name: string;
    email: string;
    grade?: string;
    job_title?: string;
    duty_station?: string;
    section_unit?: string;
    supervisor?: string;
    staff_number?: string;
    is_international: boolean;
  }) => void;
}
```

### Form Integration

In SeparationForm.tsx:
```typescript
const handleStaffSelect = (user) => {
  // Parse name into first/last
  const { firstName, lastName } = parseName(user.name);
  
  form.setValue('last_name', lastName);
  form.setValue('first_name', firstName);
  form.setValue('email', user.email);
  form.setValue('grade', user.grade || '');
  form.setValue('job_title', user.job_title || '');
  form.setValue('duty_station', user.duty_station || '');
  form.setValue('section_unit', user.section_unit || '');
  form.setValue('supervisor', user.supervisor || '');
  form.setValue('staff_number', user.staff_number || '');
  form.setValue('is_international', user.is_international);
  
  // Store user_id for linking
  setSelectedUserId(user.id);
};
```

### CB Automation in Separations Page

```typescript
const createMutation = useMutation({
  mutationFn: async (data) => {
    // Create separation
    const { data: separation, error } = await supabase
      .from('hr_separations')
      .insert(separationData)
      .select()
      .single();

    // If CB type, create linked appointment
    if (data.operation_type.includes('(CB)')) {
      const returnDate = data.tentative_date 
        ? format(addMonths(parseISO(data.tentative_date), 1), 'yyyy-MM-dd')
        : null;

      const { data: appointment } = await supabase
        .from('hr_appointments')
        .insert({
          ...copiedFields,
          operation_type: 'Appointment (CB)',
          tentative_date: returnDate,
          recruitment_type: 'CB Return',
          linked_separation_id: separation.id,
        })
        .select()
        .single();

      // Update separation with link
      await supabase
        .from('hr_separations')
        .update({ linked_appointment_id: appointment.id })
        .eq('id', separation.id);
    }
  }
});
```

---

## User Experience Flow

### Creating a Separation for Existing Staff

1. HR clicks "Add Separation"
2. Form opens with staff search at top
3. HR types "PETKOV"
4. Dropdown shows matching staff
5. HR selects "Szilvia PETKOV - P4 - Valencia"
6. All fields auto-populate
7. Record is automatically linked to user profile
8. If CB type selected, info banner appears
9. HR saves - both separation and return appointment created

### Visual Indicators

In the table, show:
- **Linked to user**: 👤 icon or "Linked" badge
- **CB pair**: 🔗 icon with tooltip "Linked to Appointment (CB)"

