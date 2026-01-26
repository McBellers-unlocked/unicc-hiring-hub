
## Plan: Preserve Existing Data During Staff Import

### Overview
Update the staff import function to intelligently preserve existing user data that shouldn't be overwritten, and only update fields that have actual values in the CSV.

---

### Key Changes Required

#### 1. Preserve the `skills` field explicitly

Currently the `skills` field is NOT in the update payload, so it's already being preserved. However, we should make this explicit to prevent accidental future changes.

#### 2. Preserve the `role` field for existing users

The import currently **overwrites** the `role` to 'Hiring Manager' for ALL users, even if they're Admin or Chief of HR. This is a bug.

**Fix:** Only set role for NEW users, never update role for existing users.

#### 3. Don't overwrite with empty/null values

If a CSV field is empty but the user already has data, preserve the existing data.

---

### Implementation Changes

**File:** `supabase/functions/import-staff-list/index.ts`

#### Change 1: Fetch existing user data before update

```typescript
// Current: Only checks if user exists
const { data: existingUser } = await supabase
  .from('users')
  .select('id')  // ← Only gets ID
  .eq('email', email)
  .maybeSingle();

// New: Fetch fields we want to preserve
const { data: existingUser } = await supabase
  .from('users')
  .select('id, skills, role')  // ← Get preservable fields
  .eq('email', email)
  .maybeSingle();
```

#### Change 2: Build update object that preserves existing data

```typescript
// For UPDATES (existing users)
const updateData: Record<string, any> = {};

// Only update fields that have values in CSV
if (name) updateData.name = name;
if (getValue(columnMap.email)) updateData.email = email;
if (getValue(columnMap.gender)) updateData.gender = getValue(columnMap.gender);
if (getValue(columnMap.staffNumber)) updateData.staff_number = getValue(columnMap.staffNumber);
// ... etc for all fields

// NEVER update these for existing users:
// - role (preserve Admin, Chief of HR, etc.)
// - skills (preserve skills data)
```

#### Change 3: For NEW users, set role

```typescript
// For INSERTS (new users)
const insertData = {
  ...userData,
  role: 'Hiring Manager',  // ← Only for new users
};
```

---

### Fields to Preserve (Never Overwrite)

| Field | Reason |
|-------|--------|
| `skills` | Skills analysis data - already preserved but make explicit |
| `role` | Users may have elevated permissions (Admin, Chief of HR) |
| `second_line_manager` | May be set via different process |
| `probation_end_date` | HR sets this separately |

### Fields to Update Only if CSV Has Value

| Field | Behavior |
|-------|----------|
| `name`, `gender`, `staff_number` | Update only if CSV value is non-empty |
| `unit`, `division`, `job_title` | Update only if CSV value is non-empty |
| `line_manager`, `duty_station` | Update only if CSV value is non-empty |
| `nationality`, `current_grade` | Update only if CSV value is non-empty |
| `contract_start_date`, `contract_end_date` | Update only if CSV value is non-empty |
| `entry_on_duty_date` | Update only if CSV value is non-empty |
| `personnel_type`, `affiliate_type` | Update only if CSV value is non-empty |

---

### Data That Is Already Safe

These are stored in **separate tables** and are never affected by staff import:

| Table | Data Type | Safe? |
|-------|-----------|-------|
| `skill_assessments` | Skills ratings, manager assessments | Yes - separate table |
| `skill_definitions` | Skill catalog | Yes - separate table |
| `candidate_flags` | Talent pool flags | Yes - separate table |
| `candidate_notes` | Talent pool notes | Yes - separate table |
| `talent_pool_searches` | Saved searches | Yes - separate table |
| `candidates` | External candidate profiles | Yes - completely separate |
| `workplans` + related | Performance data | Yes - separate table |

---

### Summary

The import will be modified to:

1. **Preserve `skills`** - Already safe, will make explicit
2. **Preserve `role`** - Never overwrite for existing users
3. **Conditional updates** - Only update fields where CSV has actual values
4. **Safe related data** - `skill_assessments`, `candidate_flags`, etc. are in separate tables and untouched

This ensures that importing a new staff list will:
- Update organizational data (unit, division, manager, grade, etc.)
- NOT overwrite skills or permissions
- NOT wipe out data if a CSV field is empty

