

## Plan: Fix Duplicate Slug Errors for Initial Requests

### Problem
When submitting an initial request with a title that already exists (e.g., "Policy Legal Intern"), the system generates a slug like `policy-legal-intern` but fails with:

```
duplicate key value violates unique constraint "job_requisitions_slug_key"
```

The code currently generates a slug without checking if it already exists in the database.

### Root Cause
**File:** `src/pages/InitialRequestForm.tsx` (lines 544-555)

```typescript
// Current code - no uniqueness check
const baseSlug = generateSlug(formData.position_title);
const { error } = await supabase
  .from('job_requisitions')
  .insert({
    ...dataToSave,
    slug: baseSlug,  // ← May already exist!
    created_by: user?.id,
  });
```

### Solution
Apply the same pattern already used in `JobWizardStep6.tsx`:
1. Query existing slugs that start with the base slug
2. Use the `generateUniqueSlug` utility to create a unique slug (e.g., `policy-legal-intern-2`, `policy-legal-intern-3`)

---

### Implementation

**File:** `src/pages/InitialRequestForm.tsx`

#### Step 1: Add import for generateUniqueSlug

```typescript
import { isValidUUID, generateUniqueSlug } from '@/lib/utils';
```

#### Step 2: Update the insert logic (around line 544-555)

```typescript
// Create new with unique slug
const baseSlug = generateSlug(formData.position_title);

// Query existing slugs that match this pattern
const { data: matchingSlugs } = await supabase
  .from('job_requisitions')
  .select('slug')
  .like('slug', `${baseSlug}%`);

const slugList = matchingSlugs?.map(r => r.slug).filter(Boolean) as string[] || [];

// Generate unique slug if collision exists
const finalSlug = slugList.includes(baseSlug) 
  ? generateUniqueSlug(baseSlug, slugList) 
  : baseSlug;

const { error } = await supabase
  .from('job_requisitions')
  .insert({
    ...dataToSave,
    slug: finalSlug,  // ← Now guaranteed unique
    created_by: user?.id,
  });
```

---

### Expected Behavior After Fix

| Scenario | Result |
|----------|--------|
| First "Policy Legal Intern" | Slug: `policy-legal-intern` |
| Second "Policy Legal Intern" | Slug: `policy-legal-intern-2` |
| Third "Policy Legal Intern" | Slug: `policy-legal-intern-3` |
| "Policy Legal Intern 2024" | Slug: `policy-legal-intern-2024` (different base) |

---

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/InitialRequestForm.tsx` | Add slug uniqueness check before insert |

---

### Why This Works

The `generateUniqueSlug` utility (already in `src/lib/utils.ts`) handles the numbering logic:
- Takes a base slug and list of existing slugs
- Returns the base slug if unique
- Otherwise appends `-2`, `-3`, etc. until unique

This is the same pattern successfully used in the Job Wizard.

