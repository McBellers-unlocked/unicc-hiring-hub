Plan to update Manage / Organization Chart

1. Change the chart data source
- Update `/admin/org-chart` to read from `public.users_clean`, matching the Analytics / Userbase page source.
- Select the relevant Userbase fields:
  - `id`
  - `full_name`
  - `samsaran_email_address` / `gsm_email_address`
  - `job_title` / `position_name`
  - `division`, `unit`
  - `current_grade`
  - `worker_type`, `category`
  - `line_manager`
  - `official_duty_station` / `office_location`
- Prefer Samsaran fields where they are the authoritative source for org structure, especially `job_title`, `line_manager`, `unit`, and `division`; use GSM fields as display fallbacks where needed.

2. Normalize names so hierarchy matching works
- The existing org chart matches `line_manager` directly against employee `name`.
- Userbase currently stores employee names like `CHAUHAN, Mr Sameer`, while line managers often appear like `Sameer CHAUHAN`.
- Add normalization logic in `src/lib/orgChartUtils.ts` to create comparable keys from both formats by:
  - removing honorifics/titles such as Mr, Ms, Mrs, Miss, Dr
  - ignoring punctuation and excess whitespace
  - supporting both `LASTNAME, Firstname` and `Firstname LASTNAME`
  - falling back to the existing exact lowercase match when appropriate
- This should reduce the large number of unmatched manager relationships from Userbase.

3. Force Sameer Chauhan as the top/root node
- Add a root selection rule that identifies Sameer Chauhan from Userbase, using robust matching on `full_name` and/or email `chauhan@unicc.org`.
- Build the hierarchy below him using `line_manager` relationships.
- Employees without a resolvable path under Sameer will be handled safely rather than breaking the chart.

4. Handle unmatched or disconnected employees
- Keep employees whose manager cannot be found in the dataset visible where possible.
- Attach disconnected records below Sameer in a clear fallback grouping or as additional top-level children under Sameer, depending on what the current chart component supports cleanly.
- Avoid creating multiple top-level roots unless there is no Sameer record available.

5. Update labels, filters, and stats
- Keep the existing chart controls, division/personnel filters, depth filter, orientation, export, and stats cards.
- Populate divisions/personnel types from `users_clean` instead of `users`.
- Display `worker_type` as personnel type, with `category` as fallback if needed.
- Use `official_duty_station` first, then `office_location` as fallback.

6. Validation
- Verify that the query finds `CHAUHAN, Mr Sameer` / `chauhan@unicc.org`.
- Verify Sameer appears as the single top node in the org chart.
- Verify direct/indirect reports are placed under managers after name normalization.
- Confirm the chart still renders when filters are applied and when export is used.

Technical files expected to change
- `src/pages/OrganizationChart.tsx`
- `src/lib/orgChartUtils.ts`

No database schema change is expected.