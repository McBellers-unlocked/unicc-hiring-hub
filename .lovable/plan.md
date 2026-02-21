

## Bold Currency, Rate, and Dates in Offer Acceptance Email

Make the currency/rate and date values bold in the generated Offer Acceptance email body so they stand out to the recipient.

### Changes (single file: `src/pages/EmailHub.tsx`)

In the `goToOfferStep2` function, wrap the dynamic values with `**` markdown-style bold markers in the email body template string:

- `${offerCurrency} ${offerRate}` becomes `**${offerCurrency} ${offerRate}**`
- `${formattedStartDate}` becomes `**${formattedStartDate}**`
- `${formattedDeadline}` becomes `**${formattedDeadline}**`

Since the email is sent via the `send-bulk-talent-email` edge function, we need to check whether it renders markdown/HTML or sends plain text. If it sends HTML, we should use `<b>` tags instead of `**`.

Additionally, update the Step 3 summary preview to render these bold markers visually (the preview already uses `whitespace-pre-wrap`, so wrapping with `<b>` or `<strong>` tags in the preview would require minor JSX changes, or we can simply rely on the bold markers being visible in preview).

### Approach

1. Check the edge function to determine if it supports HTML formatting
2. Use the appropriate bold syntax (`<b>` for HTML, `**` for markdown) in the template
3. Ensure the preview in Step 2/3 also reflects the bold formatting

