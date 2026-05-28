## Goal
Add a dedicated **Nationality reporting** section to `/admin/headcount` so HR/Admin can analyse workforce composition by nationality (respecting the existing filter bar).

## What you'll see on the page
A new "Nationality" card group placed after the existing charts, containing:

1. **Headline KPIs**
   - Total nationalities represented
   - Top nationality (name + count + %)
   - % of workforce from top 5 nationalities (concentration indicator)

2. **Top 15 nationalities — horizontal bar chart**
   Replaces the current "Top 10 + Other" pie treatment with a clearer ranked bar (count + % share label).

3. **Nationality × Gender breakdown** (stacked bar, top 10)
   Man / Woman / Other-Unknown per nationality — supports diversity reporting.

4. **Nationality × Worker type** (stacked bar, top 10)
   Staff vs Affiliate vs other worker types per nationality.

5. **Full searchable table**
   All nationalities with columns: Nationality · Headcount · % of total · Women % · Men %. Sortable by any column, search box, and a **Download CSV** button (respects active filters).

All visuals honour the existing Worker type / Division / Location filter bar already on the page.

## Technical notes
- New file `src/components/analytics/NationalityReport.tsx` containing the KPIs, charts and table. Keeps `Headcount.tsx` lean.
- Reuse the `rowsQuery` rows already fetched in `Headcount.tsx` — pass them down as a prop, so no additional DB calls.
- Extend the existing `agg` memo in `Headcount.tsx` (or compute inside the new component from the same rows) to produce:
  - `nationalityFull`: full sorted list `{ name, count, men, women, other, workerTypes: Record<string, number> }`
  - Top-N slices for charts
- Use semantic tokens / existing `PALETTE` and `GENDER_COLORS` constants — no new colors.
- CSV export: client-side blob download, filename `nationality-report-YYYY-MM-DD.csv`.
- Keep the existing "Top 10 + Other" nationality pie or remove it (replaced by the richer section) — I'll remove it to avoid duplication; let me know if you'd rather keep it.

## Out of scope
- World map visualisation (can add later if wanted).
- Trend over time (would need historical snapshots).
- Region/continent grouping (would need a nationality→region lookup table).
