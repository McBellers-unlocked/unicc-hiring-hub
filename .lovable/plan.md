## Goal
Make the Nationality section on `/admin/headcount` interactive: click any nationality (in chart or table) to drill down to the underlying people, with search inside the drill-down.

## What changes

1. **Clickable nationality rows & bars**
   - In the "All nationalities" table, the nationality name becomes a button.
   - In the Top 15 / Gender / Worker-type charts, clicking a bar opens the same drill-down.

2. **Drill-down side sheet** (slides in from the right)
   - Title: `🇺🇳 {Nationality} — {count} people`
   - Mini summary chips: Women / Men / Other split, top division, top location, top worker type.
   - **Search box** filtering by name, email, division, office location, grade, job title, or worker type (client-side, case-insensitive).
   - Sortable people table: Name · Job title · Division · Location · Grade · Worker type · Gender. Sticky header, virtual-friendly height cap with scroll.
   - **Download CSV** button — exports the (filtered) drill-down list.
   - Honours the page-level filter bar (Worker type / Division / Location) already applied to the underlying rows.

3. **Search box already at the top of the Nationality table stays** — it filters the aggregate table. The new search inside the sheet filters the drill-down people list.

## Technical notes

- Extend `rowsQuery` in `Headcount.tsx` to also select `full_name`, `email`, `job_title`, `current_grade`, `office_location`, `division` (most are already selected). Pass the full row list to `NationalityReport`.
- In `NationalityReport.tsx`:
  - Add `selectedNationality` state and a shadcn `Sheet` (right side, `w-full sm:max-w-3xl`).
  - Build `peopleByNationality` memo (Map<nationality, Row[]>) once.
  - On click handlers from chart `<Bar onClick>` and table row buttons → set selected nationality.
  - Drill-down search uses local `useState` string; filter via `.toLowerCase().includes(q)` across the searchable fields.
  - CSV export reuses existing blob-download pattern, filename `nationality-{name}-{date}.csv`.
- All styling via semantic tokens / existing `PALETTE` + `GENDER_COLORS`.

## Out of scope
- Linking from drill-down rows to individual user profile pages (can be a follow-up).
- Server-side pagination (full row set is already loaded for the page).
