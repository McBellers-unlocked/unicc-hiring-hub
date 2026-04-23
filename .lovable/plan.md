

## Headcount Analytics page (`/admin/headcount`)

A new client-side page reading from `users_clean`, slotted into the Analytics dropdown between **Userbase** and the separator. No DB / schema changes.

### 1. Routing & navigation
- Add page `src/pages/Headcount.tsx`.
- `src/App.tsx`: register route `/admin/headcount` → `<Headcount />` (admin guard, same pattern as Userbase).
- `src/components/Layout.tsx`: insert a new `DropdownMenuItem` linking to `/admin/headcount` with a `PieChart` icon, immediately after the Userbase item and before the existing `<DropdownMenuSeparator />` at line 325.

### 2. Data fetching
- Single React Query: `['users_clean:headcount', filters]`.
- One Supabase call selecting only the columns needed: `gsm_gender, samsaran_gender, worker_type, category, division, office_location, current_grade, nationality, appointment_type`.
- Filters applied server-side via `.in()` predicates:
  - `worker_type` (multi-select from distinct values)
  - `division` (multi-select from distinct values)
  - `office_location` (multi-select from distinct values)
- Distinct-value queries: 3 small parallel queries to populate filter dropdowns (cached separately as `['users_clean:distinct', column]` — same key already used by `Userbase.tsx`, so they're shared).
- Pagination: pull all matching rows in 1000-row chunks via `.range()` loop (the dataset is small, full-table aggregation is needed). Show a count at the top.

### 3. Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Headcount    (subtitle: N people · last imported …)         │
├─────────────────────────────────────────────────────────────┤
│ Filter bar:  [Worker type ▾]  [Division ▾]  [Location ▾]    │
│              active chips · "Reset"                         │
├─────────────────────────────────────────────────────────────┤
│ KPI strip — one card per Division (count + % of total)      │
├──────────────────────────┬──────────────────────────────────┤
│ Pie: Gender (Man/Woman/  │ Pie: Staff vs Affiliate          │
│ Other) — Recharts        │ (worker_type)                    │
├──────────────────────────┼──────────────────────────────────┤
│ Bar: Headcount per       │ Bar: Headcount per Worker Type   │
│ Category (P/G/D/…)       │ stacked by Division              │
├──────────────────────────┴──────────────────────────────────┤
│ Bar histogram: Distribution by Grade (sorted G3→D1, color   │
│ by category)                                                │
├─────────────────────────────────────────────────────────────┤
│ Bar: Headcount per Office Location (top 10)                 │
├──────────────────────────┬──────────────────────────────────┤
│ Bar: Top 10 Nationalities│ Bar: Headcount per Division ×    │
│                          │ Gender (grouped)                 │
└──────────────────────────┴──────────────────────────────────┘
```

All charts use existing **Recharts** (already in the project — see `WorkforceComposition`) and shadcn `Card` for framing.

### 4. Aggregation rules (client-side, in `useMemo` from the fetched rows)
- **Gender**: prefer `samsaran_gender`, fall back to `gsm_gender`. Normalize lower-case `man/woman` → "Man"/"Woman"; everything else → "Other/Unknown".
- **Staff vs Affiliate**: `worker_type` value as-is. Empty → "Unknown".
- **Category**: `category` (P / G / D). Empty → "Unspecified".
- **Division KPI cards**: render one card per distinct `division`; sort by count desc; show count + share of total.
- **Grade histogram**: order by canonical `GRADES` array from `src/lib/organizationConstants.ts` (G3…D1); rows whose grade is missing are excluded from the grade chart only.
- **Location**: use `office_location`, top 10 by count, "Other" bucket for the rest.
- **Nationality**: top 10 by count, "Other" bucket; rows with null nationality excluded.
- **Division × Gender**: grouped bar (one cluster per division, two bars Man/Woman). Other genders excluded from this chart.

### 5. Filter chip toolbar
- Reuse the same MultiSelect / chip pattern already used in `src/pages/Userbase.tsx`. Active filters shown as removable chips under the toolbar with a "Reset all" button.

### 6. Permissions
- Same gate as Userbase: roles `Admin`, `HR Assistant`, `Chief of HR` via `useAuth`. Others → `<Navigate to="/" />`.

### 7. Empty / loading
- `Skeleton` placeholders for KPI cards and charts while loading.
- If `users_clean` is empty, show the same empty state as Userbase with a CTA to `/admin/import-userbase`.

### Technical notes
- Pure client-side computation — no SQL aggregations needed; the table is small and we already need the rows for multiple charts.
- Brand colors: primary `#009CDE` (UNIQTalent) for main bars; reuse existing chart palette already used in `WorkforceComposition.tsx` for consistency.
- No edits to `users_clean`, no migrations, no edge functions.

### Out of scope
- Time-series / historical headcount evolution (would require snapshotting `users_clean`).
- Drill-through from a chart segment to the Userbase table with filters pre-applied.
- CSV export of the aggregated tables.

