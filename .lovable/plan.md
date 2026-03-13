

## Persist Strategy Tracker to Supabase for Shared Access

### Problem
Currently, strategy tracker data lives in each user's `localStorage`, so nobody can see each other's changes.

### Solution
Create a Supabase table to store strategy items, replace localStorage with real-time DB reads/writes, and restrict access to HR team roles plus Milena Grecuccio.

### Database Changes

**New table: `strategy_tracker_items`**
- `id` UUID primary key
- `action_item` text
- `year` text[] (array)
- `status` text
- `owner` text[] (array)
- `priority` text
- `updates` jsonb (array of update entries)
- `prioritisation_updates` jsonb
- `pillar` text
- `participants` text[]
- `created_at`, `updated_at` timestamps
- `created_by` UUID (references auth.users)

**Seed**: Insert the 35 default items on first load if table is empty (handled in code).

**RLS Policies**:
- SELECT: Allow authenticated users with roles `Admin`, `HR Assistant`, `Chief of HR`, or email `grecuccio@unicc.org`
- INSERT/UPDATE/DELETE: Same set of users

This uses a security definer function to check the user's role from the `users` table without recursion issues.

### Code Changes (`src/pages/StrategyTracker.tsx`)

1. **Add Supabase imports** and `useQuery`/`useMutation` from TanStack Query
2. **Fetch items** from `strategy_tracker_items` table instead of localStorage/DEFAULT_ITEMS
3. **Seed on first load**: If query returns empty, insert DEFAULT_ITEMS into the table
4. **Update handler**: Each field change triggers an upsert to Supabase (debounced)
5. **Add/delete rows**: Insert/delete from Supabase table
6. **Update entries**: Append to the jsonb `updates`/`prioritisation_updates` columns
7. **Remove localStorage** persistence logic
8. **Add access guard**: If user doesn't have the right role, show an access-denied message

### Access Control
- Roles allowed: `Admin`, `HR Assistant`, `Chief of HR`
- Additional user: `grecuccio@unicc.org` (Chief of Division)
- All other users see an "Access restricted" message

### Files Modified
- `src/pages/StrategyTracker.tsx` — major rewrite for Supabase integration
- New SQL migration — create table + RLS policies

