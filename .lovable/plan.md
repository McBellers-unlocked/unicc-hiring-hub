

# Contract Break Return Date: Business Day Calculation (Updated)

## Overview

When creating a Separation (CB), the auto-created Appointment (CB) return date will be calculated as:

1. Separation date + 31 calendar days
2. Then skip forward past any non-working days (weekends and duty station holidays) until landing on a valid working day

### How Skipping Works

The system checks the candidate date repeatedly. If it is not a working day, it advances by one day and checks again. This naturally handles all chained scenarios:

- **Saturday**: advances through Sunday, lands on Monday (or later if Monday is a holiday)
- **Friday holiday**: advances to Saturday, then Sunday, then Monday (or later if Monday is also a holiday)
- **Example**: 31 days lands on Friday 3 April 2026 (Good Friday) in Geneva -- advances to Saturday 4th, Sunday 5th, Monday 6th (Easter Monday, also a holiday), finally lands on **Tuesday 7 April**

## Technical Changes

### 1. New file: `src/lib/officialHolidays.ts`

Exports a duty-station-to-holidays map (2026 dates) and a utility function:

```
calculateCBReturnDate(separationDate: string, dutyStation: string): string
```

Duty station matching is case-insensitive with partial matching (e.g. "Valencia, Spain" matches "Valencia").

**Holiday data (excluding floating days):**
- **Geneva**: Jan 1, Apr 3, Apr 6, Sep 10, Sep 11, Dec 25, Dec 28, Dec 31
- **New York**: Jan 1, Mar 20, Apr 3, May 25, May 27, Jul 3, Sep 7, Nov 26, Dec 25
- **Rome**: Jan 1, Feb 16, Mar 20, Apr 6, May 1, Nov 2, Dec 25, Dec 28
- **Brindisi**: Jan 1, Mar 20, Apr 6, May 1, May 27, Aug 14, Dec 8, Dec 25, Dec 28
- **Valencia**: Jan 1, Mar 20, Apr 3, Apr 6, May 1, May 27, Oct 9, Oct 12, Dec 25
- **Madrid**: Jan 1, Mar 20, Apr 3, Apr 6, May 1, May 27, Oct 9, Oct 12, Dec 25

### 2. Modified file: `src/pages/operations/Separations.tsx`

In the `createSeparation` mutation, replace the `addMonths` return date calculation with a call to `calculateCBReturnDate(separationDate, dutyStation)`.

### 3. No other files affected

The appointment form, filters, and status badges remain unchanged.

