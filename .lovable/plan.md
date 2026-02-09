

# Add Timed Multiple Choice Test Assessment Type

## Overview

Add a new assessment type "Timed Multiple Choice Test" to the existing assessment builder. This will allow HR to create timed MCQ tests where candidates answer questions with single or multiple correct answers.

---

## Current State

The assessment system currently supports two types:
- **Inbox Simulation**: Candidates respond to simulated emails
- **Research Exercise**: Candidates download documents, work offline, and upload responses

**Database enum**: `assessment_type: ["inbox_simulation", "research_exercise"]`

---

## New Feature: Multiple Choice Test

A timed multiple-choice assessment where:
- Admin creates questions with 2-6 answer options
- Each question can have one correct answer (single) or multiple correct answers (multi-select)
- Candidates see questions sequentially or all at once
- Timer runs during the test (like inbox simulation)
- Automatic scoring based on correct answers

---

## Database Changes

### 1. Extend the `assessment_type` Enum

```sql
ALTER TYPE assessment_type ADD VALUE 'multiple_choice';
```

### 2. Create `assessment_mcq_questions` Table

Stores the questions for multiple choice assessments.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| assessment_id | uuid | FK to written_assessments |
| order_index | integer | Question order |
| question_text | text | The question |
| question_type | text | 'single' or 'multi' |
| points | integer | Points for correct answer (default 1) |
| explanation | text | Optional explanation shown after test |
| created_at | timestamp | Auto-set |

### 3. Create `assessment_mcq_options` Table

Stores the answer options for each question.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| question_id | uuid | FK to assessment_mcq_questions |
| order_index | integer | Option order (A, B, C, D...) |
| option_text | text | The answer text |
| is_correct | boolean | Whether this is a correct answer |
| created_at | timestamp | Auto-set |

### 4. Create `assessment_mcq_responses` Table

Stores candidate responses.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| slot_id | uuid | FK to assessment_slots |
| question_id | uuid | FK to assessment_mcq_questions |
| selected_options | uuid[] | Array of selected option IDs |
| is_correct | boolean | Whether the answer is correct |
| points_earned | integer | Points earned for this question |
| answered_at | timestamp | When answered |

### 5. Add Columns to `written_assessments`

| Column | Type | Description |
|--------|------|-------------|
| mcq_display_mode | text | 'sequential' or 'all_at_once' |
| mcq_shuffle_questions | boolean | Randomize question order |
| mcq_shuffle_options | boolean | Randomize option order |
| mcq_show_results | boolean | Show results after completion |
| mcq_passing_score | integer | Minimum percentage to pass |

---

## UI Changes

### Assessment Builder (AssessmentBuilder.tsx)

**Tab Structure for Multiple Choice:**
1. **Basics** - Title, description, time limit, settings
2. **Questions** - Add/edit/reorder MCQ questions
3. **Preview** - Review all questions and settings

**Basics Tab Additions:**
- Display mode selector (sequential vs all at once)
- Shuffle questions toggle
- Shuffle options toggle
- Show results after completion toggle
- Passing score percentage input

**New Questions Tab:**
- Question list with drag-to-reorder
- Add Question button
- For each question:
  - Question text (textarea)
  - Question type (single/multi select)
  - Points value
  - Options list (2-6 options)
  - Mark correct answer(s)
  - Optional explanation

### New Component: MCQQuestionEditor

```tsx
interface MCQQuestion {
  id?: string;
  order_index: number;
  question_text: string;
  question_type: 'single' | 'multi';
  points: number;
  explanation?: string;
  options: MCQOption[];
}

interface MCQOption {
  id?: string;
  order_index: number;
  option_text: string;
  is_correct: boolean;
}
```

### Candidate Interface Updates

**New Page: CandidateMCQAssessment.tsx** (or extend existing)

Sequential mode:
- One question per screen
- Previous/Next navigation
- Question number indicator (e.g., "Question 3 of 20")
- Timer always visible

All-at-once mode:
- Scrollable list of all questions
- Question navigation sidebar
- Answered/unanswered indicators

---

## File Changes

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/assessment/MCQQuestionEditor.tsx` | Question editing component |
| `src/components/assessment/MCQQuestionCard.tsx` | Individual question display |
| `src/pages/CandidateMCQAssessment.tsx` | Candidate test-taking interface |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/AssessmentBuilder.tsx` | Add MCQ type, questions tab, settings |
| `src/pages/AdminAssessments.tsx` | Show question count for MCQ type |
| `src/pages/AssessmentReview.tsx` | Add MCQ results review |

### Database Migrations Required

1. Add `multiple_choice` to `assessment_type` enum
2. Create `assessment_mcq_questions` table
3. Create `assessment_mcq_options` table
4. Create `assessment_mcq_responses` table
5. Add MCQ settings columns to `written_assessments`

---

## Assessment Builder Type Toggle

```tsx
type AssessmentType = "inbox_simulation" | "research_exercise" | "multiple_choice";

// In the select component:
<SelectItem value="multiple_choice">
  <div className="flex items-center gap-2">
    <ListChecks className="w-4 h-4" />
    <span>Multiple Choice Test</span>
  </div>
</SelectItem>
```

---

## MCQ Question Editor Design

```
+------------------------------------------+
| Question 1                         [x]   |
+------------------------------------------+
| Question Text:                           |
| [                                     ]  |
| [                                     ]  |
+------------------------------------------+
| Type: (Single) (Multi)    Points: [1]    |
+------------------------------------------+
| Options:                                 |
| [A] [ Option text here           ] [O]   |
| [B] [ Option text here           ] [O]   |
| [C] [ Option text here           ] [●]   |
| [D] [ Option text here           ] [O]   |
|                        [+ Add Option]    |
+------------------------------------------+
| Explanation (shown after test):          |
| [                                     ]  |
+------------------------------------------+
```

Legend:
- [O] = Radio/checkbox for marking correct answer
- [●] = Marked as correct
- [x] = Delete question

---

## Scoring Logic

**Single-select questions:**
- Full points if correct answer selected
- 0 points if wrong

**Multi-select questions:**
- Full points only if ALL correct options selected AND no incorrect options
- Partial scoring option: (correct selections - incorrect selections) / total correct options

**Auto-calculated after submission:**
- Total score, percentage, pass/fail status stored in assessment_slots

---

## Preview Tab Updates for MCQ

Show:
- Total number of questions
- Total possible points
- Time limit
- Display mode
- Shuffle settings
- Passing score threshold
- List of questions with correct answers (for admin review)

---

## Summary

| Component | Description |
|-----------|-------------|
| Database | 3 new tables + enum extension + new columns |
| Builder | New Questions tab with drag-reorder editor |
| Candidate | New MCQ test interface with timer |
| Review | Score breakdown and answer review |
| Settings | Shuffle, display mode, passing score options |

This implementation follows the existing pattern of the assessment builder with type-specific tabs and reuses the slot/invitation system already in place.

