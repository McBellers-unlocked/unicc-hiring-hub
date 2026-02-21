

## Rename "Rate confirmation to IC" to "OneHR approval" with New Template

Replace the existing "Rate confirmation to IC" email template with a new "OneHR approval" template that has a fixed subject line and body.

### Changes (single file: `src/pages/EmailHub.tsx`)

**1. Rename the label**
- In the `affiliateEmails` array, change `'Rate confirmation to IC'` to `'OneHR approval'`
- Update the condition in `handleDraftEmail` from `'Rate confirmation to IC'` to `'OneHR approval'`
- Update all dialog titles from `'Rate Confirmation'` to `'OneHR Approval'`

**2. Simplify wizard Step 1**
- Remove the "Rate" and "Date" fields since they are no longer needed for this template
- Keep only "To (email)" and "Candidate Name"
- Update validation (`step1Valid`) to only require email and name

**3. Update `goToStep2` to generate the new subject and body**
- Subject: `Use of OneHR background verification services Request for consent - ${candidateName}`
- Body: the full OneHR approval email text provided, with `${candidateName}` replacing "Name", including `<b>` tags for the two bold sections

**4. Remove unused state**
- The `rate` and `date` state variables and their reset logic will be removed since this template no longer uses them

### Email body (template)
The body will include the full text about OneHR background verification, bullet points, bold sections for "confirm your agreement" and "please send us copy of your passport", and the link to the OneHR FAQ page.

