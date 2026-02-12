

## Switch Offer Letter Templates to DOCX-Only Workflow

### Why This Works Better

The current PDF overlay approach fights against how PDFs work (absolute positioning, no text reflow). The DOCX filler already exists and handles text reflow perfectly -- long values like "Operations Bridge Technician" simply wrap naturally.

### What Changes

**1. Update your Word templates (manual step)**

Re-save your offer letter templates as `.docx` files with inline placeholders. Instead of tab-aligned fields, embed placeholders directly in the sentence flow:

- "Dear {{Mr_Ms}} {{surname}}"
- "...for the position of {{job_title}} based in {{city}}, {{country}}..."
- "...at the {{Grade}}-{{Level}} level..."

Upload these to the Document Repository replacing the current PDF versions.

**2. Simplify the edge function**

**File: `supabase/functions/generate-repo-document/index.ts`**

- Remove the entire `fillPDF` function and all its supporting code (decompressStream, parseTextWithPositions, the PlaceholderMatch interface -- roughly 200 lines).
- Remove the `pdf-lib` import since it's no longer needed.
- The main handler becomes simpler: always use the DOCX filling path. If a PDF is uploaded, return an error suggesting to use a DOCX template instead.

**3. No frontend changes needed**

The `AppointmentLifecycle.tsx` already handles the response as a blob download and uses the file extension from the template name. DOCX downloads will work identically.

### What About PDF Output?

If PDF output is essential, there are two options to consider later:

- **Option A**: Users open the downloaded DOCX in Word/Google Docs and "Save as PDF" (zero development cost).
- **Option B**: Integrate a conversion API like ConvertAPI or CloudConvert (adds a third-party dependency and API key, but automates the last step). This can be added later if needed.

### Summary of Code Changes

| File | Change |
|------|--------|
| `supabase/functions/generate-repo-document/index.ts` | Remove ~200 lines of PDF overlay code (fillPDF, decompressStream, parseTextWithPositions). Simplify handler to DOCX-only. |
| Templates (manual) | Re-upload offer letter templates as `.docx` with inline placeholders |

