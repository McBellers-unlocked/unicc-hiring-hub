

## Add "Offer Acceptance" Draft Email to Staff Recruitment

### What changes

The **Staff Recruitment** card currently shows "No items configured yet." We will replace that placeholder with a list containing one item — **"Offer Acceptance"** — styled identically to the Affiliate Recruitment items (label on the left, "Draft Email" button on the right).

Clicking "Draft Email" opens a 3-step wizard dialog (same pattern as Rate Confirmation):

1. **Step 1 — Fill Details**: Collect candidate email, candidate name, position title, and a response deadline date.
2. **Step 2 — Email Preview**: Pre-filled subject and body are shown in editable fields so HR can tweak before sending.
3. **Step 3 — Summary**: Read-only review of To, Subject, and Body before final send.

### Email template content

- **Subject**: `Offer Acceptance — [Position Title] | [Candidate Name]`
- **Body**:
```
Dear [Candidate Name],

We are pleased to inform you that you have been selected for the consultancy position of [Position Title] at UNICC.

Kindly confirm whether you accept this offer by [Response Deadline].

If you have any questions or require additional information, please do not hesitate to reach out.

Best regards,
UNICC Human Resources
```

### Technical details

**Single file changed:** `src/pages/EmailHub.tsx`

Changes:
- Add a `staffEmails` array: `['Offer Acceptance']`
- Add state for a second dialog (`offerDialogOpen`) and its wizard step (`offerWizardStep`)
- Add form fields: `offerToEmail`, `offerCandidateName`, `offerPositionTitle`, `offerDeadline` (Date)
- Add `resetOfferWizard()`, `goToOfferStep2()`, and `handleOfferSend()` functions (mirrors the Rate Confirmation pattern exactly)
- Replace the Staff Recruitment placeholder `<p>` with a `.map()` over `staffEmails`, rendering the same row layout as Affiliate Recruitment
- Add a second `<Dialog>` for the Offer Acceptance wizard with 3 steps
- `handleDraftEmail` logic extended: when label is `'Offer Acceptance'`, open the offer dialog
- Send via the existing `send-bulk-talent-email` edge function (same as Rate Confirmation)

No new files, no new dependencies, no database changes.

