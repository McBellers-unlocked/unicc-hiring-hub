

# Talent Pool AI Matching — Implementation Plan

## Current State

- The talent pool searches the existing `candidates` table (external) and `users` table (internal staff), with client-side filtering and a simplistic deterministic `JobMatchingService` that uses hardcoded skill lists and string matching.
- No embeddings infrastructure exists (no pgvector extension).
- `LOVABLE_API_KEY` is available for Lovable AI Gateway calls.
- The `candidates` table has rich fields: `skills` (JSON), `education` (JSON), `work_experience` (JSON), `years_of_experience`, `current_position`, `professional_summary`, `location`, etc.

## Architecture

```text
Recruiter selects job → "Find Matches" button
         │
    ┌────▼────┐
    │ Step A  │  Edge fn: normalize job → canonical text → embedding
    │ Job     │  (cached in job_match_profiles, upsert by job_id)
    └────┬────┘
         │
    ┌────▼────┐
    │ Step B  │  Edge fn: ensure candidate embeddings exist
    │ Embed   │  (batch upsert into talent_candidate_embeddings)
    └────┬────┘
         │
    ┌────▼────┐
    │ Step C  │  SQL: cosine similarity search → top 200
    │ Retrieve│  (pgvector index)
    └────┬────┘
         │
    ┌────▼────┐
    │ Step D  │  Edge fn: deterministic scoring (skills overlap,
    │ Rank    │  years, education, role similarity) — no LLM
    │         │  Missing data = neutral, not penalized
    └────┬────┘
         │
    ┌────▼────┐
    │ Step E  │  Edge fn: LLM explanations for top 20 only
    │ Explain │  (structured reasons + gaps via tool calling)
    └────┬────┘
         │
    ┌────▼────┐
    │ Step F  │  UI: ranked cards with tier/confidence/reasons
    │ Display │  + disclaimer banner
    └─────────┘
```

## Database Changes (1 migration)

### 1. Enable pgvector
```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
```

### 2. New tables

**talent_candidate_embeddings** — cached embeddings per candidate
- `candidate_id` uuid PK → FK `candidates(id)` ON DELETE CASCADE
- `profile_text` text NOT NULL (canonical normalized text)
- `embedding` vector(768) NOT NULL
- `completeness_score` float NOT NULL (0..1)
- `created_at` / `updated_at` timestamptz

**job_match_profiles** — cached embeddings per job
- `job_id` uuid PK → FK `jobs(id)` ON DELETE CASCADE
- `match_profile_text` text NOT NULL
- `match_profile_json` jsonb (structured: must_have_skills, seniority, etc.)
- `embedding` vector(768) NOT NULL
- `created_at` / `updated_at` timestamptz

**talent_match_runs** — each recruiter search session
- `id` uuid PK
- `job_id` uuid FK → `jobs(id)`
- `requested_by` uuid FK → `users(id)`
- `filters` jsonb
- `status` text DEFAULT 'pending' (pending → processing → completed → failed)
- `total_candidates` int
- `created_at` timestamptz

**talent_match_results** — cached ranked results
- PK `(run_id, candidate_id)`
- `run_id` uuid FK → `talent_match_runs(id)` ON DELETE CASCADE
- `candidate_id` uuid FK → `candidates(id)` ON DELETE CASCADE
- `vector_similarity` float (raw cosine)
- `match_score` float NOT NULL (0..100)
- `confidence` text NOT NULL CHECK IN ('low','medium','high')
- `tier` text NOT NULL CHECK IN ('strong','good','possible','low')
- `reasons` jsonb NOT NULL
- `gaps` jsonb
- `rank` int
- `created_at` timestamptz

### 3. Indexes
- IVFFlat vector index on `talent_candidate_embeddings.embedding`
- Index on `talent_match_results(run_id)`
- RLS: read access for authenticated HR/Admin roles on all new tables; write via service role only (edge functions)

### 4. SQL function for vector search
```sql
CREATE FUNCTION match_candidates_by_embedding(
  query_embedding vector(768),
  match_count int DEFAULT 200,
  similarity_threshold float DEFAULT 0.3
) RETURNS TABLE(candidate_id uuid, similarity float, completeness_score float)
```

## Edge Function: `talent-pool-match`

Single edge function with action-based routing. Uses `LOVABLE_API_KEY` + Lovable AI Gateway (`google/gemini-3-flash-preview` for speed).

### Actions

**`build_job_profile`** (Step A)
- Takes `job_id`, fetches job title + description + requirements
- Calls LLM with Job Match Profile Normalizer prompt → structured JSON
- Generates embedding via a second LLM call (using the `match_profile_text` output)
- Upserts into `job_match_profiles`

**`ensure_embeddings`** (Step B)
- Finds candidates missing embeddings or with stale embeddings (`updated_at > embedding.updated_at`)
- Batches of 50: calls LLM with Candidate Profile Normalizer prompt → canonical text + completeness_score
- Generates embeddings, upserts into `talent_candidate_embeddings`

**`run_match`** (Step C+D+E combined)
- Creates a `talent_match_runs` record
- Calls `match_candidates_by_embedding()` SQL function → top 200
- Applies deterministic scoring with weighted signals:
  - Skill overlap (50%): intersection of normalized skills vs job must_have_skills
  - Role similarity (20%): candidate role titles vs job family/seniority
  - Years match (15%): candidate years vs job seniority band expectations
  - Education match (10%): candidate education level vs job requirements
  - Location (5%): optional proximity
  - **Missing data = midpoint contribution, never subtracted**
- Computes confidence from `completeness_score`
- Assigns tier (strong ≥85, good ≥70, possible ≥55, low <55)
- For top 20: calls LLM Explanation Generator prompt → structured reasons/gaps
- Bulk inserts results into `talent_match_results`
- Returns run_id

### Embedding Strategy
Since the Lovable AI Gateway provides chat completions (not embeddings endpoint), we will:
- Use LLM tool calling to extract structured normalized text, then compute a deterministic text hash + TF-IDF-style vector as the embedding
- OR check if the gateway supports an embeddings endpoint

**Fallback if no embeddings endpoint**: Use trigram similarity (`pg_trgm` already installed) + full-text search (`to_tsvector`) for retrieval instead of pgvector. This avoids needing an external embeddings API while still providing semantic-ish search. The deterministic scoring layer remains identical.

**Recommended approach**: Use `pg_trgm` similarity for retrieval (already available, no new extension needed) and reserve pgvector for a future upgrade when an embeddings endpoint is confirmed. This keeps the implementation deployable immediately.

## Frontend Changes

### New component: `src/components/talent-pool/TalentPoolMatchResults.tsx`
- Receives `runId` and fetches results from `talent_match_results`
- Renders ranked candidate cards with:
  - Tier badge (color-coded: green/blue/yellow/gray)
  - Match score + confidence label (High/Medium/Low)
  - Expandable reasons bullets
  - Gaps/unknowns section (neutral language)
  - Link to candidate profile
- Disclaimer banner: "AI-generated match suggestions. Final decisions require recruiter review."
- Filters: min tier, skills, years range

### Updates to `TalentSearchFilters.tsx`
- Add "AI Match" button next to the existing job selector
- When clicked: calls the edge function, shows loading state, then renders `TalentPoolMatchResults`

### Updates to `TalentPool.tsx`
- Add state for `matchRunId` and `isMatching`
- Wire the AI match flow into the existing tab structure

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/...` | New tables, indexes, SQL function |
| `supabase/functions/talent-pool-match/index.ts` | New edge function (all pipeline steps) |
| `supabase/config.toml` | Add `[functions.talent-pool-match]` entry |
| `src/components/talent-pool/TalentPoolMatchResults.tsx` | New — ranked results UI |
| `src/components/talent-pool/TalentSearchFilters.tsx` | Add AI Match button |
| `src/pages/TalentPool.tsx` | Wire match state + results display |
| `src/lib/jobMatching.ts` | Keep as-is (legacy fallback) |

## Safety Guardrails
- All LLM prompts treat candidate text as untrusted input
- No protected characteristics used (gender, nationality, age filtered out)
- No employer/university prestige signals
- Missing data explicitly labeled as "Unknown" not "Negative"
- Confidence label prevents over-reliance on incomplete profiles
- Disclaimer shown at all times

