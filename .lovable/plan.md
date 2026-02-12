

## Fix: PDF Placeholder Replacement Not Working

### Root Cause
The edge function reports "Modified 1 streams in PDF" but placeholders remain visible. The issue is that PDF content streams often encode curly braces as **escaped characters** (`\{` instead of `{`) or split placeholders across separate text-showing operators (`Tj`). The current `replaceInContentStream` function only searches for literal `{{fieldName}}`, missing these variants.

### Solution

**File: `supabase/functions/generate-repo-document/index.ts`**

Two changes:

1. **Add debug logging** to print the received `field_values` and a snippet of each decompressed stream so we can see exactly what the PDF contains. This will be invaluable if further issues arise.

2. **Handle escaped braces** in the replacement logic:
   - Before doing placeholder searches, normalize the stream text by replacing `\{` with `{` and `\}` with `}` (PDF string escape sequences)
   - Also search for the escaped variant `\{\{fieldName\}\}` alongside `{{fieldName}}`
   - Handle the case where placeholders span across separate `Tj`/`TJ` operators by concatenating adjacent text operators before replacement

Specifically, in `replaceInContentStream`:
- For each field, try replacing both `{{fieldName}}` AND `\{\{fieldName\}\}` (escaped form)
- Add a pre-pass that normalizes escaped braces within PDF string literals before running placeholder detection
- In the TJ array handler, unescape the extracted text parts before concatenating and checking for placeholders

In `fillPDF`:
- Log the keys and values of `fieldValues` received
- For each stream, log whether it contains `{{` or `\{\{` patterns (to identify which streams have placeholders)
- Log a sample of any stream that appears to contain placeholder-like patterns

### No frontend changes needed
The mapping logic is correct -- the database query returns the right data (confirmed: gender="Woman", staff_number="S208862", job_title="Operations Bridge Technician", etc.) and the values are properly built and sent to the edge function.
