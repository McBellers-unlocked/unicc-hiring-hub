

# Restructure Affiliate Personnel to Match Appointments/Separations Pattern

## Overview

Transform the Affiliate Personnel management to follow the same UX pattern as Appointments and Separations:

1. **Main List Page** - Add "Add Affiliate" button that opens a form dialog with staff search/autofill
2. **Row Actions** - Each affiliate row has "Edit" and "Lifecycle" buttons
3. **Form Dialog** - Create/edit affiliate using the same dialog pattern with staff search combobox

---

## Current vs New Structure

| Current | New |
|---------|-----|
| Separate "Edit Demographics" page with editable table | Form dialog on main page (like Appointments) |
| No ability to create new affiliates in-app | "Add Affiliate" button opens creation form |
| Single "Lifecycle" button per row | Two buttons: "Edit" + "Lifecycle" |

---

## Implementation

### 1. Create AffiliateForm Component

**New File: `src/components/affiliate/AffiliateForm.tsx`**

A dialog-based form component matching the AppointmentForm pattern:
- Uses `StaffSearchCombobox` to search existing users and auto-populate fields
- Tabs for organizing fields: "Personal", "Contract", "Assignment"
- HR Focal Point dropdown using the fixed `HR_FOCAL_POINTS` list
- Creates new affiliate or updates existing one

**Form Fields (matching CSV import):**

| Tab | Fields |
|-----|--------|
| Personal | Name, Email, Affiliate Type, Staff Number, Nationality, Gender |
| Contract | Contract Start, Contract End, First Incumbency Date |
| Assignment | Division, Unit, Job Title, Line Manager, Duty Station, Grade |

**Staff Search Autofill:**
When an existing user is selected from the combobox:
- Populates Name, Email, Job Title, Division, etc.
- Links the affiliate record to the user via `id`
- If person doesn't exist in system, allows manual entry

### 2. Update Main Page (AffiliatePersonnel.tsx)

**Header Changes:**
- Add "Add Affiliate" button (primary) next to "Import Affiliates"
- Opens `AffiliateForm` in create mode

**Table Row Actions:**
- Replace single "Lifecycle" button with dropdown menu:
  - "Edit" - Opens `AffiliateForm` in edit mode
  - "Manage Lifecycle" - Links to lifecycle page
  - "Mark Inactive" (optional) - For completed affiliates

**Stats Cards:** Keep as-is (they provide useful overview)

### 3. Update/Remove Edit Demographics Page

**Option A (Recommended):** Keep `AffiliateDemographicsEdit.tsx` as a bulk edit tool for advanced users, but make the primary flow use the form dialog.

**Option B:** Remove the separate page entirely and rely on the row-level edit button.

For this implementation, we'll go with Option A - keep both flows available.

---

## File Changes

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/affiliate/AffiliateForm.tsx` | Dialog form for create/edit affiliate |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/AffiliatePersonnel.tsx` | Add "Add Affiliate" button, AffiliateForm dialog, row edit action |

---

## Technical Details

### AffiliateForm Component Structure

```tsx
interface AffiliateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AffiliateFormData) => Promise<void>;
  initialData?: Partial<AffiliateFormData>;
  isLoading?: boolean;
}

const affiliateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  affiliate_type: z.enum(['IC', 'Intern', 'UNV']),
  division: z.string().optional(),
  unit: z.string().optional(),
  job_title: z.string().optional(),
  line_manager: z.string().optional(),
  duty_station: z.string().optional(),
  contract_start_date: z.string().optional(),
  contract_end_date: z.string().optional(),
  current_grade: z.string().optional(),
  staff_number: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  first_incumbency_date: z.string().optional(),
});
```

### Staff Search Integration

```tsx
// When staff is selected from combobox
const handleStaffSelect = (staff: StaffMember) => {
  form.setValue('name', staff.name);
  form.setValue('email', staff.email);
  form.setValue('job_title', staff.job_title || '');
  form.setValue('duty_station', staff.duty_station || '');
  form.setValue('current_grade', staff.grade || '');
  form.setValue('line_manager', staff.supervisor || '');
  // Store user ID for linking
  setSelectedUserId(staff.id);
};
```

### Create/Update Logic

For **new affiliates** not in the system:
```tsx
// Insert new user with personnel_type = 'Affiliate'
const { error } = await supabase
  .from('users')
  .insert({
    ...formData,
    personnel_type: 'Affiliate',
  });
```

For **existing users** being converted to affiliate:
```tsx
// Update existing user to set personnel_type and affiliate fields
const { error } = await supabase
  .from('users')
  .update({
    personnel_type: 'Affiliate',
    affiliate_type: formData.affiliate_type,
    // ... other affiliate fields
  })
  .eq('id', selectedUserId);
```

### Row Actions Dropdown

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => handleEdit(affiliate)}>
      <Pencil className="h-4 w-4 mr-2" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem asChild>
      <Link to={`/admin/affiliate-personnel/${affiliate.id}/lifecycle`}>
        <ClipboardList className="h-4 w-4 mr-2" />
        Manage Lifecycle
      </Link>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## User Experience Flow

### Creating a New Affiliate

1. Click "Add Affiliate" button in header
2. Dialog opens with staff search combobox
3. Search for existing person OR enter details manually
4. Fill in affiliate-specific fields (type, contract dates)
5. Save - creates/updates user record with `personnel_type = 'Affiliate'`

### Editing an Affiliate

1. Click "Edit" from row actions dropdown
2. Dialog opens pre-populated with affiliate's current data
3. Modify fields as needed
4. Save - updates the user record

### Managing Lifecycle

1. Click "Manage Lifecycle" from row actions dropdown
2. Navigates to the dedicated lifecycle page (already implemented)

---

## Summary

This restructure brings the Affiliate Personnel management in line with the established Appointments/Separations pattern:
- Unified form dialog for create/edit operations
- Staff search autofill from existing database
- Row-level actions for quick access to edit and lifecycle
- Keeps bulk edit page available for advanced users

