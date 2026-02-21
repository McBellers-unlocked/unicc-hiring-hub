
## Add Mandatory Contract Attachment to "Contract email for signature"

### Overview
Add a mandatory file upload field (for the contract document) to Step 1 of the Contract email wizard. The attachment will be sent as a base64-encoded file via the existing edge function.

### Changes (single file: `src/pages/EmailHub.tsx`)

**1. New state variable**
- Add `contractAttachments` (`File[]`) state, initialized to `[]`

**2. Reset function**
- Add `setContractAttachments([])` to `resetContractWizard`

**3. Validation**
- Update `contractStep1Valid` to also require `contractAttachments.length > 0`

**4. Step 1 UI**
- Add a "Contract" file input field with a required red asterisk after the date picker
- Single file upload (no `multiple` attribute)
- Show uploaded file name as a Badge with an X button to remove it (same pattern as the NDA field)

**5. Step 3 Summary**
- Show the attachment in the summary view with a Paperclip icon

**6. `handleContractSend`**
- Convert the attached file to base64 using the existing `fileToBase64` helper
- Include it in the `attachments` array sent to the edge function
