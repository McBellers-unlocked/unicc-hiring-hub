
## Fix: Import Separations Header Mismatch

### The Problem
The CSV file has headers **without spaces**, but the import code expects headers **with spaces**:

| File Header | Expected by Code |
|-------------|------------------|
| `LastName` | `Last Name` |
| `FirstName` | `First Name` |
| `OperationType` | `Operation Type` |
| `TentativeDate` | `Tentative Separation Date` |
| `MainHRFocalPoint` | `HR Focal Point` |
| `StaffNumber` | `Staff Number` |
| etc. | etc. |

### Solution
Update `ImportSeparationsDialog.tsx` to check for **both** header formats (with and without spaces). This makes the import more flexible and handles various export formats.

---

### File to Modify
`src/components/operations/ImportSeparationsDialog.tsx`

---

### Changes

Update the column mappings to check both formats:

```typescript
// Before
last_name: String(row['Last Name'] || '').trim(),
first_name: String(row['First Name'] || '').trim(),

// After  
last_name: String(row['LastName'] || row['Last Name'] || '').trim(),
first_name: String(row['FirstName'] || row['First Name'] || '').trim(),
```

Full mapping updates:
- `LastName` / `Last Name`
- `FirstName` / `First Name`
- `OperationType` / `Operation Type`
- `JobTitle` / `Job Title` / `Functional Title`
- `DutyStation` / `Duty Station` / `Official Duty Station`
- `PDNumber` / `PD Number` / `PD`
- `SectionUnit` / `Section/Unit` / `Section` / `Unit`
- `SupervisorStaffNumber` / `Supervisor Staff Number`
- `SeparationType` / `Separation Type`
- `EventType` / `Event Type`
- `TentativeDate` / `Tentative Separation Date` / `Tentative Date` / `Last Working Day`
- `EffectiveDate` / `Effective Date`
- `IsInternational` / `International` / `Is International`
- `NoticeDaysRequired` / `Notice Days` / `Notice Days Required`
- `StaffNumber` / `Staff Number` / `Index Number`
- `MainHRFocalPoint` / `HR Focal Point` / `Main HR Focal Point`
- `ActionsInHRPlan` / `Actions In HR Plan` / `Actions`
- `ClearanceStatus` / `Clearance Status`
- `ContractType` / `Contract Type`

---

### Validation Check Update
Also update the row validation to check both:

```typescript
// Before
if (!row['Last Name'] && !row['First Name']) {
  return;
}

// After
if (!row['LastName'] && !row['Last Name'] && !row['FirstName'] && !row['First Name']) {
  return;
}
```

---

### Result After Fix
The import will work with both header formats:
- CamelCase: `LastName`, `FirstName`, `OperationType`
- Spaced: `Last Name`, `First Name`, `Operation Type`
