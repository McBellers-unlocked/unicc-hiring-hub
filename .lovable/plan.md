

## Plan: Add Validity Check with Warning Flags for Staff Import

### Overview
Add a validation layer that checks for missing or incomplete data in the CSV before and during import. Instead of blocking imports, rows with issues like missing `unit` will be flagged with **warnings** and still imported. Only critical issues like missing/invalid `email` will be treated as **errors** that prevent the row from being imported.

---

### Validation Categories

| Category | Fields | Behavior |
|----------|--------|----------|
| **Error (blocks import)** | `email` (missing or invalid format) | Row is skipped, counted as error |
| **Warning (imports anyway)** | `unit`, `division`, `line_manager`, `job_title`, `nationality` | Row is imported, flagged with warning |

---

### Phase 1: Update Edge Function

**File: `supabase/functions/import-staff-list/index.ts`**

#### Add warnings to result interface:

```typescript
interface ImportResult {
  // ... existing fields ...
  warnings: number;
  warningDetails: string[];
  rowsWithWarnings: number;
}
```

#### Add validation function:

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateRow(rowNumber: number, email: string, unit: string, division: string, lineManager: string, jobTitle: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Critical: Email is required
  if (!email || !email.includes('@')) {
    errors.push(`Row ${rowNumber}: Missing or invalid email`);
  }
  
  // Warnings for recommended fields
  if (!unit) {
    warnings.push(`Row ${rowNumber}: Missing unit`);
  }
  if (!division) {
    warnings.push(`Row ${rowNumber}: Missing division`);
  }
  if (!lineManager) {
    warnings.push(`Row ${rowNumber}: Missing line manager`);
  }
  if (!jobTitle) {
    warnings.push(`Row ${rowNumber}: Missing job title`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
```

#### Update processing loop:

- Call `validateRow()` for each row
- If `isValid === false`, skip row and add to errors
- If warnings exist, add to warning list but continue with import
- Track `rowsWithWarnings` count

---

### Phase 2: Update Import Page UI

**File: `src/pages/ImportStaffList.tsx`**

#### Add warnings display:

```tsx
{/* Warnings Section */}
{result.warnings > 0 && (
  <Card className="border-yellow-500 bg-yellow-50">
    <CardHeader className="pb-2">
      <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
        <AlertTriangle className="w-4 h-4" />
        Warnings ({result.warnings}) - {result.rowsWithWarnings} rows affected
      </CardTitle>
      <CardDescription className="text-yellow-600">
        These records were imported but have incomplete data
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-yellow-700">
        {result.warningDetails.slice(0, 30).map((warning, idx) => (
          <p key={idx}>• {warning}</p>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

#### Update success message:
- Show warning count alongside success
- Use yellow/amber styling for warnings to distinguish from errors

---

### Phase 3: Add Pre-Import Validation Preview (Optional Enhancement)

Before importing, show a preview of validation issues:

```tsx
{/* Pre-Import Validation Preview */}
{validationPreview && (
  <Card className="border-blue-500">
    <CardHeader>
      <CardTitle className="text-base">Validation Preview</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>{validationPreview.validRows} rows ready to import</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <span>{validationPreview.warningRows} rows with missing data (will import)</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-500" />
          <span>{validationPreview.errorRows} rows will be skipped (no email)</span>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/import-staff-list/index.ts` | Add validation logic, warnings tracking |
| `src/pages/ImportStaffList.tsx` | Add warnings UI section, update result interface |

---

### Expected Result Example

After import, the UI will show:

```text
✓ Staff: 150 created, 45 updated
✓ Affiliates: 23 created, 12 updated
⚠ Warnings: 34 (22 rows affected)
  • Row 15: Missing unit
  • Row 15: Missing line manager
  • Row 28: Missing division
  • Row 42: Missing unit
  ...
✗ Errors: 3 (rows skipped)
  • Row 7: Missing or invalid email
  • Row 156: Missing or invalid email
```

This approach ensures data quality visibility while not blocking imports for non-critical missing fields.

