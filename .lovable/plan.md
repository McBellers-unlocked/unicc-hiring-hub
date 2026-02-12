

# Fix ENSTONE Duty Station Data

## Problem
Jacqueline ENSTONE's `duty_station` in the `hr_transfers` table is stored as `#N/A` (a leftover from a spreadsheet import). It should be **Valencia**.

## Fix
Run a single SQL update on the `hr_transfers` table:

```text
UPDATE hr_transfers
SET duty_station = 'Valencia'
WHERE id = 'b4e81014-2f11-47bd-bd26-be5591cb5428';
```

No code changes are needed -- this is purely a data correction.

