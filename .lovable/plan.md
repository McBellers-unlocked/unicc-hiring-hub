

## Fix: PDF Placeholder Replacement Using White-Out and Overlay

### Why the current approach cannot work

The current strategy modifies text operators within PDF content streams. But in this PDF template, each character of a placeholder (e.g., `{{Position}}`) has its own `BT...ET` block with an absolute position set via a `Tm` (text matrix) operator. When we replace a single character's text with a full string like "Operations Bridge Technician", the text renders starting from that character's tiny position and extends rightward, overlapping whatever comes next. Removing subsequent BT/ET blocks does not help because the replacement text is already drawn in a space sized for one character.

This is a fundamental limitation of content stream manipulation for absolute-positioned PDFs. No amount of operator editing will fix the overlap.

### New approach: White-out and overlay

This is the industry-standard technique for PDF text replacement. Instead of editing the content stream, we:

1. **Parse** content streams to extract all text with their (x, y) positions, font names, and sizes by tracking the Tm (text matrix) and Tf (font) operators
2. **Build** a full-text buffer with character-to-position mapping
3. **Find** placeholders in the buffer
4. **White-out** placeholder regions by drawing white rectangles over them using pdf-lib's `page.drawRectangle()`
5. **Overlay** replacement text at the first character's position using pdf-lib's `page.drawText()`
6. **Leave content streams completely untouched** -- no decompression, no recompression, no corruption risk

### Technical details

**File: `supabase/functions/generate-repo-document/index.ts`**

Complete rewrite of the `fillPDF` function. The stream parsing utilities (`decompressStream`, `compressStream`, `unescapePdfString`, `parseTextOperators`, etc.) will be replaced with a position-aware parser and overlay logic.

**Step 1 -- Position-aware text extraction**

Parse each page's content stream to track:
- `Tm` operator: sets the text matrix, giving us (x, y) position and font size scale
- `Tf` operator: sets the current font name and size
- `Tj` / `TJ` operators: the actual text being drawn

For each character, record: `{ char, x, y, fontSize, fontName, pageIndex }`

**Step 2 -- Find placeholders in the positioned text**

Concatenate all characters from a page into a string. Search for `{{fieldName}}` patterns. Map each placeholder back to its character positions to determine:
- Start coordinates (x, y of first character)
- End coordinates (x of last character + estimated width)
- Font size for the replacement text

**Step 3 -- Draw white rectangles over placeholder regions**

```text
page.drawRectangle({
  x: startX - 1,
  y: startY - 2,
  width: (endX - startX) + estimatedLastCharWidth + 2,
  height: fontSize + 4,
  color: rgb(1, 1, 1),  // white
  borderWidth: 0,
})
```

**Step 4 -- Draw replacement text**

```text
page.drawText(replacementValue, {
  x: startX,
  y: startY,
  size: fontSize,
  font: embeddedFont,  // Standard Helvetica or similar
  color: rgb(0, 0, 0),
})
```

### Content stream Tm parsing

The key new function parses content streams to extract text with positions:

```text
function parseTextWithPositions(content: string): CharPosition[] {
  // Track state:
  let currentTm = [1,0,0,1,0,0]  // identity matrix
  let currentFontSize = 12
  let currentFontName = ""
  
  // For each operator:
  // "a b c d e f Tm" -> currentTm = [a,b,c,d,e,f], x=e, y=f
  // "/FontName size Tf" -> currentFontSize = size
  // "(text) Tj" -> record each char at (currentTm[4], currentTm[5])
  // "[(text)kern(text)] TJ" -> record chars, adjusting x by kern values
}
```

### What stays the same

- `fillDOCX` function: unchanged, works correctly
- `decompressStream`: still needed to read content streams for position extraction
- `compressStream`: no longer needed (streams are not modified)
- The main Deno.serve handler: unchanged
- The `parse-repo-template-fields` function: unchanged

### What this fixes

- No more overlapping text: replacement text is drawn as a fresh overlay with proper font metrics
- No more stream corruption: content streams are never modified
- No more font errors: binary font data is never touched
- Date placement: controlled by the template's placeholder position, not by stream manipulation artifacts

### Limitations to acknowledge

- The overlay uses a standard embedded font (Helvetica), which may not exactly match the template's font. For this UN offer letter template, this should be acceptable since it uses standard fonts.
- The white rectangle covers the exact placeholder region, so the replacement text must fit within the available space on the page (or will naturally flow rightward)

