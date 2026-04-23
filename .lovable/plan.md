

## Parse GSM + Samsaran extracts → Unified Userbase

### Overview
On clicking **Parse Data** in `/admin/import-userbase`, parse both XLSX/CSV files in-browser, transform per the rules, outer-join on **Staff Number**, store the result in `sessionStorage`, then navigate to a new `/admin/userbase` page that renders the merged table. Add **Userbase** to the Analytics dropdown above the separator.

### 1. Parsing & transformation — `src/pages/ImportUserbase.tsx`

Use the existing `xlsx` (SheetJS) library already in the project (used by `ImportStaffList`). Replace the placeholder `handleParse` with a real pipeline:

**GSM transform**
- Read sheet → JSON rows.
- Keep only these columns (case-insensitive header match):
  `Full Name, Staff Number, Nationality, Gender, Date of Birth, Email Address, Service time (Current Organization), Official Duty Station, APA Start Date, Job Name, Position Name, First Incumbency Start Date, Entry on duty date WHO, Appointment Type, Contract Start Date, Contract End Date, Current Grade, Current Step, Reporting lines (name of supervisor)`
- Add `Category` = first character of `Current Grade` (uppercased, trimmed; empty if missing).
- Normalize `First Incumbency Start Date` and `Entry on duty date WHO` to ISO `YYYY-MM-DD`. Handle Excel serial numbers (number → JS Date via `XLSX.SSF.parse_date_code`) and string dates (`new Date(...)` fallback). Invalid → empty string.
- `Gender`: `Female → Woman`, `Male → Man` (case-insensitive); other values pass through.

**Samsaran transform**
- Read sheet → JSON rows.
- Keep only: `First name, Last name, Search name, Gender, Staff number, Email address, Worker type, Intern, Department, Job title, Line manager, Office location`.
- Rename `Department` → `Unit`.
- Add `Division`: lookup from `DIVISION_UNITS` (`src/lib/organizationConstants`) — for each row's `Unit` value, find the division code whose units list contains that unit (match on the `(CODE)` extracted via the same `extractCode` helper used in `UnitsAndDivisions.tsx`, falling back to substring match on the full unit name). Empty if no match.
- `Gender`: `Male → Man`, `Female → Woman`.
- `Worker type`: `Contractor → Affiliate`, `Employee → Staff` (case-insensitive); other values pass through.
- Drop rows where `Email address` is blank/whitespace.

**Outer join**
- Join key: **Staff Number** (trimmed string; case-insensitive). Fallback secondary key: lowercase email when staff number is missing on one side.
- Build a `Map<key, mergedRow>`. For matched rows, GSM fields and Samsaran fields coexist as separate columns (no overwriting). For GSM-only or Samsaran-only rows, the other side's columns are empty strings.
- Final column order: all GSM kept columns + `Category`, then all Samsaran kept columns (with `Department` renamed to `Unit`) + `Division`. Duplicate logical fields (e.g. Gender appears in both) are kept as `GSM Gender` / `Samsaran Gender` to preserve provenance — same for `Staff Number`, `Email`, `Gender`.

**Handoff**
- Persist `{ columns: string[], rows: Record<string,string>[], generatedAt: ISO }` to `sessionStorage` under key `userbase:merged`.
- Toast success and `navigate('/admin/userbase')`.
- On parse failure (missing required headers, unreadable file): toast error, do not navigate, do not clear existing storage.

### 2. New page — `src/pages/Userbase.tsx`

- `Layout` wrapper, page title **Userbase**, subtitle showing `<row count> rows · merged <date>`.
- Read from `sessionStorage`. If empty, show empty state with a button "Go to Import Userbase" → `/admin/import-userbase`.
- Toolbar:
  - Search input (filters across all columns, case-insensitive substring).
  - **Download CSV** button — exports the currently filtered rows using SheetJS (`XLSX.utils.json_to_sheet` → `sheet_to_csv`).
- Table: shadcn `Table` inside a `max-h-[70vh] overflow-auto` wrapper with `sticky top-0` header. Render every column from the stored `columns` array; cells are plain text. Pagination not required for v1 (the dataset is one-shot per session).

### 3. Routing & navigation

- `src/App.tsx`: import `Userbase` and add `<Route path="/admin/userbase" element={<Userbase />} />` above the catch-all.
- `src/components/Layout.tsx` Analytics dropdown (lines 312–338): add a new `DropdownMenuItem` for **Userbase** (`/admin/userbase`, `Users` icon) immediately after **Hiring Analytics** and before the existing `DropdownMenuSeparator`, so it sits in the upper group.

### Technical notes

- `xlsx` package is already a dependency (used by `ImportStaffList.tsx`); no new install required.
- Date conversion helper handles three inputs: number (Excel serial), `Date` instance, string. Output `''` on `NaN`.
- Division lookup uses the existing `DIVISION_UNITS` and `extractCode` patterns from `UnitsAndDivisions.tsx` to stay consistent with how the org structure is parsed elsewhere.
- All processing is client-side; no DB schema changes, no edge functions, no Supabase calls.
- `sessionStorage` (not `localStorage`) so the merged dataset clears on tab close — appropriate for a working/preview view that has not been formally persisted.

### Out of scope (future)
- Persisting the merged Userbase to Supabase.
- Column show/hide, sort, pagination, server-side filters.
- Bulk reconciliation against existing `users` table.

