
## Add Default CC to Offer Acceptance Emails

Add `hraffiliatemanagement@unicc.org` as a default CC recipient when sending Offer Acceptance emails.

### Changes

**1. Edge function (`supabase/functions/send-bulk-talent-email/index.ts`)**
- Update the `BulkEmailRequest` interface to accept an optional `cc` field (array of strings)
- Pass the `cc` field through to the Resend `emails.send()` call

**2. Frontend (`src/pages/EmailHub.tsx`)**
- In the `handleOfferSend` function, include `cc: ['hraffiliatemanagement@unicc.org']` in the request body sent to the edge function
- Show the CC address in the Step 3 summary so the user can see it before sending

### Technical details

The Resend API natively supports a `cc` parameter as an array of email strings, so this is a straightforward pass-through. The CC will only be added for the Offer Acceptance flow; the Rate Confirmation flow remains unchanged.
