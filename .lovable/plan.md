

# Hide Completed Records from Default View

## Overview
When viewing the Appointments or Separations list, records marked as "Completed" should be hidden by default. Users can still view them by explicitly selecting "Completed" from the status filter dropdown.

---

## Current Behavior
- All records are shown regardless of status
- Filtering only happens when user selects a specific status

## New Behavior
- "Completed" records are hidden by default
- When status filter is empty/unset or "all", completed records are excluded
- When status filter is explicitly set to "Completed", only completed records are shown
- Other status filters work as before

---

## Implementation

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/operations/Separations.tsx` | Add default exclusion of "Completed" status in filter logic |
| `src/pages/operations/Appointments.tsx` | Add default exclusion of "Completed" status in filter logic |

---

## Technical Details

### Separations.tsx (Lines 345-359)

Current filtering logic:
```typescript
const filteredSeparations = useMemo(() => {
  return separations.filter(sep => {
    // ... other filters
    if (filters.status && filters.status !== 'all' && sep.status !== filters.status) return false;
    // ...
  });
}, [separations, filters]);
```

Updated logic:
```typescript
const filteredSeparations = useMemo(() => {
  return separations.filter(sep => {
    // ... other filters
    
    // Hide completed by default unless explicitly filtering for them
    if (!filters.status || filters.status === 'all') {
      if (sep.status === 'Completed') return false;
    } else if (sep.status !== filters.status) {
      return false;
    }
    
    // ... rest of filters
  });
}, [separations, filters]);
```

### Appointments.tsx (Lines 247-260)

Apply the same logic change:
```typescript
const filteredAppointments = useMemo(() => {
  return appointments.filter(apt => {
    // ... other filters
    
    // Hide completed by default unless explicitly filtering for them
    if (!filters.status || filters.status === 'all') {
      if (apt.status === 'Completed') return false;
    } else if (apt.status !== filters.status) {
      return false;
    }
    
    // ... rest of filters
  });
}, [appointments, filters]);
```

---

## User Experience

1. **Default view**: Shows all records except "Completed"
2. **Filter by "Completed"**: Shows only completed records
3. **Filter by "In Progress"**: Shows only in-progress records (unchanged)
4. **Filter by "Not Started"**: Shows only not-started records (unchanged)
5. **Clear filters / Select "All"**: Returns to default view (hides completed)

The stats cards will continue to show the total counts including completed records, so users can see the full picture and know there are completed items available to view.

---

## Summary

This is a minimal, focused change that:
- Modifies only the filtering logic (2 lines in each file)
- Keeps all other functionality intact
- Maintains access to completed records via explicit filter selection
- Follows the existing code patterns

