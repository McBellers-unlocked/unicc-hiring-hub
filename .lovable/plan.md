

## Fix: Text Overflow and Font in PDF Placeholder Filling

### Problem
When replacement text is longer than the original `{{placeholder}}`, it overflows past the right margin. Additionally, the overlay font (Helvetica at the original PDF size) doesn't match the document's Calibri 11pt style.

### Solution

**File: `supabase/functions/generate-repo-document/index.ts`**

Modify the `fillPDF` function's text overlay logic (around lines 270-293):

1. **Use size 11 as default** -- Draw replacement text at 11pt (matching Calibri 11 in the source document) instead of blindly using the detected `match.fontSize` which may be inaccurate due to PDF text matrix scaling.

2. **Auto-shrink to fit within margins** -- Before drawing, measure the replacement text width using `font.widthOfTextAtSize()`. If it would exceed the right margin (page width minus a 60pt margin), reduce the font size proportionally to fit.

3. **Wider white-out rectangle** -- Extend the white rectangle to cover from the placeholder start all the way to the right margin, ensuring no leftover original text is visible even when the replacement is shorter.

### Technical Details

The key change in the overlay loop:

```text
For each placeholder match:
  1. Calculate available width = pageWidth - startX - 60 (right margin)
  2. Start with fontSize = 11
  3. Measure text width = font.widthOfTextAtSize(value, 11)
  4. If text width > available width, scale down:
     fontSize = 11 * (availableWidth / textWidth)
  5. White-out rectangle covers from startX to right margin
  6. Draw text at the calculated font size
```

This ensures long values like "Operations Bridge Technology" or "Valencia, Spain" will shrink slightly to fit within the page boundaries instead of overflowing. Short values will render cleanly at 11pt.

### What Won't Change
- The DOCX filling logic (already works correctly with text replacement)
- The placeholder detection and position parsing
- The decompression and content stream reading logic

