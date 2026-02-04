## Assessment Series Feature - Implementation Complete

### What Was Built

Multi-part assessment series allowing candidates to complete sequential exercises (e.g., inbox simulation + research exercise) within an overall time window.

### Database Schema (Implemented)

| Table | Purpose |
|-------|---------|
| `assessment_series` | Groups assessments with overall window timing |
| `assessment_series_parts` | Links assessments to series with ordering and unlock rules |
| `assessment_series_candidates` | Candidate access tokens for series portal |
| `research_exercise_submissions` | File uploads from candidates |
| `assessment-documents` bucket | Storage for reference docs and submissions |

**Extended `written_assessments`:**
- `assessment_type` (inbox_simulation, research_exercise)
- `time_limit_hours` for research exercises
- `reference_document_url` and `reference_document_name`

### Pages Created

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/assessment-series` | AdminAssessmentSeries | List all series |
| `/admin/assessment-series/new` | AssessmentSeriesBuilder | Create series |
| `/admin/assessment-series/:id/edit` | AssessmentSeriesBuilder | Edit series |
| `/admin/assessment-series/:id/candidates` | SeriesCandidates | Invite candidates |
| `/series/:token` | CandidateSeriesPortal | Candidate view of all parts |
| `/research/:token/:assessmentId` | ResearchAssessment | Document review + file upload |

### Key Features

1. **Admin Side:**
   - Create/edit assessment series with overall time window
   - Add existing assessments as parts
   - Configure unlock dependencies (Part 2 unlocks after Part 1)
   - Manage candidates with unique access tokens

2. **Candidate Side:**
   - Series portal showing all parts and their status
   - Part unlocking after previous completion
   - Research exercise with:
     - Reference document download
     - File upload (re-uploadable until deadline)
     - Timer showing remaining time
     - Final submission confirmation

### Database Functions Created

- `validate_series_token(p_token)` - Validates candidate access
- `get_series_parts_with_status(p_series_id, p_candidate_email)` - Returns parts with completion status

### Next Steps

1. Create edge function for sending series invite emails
2. Add scoring/review UI for research exercise submissions
3. Add bulk candidate import for series
