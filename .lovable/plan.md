

## Rate Confirmation Email Wizard

### Overview
Clicking "Draft Email" on "Rate confirmation to IC" opens a multi-step dialog wizard with three steps: (1) fill variables, (2) review/edit pre-filled email, (3) summary and send.

### Step-by-Step Flow

**Step 1 -- Fill Variables**
- Fields: To (email input), Candidate Name (text), Rate (text), Date (date picker)
- "Next" button at bottom, disabled until all fields are filled

**Step 2 -- Email Preview**
- Subject field pre-filled: `Rate confirmation [Candidate Name]`
- Body field pre-filled:
  ```
  Dear [Candidate Name],

  This is to confirm your rate will be [Rate].

  Please accept by [Date].
  ```
- Both fields are editable (textarea for body, input for subject)
- "Back" and "Next" buttons

**Step 3 -- Summary and Send**
- Read-only summary showing: To, Subject, Body
- "Back" and "Send" buttons
- Send calls the existing `send-bulk-talent-email` edge function (single recipient, with the composed subject/body)
- Shows success/error toast

### Technical Details

#### File: `src/pages/EmailHub.tsx`

1. **Add state**: `dialogOpen`, `wizardStep` (1/2/3), and form fields (`toEmail`, `candidateName`, `rate`, `date`, `subject`, `body`).

2. **Step 1 logic**: When user clicks "Next", compute pre-filled subject and body from the variable fields and advance to step 2.

3. **Step 2 logic**: Subject and body are editable inputs. "Next" advances to step 3.

4. **Step 3 logic**: Renders a read-only summary. "Send" button calls `supabase.functions.invoke('send-bulk-talent-email', { body: { recipients: [{ name: candidateName, email: toEmail }], subject, body } })`. On success, shows toast and closes dialog.

5. **Dialog UI**: Uses existing `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter` components. Body content area wrapped in a `div` with `overflow-y-auto max-h-[60vh]` for scrollability.

6. **Validation**: "Next" on step 1 is disabled unless all four fields have values. Email field uses `type="email"`. Date uses the existing `CustomDatePicker` component.

7. **Wire up**: `handleDraftEmail('Rate confirmation to IC')` opens the dialog for this specific template. Other buttons keep the "coming soon" toast.

#### No new files or edge functions needed
Reuses the existing `send-bulk-talent-email` edge function which already accepts `recipients`, `subject`, and `body`.

