

# Add On-Call Requirements Info Tooltip

## What Changes

Add a clickable help icon (?) next to the "On-call Requirements" label in the Procurement TOR form. Clicking it opens a popover/tooltip displaying the full on-call billing and overtime rules.

## UI Design

The label line will change from:

```
On-call Requirements
```

to:

```
On-call Requirements  [?]
```

Clicking the `?` icon opens a popover with the formatted rules:

---

**Important Regarding On-Call Requirements and Overtime**

**If "One week per month":**
- The daily rate offer must include 1 week of on-call and 3 hours of Overtime per month (those 3 hours can be used during On-Call intervention or for any other reason)
- Any extra week of on-call requirement in excess of one week per month can be invoiced as one extra working day (as per agreed daily rate)

**If "May be required on an exceptional basis":**
- Each on-call week can be invoiced as one extra working day (as per agreed daily rate)

**Overtime rates:**
- Mondays to Saturdays: 125% of agreed daily rate
- Sundays and ICC Public Holidays: 150% of agreed daily rate

Overtime should be pre-approved by the Team Leader.

---

## Technical Details

### File: `src/pages/ProcurementTORForm.tsx`

- Import `Popover`, `PopoverTrigger`, `PopoverContent` from `@/components/ui/popover`
- Import `HelpCircle` icon from `lucide-react`
- Replace the plain `<Label>On-call Requirements</Label>` (around line 464) with a flex row containing the label and a `?` icon button wrapped in a Popover
- The popover content will contain the formatted on-call/overtime guidance text
- No database or data model changes

