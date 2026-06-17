## Problem

Clicking "Generate with AI" shows: *"AI generation failed — Failed to send a request to the Edge Function"*.

This message from `supabase.functions.invoke` means the browser could not reach the function at all (boot failure, deploy failure, or unhandled CORS preflight), not an AI Gateway error.

## Root cause (likely)

`supabase/functions/generate-position-description/index.ts` uses legacy imports that frequently fail to boot in the current edge runtime:

```ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

It also defines its own ad-hoc `corsHeaders` instead of the canonical one and is not listed in `supabase/config.toml`.

## Fix

Rewrite `supabase/functions/generate-position-description/index.ts` to the modern Lovable edge-function pattern, keeping the existing logic and request/response shape untouched:

1. Replace imports with:
   - `import { createClient } from "npm:@supabase/supabase-js@2"`
   - `import { corsHeaders } from "npm:@supabase/supabase-js@2/cors"`
   - Drop the `xhr` polyfill (not needed).
   - Use `Deno.serve` directly instead of `serve` from `std/http`.
2. Remove the local `corsHeaders` declaration; use the imported one. Keep `Content-Type: application/json` and `corsHeaders` on every response (including errors).
3. Keep the existing auth check (`Authorization` header + `supabase.auth.getUser()`), validation, attachment context build, AI Gateway call, and JSON parsing exactly as-is.
4. Keep the model as `google/gemini-2.5-flash` (it's still supported); not changing models in this fix.
5. Add an entry to `supabase/config.toml`:
   ```toml
   [functions.generate-position-description]
   verify_jwt = false
   ```
   (The function validates the JWT in code.) Also add the same block for `generate-interview-questions` if it was created in the same batch and isn't listed.

## Out of scope

- No client changes — `AIGeneratePositionDescription.tsx` already invokes the function correctly.
- No model swap and no prompt changes.

## Verification

After redeploy, click "Generate with AI" in `/requisitions/new` with title + grade + division filled and confirm the function returns a JSON body with `purpose_of_position` and `main_duties_responsibilities` (no toast error).
