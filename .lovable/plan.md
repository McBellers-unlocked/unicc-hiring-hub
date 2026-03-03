

## Root Cause: pg_net extension not enabled

The trigger function `trigger_application_scoring()` uses `net.http_post()` to call the `score-application` edge function. However, it guards the call with:

```sql
IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') THEN
  SELECT * INTO http_response FROM net.http_post(...);
END IF;
```

**Neither `pg_net` nor `http` extensions are installed.** The guard returns false, the HTTP call is silently skipped, and only the audit log entry is written. This is why the trigger fires (confirmed by audit logs) but Matthew's application was never scored.

This has been broken since the trigger was first created — every "AUTO_SCORING_TRIGGERED" audit log entry represents a trigger that fired but never actually sent the HTTP request.

## Fix

**Single migration with two changes:**

1. **Enable `pg_net` extension** — this is the Supabase-native async HTTP extension that provides `net.http_post()`.

2. **Fix the guard condition** — change the check from `extname = 'http'` to `extname = 'pg_net'` (since that's the extension that provides the `net.http_post` function).

```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_application_scoring()
  ...
  -- Changed: check for pg_net, not http
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM net.http_post(
      url := '...',
      headers := ...,
      body := ...
    );
  END IF;
  ...
```

Also switch from `SELECT * INTO http_response FROM net.http_post(...)` to `PERFORM net.http_post(...)` since we don't need the return value and `PERFORM` is the correct PL/pgSQL idiom for fire-and-forget calls.

### What this fixes
- Every new application with `phf_completed = true` will automatically trigger scoring within ~45 seconds
- No more silent failures — if `pg_net` somehow gets disabled, the `EXCEPTION` block will log to `audit_logs` with action `AUTO_SCORING_HTTP_FAILED`

### Files to change
- One SQL migration (enable extension + replace trigger function)
- No edge function or frontend changes needed

### After deployment
- Matthew Valente's application (`7ecb954b`) will need a one-time manual score trigger since the trigger already fired and won't fire again for the same row

