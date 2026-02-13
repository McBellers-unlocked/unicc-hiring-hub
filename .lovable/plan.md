

## Approach: Generate the Offer Letter PDF Programmatically

Instead of filling a template, we build the entire offer letter as a PDF from scratch using `pdf-lib`. This gives us full control over fonts, layout, and text reflow -- no template file needed at all.

### How It Works

The edge function will contain the full letter structure as code. Each section (header, salutation, body paragraphs, appointment details table, signature block, etc.) is drawn programmatically. Variable data like name, job title, grade, and duty station are injected inline and the text wraps naturally because we control the line-breaking logic.

### What Changes

**1. New edge function: `supabase/functions/generate-offer-letter-pdf/index.ts`**

A dedicated function that:
- Accepts the same `field_values` object (Mr_Ms, surname, firstname, job_title, grade, level, duty_station, country, currency, amount, start_date, end_date, HR focal point, etc.)
- Uses `pdf-lib` to create a multi-page PDF from scratch
- Embeds the UNICC logo from storage (or a bundled version)
- Draws the full 7-page letter content with proper formatting:
  - Header with logo, "Palais des Nations" address, "HUMAN RESOURCES SECTION"
  - Title: "Letter of Offer of Fixed-term Appointment under Staff Rule 420.3"
  - Reference line with staff number
  - Addressee block
  - Date
  - Salutation and body paragraphs with inline variable substitution
  - Appointment details table (type, title, category, grade/step, duty station)
  - Salary section
  - Duration, documents, reporting, insurance, pension, standards of conduct sections
  - Signature block
  - Acceptance page with signature lines
  - Annexes list
  - Page numbering in footers

**2. Text wrapping utility**

A `wrapText(text, font, fontSize, maxWidth)` function that splits text into lines that fit within the page margins. This is how variable-length values like job titles flow naturally.

**3. Update `AppointmentLifecycle.tsx`**

Change the "Draft Offer Letter" action to call the new `generate-offer-letter-pdf` endpoint instead of the template-based `generate-repo-document`. No template file path needed -- just send the field values directly.

**4. Keep `generate-repo-document` for other templates**

The existing DOCX template filler remains available for other document types in the Document Repository.

### Advantages

- No external template file to maintain -- the letter structure lives in code
- Perfect text reflow for any length of variable data
- Consistent PDF output every time
- No Word-to-PDF conversion step needed
- Full control over fonts, spacing, and layout

### Risks and Considerations

- The letter content is "hardcoded" in the function, so any wording changes require a code update (not just re-uploading a template). However, since offer letters rarely change wording, this is acceptable.
- Embedding the exact Calibri font isn't possible with pdf-lib's standard fonts, so we'll use Helvetica (visually very similar at 11pt). If exact font matching is critical, a custom font file can be embedded later.
- The UNICC logo needs to be fetched from storage or embedded as base64.
- Building a 7-page document programmatically is a significant amount of code (~400-500 lines), but it's straightforward and maintainable.

### Technical Details

The core structure of the PDF builder:

```text
1. Create PDFDocument
2. Embed Helvetica + Helvetica-Bold fonts
3. Fetch and embed UNICC logo PNG
4. For each page:
   a. addPage([595.28, 841.89])  -- A4 size
   b. Draw header (logo + address) on page 1
   c. Draw content using drawWrappedText() helper
   d. Track Y position, add new page when Y < bottom margin
   e. Draw footer with page number on each page
5. Return pdfDoc.save()
```

Key helper function:
```text
wrapText(text, font, fontSize, maxWidth):
  Split text into words
  Build lines by measuring word widths
  Return array of line strings
```

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-offer-letter-pdf/index.ts` | New -- programmatic PDF builder for the offer letter |
| `src/pages/operations/AppointmentLifecycle.tsx` | Update Draft Offer Letter to call new endpoint |
| `supabase/config.toml` | Add new function config entry |

