

## Enhanced Candidate Profile View (LinkedIn-style)

### Current State
Clicking "View" on a candidate opens `CandidateDetailModal` — a basic dialog with 4 tabs (Overview, Experience, Notes, Actions). The Actions tab has placeholder buttons ("Add to Job", "Send Email", "Export Profile") that do nothing.

### What We'll Build

Replace the current modal with a full-page-style profile drawer/sheet that feels like a LinkedIn profile, with a rich header section and functional talent management actions.

**Layout: Full-width slide-over panel (Sheet) instead of a centered dialog**

```text
┌──────────────────────────────────────────────────┐
│  ← Back to Results                          [X]  │
├──────────────────────────────────────────────────┤
│  ┌──────┐  Sarah Chen                            │
│  │Avatar│  Senior Cloud Architect at DBS Bank     │
│  └──────┘  📍 Singapore · 12 yrs exp · Woman      │
│            🏷 External  🔒 Security Clearance      │
│            ✈ Open to Relocation                    │
├──────────────────────────────────────────────────┤
│  [About] [Experience] [Skills] [Notes] [Actions] │
├──────────────────────────────────────────────────┤
│                                                  │
│  (Tab content area - scrollable)                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Profile Sections (Tabs)

1. **About** — Professional summary, contact info, languages, certifications, education summary
2. **Experience** — Work history timeline + full education details (already exists, will polish)
3. **Skills & Qualifications** — Skills grid with category grouping, certifications listed separately
4. **Notes & Flags** — Existing CandidateNotes + CandidateFlags (already built)
5. **Talent Actions** — Functional talent management panel:
   - **Add to Pipeline** — Select a job requisition and add candidate as an applicant
   - **Send Email** — Opens compose dialog (reuses BulkEmailDialog pattern for single recipient)
   - **Export Profile** — Download candidate profile as formatted text/PDF placeholder
   - **Flag for Recruitment** — Quick flag with priority and notes
   - **Schedule Interview** — Link to create interview for this candidate
   - **Compare Candidates** — Placeholder for future side-by-side comparison

### Implementation Plan

**Files to create:**
- `src/components/talent-pool/CandidateProfileSheet.tsx` — New Sheet-based full profile component replacing the dialog

**Files to modify:**
- `src/components/talent-pool/CandidateSearchCard.tsx` — Swap `CandidateDetailModal` for `CandidateProfileSheet` (for external candidates)
- `src/components/talent-pool/CandidateDetailModal.tsx` — Keep as-is for backwards compatibility, but the search card will use the new sheet

### Technical Approach
- Use Shadcn `Sheet` (side panel) with `side="right"` and full height for the LinkedIn-like feel
- Reuse existing `CandidateNotes` and `CandidateFlags` components
- "Add to Pipeline" will query `jobs` table for open positions and insert into `applications`
- Profile data already available from the candidate record passed in (skills, work_experience, education, certifications, languages are all JSONB)

