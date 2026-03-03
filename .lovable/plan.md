

## Fix: Remove `temperature` parameter for GPT-5 compatibility

### Root Cause
The logs show every AI Gateway call fails with:
> `"Unsupported value: 'temperature' does not support 0.1 with this model. Only the default (1) value is supported."`

`openai/gpt-5` does not support custom temperature values. The code sets `temperature: 0.1` in two places (lines 181 and 224), causing all tool-calling and fallback requests to return 400 errors. The fallback text parsing then also fails, producing "AI analysis failed (parse failure)" for every criterion.

### Fix
Remove the `temperature` parameter from both API call locations in `supabase/functions/score-application/index.ts`:

| Location | Change |
|---|---|
| Line 181 (`callAIWithToolCalling`) | Remove `temperature: 0.1` |
| Line 224 (fallback text call) | Remove `temperature: 0.1` |

Then redeploy the edge function. No other changes needed.

