
## Reorder Sections on /operations/admin

### Change
Reorder both the **stats summary cards** and the **section tables** in `src/pages/operations/LocalAdminDashboard.tsx` to match the requested sequence:

1. Arrivals
2. Departures
3. Transfers
4. Contract Breaks

### Current order (lines ~273–306 for stats, ~310–447 for sections)
- Contract Breaks → Transfers → Departures → Arrivals

### Target order
- Arrivals → Departures → Transfers → Contract Breaks

### Technical detail
Two blocks need reordering in the same file — no logic changes, no data changes:

1. **Stats grid** (lines 273–306): Swap the four `<Card>` elements so Arrivals comes first, then Departures, then Transfers, then Contract Breaks.

2. **Section tables** (lines 310–447): Reorder the four `{!isLoading && (<SectionCard …>)}` blocks in the same sequence — Arrivals, Departures, Transfers, Contract Breaks.

No other files need to be touched.
