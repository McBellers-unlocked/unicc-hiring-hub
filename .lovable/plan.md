

# Fix MCQ Assessment Candidate Experience

## Problem

When candidates click the assessment link from their email, they are shown the **Inbox Simulation** interface instead of the **Multiple Choice Test** interface. This happens because:

1. The `validate_assessment_token` database function doesn't return `assessment_type`
2. The `CandidateAssessment.tsx` page doesn't check the assessment type
3. There's no MCQ test-taking interface for candidates

---

## Solution Overview

Update the candidate assessment flow to:
1. Include `assessment_type` in the token validation response
2. Render the appropriate interface based on assessment type
3. Create a full MCQ test-taking experience for candidates

---

## Database Changes

### Update `validate_assessment_token` Function

Add `assessment_type` to the return columns:

```sql
CREATE OR REPLACE FUNCTION public.validate_assessment_token(p_token TEXT)
RETURNS TABLE (
  slot_id UUID,
  assessment_id UUID,
  candidate_name TEXT,
  candidate_email TEXT,
  status assessment_slot_status,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  time_limit_minutes INTEGER,
  curveball_trigger_type curveball_trigger_type,
  curveball_trigger_value INTEGER,
  instructions TEXT,
  title TEXT,
  assessment_type assessment_type  -- NEW
)
...
SELECT 
  ...
  a.assessment_type  -- NEW
FROM ...
```

---

## UI Changes

### Update CandidateAssessment.tsx

Check the assessment type and render the appropriate interface:

```tsx
// After fetching assessment data, check type
if (assessmentData?.assessment_type === 'multiple_choice') {
  return <MCQCandidateInterface data={assessmentData} />;
}

// Otherwise show existing inbox simulation
return <InboxSimulationInterface />;
```

### Create MCQ Candidate Interface

New component within CandidateAssessment or as separate internal component:

**Pre-Start Screen:**
- Welcome message with candidate name
- Assessment title and instructions
- Number of questions and time limit
- "Start Assessment" button

**Test-Taking Interface:**

```
+------------------------------------------+
| Timer: 45:00        Question 3 of 20     |
+------------------------------------------+
|                                          |
| What is the primary purpose of...?       |
|                                          |
| ( ) Option A                             |
| ( ) Option B                             |
| (●) Option C                             |
| ( ) Option D                             |
|                                          |
+------------------------------------------+
| [Previous]                      [Next]   |
+------------------------------------------+
| Progress: ●●●○○○○○○○○○○○○○○○○○           |
+------------------------------------------+
```

**Features:**
- Timer countdown (same as inbox simulation)
- Question navigation (sequential or all-at-once based on settings)
- Progress indicator showing answered vs unanswered
- Answer selection (radio for single, checkbox for multi)
- Auto-save responses
- Submit button with confirmation dialog

---

## File Changes

| File | Changes |
|------|---------|
| **Migration** | Update `validate_assessment_token` to return `assessment_type` |
| `src/integrations/supabase/types.ts` | Add `assessment_type` to function return type |
| `src/pages/CandidateAssessment.tsx` | Add type check and MCQ interface |

---

## MCQ Interface Component Structure

```tsx
// Inside CandidateAssessment.tsx or as new component

interface MCQCandidateViewProps {
  assessmentData: AssessmentData;
  onSubmit: () => void;
}

function MCQCandidateView({ assessmentData, onSubmit }: MCQCandidateViewProps) {
  // State for current question, answers, timer
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  
  // Fetch questions with options
  const { data: questions } = useQuery({
    queryKey: ["mcq-questions", assessmentData.assessment_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("assessment_mcq_questions")
        .select("*, assessment_mcq_options(*)")
        .eq("assessment_id", assessmentData.assessment_id)
        .order("order_index");
      return data;
    }
  });
  
  // Render question with options
  // Handle answer selection
  // Save responses to assessment_mcq_responses table
  // Submit when complete or time runs out
}
```

---

## Data Flow

```text
1. Candidate clicks email link
   ↓
2. /assessment/:token loads CandidateAssessment.tsx
   ↓
3. validate_assessment_token RPC called
   ↓
4. Response includes assessment_type: "multiple_choice"
   ↓
5. Component renders MCQ interface instead of inbox
   ↓
6. Questions fetched from assessment_mcq_questions
   ↓
7. Candidate answers, responses saved to assessment_mcq_responses
   ↓
8. On submit, calculate score and mark slot as completed
```

---

## Scoring on Submit

When the candidate submits:

1. Fetch all questions with correct answers
2. Compare against candidate's responses
3. Calculate:
   - Points earned per question
   - Total score
   - Percentage
   - Pass/fail status
4. Update assessment_slot with:
   - `status: 'completed'`
   - `submitted_at: now()`
   - `score: calculated_score`
   - `score_percentage: calculated_percentage`

---

## Implementation Summary

| Step | Description |
|------|-------------|
| 1 | Create migration to update `validate_assessment_token` |
| 2 | Regenerate Supabase types |
| 3 | Add `assessment_type` to AssessmentData interface |
| 4 | Create MCQ candidate interface component |
| 5 | Add conditional rendering in CandidateAssessment.tsx |
| 6 | Implement answer saving and scoring logic |

