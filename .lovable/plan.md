

## Public Read-Only Strategy Tracker Link

### Approach
Create a token-protected public route (`/strategy-tracker/view/:token`) that displays the strategy tracker in read-only mode — no login required. A secret token acts as the access gate instead of authentication.

### Database Changes
1. **New RLS policy** on `strategy_tracker_items`: Allow `SELECT` for `anon` role when accessed via a service-level function (or use an edge function to proxy the data).

Since RLS currently blocks anonymous access, the cleanest approach is a **Supabase Edge Function** that fetches the data using the service role key and returns it as JSON — only if the correct token is provided.

2. **Store the share token** in a new `strategy_tracker_settings` table (single row) so HR can regenerate it if needed. Alternatively, use a hardcoded token for simplicity.

### Implementation

**Option chosen: Edge Function + simple shared token**

1. **Edge Function `get-strategy-tracker-public`**
   - Accepts a `token` query param
   - Validates token against a stored secret (env var `STRATEGY_TRACKER_PUBLIC_TOKEN`)
   - If valid, fetches all rows from `strategy_tracker_items` using service role client and returns JSON
   - No auth required

2. **New page: `src/pages/StrategyTrackerPublic.tsx`**
   - Route: `/strategy/view/:token`
   - Fetches data from the edge function passing the token
   - Renders the same table as StrategyTracker but fully read-only (no edit controls, no add/delete buttons)
   - No Layout/sidebar — clean standalone page with UNICC branding
   - Shows "Access denied" if token is invalid

3. **Route in `App.tsx`**
   - Add `/strategy/view/:token` pointing to `StrategyTrackerPublic`

4. **Share button in StrategyTracker.tsx**
   - Add a "Copy public link" button (visible to admins) that copies the URL with the token to clipboard
   - Token is set as a Supabase edge function secret

### Files
- **New**: `supabase/functions/get-strategy-tracker-public/index.ts`
- **New**: `src/pages/StrategyTrackerPublic.tsx`
- **Modified**: `src/App.tsx` — add public route
- **Modified**: `src/pages/StrategyTracker.tsx` — add "Copy link" button
- **Secret**: `STRATEGY_TRACKER_PUBLIC_TOKEN` — a random UUID token

### Shareable URL
```
https://unicc-hireflow.lovable.app/strategy/view/[token]
```

Senior managers open this link and see the full tracker table in read-only mode — no login needed.

