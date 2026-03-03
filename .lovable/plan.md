

## Problem: "Starting..." stall persists

Looking at the edge function logs, the function IS processing (boots, queries DB, reaches "Processing slice 1"). But the client never gets the response, eventually timing out with "failed to send edge function".

Two likely causes:

### 1. Unawaited `fetch()` may not send before response flushes

Line 255: `fetch(...)` is called without `await`. In Deno Deploy, the HTTP request might not actually be dispatched before the isolate processes the return. More critically, the `try/catch` around it **cannot catch async rejections** from an unawaited Promise. If the fetch fails silently, no slice ever starts.

**Fix**: Add `await` to the self-invoke fetch so the request is confirmed sent before returning the response. We don't need to await the *response body* — just ensure the request leaves the wire.

### 2. HTTP 202 status may confuse Supabase client

The response uses `status: 202`. Some versions of `supabase-js` may not handle non-200 2xx statuses correctly in `functions.invoke()`.

**Fix**: Change to `status: 200`.

### Changes

**`supabase/functions/trigger-batch-scoring/index.ts`** (lines 254-282):
- Change `fetch(...)` to `await fetch(...)` on line 255 — ensures the self-invoke request is sent
- Change response status from `202` to `200` on line 281
- Both changes are single-line edits

### Expected result
- Function sends the self-invoke request, confirms it was sent, then returns 200 to the client within ~1 second
- UI transitions from "Starting..." to "Scoring 0/40..." immediately
- Background slices process as before

