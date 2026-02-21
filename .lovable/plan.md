

## Rename "Additional Attachments" to "NDA" and Make It Required

### Changes (single file: `src/pages/EmailHub.tsx`)

**1. Rename the label**
- Change "Additional Attachments (optional)" to "NDA" on line 404

**2. Make it required**
- Update `docStep1Valid` validation (line 156) to also require `docExtraAttachments.length > 0`
- This will disable the "Next" button until the user uploads the NDA file

**3. Remove `multiple` attribute**
- Since this is specifically for the NDA document, remove the `multiple` prop from the file input so only one file can be selected (unless multiple NDA files are expected -- will keep `multiple` if so)

No other files need changes.
