

## General Documentation to IC -- Subject Fix, Default Attachments & Custom Attachment Upload

### 1. Subject line fix
Update the subject template in `goToDocStep2` from:
```
[formattedDate] Individual Consultancy...
```
to:
```
[Required by formattedDate] Individual Consultancy...
```

### 2. Copy uploaded documents into the project
Copy the 4 uploaded files to `public/email-templates/` so they can be served as downloadable attachments:
- `DoI_form_for_WHO_experts.docx`
- `Supplier_creation_and_modification_request_form.xlsx`
- `WHO_90_6_Designation_of_Beneficiaries.docx`
- `WHO_MedicalCertificateFitnessforWork_Version1_20160224.docx`

### 3. Update the edge function to support attachments
Modify `supabase/functions/send-bulk-talent-email/index.ts` to:
- Accept an optional `attachments` array in the request body (each item has `filename` and `content` as base64-encoded string, plus `contentType`)
- Pass them through to the Resend API's `attachments` parameter

### 4. Update the frontend wizard
In `src/pages/EmailHub.tsx`:
- Add state for additional custom file attachments (`docExtraAttachments`)
- In Step 1, show a list of the 4 default attachments (always included, shown as read-only chips/labels)
- Add a file input to optionally attach additional documents
- In `handleDocSend`, read both the default files (fetched from `public/email-templates/`) and any user-uploaded files, convert them to base64, and include them in the `attachments` array sent to the edge function
- Show the attachment list in the Step 3 summary

### Technical details

**Edge function change**: The Resend API accepts attachments as `{ filename: string, content: Buffer }`. We will send base64 strings from the frontend and decode them in the edge function using `Uint8Array`.

**Default attachments flow**: The 4 template files are stored in the `public/` folder. When sending, the frontend fetches each file, converts to base64, and adds them to the payload alongside any extra attachments the user uploaded via the file input.

**Custom attachments**: A standard `<input type="file" multiple>` element lets the user pick additional files. These are read with `FileReader.readAsDataURL()`, converted to base64, and appended to the attachments array.

