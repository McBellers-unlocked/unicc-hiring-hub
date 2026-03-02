

## Problem: Sarah Chen Not Appearing

The root cause is the **Supabase 1000-row default limit**. There are 1,334 candidates in the database, and the talent pool query (`select("*")`) returns at most 1,000 rows with no explicit ordering. Sarah Chen (the newest record) falls outside that 1,000-row window.

## Solution: Newest-first ordering + pagination

### 1. Fix the candidates query in `TalentSearchResults.tsx`

**External candidates query changes:**
- Add `.order('updated_at', { ascending: false })` so newest profiles appear first
- Add `.range(offset, offset + PAGE_SIZE - 1)` for pagination
- Request count header via `.select('*', { count: 'exact' })` to know total results

**Internal staff query changes:**
- Same ordering and pagination pattern

### 2. Add pagination state and controls

- Add `page` state (reset to 0 when filters change)
- Display page controls (Previous / Next buttons) below results
- Show "Page X of Y" indicator alongside the existing result count
- Page size: 50 candidates per page (keeps load fast while showing meaningful batches)

### 3. Reset behavior

- Reset page to 0 whenever any filter changes (already partially handled by the `useEffect` that clears selection)
- "Select all internal" checkbox applies only to the current page

### Files to modify
- `src/components/talent-pool/TalentSearchResults.tsx` — query ordering, pagination, page controls UI

### Technical note
Since client-side filtering (text search, skills AND-match, education level) happens *after* fetching, we need to fetch enough data for filtering to work meaningfully. Two options:
- **Option A (simpler)**: Fetch larger batches (e.g., 200) and paginate the filtered results client-side — keeps existing filter logic intact
- **Option B (better long-term)**: Move text/skill filtering to the database query — more efficient but larger change

I'll go with **Option A** for now: fetch 200 per DB page, paginate the filtered results in groups of 50, with a "Load more" button that fetches the next DB batch if needed. This immediately fixes Sarah Chen's visibility while preserving all existing filter logic.

