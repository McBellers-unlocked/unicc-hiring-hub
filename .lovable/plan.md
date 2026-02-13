

## Add Validation Rules to Contract Record Creation

### Overview
Add client-side validation before saving a new contract record to prevent duplicate values and overlapping date ranges.

### Validation Rules

**Rule 1 -- No duplicate values across any column**
Before saving, check the 4 reference fields (`samsaran_pr`, `samsaran_po`, `gsm_reg_number`, `gsm_po`) against all existing rows for the same affiliate. If any non-empty value already exists in any row (excluding the row being edited), block the save with a specific error like:
> "Samsaran PO value 'PO-1234' already exists in another contract record."

Only non-empty values are checked (blank fields are ignored).

**Rule 2 -- No overlapping date ranges**
If the new record has a start date or end date, check whether either date falls within the range `[start_date, end_date]` of any other existing row. Also check the reverse (existing dates falling within the new range). Block the save with an error like:
> "Contract dates overlap with an existing record (01/03/2025 - 30/06/2025)."

Only rows that have both a start and end date are checked for overlap. The new record also needs at least a start date for this check to apply.

### Changes to `src/pages/AffiliateContractHistory.tsx`

**Add a `validateForm` function** that:
1. Filters `rows` to exclude the currently edited row (if editing)
2. For each of the 4 reference fields, checks if the form value (trimmed, non-empty) matches any existing row's value for the same field
3. For date overlap, checks if the new `[start_date, end_date]` range overlaps with any existing row's range using the standard overlap formula: `newStart <= existingEnd && newEnd >= existingStart`
4. Returns an array of error strings

**Update the Save button handler** to:
1. Call `validateForm()` before `saveMutation.mutate(form)`
2. If errors exist, show each as a `toast.error()` and abort
3. If no errors, proceed with the mutation

### Technical Detail

```text
validateForm(form, rows, editingRow):
  errors = []
  otherRows = rows.filter(r => r.id !== editingRow?.id)

  // Check duplicates for each field
  for field in [samsaran_pr, samsaran_po, gsm_reg_number, gsm_po]:
    if form[field] is non-empty:
      match = otherRows.find(r => r[field] === form[field])
      if match: errors.push("${fieldLabel} '${value}' already exists")

  // Check date overlap
  if form.start_date:
    newStart = form.start_date
    newEnd = form.end_date || form.start_date
    for row in otherRows where row.start_date and row.end_date:
      if newStart <= row.end_date and newEnd >= row.start_date:
        errors.push("Dates overlap with record (row.start - row.end)")

  return errors
```

No database changes needed -- this is purely client-side validation.

