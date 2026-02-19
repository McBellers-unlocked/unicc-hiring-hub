
## Contract Breaks: Adding a "Break Type" Column with Coloured Pills

### The Problem
All Contract Break records currently look identical in the table — there is no way to distinguish whether a record is a **Secondment**, a **Loan**, or **Long-term Leave** at a glance. The user wants a type column with coloured pills for quick identification.

### Where to Store the Break Type

The `hr_separations` table already has an `event_type` column (text, currently null for all CB records). This is the correct field to repurpose as the CB sub-type. No new database column is needed.

**Three CB sub-types, each with a distinct colour:**

| Sub-type | Colour | Rationale |
|---|---|---|
| Secondment | Blue (indigo) | Staff moving to another organisation temporarily |
| Loan | Purple | Staff "loaned out" internally |
| Long-term Leave | Teal/green | Extended absence, no move |

### Changes Required

#### 1. SeparationForm — add sub-type selector (conditional on ContractBreak)

When `separation_type === 'ContractBreak'`, show a new **"Break Type"** dropdown (stored in `event_type`) with three options:
- Secondment
- Loan
- Long-term Leave

This is already a field in the form schema — it just needs options and conditional visibility.

#### 2. LocalAdminDashboard — add "Break Type" column with coloured pill

**New table header (10 columns total = 9 data + 1 toggle):**

| Last Name | First Name | Grade | **Break Type** | Division / Unit | Last Day of Contract | Contract Break | Duty Station | *(chevron)* |

The existing "Type of Contract" column (currently always `—` due to null data) is **replaced** by "Break Type", which uses `sep.event_type` and renders a coloured pill:

- `Secondment` → indigo/blue badge
- `Loan` → purple badge
- `Long-term Leave` → teal badge
- null/unknown → muted `—`

The `HrSeparation` interface and Supabase `.select()` already include all needed fields. The `event_type` field just needs to be added to the select string and interface.

#### 3. Pill colour helper

A small `CBTypeBadge` component (or inline helper) maps sub-type strings to Tailwind colour classes:

```text
Secondment    → bg-indigo-100 text-indigo-700 border-indigo-200
Loan          → bg-purple-100 text-purple-700 border-purple-200
Long-term Leave → bg-teal-100 text-teal-700 border-teal-200
(null)        → plain text "—"
```

### Files to change

| File | Change |
|---|---|
| `src/components/operations/SeparationForm.tsx` | Add conditional "Break Type" dropdown (populates `event_type`) when `separation_type === 'ContractBreak'` |
| `src/pages/operations/LocalAdminDashboard.tsx` | (a) Add `event_type` to `HrSeparation` interface and `.select()`, (b) Replace "Type of Contract" column header with "Break Type", (c) Render coloured pill from `sep.event_type` |

### No database schema changes required
`event_type` already exists in `hr_separations`. The SeparationForm already has it in the Zod schema and form state — it just needs the right dropdown options and conditional display logic.

### What the CB table will look like after the change

Visible row example:

```text
BOISSEAU  Simon  P3  [Secondment ●]  DDC  18 Mar 2026  18 Mar → 20 Apr  Brindisi  ›
```

Expanded panel (unchanged — Job Title, Supervisor, New Contract Start, and the "expiry date not stored" note).

The section title stays as "Contract Breaks / Secondment / Loan / Long-term Leave" — the pills now make it self-evident which sub-type each row is.
