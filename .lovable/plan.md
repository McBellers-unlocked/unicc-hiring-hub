
# Add Sortable Columns to Affiliate Personnel Table

## Overview

This implementation adds sorting functionality to all columns in the Affiliate Personnel table and rearranges columns to include "First Contract Date" (first_incumbency_date) and place Status before Contract End.

---

## New Column Order

| Order | Column | Sortable | Field |
|-------|--------|----------|-------|
| 1 | Name | Yes | `name` |
| 2 | Type | Yes | `affiliate_type` |
| 3 | Division | Yes | `division` |
| 4 | Job Title | Yes | `job_title` |
| 5 | Location | Yes | `duty_station` |
| 6 | First Contract | Yes (NEW) | `first_incumbency_date` |
| 7 | Status | Yes (MOVED) | Calculated status |
| 8 | Contract End | Yes (MOVED) | `contract_end_date` |
| 9 | Actions | No | - |

---

## Sorting Implementation

### State Management

Add sorting state to track current column and direction:

```typescript
type SortDirection = 'asc' | 'desc' | null;
type SortField = 'name' | 'affiliate_type' | 'division' | 'job_title' | 
                 'duty_station' | 'first_incumbency_date' | 'status' | 'contract_end_date';

const [sortField, setSortField] = useState<SortField | null>(null);
const [sortDirection, setSortDirection] = useState<SortDirection>(null);
```

### Toggle Sort Function

```typescript
const handleSort = (field: SortField) => {
  if (sortField === field) {
    // Cycle: asc -> desc -> null
    if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else if (sortDirection === 'desc') {
      setSortField(null);
      setSortDirection(null);
    }
  } else {
    setSortField(field);
    setSortDirection('asc');
  }
};
```

### Sorted Data Computation

```typescript
const sortedAffiliates = useMemo(() => {
  if (!sortField || !sortDirection) return filteredAffiliates;
  
  return [...filteredAffiliates].sort((a, b) => {
    let valueA: any;
    let valueB: any;
    
    if (sortField === 'status') {
      // Sort by days remaining (calculated field)
      const statusA = getContractStatus(a.contract_start_date, a.contract_end_date, a.first_incumbency_date);
      const statusB = getContractStatus(b.contract_start_date, b.contract_end_date, b.first_incumbency_date);
      valueA = statusA.daysRemaining ?? Infinity;
      valueB = statusB.daysRemaining ?? Infinity;
    } else {
      valueA = a[sortField];
      valueB = b[sortField];
    }
    
    // Handle nulls
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return sortDirection === 'asc' ? 1 : -1;
    if (valueB == null) return sortDirection === 'asc' ? -1 : 1;
    
    // Compare
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortDirection === 'asc' 
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }
    
    return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
  });
}, [filteredAffiliates, sortField, sortDirection]);
```

---

## Sortable Table Header Component

Create a reusable sortable header that shows sort indicators:

```tsx
interface SortableTableHeadProps {
  field: SortField;
  currentField: SortField | null;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
  className?: string;
}

const SortableTableHead = ({ 
  field, 
  currentField, 
  direction, 
  onSort, 
  children,
  className 
}: SortableTableHeadProps) => {
  const isActive = currentField === field;
  
  return (
    <TableHead 
      className={cn("cursor-pointer select-none hover:bg-muted/50", className)}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
};
```

---

## Updated Table Structure

```tsx
<TableHeader>
  <TableRow>
    <SortableTableHead field="name" currentField={sortField} direction={sortDirection} onSort={handleSort}>
      Name
    </SortableTableHead>
    <SortableTableHead field="affiliate_type" currentField={sortField} direction={sortDirection} onSort={handleSort}>
      Type
    </SortableTableHead>
    <SortableTableHead field="division" currentField={sortField} direction={sortDirection} onSort={handleSort}>
      Division
    </SortableTableHead>
    <SortableTableHead field="job_title" currentField={sortField} direction={sortDirection} onSort={handleSort}>
      Job Title
    </SortableTableHead>
    <SortableTableHead field="duty_station" currentField={sortField} direction={sortDirection} onSort={handleSort}>
      Location
    </SortableTableHead>
    <SortableTableHead field="first_incumbency_date" currentField={sortField} direction={sortDirection} onSort={handleSort}>
      First Contract
    </SortableTableHead>
    <SortableTableHead field="status" currentField={sortField} direction={sortDirection} onSort={handleSort}>
      Status
    </SortableTableHead>
    <SortableTableHead field="contract_end_date" currentField={sortField} direction={sortDirection} onSort={handleSort}>
      Contract End
    </SortableTableHead>
    <TableHead className="w-28">Actions</TableHead>
  </TableRow>
</TableHeader>
```

---

## New "First Contract" Column Cell

Add a new table cell for the first incumbency date:

```tsx
<TableCell>
  {affiliate.first_incumbency_date ? (
    <div className="flex items-center gap-1">
      <Calendar className="h-3 w-3 text-muted-foreground" />
      <span className="text-sm">
        {format(parseISO(affiliate.first_incumbency_date), 'dd MMM yyyy')}
      </span>
    </div>
  ) : '-'}
</TableCell>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/AffiliatePersonnel.tsx` | Add sorting state, SortableTableHead component, sort logic, new column, reorder columns |

---

## Implementation Details

### Imports to Add
```typescript
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
```

### Changes Summary

1. **State**: Add `sortField` and `sortDirection` state variables
2. **Handler**: Add `handleSort` function to toggle sorting
3. **Memoization**: Create `sortedAffiliates` with useMemo for sorted data
4. **Component**: Add inline `SortableTableHead` component for clickable headers
5. **Columns**: 
   - Add "First Contract" column showing `first_incumbency_date`
   - Move "Status" column before "Contract End"
6. **Rendering**: Update table body to use `sortedAffiliates` and add new cell

---

## User Experience

- Click any column header to sort ascending (shows ↑ icon)
- Click again to sort descending (shows ↓ icon)
- Click a third time to remove sorting (shows ↕ dim icon)
- Clicking a different column resets and sorts that column ascending
- Null/empty values sort to the end when ascending, beginning when descending
- Status column sorts by days remaining (urgency-based)
