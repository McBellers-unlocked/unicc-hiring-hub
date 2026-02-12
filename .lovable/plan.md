

## Fix: Blank PDF After Offer Letter Generation

### Problem
The downloaded PDF is blank because the current `generate-repo-document` edge function manually edits raw PDF bytes (decompressing streams, replacing text, recompressing). This corrupts the PDF's **cross-reference (xref) table** -- the internal index that tells PDF readers where each object is located. When stream sizes change after placeholder replacement, all byte offsets shift, but the xref table is never rebuilt, so the PDF viewer cannot find any content.

### Solution
Replace the manual byte manipulation with **pdf-lib**, a proper PDF library that handles structural integrity automatically. The approach:

1. Load the PDF with `pdf-lib`'s `PDFDocument`
2. Access each page's content stream through pdf-lib's internal API
3. Decompress the stream data, replace `{{placeholders}}`, recompress
4. Set the modified stream back on the page object
5. Let `pdf-lib` save the document -- it correctly rebuilds the xref table and all byte offsets

### Technical Details

**File changed:** `supabase/functions/generate-repo-document/index.ts`

- Import `pdf-lib` via `https://esm.sh/pdf-lib@1.17.1`
- Rewrite `fillPDF()` to:
  - Use `PDFDocument.load(fileBytes)` to parse the PDF properly
  - Iterate over all pages, get their content stream(s) via `page.node.Contents()`
  - For each stream: decompress (if FlateDecode), run placeholder replacement, recompress, update the stream object in-place using pdf-lib's API
  - Also handle direct (uncompressed) streams
  - Call `pdfDoc.save()` which outputs a valid PDF with correct xref table
- Keep the existing `replaceInContentStream()` function for the actual text replacement logic (handles TJ arrays and split placeholders)
- Keep `decompressStream()` and `compressStream()` helpers
- Keep `fillDOCX()` unchanged

**No frontend changes needed** -- the download flow already works correctly with binary blob responses.

