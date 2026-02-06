

# Affiliate Personnel: Edit Demographics + Lifecycle Manager

## Overview

This implementation adds two major features to the Affiliate Personnel management system:

1. **Edit Demographics** - An editable table view for HR focal points to directly modify affiliate data (same fields as the CSV import)
2. **Manage Lifecycle** - A contract break/onboarding timeline with checklist tasks for each affiliate

---

## Feature 1: Edit Demographics

### User Experience

- Click "Edit demographics" button in the table header
- Opens a new page with an editable data table
- Each row is an affiliate, columns match the CSV import fields
- Inline editing with auto-save on blur
- Bulk editing support for common fields

### Route

```
/admin/affiliate-personnel/edit
```

### Editable Fields (matching CSV import)

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | Full name |
| Email | Text | Read-only (unique identifier) |
| Affiliate Type | Select | IC, Intern, UNV |
| Division | Text | Org division |
| Unit | Text | Sub-unit |
| Job Title | Text | Current role |
| Line Manager | Text | Supervisor name |
| Duty Station | Text | Location |
| Contract Start Date | Date | Start of current contract |
| Contract End Date | Date | End of current contract |
| Current Grade | Text | Pay grade |
| Staff Number | Text | Employee ID |
| Nationality | Text | Country of citizenship |
| Gender | Select | Male, Female |
| First Incumbency Date | Date | Original start date |

### Components to Create

**`src/pages/AffiliateDemographicsEdit.tsx`**
- Full-page editable table with filters
- Uses React Table for inline editing
- Auto-saves changes to Supabase `users` table
- Shows validation errors inline
- Back button returns to main affiliate list

---

## Feature 2: Manage Lifecycle

### User Experience

1. Click "Manage lifecycle" button on any affiliate row
2. Opens a dedicated lifecycle management page showing:
   - Affiliate name and email (header)
   - Contract break dates (calculated from current end date + next start date)
   - Days to onboard date (countdown)
   - Visual timeline from Day -45 to Day 0
   - Checklist steps with color-coded status

### Route

```
/admin/affiliate-personnel/:id/lifecycle
```

### Timeline Stages (from mockup)

| Stage | Day Marker | KPI Target |
|-------|------------|------------|
| Contract Break Preparations | Day -45 | By Day -45 |
| Purchase Request | Day -30 | By Day -30 |
| Documentation | Day -20 | By Day -20 |
| Purchase Order | Day -14 | By Day -14 |
| Stakeholders Update | Day 0 | By Day 0 |

### Checklist Items per Stage

**Day -45: Contract Break Preparations**
- Remind consultant of Timesheet
- Evaluation form reminder
- Send Contract Break ticket

**Day -30: Purchase Request**
- Confirm account codes
- Raise PR
- PR completed

**Day -20: Documentation**
- (Configurable items)

**Day -14: Purchase Order**
- (Configurable items)

**Day 0: Stakeholders Update**
- (Configurable items)

### Stage Color Logic

| Condition | Color |
|-----------|-------|
| All actions completed | Green |
| Actions pending, within KPI | Blue/Neutral |
| Actions pending, KPI date passed | Red |

### Database Schema

**New Table: `affiliate_lifecycle_checklists`**
```sql
CREATE TABLE affiliate_lifecycle_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_cycle_start DATE, -- Start of this contract cycle
  contract_cycle_end DATE,   -- End of this contract cycle
  next_contract_start DATE,  -- When the next contract begins
  stage TEXT NOT NULL,       -- 'contract_break_prep', 'purchase_request', etc.
  item_key TEXT NOT NULL,    -- 'remind_timesheet', 'raise_pr', etc.
  item_label TEXT NOT NULL,  -- Display text
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, contract_cycle_end, stage, item_key)
);
```

### Lifecycle Page Components

**`src/pages/AffiliateLifecycle.tsx`**
- Main lifecycle management page
- Fetches affiliate data and checklist items
- Displays timeline visualization
- Handles checkbox interactions

**`src/components/affiliate/AffiliateLifecycleTimeline.tsx`**
- Visual timeline component (Day -45 to Day 0)
- Circular markers with color-coded status
- Horizontal connector lines
- Responsive layout

**`src/components/affiliate/AffiliateLifecycleChecklist.tsx`**
- Checklist section for each stage
- Checkbox items with labels
- Completion timestamps
- Notes field (optional)

**`src/lib/affiliateLifecycleConfig.ts`**
- Default checklist items per stage
- Stage definitions with KPI targets

---

## Implementation Details

### Route Updates (App.tsx)

```tsx
import AffiliateDemographicsEdit from "./pages/AffiliateDemographicsEdit";
import AffiliateLifecycle from "./pages/AffiliateLifecycle";

// Add routes
<Route path="/admin/affiliate-personnel/edit" element={<AffiliateDemographicsEdit />} />
<Route path="/admin/affiliate-personnel/:id/lifecycle" element={<AffiliateLifecycle />} />
```

### Affiliate Table Updates (AffiliatePersonnel.tsx)

Add two new elements:
1. "Edit demographics" button in header (links to edit page)
2. "Manage lifecycle" button in each row's action column

```tsx
// Header button
<Button variant="outline" asChild className="ml-4">
  <Link to="/admin/affiliate-personnel/edit">
    <Edit className="w-4 h-4 mr-2" />
    Edit demographics
  </Link>
</Button>

// Row action
<TableCell>
  <Button variant="outline" size="sm" asChild>
    <Link to={`/admin/affiliate-personnel/${affiliate.id}/lifecycle`}>
      Manage lifecycle
    </Link>
  </Button>
</TableCell>
```

### Contract Break Detection Logic

Determine if an affiliate is in a contract break:
```typescript
const isContractBreak = (affiliate: AffiliateUser) => {
  if (!affiliate.contract_start_date) return false;
  const startDate = parseISO(affiliate.contract_start_date);
  const today = new Date();
  // Future start date + has worked before = contract break
  return startDate > today && affiliate.first_incumbency_date;
};

const getContractBreakDates = (affiliate: AffiliateUser) => {
  // Previous contract end = day before new contract start
  // Or use a separate field if available
  return {
    breakStart: affiliate.contract_end_date, // Previous end
    breakEnd: affiliate.contract_start_date, // New start
    daysToOnboard: differenceInDays(parseISO(affiliate.contract_start_date), new Date())
  };
};
```

### Timeline Calculation

```typescript
const LIFECYCLE_STAGES = [
  { key: 'contract_break_prep', label: 'Contract Break Preparations', dayMarker: -45 },
  { key: 'purchase_request', label: 'Purchase Request', dayMarker: -30 },
  { key: 'documentation', label: 'Documentation', dayMarker: -20 },
  { key: 'purchase_order', label: 'Purchase Order', dayMarker: -14 },
  { key: 'stakeholders_update', label: 'Stakeholders Update', dayMarker: 0 },
];

const getStageStatus = (
  stage: Stage,
  daysToOnboard: number,
  checklist: ChecklistItem[]
) => {
  const stageItems = checklist.filter(item => item.stage === stage.key);
  const allComplete = stageItems.every(item => item.completed);
  const kpiPassed = daysToOnboard < Math.abs(stage.dayMarker);
  
  if (allComplete) return 'complete'; // Green
  if (kpiPassed) return 'overdue';    // Red
  return 'pending';                    // Blue
};
```

---

## Extension Without Contract Break

For cases where an extension does not involve a contract break (continuous contract), the lifecycle view will:
- Show only relevant stages (stakeholders update, documentation)
- Hide contract break-specific items
- Use contract end date as Day 0

A toggle or automatic detection based on `first_incumbency_date` vs `contract_start_date` comparison can determine which workflow to show.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/AffiliateDemographicsEdit.tsx` | Editable table page |
| `src/pages/AffiliateLifecycle.tsx` | Lifecycle management page |
| `src/components/affiliate/AffiliateLifecycleTimeline.tsx` | Timeline visualization |
| `src/components/affiliate/AffiliateLifecycleChecklist.tsx` | Checklist component |
| `src/lib/affiliateLifecycleConfig.ts` | Stage and item definitions |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add two new routes |
| `src/pages/AffiliatePersonnel.tsx` | Add "Edit demographics" button + "Manage lifecycle" column |

## Database Migration

```sql
-- Affiliate lifecycle checklists
CREATE TABLE affiliate_lifecycle_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_cycle_start DATE,
  contract_cycle_end DATE,
  next_contract_start DATE,
  stage TEXT NOT NULL,
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, contract_cycle_end, stage, item_key)
);

-- Enable RLS
ALTER TABLE affiliate_lifecycle_checklists ENABLE ROW LEVEL SECURITY;

-- Allow HR roles to manage
CREATE POLICY "HR can manage affiliate checklists" ON affiliate_lifecycle_checklists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('Admin', 'HR Assistant', 'Chief of HR')
    )
  );
```

---

## Summary

This implementation provides:
1. **Edit Demographics**: Direct inline editing of all affiliate data fields in a table format
2. **Manage Lifecycle**: A timeline-based onboarding checklist with KPI tracking and color-coded status indicators

The design follows existing patterns from the HR Operations module (threaded comments, status tracking) and the RequisitionWorkflowTimeline component (KPI-based color coding).

