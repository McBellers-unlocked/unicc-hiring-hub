
## Plan: Add "Remote (Country)" Display Format for Affiliate Personnel

### Current Behavior
The import currently takes the duty station from either:
- `DS Short` column (if available)
- `Office Location` column (fallback)

### Requested Change
When an affiliate is marked as **Remote** in the office location, append the **Official Duty Station** in brackets:
- `Remote` + `Syria` → `Remote (Syria)`

### Changes to `import-affiliate-personnel/index.ts`

**1. Add column detection for Official Duty Station** (after line 110):
```typescript
const officialDutyStationIndex = findColumn(['official duty station']);
```

**2. Parse the official duty station value** (after line 163):
```typescript
const officialDutyStation = officialDutyStationIndex !== -1 
  ? values[officialDutyStationIndex]?.trim() 
  : '';
```

**3. Add logic to format "Remote (Country)"** (replace lines 160-163):
```typescript
// Get office location and DS short values
const officeLocation = officeLocationIndex !== -1 ? values[officeLocationIndex]?.trim() : '';
const dsShort = dsShortIndex !== -1 ? values[dsShortIndex]?.trim() : '';
const officialDutyStation = officialDutyStationIndex !== -1 
  ? values[officialDutyStationIndex]?.trim() 
  : '';

// Build duty station - for Remote workers, append official duty station
let dutyStation = dsShort || officeLocation;
if (dutyStation.toLowerCase() === 'remote' && officialDutyStation) {
  dutyStation = `Remote (${officialDutyStation})`;
}
```

### Expected Results

| Office Location | Official Duty Station | Result |
|-----------------|----------------------|--------|
| Remote | Syria | `Remote (Syria)` |
| Remote | Geneva | `Remote (Geneva)` |
| Remote | *(empty)* | `Remote` |
| Geneva | Syria | `Geneva` *(unchanged)* |
| *(empty)* | Damascus | *(empty - no change)* |

### Files to Modify
- `supabase/functions/import-affiliate-personnel/index.ts`
