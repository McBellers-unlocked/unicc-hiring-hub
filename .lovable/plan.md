

## Add row manually to Userbase

Add an "Add row" button next to "Remove rows" / "Download CSV" that opens a multi-step wizard to insert a new record into `users_clean`. Email, worker type, unit and division are required.

### UI — `src/pages/Userbase.tsx`

New button (admin/HR only, hidden while in remove mode):

```
[ + Add row ]   [ Download CSV ]   [ Remove rows ]
```

Clicking opens `<AddUserbaseRowDialog>` (new component).

### Wizard — `src/components/userbase/AddUserbaseRowDialog.tsx` (new)

A `Dialog` with a 4-step wizard, scrollable body (per dialog-scrolling memory: wrap content in `<div className="overflow-y-auto max-h-[60vh]">`). Step indicator at top, Back / Next / Save buttons at bottom.

**Step 1 — Identity & Contact** (required fields marked *)
- Source (radio: GSM / Samsaran / Manual — default `Manual`) → maps to `source` column
- GSM Email Address *
- Samsaran Email address *  
  (At least ONE of the two emails must be provided. If only one is filled, the other is left null. Validation: at least one valid email.)
- Full Name, First Name, Last Name
- GSM Staff Number, Samsaran Staff Number
- Search Name

> **Mandatory rule:** at least one email address is required. (User said "Email address" — we treat either GSM or Samsaran email as satisfying this.)

**Step 2 — Employment** (required fields marked *)
- Worker Type * (Select: Staff, IC, UNV, Intern, Affiliate, Other — free text fallback)
- Unit * (text input)
- Division * (Select using `DIVISIONS` from `organizationConstants.ts`: CS, DD, DS, DO, MS, OP)
- Job Name, Job Title, Position Name
- Category, Appointment Type
- Current Grade (Select from `GRADES`), Current Step
- Line Manager, Reporting Lines
- Intern (checkbox / yes-no)

**Step 3 — Location & Personal**
- Official Duty Station (Select from `LOCATIONS`)
- Office Location (text)
- GSM Gender (Select: Male / Female / Other)
- Nationality (text)
- Date of Birth (date)

**Step 4 — Dates & Service**
- APA Start Date
- First Incumbency Start Date
- Entry on Duty Date (WHO)
- Contract Start Date
- Contract End Date
- Service Time Current Org (text/number)

### Validation

Zod schema enforces:
- `worker_type`: non-empty
- `unit`: non-empty
- `division`: must be one of CS/DD/DS/DO/MS/OP
- At least one of `gsm_email_address` / `samsaran_email_address` is a valid email
- Both email fields, if filled, must be valid email format
- Date fields: valid ISO date or null

"Next" button on each step is disabled until that step's required fields pass validation; Step 1 also blocks if no email is provided.

### Save behavior

On final "Save":
1. Build payload — only include keys with non-empty values; nulls for blanks.
2. Default `source = 'manual'` if user didn't pick one.
3. `supabase.from('users_clean').insert(payload).select().single()`.
4. On success: toast "Row added", close dialog, invalidate `['users_clean']`, `['users_clean:meta']`, `['users_clean:missing']`.
5. On failure: toast error message; keep wizard open with values preserved.

### Permissions

Button visible only when `canEdit === true` (Admin / HR Assistant), matching the existing edit + delete gating.

### Out of scope
- Bulk add / CSV upload from this dialog (already handled by Import Userbase).
- Editing existing rows from this dialog (handled by inline `EditableCell`).
- Auto-derived fields like `full_name = first + last` (user enters both independently).
- Adding new enum values to `worker_type` or `division` lists.

### Files touched
- `src/pages/Userbase.tsx` — new "Add row" button + dialog mount + state.
- `src/components/userbase/AddUserbaseRowDialog.tsx` — new wizard component.

