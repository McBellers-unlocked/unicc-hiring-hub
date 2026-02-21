

## Fix: Attachments Not Arriving in "General Documentation to IC" Emails

The edge function logs confirm **5 attachments are being sent** and the email succeeds, but recipients don't see them. The root cause is in the edge function: `base64Decode()` converts the base64 string to a `Uint8Array`, but the Resend API in this context doesn't handle `Uint8Array` correctly for attachments. Resend natively accepts base64 strings -- so we should skip the decode step entirely.

### Changes (single file: `supabase/functions/send-bulk-talent-email/index.ts`)

1. **Remove the unused import** of `base64Decode` from Deno std (line 3)
2. **Pass base64 strings directly to Resend** instead of decoding them to `Uint8Array` (lines 55-59):
   - Change from: `content: base64Decode(att.content)`
   - Change to: `content: att.content`

This is a minimal, targeted fix -- no frontend changes needed.

