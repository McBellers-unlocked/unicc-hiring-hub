

## Reorder CSV Template -- Samsaran PR First

### Change
In `src/pages/AffiliatePersonnel.tsx`, update the CSV headers string so "Samsaran PR" is the first column, serving as the primary key for joining personnel and contract history data.

### Updated Column Order

1. **Samsaran PR** (moved to first position)
2. Email Address
3. First name
4. Last name
5. Worker type
6. Division
7. Unit
8. Job title
9. Line manager
10. Duty station
11. Current Grade
12. Staff number
13. Nationality
14. Gender
15. First Incumbency Date
16. Samsaran PO
17. GSM Reg Number
18. GSM PO
19. Contract Start Date
20. Contract End Date

### Technical Detail

**File:** `src/pages/AffiliatePersonnel.tsx` (around line 597)

Replace the existing headers string with:

```text
"Samsaran PR,Email Address,First name,Last name,Worker type,Division,Unit,Job title,Line manager,Duty station,Current Grade,Staff number,Nationality,Gender,First Incumbency Date,Samsaran PO,GSM Reg Number,GSM PO,Contract Start Date,Contract End Date"
```

Single-line change, no other modifications needed.

