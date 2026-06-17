## Problem

The toast "Failed to send a request to the Edge Function" is thrown by `supabase.functions.invoke()` when the browser cannot complete the HTTP request — almost always a CORS preflight failure, not a server-side error.

`supabase/functions/generate-position-description/index.ts` lines 3–7 whitelist only:

```
authorization, x-client-info, apikey, content-type
```

The current `supabase-js` client also sends `x-supabase-api-version` on every `functions.invoke()` call. Because that header is not whitelisted, the browser's preflight `OPTIONS` rejects the request and the client throws `FunctionsFetchError: Failed to send a request to the Edge Function` — exactly the symptom in the screenshot. Other edge functions in this project that work have a broader CORS header set.

## Fix (single file)

Edit only `supabase/functions/generate-position-description/index.ts`:

1. Replace the local `corsHeaders` object with the shared SDK one used elsewhere in the project:
   - Add `import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";` at the top.
   - Delete the inline `const corsHeaders = { ... }` to avoid a duplicate-identifier error.
2. Leave the existing `OPTIONS` short-circuit and `json()` helper as-is — they already spread `corsHeaders` into every response, including error paths.
3. No changes to: system prompt, model (`google/gemini-2.5-flash`), request schema, auth check (`getClaims`), attachment truncation limits (`MAX_PER_FILE` / `MAX_TOTAL_CONTEXT`), output validation, or the client component `AIGeneratePositionDescription.tsx`.

## Verification

- Reload `/requisitions/new`, ensure title/grade/division are filled, attach the same JD again.
- Expect: spinner on "Generate with AI", no red toast, fields populated from the JD. If the AI itself fails (rate limit / credits) the real 429 / 402 message will now surface instead of the generic "Failed to send a request to the Edge Function".

## Out of scope

- Body-size hardening for very large PDFs (would only matter if a JD's extracted text pushes the JSON body past gateway limits — follow-up if it actually recurs).
- Any scoring engine / rubric changes.
