

## Plan: Create Unified Staff Import Function

### Overview
Create a new unified import system that can handle both **Staff** and **Affiliate** personnel in a single CSV upload. The importer will:
1. Detect `personnel_type` from CSV (Staff or Affiliate)
2. If Affiliate, detect `affiliate_type` (IC, Intern, UNV)
3. Create new users or update existing ones

---

### Phase 1: Create Unified Import Edge Function

**New file: `supabase/functions/import-staff-list/index.ts`**

A unified edge function that:
- Accepts CSV data with both Staff and Affiliate personnel
- Detects personnel type from `Personnel Type` column
- Detects affiliate type from `Worker Type` or `App Type Short` columns for affiliates
- Handles all user fields from your CSV:

| CSV Column | Database Field |
|------------|----------------|
| Email / Email Address | `email` |
| First Name + Last Name | `name` |
| Gender | `gender` |
| Staff Number | `staff_number` |
| Personnel Type | `personnel_type` (Staff/Affiliate) |
| Worker Type / App Type Short | `affiliate_type` (IC/Intern/UNV) |
| Unit | `unit` |
| Division | `division` |
| Job Title | `job_title` |
| Line Manager | `line_manager` |
| DS Short / Office Location | `duty_station` |
| Nationality | `nationality` |
| Current Grade | `current_grade` |
| Contract Start Date | `contract_start_date` |
| Contract End Date | `contract_end_date` |
| Entry On Duty Date | `entry_on_duty_date` |

**Key Logic:**
1. For each row, check `Personnel Type` column
2. If value is "Staff" → set `personnel_type = 'Staff'`, `affiliate_type = null`
3. If value is "Affiliate" or empty with IC/Intern/UNV worker type → set `personnel_type = 'Affiliate'`, detect `affiliate_type`
4. For existing users (match by email): Update their data
5. For new users: Create auth account and user record
6. Assign role based on personnel type:
   - Staff → 'Hiring Manager'
   - Affiliate → 'Hiring Manager'

---

### Phase 2: Create Unified Import Page

**New file: `src/pages/ImportStaffList.tsx`**

Route: `/admin/import-staff-list`

Features:
- Drag-and-drop CSV upload (supports .csv, .xlsx, .xls via xlsx library)
- Clear explanation that this imports both Staff and Affiliate
- Shows personnel type badges for context
- Import summary with breakdown:
  - Staff: X created, Y updated
  - Affiliates: X created, Y updated (by type IC/Intern/UNV)
  - Errors: Z
- Link to Affiliate Personnel and Organization Chart after import

---

### Phase 3: Update Navigation

**Update: `src/components/Layout.tsx`**

Replace separate import links with single "Import Staff List" option that handles both types.

**Update: `src/App.tsx`**

Add route for `/admin/import-staff-list`.

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/import-staff-list/index.ts` | Create unified import function |
| `src/pages/ImportStaffList.tsx` | Create import page |
| `src/components/Layout.tsx` | Update navigation |
| `src/App.tsx` | Add route |

---

### Data Flow

```text
CSV with Staff + Affiliates
        ↓
Parse & detect Personnel Type per row
        ↓
Staff rows → personnel_type='Staff', affiliate_type=null
Affiliate rows → personnel_type='Affiliate', affiliate_type=IC/Intern/UNV
        ↓
Upsert to users table (create or update by email)
        ↓
Return summary with Staff/Affiliate breakdown
```

---

### Column Detection Strategy

The function will use flexible column detection to handle various CSV formats:

```typescript
const findColumn = (patterns: string[]): number => {
  return headers.findIndex(h => {
    const lower = h.toLowerCase().trim();
    return patterns.some(p => lower.includes(p));
  });
};

// Example patterns
personnelTypeIndex = findColumn(['personnel type', 'personnel_type', 'type of personnel']);
workerTypeIndex = findColumn(['worker type', 'worker_type', 'app type short']);
```

---

### Personnel Type Logic

```typescript
// Detect personnel type
let personnelType = 'Staff'; // Default
let affiliateType = null;

const personnelTypeValue = values[personnelTypeIndex]?.trim().toLowerCase();
const workerTypeValue = values[workerTypeIndex]?.trim().toUpperCase();

if (personnelTypeValue === 'affiliate' || 
    ['IC', 'INTERN', 'UNV'].includes(workerTypeValue)) {
  personnelType = 'Affiliate';
  
  // Detect affiliate type
  if (workerTypeValue === 'IC') affiliateType = 'IC';
  else if (workerTypeValue.includes('INTERN')) affiliateType = 'Intern';
  else if (workerTypeValue === 'UNV') affiliateType = 'UNV';
}
```

This creates a single import system that handles your complete staff member list with proper classification of both Staff and Affiliate personnel.

