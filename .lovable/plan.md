
## Implement "General documentation to IC" Email Template

Add a new email wizard for the "General documentation to IC" button in the Email Hub, following the same pattern as the existing OneHR approval and Offer Acceptance wizards.

### Wizard Step 1 -- Input Fields
- **To (email)** -- recipient email address
- **Candidate Name** -- used in greeting and subject
- **Required by Date** -- date picker, formatted in the subject line
- **Start Date** -- used in the body ("prior to your first day, start date")

### Wizard Step 2 -- Email Preview (editable)
- **Subject**: `[formattedRequiredDate] Individual Consultancy contract documents - ${candidateName}`
- **Body**: The full documentation request email with:
  - List of required documents (DOI, Medical Certificate, GSM Supplier Form, WHO 90.6, NDA)
  - Bold sections using `<b>` tags for: "in case of any charges encountered for the medical certificate up to $50", "Keep all proof of payment", "a copy of your bank statement", "GSM supplier form, bank statement and NDA signed"
  - Start date inserted in the line about remaining documents deadline

### Wizard Step 3 -- Summary & Send

### Technical Details

All changes in `src/pages/EmailHub.tsx`:

1. **New state variables**: `docDialogOpen`, `docWizardStep`, `docSending`, `docToEmail`, `docCandidateName`, `docRequiredByDate`, `docStartDate`, `docSubject`, `docBody`
2. **New reset function**: `resetDocWizard()`
3. **Update `handleDraftEmail`**: Add condition for `'General documentation to IC'` to open the new dialog
4. **New validation**: `docStep1Valid` requiring email, name, required-by date, and start date
5. **New `goToDocStep2`**: Generates the subject and body template with the provided values
6. **New `handleDocSend`**: Sends via `send-bulk-talent-email` edge function
7. **New Dialog JSX**: 3-step wizard dialog matching the existing pattern, with date pickers for both date fields
