

## Persist Userbase to Supabase + Advanced Table Controls

### 1. Database — new table `users_clean`

Create via migration. Stores the merged GSM+Samsaran dataset as the canonical source of truth, replacing `sessionStorage`.

**Schema**
```sql
create table public.users_clean (
  id uuid primary key default gen_random_uuid(),
  -- GSM fields
  full_name text,
  gsm_staff_number text,
  nationality text,
  gsm_gender text,
  date_of_birth text,
  gsm_email_address text,
  service_time_current_org text,
  official_duty_station text,
  apa_start_date text,
  job_name text,
  position_name text,
  first_incumbency_start_date date,
  entry_on_duty_date_who date,
  appointment_type text,
  contract_start_date text,
  contract_end_date text,
  current_grade text,
  current_step text,
  reporting_lines text,
  category text,
  -- Samsaran fields
  first_name text,
  last_name text,
  search_name text,
  samsaran_gender text,
  samsaran_staff_number text,
  samsaran_email_address text,
  worker_type text,
  intern text,
  unit text,
  job_title text,
  line_manager text,
  office_location text,
  division text,
  -- Bookkeeping
  match_key text,                       -- sn:<num> or em:<email>
  source text not null,                 -- 'gsm' | 'samsaran' | 'both'
  imported_at timestamptz not null default now(),
  imported_by uuid references auth.users(id)
);

create index users_clean_match_key_idx on public.users_clean(match_key);
create index users_clean_email_idx on public.users_clean(lower(coalesce(samsaran_email_address, gsm_email_address)));
create index users_clean_division_idx on public.users_clean(division);
create index users_clean_unit_idx on public.users_clean(unit);
create index users_clean_worker_type_idx on public.users_clean(worker_type);
```

**RLS** — restricted to admin/HR only (consistent with existing `users` table policy pattern via `get_current_user_division` / role checks):
- SELECT: roles `Admin`, `HR Assistant`, `Chief of HR`.
- INSERT/UPDATE/DELETE: roles `Admin`, `HR Assistant`.
- No public/anon access.

### 2. Persistence flow — `src/pages/ImportUserbase.tsx`

After the existing client-side parse/transform/outer-join in `handleParse`:

1. Map merged rows to `users_clean` column names (snake_case keys above).
2. Compute `source`:
   - GSM-only row → `'gsm'`
   - Samsaran-only → `'samsaran'`
   - Both → `'both'`
3. Wipe-and-replace strategy: `delete from users_clean` then `insert` the new batch in chunks of 500 (Supabase row-payload safety). Wrap in a single client-visible "Saving to database…" toast progression.
4. On success: also keep the `sessionStorage` write (as cache for instant render), then `navigate('/admin/userbase')`.
5. On failure: toast error, keep session data so user can still preview.
6. `imported_by = auth.uid()`.

Rationale: the dataset is a full periodic refresh, not incremental — wipe-and-replace is simpler than upsert/merge and matches user intent ("refresh the user base").

### 3. Userbase page — `src/pages/Userbase.tsx` (rewrite)

Replace session-only render with a Supabase-backed, server-paginated table.

**Data fetching**
- React Query `useQuery(['users_clean', { page, pageSize, sort, filters, search }])`.
- Single Supabase call per page using `.range(from, to)` + `.order(col, { ascending })` + `.ilike()` filters + `.count: 'exact'` for total.
- Global search → `.or('full_name.ilike.%q%,gsm_email_address.ilike.%q%,samsaran_email_address.ilike.%q%,gsm_staff_number.ilike.%q%,samsaran_staff_number.ilike.%q%,unit.ilike.%q%,job_title.ilike.%q%')` (debounced 300ms).
- If table is empty → existing empty state with "Go to Import Userbase" CTA.

**Sort**
- Click any column header → toggles asc / desc / none. Single-column sort. Default order: `imported_at desc, full_name asc`.
- Sort icon (chevron) in header.

**Pagination**
- shadcn `Pagination` component at the bottom.
- Page size selector (25 / 50 / 100 / 250). Default 50.
- Display "Showing X–Y of N".

**Server-side filters**
- Toolbar above table with a "Filters" popover. Each chip filter is sent as a Supabase predicate:
  - **Division** — multi-select from distinct values (loaded once via dedicated query).
  - **Unit** — searchable multi-select (distinct).
  - **Worker type** — multi-select (`Staff`, `Affiliate`, `Intern`, etc.).
  - **Category** — multi-select (`P`, `G`, `D`, …).
  - **Source** — `gsm` / `samsaran` / `both`.
  - **Office location** — multi-select.
- Active filters render as removable chips under the toolbar.
- Multi-value filters use `.in('column', […])`.

**Column show/hide**
- "Columns" dropdown (shadcn `DropdownMenu` with checkbox items) listing every column with a checkbox.
- Visible-column state persisted in `localStorage` under `userbase:visible-columns`.
- A "Reset to defaults" item restores the default visible set.
- Default-visible set (rest hidden but toggleable): `Full Name, Unit, Division, Job Title, Worker Type, Category, Office Location, Samsaran Email Address, GSM Staff Number, Line Manager`.

**Download CSV**
- Two modes via split button:
  - **Current page** — exports rendered rows.
  - **All matching filters** — fetches all matching rows in chunks of 1000 via `.range()` loop, then exports.
- Export honours both column visibility and current filters/sort.

**Header strip**
- Title `Userbase` · subtitle `<total> rows · last imported <imported_at MAX> by <user>` (small extra query for the latest `imported_at`).

### 4. Routing & Layout — unchanged
- Route `/admin/userbase` and Analytics dropdown entry already exist.

### 5. Cleanup
- Remove `sessionStorage` reliance for display (kept only as transient cache during the navigate hop after import).
- Keep merge/transform logic exactly as-is in `ImportUserbase.tsx`; only the post-merge handoff changes.

### Technical notes
- Auth required — page redirects unauthenticated users via existing layout/auth guard.
- All filter/sort/search predicates run server-side; the client never holds the full dataset (handles >10k rows cleanly).
- Date columns (`first_incumbency_start_date`, `entry_on_duty_date_who`) typed as `date`; everything else stays `text` to absorb messy source values without insert failures.
- Indices on the most-filtered columns (`division`, `unit`, `worker_type`, email lower-case) keep paginated queries snappy.
- `src/integrations/supabase/types.ts` regenerates automatically after the migration.

### Out of scope
- Diff/reconciliation against existing `public.users` table.
- Edit-in-place on `users_clean` rows.
- Saved filter presets.

