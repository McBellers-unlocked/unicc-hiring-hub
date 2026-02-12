

## Fix: PDF Placeholder Replacement - Complete Rewrite of Stream Processing

### Root Cause (confirmed from logs)
The `parse-repo-template-fields` function uses `pdf-parse` which correctly renders all text and finds 19 placeholders. But `generate-repo-document` searches for `{{HRINITIAL}}` as a contiguous string within individual `[...] TJ` arrays or adjacent `Tj` operators.

In this PDF, each character (including `{`, `{`, `H`, `R`, etc.) is rendered in its **own separate BT/ET block** with individual positioning. For example, `{{HRINITIAL}}` is spread across ~13 separate text-drawing operations. The current regex-based approach only looks within a single TJ array or adjacent Tj sequences -- it never concatenates text across BT/ET block boundaries.

This is why "Modified 1 streams" is reported (the escaped-brace variant `\\{\\{` accidentally matches something minor) but no actual placeholder content is replaced.

### Solution: Full-stream text operator parsing

Rewrite the `replaceInContentStream` function to:

1. **Parse ALL text-showing operators** in the stream sequentially (both `Tj` and `TJ` inside BT...ET blocks), building a list of operator entries with their text content and stream positions
2. **Concatenate all extracted text** into a single string (unescaping PDF string escapes)
3. **Find placeholder positions** in the concatenated text
4. **Map each placeholder back** to the specific operators that contain its characters
5. **Replace text in those operators**: put the replacement value in the first operator and blank out subsequent operators that were part of the placeholder

### Technical Details

**File: `supabase/functions/generate-repo-document/index.ts`**

Replace the `replaceInContentStream` function with a new approach:

```text
Step 1: Walk through the stream and find all text-showing operators
   - Match patterns: (text) Tj  and  [(text)kern(text)kern...] TJ
   - For each, record: { startIndex, endIndex, textParts[], fullMatch }

Step 2: Build concatenated text from all operators in order
   - Unescape PDF string escapes: \( -> (, \) -> ), \\ -> \, \{ -> {, \} -> }
   - Track character-to-operator mapping

Step 3: For each field placeholder {{name}}, find its position in concatenated text
   - Determine which operators contain the placeholder characters

Step 4: For each found placeholder:
   - Put replacement value in the FIRST operator's text
   - Clear text from remaining operators that were part of the placeholder
   - Reconstruct the operator strings in the stream

Step 5: Rebuild the stream with modified operators
```

This handles ALL cases:
- Placeholder entirely within one TJ array (already worked)
- Placeholder split across TJ array elements (already worked)  
- Placeholder split across separate BT/ET blocks (NEW - this is the actual problem)
- Any combination of Tj and TJ operators

### Why the simpler approaches failed
- Simple string search: `{{HRINITIAL}}` never appears as a contiguous string in the raw stream
- TJ array handler: only looks within a single `[...] TJ` -- placeholder spans multiple TJ operators
- Adjacent Tj handler: only looks at consecutive `(text) Tj` sequences -- placeholder spans separate BT/ET blocks
- Global brace normalization: corrupted binary/font data in other streams

### No other files need changes
The frontend mapping logic and field values are confirmed correct from logs.

