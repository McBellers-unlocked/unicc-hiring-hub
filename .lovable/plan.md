
## Plan: Fix CSV Import to Skip Title Rows

### Problem Identified
The edge function logs show that the import is failing because:
1. The CSV file has a **title row** like "HEADCOUNT AS OF END OF THE MONTH" as the first line
2. The actual column headers (Email, First Name, etc.) are on a **later row** (likely row 2 or 3)
3. Both import functions parse line 0 as headers, missing the real header row

**Log evidence:**
```
Headers found: ["HEADCOUNT AS OF END OF THE MONTH", "", "", ...]
Column indices: { emailIndex: -1, firstNameIndex: -1, ... }
```

All column indices are `-1` because the function looked for "email" in "HEADCOUNT AS OF END OF THE MONTH".

---

### Solution
Update both edge functions to **auto-detect the actual header row** by scanning the first few lines for a row that contains expected column names.

---

### Technical Changes

**Files to modify:**
1. `supabase/functions/import-staff-list/index.ts`
2. `supabase/functions/import-affiliate-personnel/index.ts`

**Logic update:**

```typescript
// Find the actual header row by scanning first 10 lines
function findHeaderRow(lines: string[]): { headerIndex: number; headers: string[] } {
  const maxScan = Math.min(10, lines.length);
  
  for (let i = 0; i < maxScan; i++) {
    const headers = parseCSVLine(lines[i]);
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    // Check if this row contains expected column names
    const hasEmail = normalizedHeaders.some(h => h.includes('email'));
    const hasName = normalizedHeaders.some(h => 
      h.includes('first name') || h.includes('last name') || h.includes('name')
    );
    
    if (hasEmail || hasName) {
      console.log(`Found header row at line ${i + 1}`);
      return { headerIndex: i, headers };
    }
  }
  
  // Fallback to first row
  return { headerIndex: 0, headers: parseCSVLine(lines[0]) };
}
```

Then update the data processing loop:
```typescript
// Instead of: for (let i = 1; i < lines.length; i++)
// Use: for (let i = headerIndex + 1; i < lines.length; i++)
```

---

### Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/import-staff-list/index.ts` | Add `findHeaderRow()` function, update header detection |
| `supabase/functions/import-affiliate-personnel/index.ts` | Add `findHeaderRow()` function, update header detection |

---

### Expected Behavior After Fix

1. Function scans first 10 lines of CSV
2. Finds the row containing "email", "first name", etc.
3. Uses that row as headers
4. Processes data rows starting from the row after headers
5. Successfully maps columns and imports data

This handles CSV files that have:
- Title rows (like "HEADCOUNT AS OF END OF THE MONTH")
- Blank rows before headers
- Headers on any of the first 10 lines
