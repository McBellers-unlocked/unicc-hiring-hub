

## Convert Updates to a Log/Feed with Attribution

### What changes

**File**: `src/pages/StrategyTracker.tsx`

Convert the `updates` and `prioritisationUpdates` fields from plain text strings into arrays of log entries, each recording who posted it and when.

### Data model change

```typescript
type UpdateEntry = {
  id: string;
  text: string;
  author: string;  // from useAuth userName
  date: string;    // ISO string
};

type StrategyItem = {
  // ...existing fields
  updates: UpdateEntry[];           // was string
  prioritisationUpdates: UpdateEntry[];  // was string
};
```

### UI change (in the expandable detail row)

For both Updates and Prioritisation Updates sections:

1. **Display existing entries** as a scrollable list, each showing: text, author name, and relative date (e.g., "2 days ago"). Most recent first.
2. **Add new entry**: A small textarea + "Add" button below the list. On submit, push a new `UpdateEntry` with the current user's name (from `useAuth`) and timestamp.
3. Style entries as small cards/bubbles with muted author/date text.

### Migration

Existing localStorage data has `updates`/`prioritisationUpdates` as strings. Migration helper converts non-empty strings into a single-entry array `[{ id, text: oldString, author: "Unknown", date: now }]` and empty strings to `[]`.

### Auth integration

Import `useAuth` hook and destructure `userName` to stamp each new update entry with the logged-in user's name.

### Files modified
- `src/pages/StrategyTracker.tsx` only

