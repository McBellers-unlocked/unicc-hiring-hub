

## Implement "Contract email for signature" Wizard

### Overview
Add a new 3-step wizard dialog for the "Contract email for signature" template, following the same pattern as the existing wizards (OneHR approval, General documentation to IC, Offer Acceptance).

### Step 1 -- Fill Details
Fields:
- **Recipient email** (required)
- **Name and surname** (required)
- **Return by date** (required, date picker)

### Step 2 -- Email Preview
- **Subject**: `UNICC Individual consultancy contract - [Name and surname]`
- **Body**:
  ```
  Dear [name],

  Please find attached your UNICC Individual consultancy contract.
  Kindly review, sign and return the contract by [date].

  Best regards,
  ```
- Editable subject and body fields (same as other wizards)

### Step 3 -- Summary and Send
- Shows To, Subject, Body preview
- Send button

### Technical Details (single file: `src/pages/EmailHub.tsx`)

1. **Add state variables** for the contract wizard: `contractDialogOpen`, `contractWizardStep`, `contractSending`, `contractToEmail`, `contractCandidateName`, `contractReturnByDate`, `contractSubject`, `contractBody`

2. **Add `resetContractWizard`** function to clear all contract state

3. **Update `handleDraftEmail`** to handle `'Contract email for signature'` by calling `resetContractWizard()` and opening the contract dialog

4. **Add `goToContractStep2`** that sets:
   - Subject: `UNICC Individual consultancy contract - {contractCandidateName}`
   - Body: `Dear {contractCandidateName},\n\nPlease find attached your UNICC Individual consultancy contract. Kindly review, sign and return the contract by {formattedDate}.\n\nBest regards,`

5. **Add `handleContractSend`** that sends via `send-bulk-talent-email` edge function (no attachments needed for now -- the actual contract PDF would be attached manually or via a future enhancement)

6. **Add the contract Dialog JSX** with 3 steps mirroring the existing wizard pattern

7. **Validation**: `contractStep1Valid` requires email, name, and return-by date to be filled

