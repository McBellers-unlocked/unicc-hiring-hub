

## Add Financial Fields to Download Template

Add "Unit Price", "Contract Unit", and "Currency" to the CSV headers in the download template button on line 635 of `src/pages/AffiliatePersonnel.tsx`.

**Current headers string (line 635):**
```
"Samsaran PR,Email Address,First name,Last name,Worker type,Division,Unit,Job title,Line manager,Duty station,Current Grade,Staff number,Nationality,Gender,First Incumbency Date,Samsaran PO,GSM Reg Number,GSM PO,Contract Start Date,Contract End Date"
```

**Updated:** Append `,Unit Price,Contract Unit,Currency` to the end.

Single line change, one file.

