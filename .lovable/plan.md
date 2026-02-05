
## Plan: Fix Import Appointments CSV Parser

### Issues Identified

**Issue 1: Excel Serial Date Parsing**
- Values like `45210`, `45215`, `45230`, `45231` are Excel serial dates
- Currently these pass to `new Date(dateStr)` which creates invalid dates
- PostgreSQL then rejects them as "time zone displacement out of range: +045210-01"

**Issue 2: Row Validation - Missing Required Fields**
- Some rows have malformed data where comment text bleeds into wrong columns
- Rows like `,Intern to staff. Medical sent ig...` start with a comma, meaning `last_name` is empty
- The current parser skips empty names but still adds rows with empty `first_name`

---

### Root Cause Analysis

**Date parsing** at line 380-423:
```typescript
// Current code - no Excel serial handling
function parseDate(dateStr: string): string {
  // ... tries ISO, DD/MM/YYYY, DD-Mon-YY
  // Falls through to new Date(dateStr) which fails on "45210"
  try {
    const parsed = new Date(dateStr);  // Creates invalid date
    ...
  }
}
```

**Row validation** at line 169-172:
```typescript
// Current - only checks if BOTH are empty
if (!lastName && !firstName) {
  warnings.push(`Row ${i + 1}: Missing name, skipped`);
  continue;
}
```

---

### Solution

**1. Add Excel Serial Date Support**

Add detection for numeric date strings (5-digit numbers like 45210):

```typescript
function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // Check for Excel serial date (5-digit number)
  const numericDate = parseFloat(dateStr);
  if (!isNaN(numericDate) && numericDate > 1000 && numericDate < 100000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + numericDate * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().substring(0, 10);
    }
  }
  
  // ... rest of existing parsing
}
```

**2. Improve Row Validation**

Skip rows where EITHER required field is missing:

```typescript
// Check both required fields independently
if (!lastName || !firstName) {
  warnings.push(`Row ${i + 1}: Missing name (last: "${lastName}", first: "${firstName}"), skipped`);
  continue;
}
```

**3. Additional Safety: Validate Date Before Insert**

Add a final validation before inserting to catch any malformed dates:

```typescript
// Validate parsed dates are reasonable (between 2000 and 2100)
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return true; // Empty is ok (optional field)
  const year = parseInt(dateStr.substring(0, 4));
  return year >= 2000 && year <= 2100;
}

// Before insert
if (apt.tentative_date && !isValidDate(apt.tentative_date)) {
  warnings.push(`Invalid tentative_date for ${apt.last_name}: ${apt.tentative_date}`);
  apt.tentative_date = '';
}
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/import-appointments/index.ts` | Fix parseDate, improve validation |

---

### Technical Implementation

**Updated `parseDate` function:**
```typescript
function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const trimmed = dateStr.trim();
  
  // 1. Check for Excel serial date (5-digit number like 45210)
  const numericDate = parseFloat(trimmed);
  if (!isNaN(numericDate) && numericDate > 1000 && numericDate < 100000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + numericDate * 86400000);
    if (!isNaN(date.getTime())) {
      const result = date.toISOString().substring(0, 10);
      // Validate the year is reasonable
      const year = parseInt(result.substring(0, 4));
      if (year >= 2000 && year <= 2100) {
        return result;
      }
    }
    return ''; // Invalid Excel date
  }
  
  // 2. Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }
  
  // 3. Try DD/MM/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // 4. Try DD-Mon-YY format
  const monthNames: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  const shortDateMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (shortDateMatch) {
    const [, day, month, year] = shortDateMatch;
    const monthNum = monthNames[month.toLowerCase()];
    if (monthNum) {
      const fullYear = year.length === 2 
        ? (parseInt(year) > 50 ? `19${year}` : `20${year}`)
        : year;
      return `${fullYear}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  // 5. Don't fallback to new Date() - too risky
  return '';
}
```

**Updated row validation:**
```typescript
// At line ~169 - stricter validation
if (!lastName || !firstName) {
  warnings.push(`Row ${i + 1}: Missing required name field, skipped`);
  continue;
}

// Validate operation_type is a valid enum
const validOperationTypes = ['Appointment', 'Appointment (CB)', 'Direct Appointment'];
if (!validOperationTypes.includes(operationType)) {
  operationType = 'Appointment'; // Default fallback
}
```

---

### Testing

After deploying, the import should:
- Convert `45210` to `2023-10-05` (valid date)
- Skip rows with empty first_name instead of inserting them
- Report skipped rows in the warnings array

---

### Implementation Order

1. Update `parseDate()` function with Excel serial date support
2. Add year validation (2000-2100) to catch outliers
3. Improve row validation to require BOTH first_name AND last_name
4. Remove risky `new Date(dateStr)` fallback
5. Deploy and test with the same CSV
