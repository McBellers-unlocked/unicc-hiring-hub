

## Plan: Add Multi-Part Assessment Series with Research Exercise Support

### Overview

Implement a new "Assessment Series" feature that allows grouping multiple assessments (inbox simulation + research exercise) into a sequential workflow where:
- Part 2 unlocks only after Part 1 is completed
- Candidates submit file uploads for the research exercise
- Documents/contracts can be attached for candidates to review
- Overall 7-day window with individual time limits per part

---

### Phase 1: Database Schema

**New Tables:**

| Table | Purpose |
|-------|---------|
| `assessment_series` | Groups assessments together with overall timing |
| `assessment_series_parts` | Links assessments to series with ordering |
| `assessment_series_candidates` | Candidate access to the series portal |
| `research_exercise_submissions` | File uploads from candidates |

**New Column on `written_assessments`:**

| Column | Type | Purpose |
|--------|------|---------|
| `assessment_type` | enum | `inbox_simulation`, `research_exercise` |
| `time_limit_hours` | integer | For research exercises (48h instead of minutes) |
| `reference_document_url` | text | URL to attached contract/document |
| `reference_document_name` | text | Display name for the document |

**Schema Details:**

```sql
-- Enum for assessment types
CREATE TYPE assessment_type AS ENUM ('inbox_simulation', 'research_exercise');

-- Assessment Series table
CREATE TABLE assessment_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  series_opens_at TIMESTAMPTZ,
  series_closes_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  status assessment_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Parts linking table
CREATE TABLE assessment_series_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES assessment_series(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES written_assessments(id),
  part_number INTEGER NOT NULL,
  part_title TEXT,
  unlock_after_previous BOOLEAN DEFAULT true,
  UNIQUE(series_id, part_number)
);

-- Candidate access to series
CREATE TABLE assessment_series_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES assessment_series(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Research exercise file submissions
CREATE TABLE research_exercise_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES assessment_slots(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT now()
);
```

**Storage Bucket:**

Create `assessment-documents` bucket for:
- Reference documents (contracts, policy documents) uploaded by admin
- Candidate submissions (file uploads)

---

### Phase 2: Admin UI - Series Management

**New Pages:**

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/assessment-series` | `AdminAssessmentSeries.tsx` | List all series |
| `/admin/assessment-series/new` | `AssessmentSeriesBuilder.tsx` | Create/edit series |
| `/admin/assessment-series/:id/candidates` | `SeriesCandidates.tsx` | Invite candidates to series |

**Series Builder Features:**

1. **Basics Tab:**
   - Series title and description
   - Overall window (e.g., Opens Feb 5 @ 09:00 CET, Closes Feb 12 @ 08:59 CET)
   - Status (draft/active/archived)

2. **Parts Tab:**
   - Add existing assessments as parts
   - Or create new assessment inline
   - Set part order and unlock dependencies
   - For each part, show: title, type, time limit

3. **Preview Tab:**
   - Timeline visualization of the series
   - What candidates will see

**Research Exercise Builder:**

Extend `AssessmentBuilder.tsx` to support `research_exercise` type:
- Time limit in hours (not minutes)
- No email/curveball sections
- Document upload field for reference materials
- Instructions for what to submit

---

### Phase 3: Candidate Portal

**New Pages:**

| Route | Component | Purpose |
|-------|-----------|---------|
| `/series/:token` | `CandidateSeriesPortal.tsx` | Series overview with all parts |
| `/research/:token` | `ResearchAssessment.tsx` | Document review + file upload |

**Series Portal Features:**

```
+------------------------------------------+
|  Associate Policy Officer Assessment     |
|  Window: Feb 5 - Feb 12, 2026           |
+------------------------------------------+

  Part 1: Inbox Simulation        [Start]
  2 hours | Opens when ready
  
  Part 2: Contract Review         [Locked]
  48 hours | Unlocks after Part 1
  Upload your revised contract
+------------------------------------------+
```

**Research Assessment Flow:**

1. Candidate clicks "Start Part 2"
2. 48-hour timer begins
3. Shows:
   - Instructions
   - Download link for reference document (contract)
   - File upload area
   - Timer showing remaining time
4. Candidate works offline, then uploads final document
5. Can re-upload until deadline (replaces previous)
6. Submit button to finalize

---

### Phase 4: Edge Functions

| Function | Purpose |
|----------|---------|
| `send-series-invite` | Email invitation with series portal link |
| `upload-research-submission` | Handle file uploads to storage bucket |
| `validate-series-token` | RPC function to check series candidate access |

---

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| New migration | Create | Series tables, enum, storage bucket |
| `src/pages/AdminAssessmentSeries.tsx` | Create | List series |
| `src/pages/AssessmentSeriesBuilder.tsx` | Create | Create/edit series |
| `src/pages/SeriesCandidates.tsx` | Create | Invite candidates to series |
| `src/pages/CandidateSeriesPortal.tsx` | Create | Candidate series overview |
| `src/pages/ResearchAssessment.tsx` | Create | Document review + upload |
| `src/pages/AssessmentBuilder.tsx` | Modify | Add research exercise type support |
| `supabase/functions/send-series-invite/index.ts` | Create | Series invite email |
| `supabase/functions/upload-research-submission/index.ts` | Create | File upload handler |
| `src/App.tsx` | Modify | Add new routes |

---

### Candidate Journey (Example)

**Thursday Feb 5, 09:00 CET:**
1. Candidate receives email with series link
2. Opens portal, sees both parts (Part 2 locked)
3. Clicks "Start Part 1" - begins 2-hour inbox exercise
4. Completes Part 1

**After Part 1 completion:**
1. Part 2 unlocks automatically
2. Candidate can start when ready (within series window)
3. Clicks "Start Part 2" - downloads reference contract
4. 48-hour timer begins
5. Works on revision offline
6. Uploads final document before timer expires

**Thursday Feb 12, 08:59 CET:**
- Series closes, no more submissions accepted

---

### Implementation Order

1. **Database migration** - Create tables and storage bucket
2. **AssessmentBuilder updates** - Support research exercise type
3. **Series builder** - Create and manage series
4. **Candidate portal** - View series and access parts
5. **Research assessment** - Document download + file upload
6. **Email function** - Series invite emails
7. **Testing and refinement**

