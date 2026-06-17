## Plan

The repeated error is a browser-side `FunctionsFetchError`: the request is failing before the app receives a normal HTTP response from the Edge Function. That usually means the function is not reachable/booting correctly or the browser preflight is failing, not that the AI prompt itself is wrong.

## What I will change

1. **Make the Edge Function boot-safe**
   - Replace the SDK CORS helper import with a local `corsHeaders` object to remove a possible unsupported `@supabase/supabase-js/cors` subpath import at Edge runtime.
   - Keep CORS headers on every response, including errors and OPTIONS preflight.

2. **Use the documented Lovable AI Gateway request pattern**
   - Change the gateway header from `Authorization: Bearer <LOVABLE_API_KEY>` to `Lovable-API-Key: <LOVABLE_API_KEY>`.
   - Switch the model to the current default `google/gemini-3-flash-preview`.
   - Keep structured JSON output and the existing UN/UNICC prompt behavior.

3. **Improve client error visibility**
   - In `AIGeneratePositionDescription.tsx`, distinguish fetch/relay/http failures.
   - If the function returns JSON like `{ error: ... }`, show that actual message in the toast instead of only `Failed to send a request to the Edge Function`.
   - Log the full function error object to the browser console for the next debugging pass if needed.

4. **Apply the same runtime-safe CORS pattern to the related interview-question function**
   - It was changed in the same way previously, so I’ll make it consistent to avoid the same boot issue elsewhere.

## Files to update

- `supabase/functions/generate-position-description/index.ts`
- `supabase/functions/generate-interview-questions/index.ts`
- `src/components/requisition/AIGeneratePositionDescription.tsx`

## Validation

- Check the edited files for the corrected imports/headers.
- Re-test the AI generation button in preview if available; if it still fails, the improved toast/console will reveal whether the remaining issue is missing `LOVABLE_API_KEY`, auth/session, credits/rate limit, or deployment.