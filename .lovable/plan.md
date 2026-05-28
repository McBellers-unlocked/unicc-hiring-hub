## Talent Pool — Region / Member State / Nationality filters

Add three new filters that apply to **all talent sources** (All / External / Internal). They sit alongside the existing filters in `TalentSearchFilters.tsx` and are applied client-side in `TalentSearchResults.tsx`.

### Matching rule

A candidate matches a value if **either** their nationality **or** their location resolves to it:
- External (`candidates`): `present_nationality` OR `location`
- Internal (`users`): `nationality` OR `duty_station`

For Region, the candidate's country (from either field) is mapped to its UN regional group; the candidate matches if any selected region contains that country.

### New filter state

In `src/pages/TalentPool.tsx` extend `SearchFilters`:
```ts
regions: string[];        // UN regional groups
memberStates: string[];   // UN member-state country names
nationalities: string[];  // same vocabulary as memberStates; separate filter
```
Defaulted to `[]`. Cleared by "Clear filters" and tracked in the `useEffect` selection-reset deps.

### New reference data

New file `src/lib/unRegions.ts`:
- `UN_REGIONAL_GROUPS`: 5 groups — `Africa`, `Asia-Pacific`, `Eastern Europe`, `Latin America & Caribbean (GRULAC)`, `Western Europe & Others (WEOG)`.
- `UN_MEMBER_STATES`: 193 UN member-state country names (canonical English spellings matching `src/lib/countries.ts` where possible).
- `COUNTRY_TO_REGION: Record<string, RegionKey>` mapping each member state → its UN group.
- Helper `getRegionForCountry(name) → RegionKey | null` that is case-insensitive and tolerant of common variants (e.g. "USA" → "United States of America", "UK" → "United Kingdom").

Nationality dropdown uses `UN_MEMBER_STATES` (matches user choice "All UN member states").

### UI in `TalentSearchFilters.tsx`

Add a new section (visible for every `talentSource`) before "Internal-specific filters":

- **Region** — wrap of `Badge` toggles for the 5 UN regional groups (same pattern as Division/Grade).
- **Member State** — searchable multi-select using a `Command` popover (193 entries is too many for badges). Selected values render as removable chips below.
- **Nationality** — same searchable multi-select pattern as Member State.

Also extend `clearFilters` to reset the three new arrays.

### Filter application in `TalentSearchResults.tsx`

In the client-side filter block (around line 218 onwards), after the existing checks, add:

```ts
const personCountries = new Set<string>();
const nat = person._source === "internal" ? person.nationality : person.present_nationality;
if (nat) personCountries.add(normalize(nat));
if (person.location) personCountries.add(normalize(person.location));

if (filters.nationalities.length && !filters.nationalities.some(n => personCountries.has(normalize(n)))) return false;
if (filters.memberStates.length && !filters.memberStates.some(n => personCountries.has(normalize(n)))) return false;
if (filters.regions.length) {
  const personRegions = [...personCountries].map(getRegionForCountry).filter(Boolean);
  if (!filters.regions.some(r => personRegions.includes(r))) return false;
}
```

Normalization: lowercase + trim + strip trailing country qualifiers ("Republic of", commas). For `location`, split on `,` and check each token so "Rome, Italy" matches "Italy".

Extend `NormalizedTalent` to carry `present_nationality` (external) and `nationality` (internal); both populated in the two `forEach` blocks.

### Saved searches

`SavedSearchManager` already round-trips arbitrary `SearchFilters` so the three new arrays serialize for free — no change needed beyond defaults.

### Non-goals

- No backend / schema change. Country list is static.
- No fuzzy matching beyond the small alias table in `unRegions.ts`.
- "Member State" and "Nationality" use the same vocabulary intentionally; they remain separate filters so users can e.g. require "nationality = France" but "based in any African member state".

### Files touched

- `src/pages/TalentPool.tsx` — extend `SearchFilters` + initial state + selection-reset deps.
- `src/components/talent-pool/TalentSearchFilters.tsx` — add 3 UI controls + clear-filters update.
- `src/components/talent-pool/TalentSearchResults.tsx` — extend `NormalizedTalent`, populate new fields, apply new filters.
- `src/lib/unRegions.ts` — new file (regions, member states, country→region map, helpers).