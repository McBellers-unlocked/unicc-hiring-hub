
## Add "Download Template" Button to Affiliate Personnel Page

### Overview
Add a "Download template" button next to the "Import" button on `/admin/affiliate-personnel`. Clicking it downloads a CSV file with headers covering all editable fields from both the Affiliate Personnel table and the Contract History table.

### CSV Template Columns

The template will include one header row with these columns:

**From Affiliate Personnel (users table):**
- Email Address, First name, Last name, Worker type (IC/Intern/UNV), Division, Unit, Job title, Line manager, Duty station, Current Grade, Staff number, Nationality, Gender, First Incumbency Date

**From Contract History (affiliate_contract_history table):**
- Samsaran PR, Samsaran PO, GSM Reg Number, GSM PO, Contract Start Date, Contract End Date

### Changes to `src/pages/AffiliatePersonnel.tsx`

1. **Add a `Download` icon import** from `lucide-react` (alongside existing icons).

2. **Add a `handleDownloadTemplate` function** that:
   - Defines the CSV header row as a comma-separated string of all column names listed above
   - Creates a Blob with `text/csv` content type
   - Triggers a browser download with filename `affiliate_personnel_template.csv`

3. **Add a new Button** between "Import" and the backfill button (around line 594), styled as `variant="outline"` with a Download icon and label "Download template".

### Technical Detail

```text
handleDownloadTemplate():
  headers = "Email Address,First name,Last name,Worker type,Division,Unit,Job title,Line manager,Duty station,Current Grade,Staff number,Nationality,Gender,First Incumbency Date,Samsaran PR,Samsaran PO,GSM Reg Number,GSM PO,Contract Start Date,Contract End Date"
  blob = new Blob([headers + "\n"], { type: 'text/csv' })
  url = URL.createObjectURL(blob)
  // Create temporary anchor, click it, revoke URL
```

No backend changes needed -- this is a purely client-side CSV generation.
