

## Fix: PDF Stream Corruption from Global Brace Normalization

### Root Cause
Line 89 in the edge function does `modified.replace(/\\\{/g, "{").replace(/\\\}/g, "}")` -- this replaces EVERY escaped brace in the entire PDF content stream, not just those inside placeholders. This corrupts font data, binary references, and other stream content, causing:
- Font extraction errors in Adobe Acrobat
- False positive stream modifications (3 streams modified instead of 1)
- Broken PDF output even though replacement values are correct

### Fix

**File: `supabase/functions/generate-repo-document/index.ts`**

1. **Remove the global normalization pre-pass** (line 89) -- it must not touch the entire stream

2. **Replace with targeted searches** -- for each field, search for both forms:
   - `{{fieldName}}` (literal braces)
   - `\{\{fieldName\}\}` (escaped braces, as they appear in PDF strings)

3. **In the TJ/Tj handlers**, unescape braces only in the extracted text parts (already done), but also search the original stream for escaped-brace variants

Specifically in `replaceInContentStream`:

```text
// REMOVE: modified = modified.replace(/\\\{/g, "{").replace(/\\\}/g, "}");

// For each field, replace BOTH variants:
for each (fieldName, value):
  replace "{{fieldName}}" with value          // literal braces
  replace "\\{\\{fieldName\\}\\}" with value  // escaped braces in PDF strings
```

4. **Fix the comparison** -- since we no longer normalize, the `modifiedText === decompressedText` check on line 202 will only trigger when actual placeholder replacement occurred, eliminating false positive stream rewrites and preventing corruption.

### Why This Fixes Everything
- Streams without placeholders are left completely untouched (no font corruption)
- Only streams with actual `{{...}}` or `\{\{...\}\}` patterns get modified
- The TJ array handler still works for split placeholders (already correctly unescapes text parts before concatenation)
