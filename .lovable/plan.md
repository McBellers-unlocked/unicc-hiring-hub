

## Force Load Default Items

**File**: `src/pages/StrategyTracker.tsx`

**Change**: On line 136, remove the localStorage check so it always initializes with `DEFAULT_ITEMS`. This is a one-line change:

```tsx
// Before
return stored ? (JSON.parse(stored) as any[]).map(migrateItem) : DEFAULT_ITEMS;

// After
return DEFAULT_ITEMS;
```

This will force the 35 seeded rows to load. The `useEffect` will then save them to localStorage, so subsequent reloads will persist any edits you make going forward.

