

## Update Date Format in Offer Acceptance Email

Change the date format used in the Offer Acceptance email body from `dd/MM/yyyy` (e.g. 15/05/2026) to `d MMMM yyyy` (e.g. 15 May 2026).

### Changes (single file: `src/pages/EmailHub.tsx`)

In the `goToOfferStep2` function, update the two `format()` calls for the Offer Acceptance dates:

- `format(offerDeadline, 'dd/MM/yyyy')` becomes `format(offerDeadline, 'd MMMM yyyy')`
- `format(offerStartDate, 'dd/MM/yyyy')` becomes `format(offerStartDate, 'd MMMM yyyy')`

This only affects the Offer Acceptance wizard; the Rate Confirmation dates remain unchanged.

