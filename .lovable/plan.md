# AI Interview Questions + Library

Add two capabilities to the Interview Questions section of a job (`JobInterviewQuestionsBuilder.tsx`):

1. **Generate with AI** — suggest interview questions based on the job's selected requirements (essential/desirable criteria bullets) and competencies.
2. **Interview Questions Library** — every saved question is stored in a reusable library, browsable/searchable so users can pull existing questions into a new job.

## 1. UI changes (`JobInterviewQuestionsBuilder.tsx`)

In the "Interview Questions" card header, add two new buttons next to **Add Question**:
- **Generate with AI** (Wand2 icon) — disabled with tooltip if no requirements and no competencies are defined on the job.
- **Browse Library** (BookOpen icon) — opens a dialog listing previously saved questions.

### Generate with AI flow
- Opens a small dialog: choose how many questions (3/5/8, default 5), optional scope toggles (which competencies/requirement categories to focus on — default all).
- Calls a new edge function `generate-interview-questions` with the job's requirements + competencies + position title/level.
- Returns a list of `{ question_text, requirement_ids[], competency_ids[], estimated_minutes }`.
- Shows results in a preview list with checkboxes; user picks which to append. Selected ones are added to the `questions` state (not auto-saved — user still clicks Save Questions).
- Same overwrite vs append choice is unnecessary — always append.

### Browse Library flow
- Dialog with search input + filters (competency, requirement category, job title/level).
- Lists library questions with text, tags (competencies/requirements), times used.
- Multi-select → "Add selected" appends them to current questions (resets `id`, sets new `order_index`, preserves competency/requirement mappings only when the same competency/requirement exists on the current job; otherwise drops them).

## 2. Library persistence

When `saveQuestions()` runs, also upsert each saved question into a new global table `interview_questions_library`:
- Dedup by case-insensitive `question_text` hash; if it exists, increment `usage_count` and update `last_used_at` + append `job_id` to `used_in_jobs[]`.
- Store competency_names[] and requirement_titles[] (denormalized strings) so library entries remain meaningful across jobs.
- Store `created_by`, `created_at`, `last_used_at`, `usage_count`.

### New table (migration)
```sql
create table public.interview_questions_library (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  question_text_normalized text not null unique, -- lower(trim(question_text))
  competency_names text[] not null default '{}',
  requirement_titles text[] not null default '{}',
  tags text[] not null default '{}',
  estimated_minutes numeric default 4.0,
  usage_count int not null default 1,
  used_in_jobs uuid[] not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  last_used_at timestamptz default now()
);

grant select, insert, update on public.interview_questions_library to authenticated;
grant all on public.interview_questions_library to service_role;
alter table public.interview_questions_library enable row level security;

-- Read: any authenticated user can browse the library
create policy "Authenticated can read library"
on public.interview_questions_library for select to authenticated using (true);

-- Insert/update: authenticated users (writes happen via saveQuestions)
create policy "Authenticated can insert library"
on public.interview_questions_library for insert to authenticated with check (true);
create policy "Authenticated can update library"
on public.interview_questions_library for update to authenticated using (true);
```

## 3. Edge function `generate-interview-questions`

- Auth: verify JWT (mirror `generate-position-description`).
- Input: `{ jobId, count, focusCompetencyIds?, focusRequirementCategories? }`.
- Server fetches the job's requirements + competencies + position title + level via service role.
- Calls Lovable AI Gateway `google/gemini-2.5-flash` with a JSON-structured prompt asking for behavioural/STAR-format questions, each tagged with the requirement bullet IDs and competency IDs it assesses.
- Parses JSON, validates IDs exist on the job, returns `{ questions: [...] }`.
- Handles 429/402 with explicit messages.

## 4. Files

**New**
- `supabase/functions/generate-interview-questions/index.ts`
- `supabase/migrations/<timestamp>_interview_questions_library.sql`
- `src/components/interview/AIGenerateInterviewQuestions.tsx` — dialog + button (generate flow + preview/select).
- `src/components/interview/InterviewQuestionLibraryDialog.tsx` — browse/search/select.

**Edited**
- `src/components/JobInterviewQuestionsBuilder.tsx` — add the two header buttons, wire the dialogs, and inside `saveQuestions()` call a helper that upserts each question into `interview_questions_library`.

## Non-goals
- No editing/deleting library entries from the UI in this pass.
- No ML ranking — library list is just searchable + sortable by usage_count/recent.
- No automatic assignment to panel members on AI-generated questions.
