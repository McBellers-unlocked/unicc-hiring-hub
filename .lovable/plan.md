

## Plan: Add CSV Import for Appointments

### Overview
Add a CSV import feature to the Appointments page that follows the same pattern as the existing staff import functions. Users will be able to upload their spreadsheet data to bulk-create appointment records.

---

### Column Mapping (from Spreadsheet)

Based on the screenshots you provided earlier:

| CSV Column | Database Field | Notes |
|------------|----------------|-------|
| Last Name | `last_name` | Required |
| First Name | `first_name` | Required |
| Operation Type | `operation_type` | Appointment, Appointment (CB), Direct Appointment |
| Tentative Date | `tentative_date` | Various date formats supported |
| Job Title | `job_title` | |
| Grade | `grade` | P3, G5, etc. |
| Contract Type | `contract_type` | Temporary, Fixed-term, etc. |
| Duty Station / Location | `duty_station` | |
| Unit | `section_unit` | |
| Supervisor | `supervisor` | |
| Old PO | `old_po` | For CB returns |
| New PO | `new_po` | |
| Vacancy Reference | `vacancy_reference` | |
| Main HR Focal Point | `main_hr_focal_point` | |
| Recruitment Type | `recruitment_type` | Newcomer, etc. |
| Effective Date | `effective_date` | |
| International | `is_international` | Yes/No → boolean |
| Notice Days | `notice_days_required` | Number, default 30 |
| Comments | `comments` | |
| Onboarding Comments | `onboarding_comments` | |
| Actions in HR Plan | `actions_in_hr_plan` | |
| Email | `email` | For user linking |

---

### Implementation Approach

**Option 1: Edge Function (Recommended)**
- Create `import-appointments` edge function
- Same pattern as `import-affiliate-personnel`
- Handles CSV parsing, validation, user linking
- Returns summary of created/updated/errors

**Option 2: Client-side parsing**
- Parse CSV in browser
- Call Supabase insert directly
- Simpler but less robust

**Recommended: Option 1** for consistency with existing imports.

---

### UI Changes to Appointments Page

Add an "Import CSV" button next to the "Add Appointment" button:

```text
[📤 Import CSV]  [+ Add Appointment]
```

Clicking opens a dialog with:
1. File picker for CSV
2. Preview of first few rows
3. Column mapping verification
4. Import button
5. Results summary

---

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/import-appointments/index.ts` | Edge function for CSV import |
| `src/components/operations/ImportAppointmentsDialog.tsx` | Import dialog UI |

### Files to Modify

| File | Purpose |
|------|---------|
| `src/pages/operations/Appointments.tsx` | Add import button and dialog |

---

### Edge Function Logic

```typescript
// import-appointments/index.ts

// 1. Parse CSV with auto-header detection
// 2. Map columns flexibly (case-insensitive, partial matches)
// 3. For each row:
//    a. Parse dates (multiple formats supported)
//    b. Normalize operation_type to valid enum value
//    c. Check if user exists by email → link user_id
//    d. Insert into hr_appointments
// 4. Return summary: { created, skipped, errors }
```

---

### Import Dialog Features

1. **Drag & drop file upload** or click to select
2. **Auto-detect columns** from header row
3. **Preview table** showing first 5 rows
4. **Progress indicator** during import
5. **Results summary**:
   - ✅ 15 appointments created
   - ⚠️ 2 rows skipped (missing required fields)
   - 🔗 8 linked to existing users

---

### Error Handling

- Missing required fields (last_name, first_name, operation_type) → skip row, report warning
- Invalid date format → try multiple parsers, leave null if failed
- Invalid operation_type → map to closest match or "Appointment" default
- Duplicate detection by name + tentative_date (optional)

---

### Technical Details

**Date Parsing (reuse from affiliate import):**
- ISO: `2026-02-09`
- UK: `09/02/2026`
- Short: `9-Feb-26`
- Excel: Handle various date formats

**Operation Type Normalization:**
```typescript
const normalizeOperationType = (value: string): string => {
  const lower = value.toLowerCase().trim();
  if (lower.includes('cb') || lower.includes('return')) return 'Appointment (CB)';
  if (lower.includes('direct')) return 'Direct Appointment';
  return 'Appointment';
};
```

**User Linking:**
```typescript
// If email provided, check if user exists
if (email) {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  if (user) appointmentData.user_id = user.id;
}
```

---

### Implementation Order

1. Create `import-appointments` edge function with CSV parsing
2. Create `ImportAppointmentsDialog.tsx` component
3. Add import button to Appointments page
4. Test with sample CSV data

