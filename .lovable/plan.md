

## Fix: Letter Date and Overlapping Text in PDF Generation

### Problem 1: Letter date shows start date instead of today's date

**Finding from logs**: The `date` field IS correctly set to "12 February 2026" (today). The "16 March 2026" shown in the letter header is the `{{start_date}}` field being correctly replaced. The PDF template itself uses `{{start_date}}` in the letter date position rather than `{{date}}`.

**Fix**: Add a dedicated `letter_date` alias to the field mapping in `AppointmentLifecycle.tsx`, and also map `start_date` variants more carefully. Specifically, we will ensure the mapping includes a `letter_date` alias pointing to today's date. However, since the template literally has `{{start_date}}` in the letter date spot, the real fix is:
- The user should update the PDF template to use `{{date}}` for the letter date
- OR we add a dialog-level override: when the fill dialog shows parsed fields, the `date` field should always default to today's date (already done on line 103)

Since the template file is the source of truth and we cannot change it here, we will ensure the code also maps `letter_date` to today and document this. But the quickest fix is to check whether the field name is an exact match issue -- the logs show the template has `{{date}}` in one stream and `{{start_date}}` in another. The letter header position shows the start date, which means the template uses `{{start_date}}` there. This is a template design choice.

We will leave the date mapping as-is since it is working correctly -- the user may need to update their PDF template to use `{{date}}` instead of `{{start_date}}` in the letter date position.

### Problem 2: Overlapping text

**Root cause**: In this PDF, each character of a placeholder like `{{Position}}` has its own `BT...ET` block with absolute positioning (`Tm` operator). When the placeholder is replaced:
- The full replacement text (e.g., "Operations Bridge Technician") is placed in the FIRST character's operator
- Middle and last characters' operators are cleared to empty strings `() Tj`
- But their surrounding BT/ET blocks and positioning commands remain in the stream

The replacement text renders starting at the first character's position but extends far beyond it (since "Operations Bridge Technician" is much longer than one character width). Meanwhile, the NEXT non-placeholder text starts at its original absolute position, causing overlap.

**Fix in `supabase/functions/generate-repo-document/index.ts`**:

Instead of just clearing the text in middle/last operators, we need to **remove the entire BT...ET blocks** that contained those operators. This way:
- The replacement text renders from the first operator's position
- No phantom positioning from cleared operators
- The next real text block starts at its own absolute position (which is correct for the PDF layout)

Changes to `replaceInContentStream`:

1. When a placeholder spans multiple operators, identify the BT...ET block boundaries for each operator
2. For middle and last operators that get cleared, remove the entire BT...ET block from the stream (not just the text content)
3. Keep only the first operator's BT...ET block with the replacement text

This requires a helper that finds the enclosing `BT...ET` block for a given operator position in the stream.

### Technical approach

```text
For each operator, find its enclosing BT...ET block:
  - Scan backwards from op.start to find "BT"
  - Scan forwards from op.end to find "ET"
  - Record { btStart, etEnd } for each operator

When clearing middle/last operators of a multi-operator placeholder:
  - Instead of setting opTexts[i] = ""
  - Mark the entire BT...ET block for removal
  - After all replacements, remove marked blocks from the stream
```

### Files to modify
- `supabase/functions/generate-repo-document/index.ts` -- update `replaceInContentStream` to remove entire BT/ET blocks for cleared placeholder operators
