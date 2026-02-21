
## Add CC to All Affiliate Recruitment Emails

### Overview
Currently only the **Offer Acceptance** template includes `cc: ['hraffiliatemanagement@unicc.org']`. The other three affiliate templates -- **OneHR approval**, **General documentation to IC**, and **Contract email for signature** -- are missing it.

### Changes (single file: `src/pages/EmailHub.tsx`)

1. **OneHR approval (`handleSend`, ~line 160)** -- add `cc: ['hraffiliatemanagement@unicc.org']` to the request body
2. **General documentation to IC (`handleDocSend`, ~line 228)** -- add `cc: ['hraffiliatemanagement@unicc.org']` to the request body
3. **Contract email for signature (`handleContractSend`, ~line 269)** -- add `cc: ['hraffiliatemanagement@unicc.org']` to the request body
4. **Step 3 summaries** -- add a "CC: hraffiliatemanagement@unicc.org" line in the preview/summary for all three wizards (matching the existing pattern in Offer Acceptance)
