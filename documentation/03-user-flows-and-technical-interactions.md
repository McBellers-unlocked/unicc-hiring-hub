# Main User Flows & Technical Interactions

## Flow 1: Job Requisition Creation & Approval

**User Journey**: Hiring Manager → Finance → Chief → Deputy Director → Director → HR → Job Posted

### Step 1: Initial Request (Hiring Manager)
- **Page**: `src/pages/InitialRequestForm.tsx`
- **Route**: `/requisitions/initial/new`
- **Action**: Fill position details, competencies, requirements
- **Technical Flow**:
  ```
  React Hook Form (validation) →
  Zod schema validation →
  React Query mutation →
  Supabase INSERT into job_requisitions →
  PostgreSQL RLS check (is_hiring_manager) →
  Trigger: update_updated_at_column →
  Edge function: send-requisition-notification →
  Response → Cache invalidation → UI update
  ```
- **Backend**: INSERT into `job_requisitions` with status='draft'
- **Notification**: Email to Finance Controller via SendGrid

### Step 2: Multi-Level Approvals

Each approver reviews and approves/rejects:

#### Finance Controller
- **Page**: `src/pages/DirectorView.tsx` (role-based view)
- **Action**: Click "Approve" or "Request Changes"
- **Technical Flow**:
  ```
  Button click → Confirmation dialog →
  React Query mutation →
  UPDATE job_requisitions SET
    finance_controller_approval = TRUE,
    finance_controller_approved_by = {user_id},
    finance_controller_approved_at = NOW(),
    status = 'pending_division'
  → RLS check (has_role('Finance Controller')) →
  Trigger: audit_log_insert →
  Edge function: send-notification →
  Response → Invalidate queries(['requisitions']) →
  UI re-render
  ```
- **Notification**: Email to Chief of Division

#### Chief of Division
- **Page**: `src/pages/ChiefOfDivisionView.tsx`
- **Route**: `/chief-of-division`
- **Action**: Review + Approve
- **Backend**: Similar UPDATE pattern with `chief_of_division_approval = TRUE`, `status = 'pending_deputy_director'`

#### Deputy Director → Director
Similar pattern with respective approval fields.

### Step 3: HR Final Preparation
- **Page**: `src/pages/ChiefHRReview.tsx`
- **Route**: `/admin/chief-hr-review`
- **Component**: `src/components/FinalDocumentReviewDialog.tsx` (track-changes view)
- **Action**: Review fully approved requisition, finalize position description
- **Technical Flow**:
  ```
  Fetch requisition data →
  Display track-changes UI (DiffViewer) →
  User makes final edits →
  Click "Generate PDF" →
  Edge function: generate-requisition-pdf
    - Fetch requisition data
    - Render HTML template
    - Convert to PDF (Puppeteer/similar)
    - Upload to Supabase Storage
    - Return PDF URL
  → UPDATE job_requisitions SET pdf_url = '...' →
  Display PDF preview →
  User confirms
  ```
- **Edge Function**: `generate-requisition-pdf` creates PDF
- **UI Component**: Inline PDF viewer with approval button

### Step 4: Convert to Job
- **Page**: `src/pages/AdminRequisitions.tsx`
- **Route**: `/admin/requisitions`
- **Action**: Click "Convert to Job"
- **Technical Flow**:
  ```
  Edge function: convert-requisition-to-job
    1. Fetch full requisition data
    2. Transform to job schema
    3. INSERT into jobs (title, description, etc.)
    4. INSERT into job_requirements (from essential/desirable)
    5. INSERT into job_competencies (from competencies)
    6. INSERT into job_language_requirements (from languages)
    7. UPDATE job_requisitions SET converted_to_job_id = {job_id}
    8. Return job_id
  → React Query refetch(['jobs']) →
  Navigate to /admin/jobs/{job_id}
  ```
- **Result**: Job is now visible at `/jobs` and `/admin/jobs`

**Complete Technical Stack**:
```
Frontend:
  React Component (InitialRequestForm)
  → React Hook Form (form state)
  → Zod (validation schema)
  → React Query (mutations & queries)

Backend:
  Supabase Client (JS)
  → PostgreSQL (database operations)
  → RLS policies (security)
  → Triggers (audit, timestamps)
  → Edge Functions (notifications, PDF generation)

External:
  SendGrid (email delivery)
  Azure Blob/Supabase Storage (PDF storage)
```

---

## Flow 2: Candidate Application Submission

**User Journey**: Browse Jobs → Apply → Upload Documents → Submit → Confirmation

### Step 1: Browse Jobs
- **Page**: `src/pages/Jobs.tsx`
- **Route**: `/jobs`
- **Query**:
  ```typescript
  const { data: jobs } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .lte('closing_date', new Date())

      if (filters.category) {
        query = query.eq('category', filters.category)
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`)
      }

      return query
    }
  })
  ```
- **Backend**: PostgreSQL query with RLS (public can see active jobs)
- **Caching**: React Query caches for 5 minutes

### Step 2: View Job Details
- **Page**: `src/pages/JobDetail.tsx`
- **Route**: `/jobs/{slug}`
- **Data Fetched**:
  ```typescript
  const { data } = useQuery({
    queryKey: ['job', slug],
    queryFn: async () => {
      const { data: job } = await supabase
        .from('jobs')
        .select(`
          *,
          job_requirements(*),
          job_competencies(*),
          job_language_requirements(*)
        `)
        .eq('slug', slug)
        .single()

      return job
    }
  })
  ```
- **UI**: Markdown rendering of description, requirements checklist

### Step 3: Fill Application
- **Page**: `src/pages/JobApplication.tsx`
- **Route**: `/apply/{jobId}`
- **Form Fields**:
  - Personal info (name, email, phone)
  - File uploads (CV, motivation letter, PHF)
  - Killer questions (screening questions with custom logic)
  - Consents (GDPR, data processing)

**File Upload Flow**:
```
User selects file →
onChange handler →
  1. Validate file (type, size)
  2. Generate unique filename
  3. Upload to Supabase Storage:
     supabase.storage
       .from('application-files')
       .upload(`${applicationId}/${filename}`, file)
  4. Get public URL:
     supabase.storage
       .from('application-files')
       .getPublicUrl(path)
  5. Store URL in form state
→ On submit: URLs stored in application.files JSONB
```

**Form Validation**:
```typescript
const applicationSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  cv: z.string().url("CV is required"),
  motivation_letter: z.string().url().optional(),
  answers: z.record(z.any()), // Killer questions
  consents: z.object({
    gdpr: z.boolean().refine(val => val === true),
    data_processing: z.boolean().refine(val => val === true)
  })
})
```

### Step 4: Submit Application
- **Action**: Click "Submit Application"
- **Technical Flow**:
  ```
  Form onSubmit →
  Validate with Zod →
  React Query mutation:

    1. Upsert Candidate:
       const { data: candidate } = await supabase
         .from('candidates')
         .upsert({
           email: formData.email,
           name: formData.name,
           phone: formData.phone,
           // ... other fields
         }, { onConflict: 'email' })
         .select()
         .single()

    2. Create Application:
       const { data: application } = await supabase
         .from('applications')
         .insert({
           job_id: jobId,
           candidate_id: candidate.id,
           files: {
             cv: formData.cv,
             motivation_letter: formData.motivation_letter,
             // ...
           },
           answers: formData.answers,
           consents: formData.consents,
           status: 'Application',
           source: 'direct'
         })
         .select()
         .single()

    3. Trigger automatic scoring (backend):
       - PostgreSQL trigger or scheduled function
       - Calculate screening_scores

    4. Send confirmation email:
       Edge function: send-application-confirmation
         - Fetch application + job data
         - Send email via SendGrid

  → Success response →
  React Query: invalidateQueries(['my-applications']) →
  Navigate to /my-applications
  ```

**Backend Triggers**:
```sql
-- Auto-insert into stage_events
CREATE TRIGGER application_stage_insert
AFTER INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION log_stage_event();

-- Audit log
CREATE TRIGGER application_audit
AFTER INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION audit_log_insert();
```

**Technical Stack**:
```
Frontend:
  JobApplication.tsx
  → React Hook Form (form state)
  → Zod (validation)
  → Supabase Storage (file upload)
  → React Query (mutation)

Backend:
  Supabase Database
  → UPSERT candidates (idempotent)
  → INSERT applications
  → Triggers (stage_events, audit_logs)
  → Edge function (email confirmation)
```

---

## Flow 3: Video Interview Assignment & Submission

**User Journey**: HR assigns videos → Candidate receives email → Records videos → HR reviews

### Step 1: Create Question Set
- **Page**: `src/pages/JobInterviewQuestions.tsx`
- **Route**: `/admin/jobs/{jobId}/questions`
- **Action**: Create question bank for job
- **Technical Flow**:
  ```
  Form with questions array →
  INSERT into video_question_sets:
    {
      job_id: jobId,
      name: "Technical Interview Round 1",
      questions: [
        {
          id: "q1",
          text: "Describe your experience with...",
          read_secs: 30,
          prep_secs: 60,
          answer_secs: 120
        },
        // ... more questions
      ],
      allow_retakes: true,
      max_retakes: 2
    }
  → Response → Cache update
  ```

### Step 2: Bulk Assign Videos
- **Page**: `src/pages/JobVideoAssignmentManager.tsx`
- **Route**: `/admin/jobs/{jobId}/video-assignment`
- **Component**: `src/components/BulkVideoAssignmentDialog.tsx`
- **Action**: Select applications (longlist/shortlist), set deadline
- **Technical Flow**:
  ```
  User selects applications + question set + deadline →
  React Query mutation:

    1. Bulk insert video_assignments:
       const assignments = applications.map(app => ({
         application_id: app.id,
         question_set_id: questionSetId,
         token: generateSecureToken(), // crypto.randomUUID()
         status: 'NotStarted',
         deadline_at: deadline,
         created_at: new Date()
       }))

       await supabase
         .from('video_assignments')
         .insert(assignments)

    2. For each assignment, trigger email:
       Edge function: send-video-invite
         - Fetch candidate email from application
         - Generate email with link:
           https://uniccconnect.com/video-interview/{token}
         - Send via SendGrid

    3. Insert video_events:
       INSERT into video_events (
         assignment_id,
         type: 'InviteSent',
         at: NOW()
       )

  → Success → Invalidate queries → Show confirmation
  ```

### Step 3: Candidate Opens Link
- **Page**: `src/pages/VideoInterview.tsx`
- **Route**: `/video-interview/{token}`
- **No Authentication Required** (token-based access)
- **Technical Flow**:
  ```
  useEffect on mount:
    1. Query video_assignments WHERE token = {token}:
       const { data: assignment } = await supabase
         .from('video_assignments')
         .select(`
           *,
           video_question_sets(*),
           applications(
             job_id,
             candidate_id,
             jobs(title)
           )
         `)
         .eq('token', token)
         .single()

    2. Validate:
       - Assignment exists
       - Not expired (deadline_at > NOW())
       - Status != 'Completed'

    3. Update status if first open:
       if (assignment.status === 'NotStarted') {
         UPDATE video_assignments
         SET status = 'LinkOpened', opened_at = NOW()
         WHERE token = token

         INSERT into video_events
         (assignment_id, type: 'LinkOpened', at: NOW())
       }

  → Display welcome screen with instructions
  ```

### Step 4: Record Answers
- **Component**: `src/components/VideoRecorder.tsx`
- **UI Flow**: Question-by-question
  1. **Read Phase** (30s): Display question, countdown timer
  2. **Prep Phase** (60s): Candidate prepares, notes allowed
  3. **Answer Phase** (120s): Record video
  4. **Review**: Play back, option to retake (if allowed)

**MediaRecorder API**:
```typescript
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  })

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9'
  })

  const chunks = []
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data)

  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'video/webm' })
    await uploadVideo(blob, questionId)
  }

  mediaRecorder.start()
  setRecording(true)
}

const uploadVideo = async (blob, questionId) => {
  // Convert blob to File
  const file = new File([blob], `answer_${questionId}.webm`, {
    type: 'video/webm'
  })

  // Upload via edge function (proxy to Azure Blob)
  const formData = new FormData()
  formData.append('file', file)
  formData.append('assignment_id', assignmentId)
  formData.append('question_id', questionId)

  const response = await fetch('/functions/v1/file-proxy', {
    method: 'POST',
    body: formData
  })

  const { url } = await response.json()

  // Save to database
  await supabase.from('video_answers').insert({
    application_id: applicationId,
    question_id: questionId,
    url: url,
    duration: recordingDuration,
    taken_at: new Date()
  })

  // Update assignment status
  await supabase
    .from('video_assignments')
    .update({
      status: 'InProgress',
      last_activity_at: new Date()
    })
    .eq('id', assignmentId)
}
```

### Step 5: Complete Submission
- **Action**: Submit all answers (after answering all questions)
- **Technical Flow**:
  ```
  Final submit button →
  UPDATE video_assignments
  SET status = 'Completed', completed_at = NOW()
  WHERE id = assignmentId

  INSERT into video_events
  (assignment_id, type: 'Completed', at: NOW())

  → Display thank you page
  → Email confirmation to candidate (optional)
  ```

### Step 6: HR Reviews Videos
- **Page**: `src/pages/ApplicationDetail.tsx`
- **Route**: `/admin/applications/{id}`
- **Component**: `src/components/VideoRating.tsx`
- **UI**: Video player + rating (1-5 stars) + comments
- **Technical Flow**:
  ```
  Fetch video_answers for application:
    const { data: answers } = await supabase
      .from('video_answers')
      .select('*')
      .eq('application_id', applicationId)

  For each video:
    - Display video player (Azure Blob URL)
    - Show question text
    - Display rating form

  On submit rating:
    INSERT into video_ratings {
      video_answer_id: answerId,
      evaluator_id: currentUserId,
      rating: 4,
      comments: "Strong technical knowledge..."
    }

    → Update video_answers SET processing_status = 'reviewed'
    → Invalidate cache → UI update
  ```

**Complete Technical Stack**:
```
Frontend:
  JobVideoAssignmentManager.tsx
  → BulkVideoAssignmentDialog
  → React Query (bulk mutation)

  VideoInterview.tsx
  → VideoRecorder component
  → MediaRecorder API (browser)
  → React state management

Backend:
  Supabase Database
  → video_assignments table
  → video_answers table
  → video_events table

  Edge Functions:
  → send-video-invite (email)
  → file-proxy (Azure Blob upload)

External:
  → Azure Blob Storage (video hosting)
  → SendGrid (email delivery)
```

---

## Flow 4: Panel Interview Scheduling & Feedback

**User Journey**: Configure Panel → Set Availability → Invite Candidates → Conduct Interview → Submit Feedback

### Step 1: Configure Panel Composition
- **Page**: `src/pages/ReviewCommittee.tsx`
- **Route**: `/admin/jobs/{jobId}/review-committee`
- **Action**: Add panel members (internal users + external experts)
- **Technical Flow**:
  ```
  Multi-select users + add external members →
  React Query mutation:

    1. Insert panel members:
       await supabase
         .from('job_interview_panel_members')
         .insert(
           selectedUsers.map(user => ({
             job_id: jobId,
             user_id: user.id,
             panel_role: user.role // HM, Panel Member, SME, HR Rep
           }))
         )

    2. Database validation trigger:
       - Run validate_panel_composition() function
       - Check:
         ✓ Min 3 members
         ✓ Gender balance (required)
         ✓ Division diversity (required)
         ⚠ Duty station diversity (recommended)
         ⚠ Nationality diversity (recommended)

    3. If validation fails:
       - RAISE EXCEPTION with error message
       - Frontend catches error and displays to user

  → Success → Invalidate queries(['panel-members', jobId])
  ```

**Validation Function** (PostgreSQL):
```sql
CREATE FUNCTION validate_panel_composition(p_job_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  member_count INT;
  gender_count INT;
  division_count INT;
BEGIN
  -- Count members
  SELECT COUNT(*) INTO member_count
  FROM job_interview_panel_members
  WHERE job_id = p_job_id;

  IF member_count < 3 THEN
    RAISE EXCEPTION 'Panel must have at least 3 members';
  END IF;

  -- Check gender diversity
  SELECT COUNT(DISTINCT u.gender) INTO gender_count
  FROM job_interview_panel_members jipm
  JOIN users u ON jipm.user_id = u.id
  WHERE jipm.job_id = p_job_id;

  IF gender_count < 2 THEN
    RAISE EXCEPTION 'Panel must include both male and female members';
  END IF;

  -- Check division diversity
  SELECT COUNT(DISTINCT u.division) INTO division_count
  FROM job_interview_panel_members jipm
  JOIN users u ON jipm.user_id = u.id
  WHERE jipm.job_id = p_job_id;

  IF division_count < 2 THEN
    RAISE EXCEPTION 'Panel must include members from different divisions';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Step 2: Panel Members Set Availability
- **Page**: `src/components/dashboard/PanelMemberDashboard.tsx`
- **Component**: Calendar view with time slot creation
- **Action**: Select available time slots (date + time + duration)
- **Technical Flow**:
  ```
  User selects date range + time slots →
  Generate slots (e.g., every 1 hour, 9am-5pm) →
  Bulk insert:

    await supabase
      .from('panel_interview_time_slots')
      .insert(
        slots.map(slot => ({
          job_id: jobId,
          panel_member_ids: [currentUserId], // Array of available members
          slot_datetime: slot.datetime,
          duration_minutes: 60,
          status: 'available'
        }))
      )

  → Success → Calendar refreshes with new slots
  ```

### Step 3: HR Invites Candidates
- **Page**: `src/pages/AdminApplications.tsx`
- **Route**: `/applications/manage`
- **Action**: Send interview invitation to shortlisted candidates
- **Technical Flow**:
  ```
  Select applications in 'Shortlist' status →
  Click "Send Interview Invitations" →

    For each application:
      1. INSERT into panel_interview_invitations:
         {
           application_id: app.id,
           job_id: app.job_id,
           status: 'pending',
           invited_at: NOW(),
           deadline_at: NOW() + INTERVAL '7 days'
         }

      2. Send email via edge function:
         Edge function: send-interview-invitation
           - Generate booking link:
             https://uniccconnect.com/book-interview/{application_id}
           - Send via SendGrid

  → Success → Update application status to 'Panel Interview'
  ```

### Step 4: Candidate Books Slot
- **Page**: `src/pages/BookInterviewSlot.tsx`
- **Route**: `/book-interview/{applicationId}`
- **UI**: Calendar showing available slots filtered by panel availability
- **Technical Flow**:
  ```
  On page load:
    1. Fetch invitation:
       const { data: invitation } = await supabase
         .from('panel_interview_invitations')
         .select('*, applications(*, jobs(*))')
         .eq('application_id', applicationId)
         .single()

    2. Fetch available slots:
       const { data: slots } = await supabase
         .from('panel_interview_time_slots')
         .select('*')
         .eq('job_id', invitation.job_id)
         .eq('status', 'available')
         .gte('slot_datetime', new Date())
         .order('slot_datetime')

    3. Display calendar with slots

  On slot selection:
    1. Optimistic UI update (mark as selected)

    2. Mutation with transaction:
       BEGIN;

       -- Lock slot
       UPDATE panel_interview_time_slots
       SET status = 'booked', booked_by_application_id = applicationId
       WHERE id = slotId AND status = 'available'; -- Ensure still available

       -- Update invitation
       UPDATE panel_interview_invitations
       SET status = 'booked', booked_slot_id = slotId, booked_at = NOW()
       WHERE application_id = applicationId;

       -- Create interview session
       INSERT INTO panel_interviews (
         application_id,
         title,
         scheduled_at,
         duration_minutes,
         location,
         meeting_link,
         status
       ) VALUES (...);

       COMMIT;

    3. Send confirmation emails:
       Edge function: send-interview-confirmation
         - Email to candidate
         - Email to all panel members

  → Navigate to confirmation page
  ```

### Step 5: Conduct Interview
- **Time**: Scheduled date/time
- **Location**: Physical or virtual (meeting_link in panel_interviews)
- **Panel Access**: Panel members see upcoming interviews in dashboard

### Step 6: Submit Feedback
- **Page**: `src/pages/PanelInterviewFeedback.tsx`
- **Route**: `/panel-interview/{interviewId}/feedback`
- **Component**: `src/components/FeedbackFormRenderer.tsx`
- **Form**: Dynamic form based on `feedback_form_templates`

**Template Structure**:
```json
{
  "name": "Technical Interview Feedback",
  "sections": [
    {
      "title": "Technical Skills",
      "questions": [
        {
          "id": "tech_1",
          "text": "Problem-solving ability",
          "type": "scale",
          "scale": { "min": 1, "max": 5 }
        },
        {
          "id": "tech_2",
          "text": "Technical knowledge",
          "type": "scale",
          "scale": { "min": 1, "max": 5 }
        }
      ]
    },
    {
      "title": "Communication",
      "questions": [...]
    }
  ]
}
```

**Technical Flow**:
```
Load template:
  const { data: template } = await supabase
    .from('feedback_form_templates')
    .select('*')
    .eq('id', templateId)
    .single()

Render dynamic form:
  - Map sections to form sections
  - Map questions to form fields (scale, text, choice)

On submit:
  1. Calculate overall score:
     const overall = calculateWeightedAverage(responses)

  2. INSERT feedback:
     await supabase
       .from('feedback_form_responses')
       .insert({
         application_id: applicationId,
         evaluator_id: currentUserId,
         panel_interview_id: interviewId,
         responses: responses, // JSONB
         overall: overall,
         recommendation: 'Yes' // or No, Reserve, Roster
       })

  3. Check if all panel members submitted:
     SELECT COUNT(*) FROM feedback_form_responses
     WHERE panel_interview_id = interviewId

     If all submitted:
       - Trigger auto-generation of consolidated report

  → Navigate to dashboard with success message
```

### Step 7: Generate Consolidated Report
- **Page**: `src/pages/ApplicationDetail.tsx`
- **Component**: `src/components/InterviewPanelReport.tsx`
- **Data**: Aggregate feedback from all panel members
- **Technical Flow**:
  ```
  Fetch all feedback:
    const { data: feedbacks } = await supabase
      .from('feedback_form_responses')
      .select(`
        *,
        users(name, role)
      `)
      .eq('application_id', applicationId)

  Calculate aggregates:
    - Average score per section
    - Overall average
    - Recommendation breakdown (Yes: 3, No: 0, Reserve: 1)

  Display in score matrix:
    Component: InterviewScoreMatrix.tsx
      - Row per evaluator
      - Column per competency/section
      - Color-coded cells (green > 4, yellow 3-4, red < 3)

  Generate summary:
    - Compiled comments
    - Final recommendation
    - Next steps

  Save report:
    INSERT/UPDATE interview_panel_reports {
      application_id,
      job_id,
      introduction,
      skills,
      competencies,
      recommendation
    }
```

**Complete Technical Stack**:
```
Frontend:
  ReviewCommittee.tsx (panel setup)
  → Multi-select component
  → Validation feedback

  BookInterviewSlot.tsx (candidate booking)
  → Calendar component
  → Optimistic UI updates

  PanelInterviewFeedback.tsx (evaluator)
  → Dynamic form rendering
  → Real-time validation

Backend:
  Supabase Database
  → panel_interview_time_slots (availability)
  → panel_interviews (sessions)
  → feedback_form_responses (evaluations)
  → Database function (validation)
  → Triggers (audit)

  Edge Functions:
  → send-interview-invitation
  → send-interview-confirmation
```

---

## Flow 5: Application Scoring & Stage Progression

**User Journey**: Application Received → Auto-Screening → Manual Review → Longlist → Shortlist

### Step 1: Initial Screening (Automated)
- **Trigger**: Application submitted (database trigger or scheduled job)
- **Edge Function**: `auto-score-application` (or scheduled function)
- **Algorithm**:
  ```javascript
  async function scoreApplication(applicationId) {
    // Fetch application data
    const { data: app } = await supabase
      .from('applications')
      .select(`
        *,
        candidates(*),
        jobs(
          *,
          job_requirements(*),
          job_competencies(*)
        )
      `)
      .eq('id', applicationId)
      .single()

    let totalScore = 0
    let rubric = {}

    // Score experience
    const expScore = scoreExperience(
      app.candidates.work_experience,
      app.jobs.job_requirements.filter(r => r.category === 'Essential Experience')
    )
    rubric.experience = expScore
    totalScore += expScore.score * 0.4 // 40% weight

    // Score education
    const eduScore = scoreEducation(
      app.candidates.education,
      app.jobs.job_requirements.filter(r => r.category === 'Essential Education')
    )
    rubric.education = eduScore
    totalScore += eduScore.score * 0.3 // 30% weight

    // Score skills
    const skillsScore = scoreSkills(
      app.candidates.skills,
      app.jobs.job_competencies
    )
    rubric.skills = skillsScore
    totalScore += skillsScore.score * 0.2 // 20% weight

    // Killer questions
    const kqScore = scoreKillerQuestions(
      app.answers,
      app.jobs.killer_questions
    )
    rubric.killer_questions = kqScore
    totalScore += kqScore.score * 0.1 // 10% weight

    // Save score
    await supabase
      .from('screening_scores')
      .insert({
        application_id: applicationId,
        ai_score: Math.round(totalScore),
        rubric_breakdown: rubric,
        version: '1.0'
      })

    // Flag for longlist if score > 70
    if (totalScore > 70) {
      await supabase
        .from('applications')
        .update({ suggested_for_longlist: true })
        .eq('id', applicationId)
    }
  }
  ```

### Step 2: HR Reviews Applications
- **Page**: `src/pages/AdminApplications.tsx`
- **Route**: `/applications/manage`
- **UI**: Table with columns:
  - Candidate name
  - Application date
  - Status
  - AI score (sortable)
  - Actions (View, Score, Move to Stage)

**Query with Filters**:
```typescript
const { data: applications } = useQuery({
  queryKey: ['applications', jobId, filters],
  queryFn: async () => {
    let query = supabase
      .from('applications')
      .select(`
        *,
        candidates(*),
        screening_scores(ai_score),
        jobs(title)
      `)

    if (jobId) {
      query = query.eq('job_id', jobId)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.minScore) {
      query = query.gte('screening_scores.ai_score', filters.minScore)
    }

    return query.order('screening_scores.ai_score', { ascending: false })
  }
})
```

### Step 3: Manual Scoring
- **Page**: `src/pages/ApplicationDetail.tsx`
- **Route**: `/admin/applications/{id}`
- **Component**: `src/components/ApplicationScoring.tsx`
- **UI**:
  ```
  Requirements Checklist:
    □ Essential Requirement 1 (weight: 10): [Score: 8/10]
    □ Essential Requirement 2 (weight: 15): [Score: 12/15]
    ...

  Total Score: 85/100

  Notes: [Textarea]
  ```

**Technical Flow**:
```
Load requirements:
  const { data: requirements } = await supabase
    .from('job_requirements')
    .select('*')
    .eq('job_id', jobId)
    .order('order_index')

Render form:
  - Map each requirement to score input
  - Calculate weighted total in real-time

On submit:
  INSERT into evaluations {
    application_id: applicationId,
    evaluator_id: currentUserId,
    section_scores: {
      req_1: 8,
      req_2: 12,
      ...
    },
    total: 85,
    notes: "Strong candidate..."
  }

  → Invalidate queries → Update UI
```

### Step 4: Move to Longlist
- **Action**: Click "Move to Longlist" button
- **Component**: `src/components/ActionConfirmationDialog.tsx`
- **Technical Flow**:
  ```
  Confirmation dialog →
  React Query mutation:

    BEGIN TRANSACTION;

    -- Update application status
    UPDATE applications
    SET status = 'Longlist', updated_at = NOW()
    WHERE id = applicationId;

    -- Log stage change
    INSERT INTO stage_events (
      application_id,
      from_stage,
      to_stage,
      by_user,
      at
    ) VALUES (
      applicationId,
      'Application',
      'Longlist',
      currentUserId,
      NOW()
    );

    COMMIT;

  → Trigger: audit_log_insert (automatic)
  → Edge function: send-status-update-email (optional)
  → Response → Invalidate queries(['applications']) → UI update
  ```

### Step 5: Shortlist Selection
- **Page**: `src/pages/AdminApplications.tsx` (filtered to Longlist)
- **Action**: Select top candidates, click "Bulk Move to Shortlist"
- **Technical Flow**:
  ```
  Bulk selection (checkbox) →
  Bulk mutation:

    const applicationIds = selectedRows.map(r => r.id)

    -- Update all selected
    UPDATE applications
    SET status = 'Shortlist', updated_at = NOW()
    WHERE id = ANY(applicationIds)

    -- Bulk insert stage events
    INSERT INTO stage_events (application_id, from_stage, to_stage, by_user, at)
    SELECT id, 'Longlist', 'Shortlist', currentUserId, NOW()
    FROM unnest(applicationIds) AS id

  → Success → Refetch → Update table
  ```

### Step 6: Progress to Interview
- **From Shortlist**: Move to "Pre-Recorded Video" or "Panel Interview"
- **Process**: Same stage transition pattern

**Technical Stack**:
```
Frontend:
  AdminApplications.tsx
  → Tanstack Table (sorting, filtering)
  → Bulk selection
  → React Query (mutations)

  ApplicationScoring.tsx
  → Dynamic form generation
  → Real-time calculation

Backend:
  Supabase Database
  → applications table (status field)
  → stage_events table (audit trail)
  → screening_scores table (AI scores)

  Edge Functions:
  → auto-score-application (scheduled or triggered)
  → send-status-update-email (notifications)
```

---

## Flow 6: Talent Pool Search

**User Journey**: HR searches historical candidates for future opportunities

### Page
`src/pages/TalentPool.tsx`
**Route**: `/admin/talent-pool`

### Search Interface

**Filters**:
- Keywords (full-text search on name, skills, experience)
- Location
- Years of experience (range)
- Education level
- Languages
- Skills (multi-select)
- Previous application status
- Flags (high_potential, future_opportunity, roster)

**Query Builder**:
```typescript
const buildTalentPoolQuery = (filters) => {
  let query = supabase
    .from('candidates')
    .select(`
      *,
      applications(
        count,
        status,
        jobs(title)
      ),
      candidate_flags(flag_type),
      candidate_notes(note, created_by, created_at)
    `)

  // Full-text search
  if (filters.keywords) {
    query = query.textSearch('fts', filters.keywords, {
      type: 'websearch',
      config: 'english'
    })
  }

  // Location
  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`)
  }

  // Experience range
  if (filters.minExperience) {
    query = query.gte('years_of_experience', filters.minExperience)
  }
  if (filters.maxExperience) {
    query = query.lte('years_of_experience', filters.maxExperience)
  }

  // Skills (JSONB contains)
  if (filters.skills?.length > 0) {
    query = query.contains('skills', filters.skills)
  }

  // Flags
  if (filters.flags?.length > 0) {
    query = query.in('candidate_flags.flag_type', filters.flags)
  }

  return query
    .order('created_at', { ascending: false })
    .limit(50)
}
```

**Full-Text Search Setup** (PostgreSQL):
```sql
-- Add tsvector column
ALTER TABLE candidates ADD COLUMN fts tsvector;

-- Create index
CREATE INDEX candidates_fts_idx ON candidates USING GIN(fts);

-- Trigger to update fts column
CREATE TRIGGER candidates_fts_update
BEFORE INSERT OR UPDATE ON candidates
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(
  fts, 'pg_catalog.english',
  name, skills, work_experience
);
```

### Results Display

**Component**: `src/components/talent-pool/TalentPoolResults.tsx`

**Card View**:
```tsx
<Card>
  <CardHeader>
    <div className="flex justify-between">
      <div>
        <h3>{candidate.name}</h3>
        <p>{candidate.location}</p>
      </div>
      <div>
        <Badge>{candidate.years_of_experience} years</Badge>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    {/* Skills */}
    <div className="flex flex-wrap gap-2">
      {candidate.skills.map(skill => (
        <Badge variant="secondary">{skill}</Badge>
      ))}
    </div>

    {/* Flags */}
    {candidate.candidate_flags.map(flag => (
      <Badge variant="outline">{flag.flag_type}</Badge>
    ))}

    {/* Application count */}
    <p className="text-sm text-muted-foreground">
      {candidate.applications.length} previous applications
    </p>

    {/* Actions */}
    <div className="flex gap-2 mt-4">
      <Button asChild>
        <Link to={`/candidate-profile/${candidate.id}`}>
          View Profile
        </Link>
      </Button>
      <Button variant="outline" onClick={() => openNoteDialog(candidate.id)}>
        Add Note
      </Button>
      <Button variant="outline" onClick={() => openFlagDialog(candidate.id)}>
        Flag
      </Button>
    </div>
  </CardContent>
</Card>
```

### Save Search
- **Action**: Click "Save Search"
- **Technical Flow**:
  ```
  Modal with search name →
  INSERT into talent_pool_searches {
    created_by: currentUserId,
    name: "Senior Developers - Python",
    search_criteria: {
      keywords: "python django",
      minExperience: 5,
      skills: ["Python", "Django", "PostgreSQL"],
      location: "Valencia"
    },
    is_shared: false
  }

  → Success → Add to sidebar → Close modal
  ```

### Candidate Profile Deep Dive
- **Page**: `src/pages/CandidateProfile.tsx`
- **Route**: `/candidate-profile/{id}`
- **Tabs**:
  1. **Overview**: Summary, contact info
  2. **Work Experience**: Timeline view
  3. **Education**: Degrees, certifications
  4. **Skills**: Categorized (technical, soft, languages)
  5. **Application History**: All past applications with outcomes
  6. **Notes**: HR private notes
  7. **Analytics**: Profile completion %, match scores

**Technical Flow**:
```
Fetch comprehensive data:
  const { data: candidate } = await supabase
    .from('candidates')
    .select(`
      *,
      applications(
        *,
        jobs(title, notice_no),
        stage_events(*),
        evaluations(*)
      ),
      candidate_notes(
        *,
        users(name)
      ),
      candidate_flags(*)
    `)
    .eq('id', candidateId)
    .single()

Render tabs:
  - <Tabs> component from shadcn/ui
  - Each tab lazy loads content
  - Application history in timeline format
  - Notes with author and timestamp
```

**Complete Technical Stack**:
```
Frontend:
  TalentPool.tsx
  → Advanced filter form
  → React Query (debounced search)
  → Infinite scroll (pagination)

  CandidateProfile.tsx
  → Tab navigation
  → Timeline component
  → Analytics charts (Recharts)

Backend:
  Supabase Database
  → Full-text search (GIN index)
  → JSONB queries (contains, @>)
  → Complex joins

  Performance:
  → Debounced search (500ms)
  → Cached results (React Query, 10 min)
  → Paginated results (limit/offset)
```

---

## Cross-Cutting Technical Concerns

### 1. Authentication & Authorization

**Login Flow**:
```
Auth.tsx → Email/password form →
supabase.auth.signInWithPassword({email, password}) →
JWT token stored in localStorage →
Auth state updated via useAuth hook →
Redirect to dashboard
```

**useAuth Hook** (`src/hooks/useAuth.tsx`):
```typescript
export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [userRoles, setUserRoles] = useState([])

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user)
      if (session?.user) {
        fetchUserRoles(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user)
        if (session?.user) {
          fetchUserRoles(session.user.id)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, userRoles, loading }
}
```

**RLS Example**:
```sql
-- Applications: Candidates see only their own
CREATE POLICY "candidates_view_own"
ON applications FOR SELECT
TO authenticated
USING (
  candidate_id IN (
    SELECT id FROM candidates
    WHERE email = auth.jwt() ->> 'email'
  )
);

-- HR can see all
CREATE POLICY "hr_view_all"
ON applications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('Admin', 'HR Assistant', 'Chief of HR')
  )
);
```

### 2. Real-Time Updates

**WebSocket Subscription**:
```typescript
useEffect(() => {
  const channel = supabase
    .channel('applications_changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'applications',
        filter: `job_id=eq.${jobId}`
      },
      (payload) => {
        console.log('Application updated:', payload)
        // Invalidate cache to refetch
        queryClient.invalidateQueries(['applications', jobId])
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [jobId])
```

### 3. Caching Strategy

**React Query Configuration**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1
    },
    mutations: {
      retry: 0
    }
  }
})
```

**Cache Invalidation**:
```typescript
const moveStageMutation = useMutation({
  mutationFn: async ({ applicationId, newStage }) => {
    return supabase
      .from('applications')
      .update({ status: newStage })
      .eq('id', applicationId)
  },
  onSuccess: (data, variables) => {
    // Invalidate affected queries
    queryClient.invalidateQueries(['applications'])
    queryClient.invalidateQueries(['application', variables.applicationId])
    queryClient.invalidateQueries(['dashboard'])
  }
})
```

### 4. Error Handling

**Component-Level**:
```tsx
const { data, error, isLoading } = useQuery({
  queryKey: ['applications'],
  queryFn: fetchApplications
})

if (error) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        {error.message || 'Failed to load applications'}
      </AlertDescription>
    </Alert>
  )
}
```

**Global Error Boundary**:
```tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error:', error, errorInfo)
    // Send to logging service
    logErrorToService(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
```

### 5. File Handling

**Upload with Progress**:
```typescript
const uploadFile = async (file, onProgress) => {
  const filePath = `${applicationId}/${file.name}`

  const { data, error } = await supabase.storage
    .from('application-files')
    .upload(filePath, file, {
      onUploadProgress: (progress) => {
        const percent = (progress.loaded / progress.total) * 100
        onProgress(percent)
      }
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('application-files')
    .getPublicUrl(filePath)

  return publicUrl
}
```

---

## Flow 7: Performance Management (ePMDS)

**User Journey**: Staff/Supervisor → Begin Year → Mid Year → End Year → Completion

### Overview
The electronic Performance Management and Development System (ePMDS) enables annual performance evaluation cycles with objectives, competencies, and learning plans.

### Step 1: Performance Cycle Creation (HR Admin)
- **Page**: `src/pages/AdminPerformanceCycles.tsx`
- **Route**: `/admin/performance-cycles`
- **Action**: Create new annual cycle with deadlines
- **Technical Flow**:
  ```
  Form submission →
  React Query mutation →
  INSERT into performance_cycles {
    name: '2025 Performance Cycle',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    begin_year_deadline: '2025-02-28',
    mid_year_deadline: '2025-07-31',
    end_year_deadline: '2025-12-31',
    status: 'active',
    created_by: userId
  }
  → Trigger: update_updated_at_column →
  Response → Cache invalidation → UI update
  ```

### Step 2: Workplan Creation (Staff)
- **Page**: `src/pages/Performance.tsx`
- **Route**: `/performance`
- **Action**: Create workplan for active cycle, select supervisors
- **Technical Flow**:
  ```
  Load active cycle:
    SELECT * FROM performance_cycles
    WHERE status = 'active'
    ORDER BY start_date DESC
    LIMIT 1

  Create workplan:
    INSERT into workplans {
      cycle_id: cycleId,
      staff_id: auth.uid(),
      supervisor1_id: selectedSupervisor1,
      supervisor2_id: selectedSupervisor2,
      is_supervisor_role: false,
      current_phase: 'begin_year',
      status: 'draft'
    }

  RLS Policy Check:
    - Staff can create own workplan
    - HR can create any workplan

  → Navigate to /performance/workplan/{workplanId}
  ```

### Step 3: Begin Year - Objectives Setting (Staff & Supervisor)
- **Page**: `src/pages/WorkplanDetail.tsx`
- **Route**: `/performance/workplan/{id}`
- **Component**: Objective editor with Budget Output linking
- **Technical Flow**:
  ```
  Add 3-5 SMART objectives:
    INSERT into workplan_objectives {
      workplan_id: workplanId,
      order_index: 0,
      title: 'Implement new recruitment module',
      description: 'Develop and deploy...',
      output_id: budgetOutputId, // FK to budget_outputs
      planned_time_percent: 25,
      status: 'not_started'
    }

  Add mandatory & optional competencies:
    INSERT into workplan_competencies {
      workplan_id: workplanId,
      competency_name: 'Leadership',
      competency_type: 'mandatory',
      description: 'Demonstrates leadership...',
      order_index: 0
    }

  Add team objectives:
    INSERT into workplan_team_objectives {
      workplan_id: workplanId,
      objective_type: 'learning_organization',
      title: 'Knowledge sharing sessions',
      individual_contribution: 'Lead monthly tech talks',
      status: 'not_started'
    }

  Add learning plan:
    INSERT into workplan_learning_plans {
      workplan_id: workplanId,
      learning_areas: ['Cloud Architecture', 'AI/ML'],
      learning_methods: ['Online courses', 'Certification'],
      learning_reasons: ['Career advancement', 'Project needs'],
      description: 'Complete AWS certification...'
    }
  ```

### Step 4: Begin Year - Signatures
- **Action**: Staff signs → Supervisor1 signs → Supervisor2 signs (if applicable)
- **Technical Flow**:
  ```
  Staff signature:
    UPDATE workplans
    SET
      begin_year_staff_signed_at = NOW(),
      status = 'pending_supervisor'
    WHERE id = workplanId
    AND staff_id = auth.uid()

  Supervisor1 signature:
    UPDATE workplans
    SET begin_year_supervisor1_signed_at = NOW()
    WHERE id = workplanId
    AND supervisor1_id = auth.uid()
    AND begin_year_staff_signed_at IS NOT NULL

  Supervisor2 signature (if applicable):
    UPDATE workplans
    SET
      begin_year_supervisor2_signed_at = NOW(),
      status = 'in_progress',
      current_phase = 'begin_year'
    WHERE id = workplanId
    AND supervisor2_id = auth.uid()
    AND begin_year_supervisor1_signed_at IS NOT NULL

  RLS: Only assigned staff/supervisors can sign
  Edge Function: send-workplan-notification (notify next signer)
  ```

### Step 5: Mid Year - Progress Review
- **Phase Transition**: System moves to mid_year based on cycle dates
- **Technical Flow**:
  ```
  Staff updates progress:
    UPDATE workplan_objectives
    SET
      mid_year_progress = 'Completed 60% - on track',
      status = 'on_track',
      actual_time_percent = 30
    WHERE workplan_id = workplanId
    AND id = objectiveId

  Staff signs mid-year:
    UPDATE workplans
    SET
      mid_year_staff_signed_at = NOW(),
      current_phase = 'mid_year'
    WHERE id = workplanId

  Supervisor reviews and signs:
    UPDATE workplans
    SET
      mid_year_supervisor1_signed_at = NOW(),
      mid_year_supervisor2_signed_at = NOW()
    WHERE id = workplanId
  ```

### Step 6: End Year - Final Evaluation
- **Phase**: End of cycle (after end_year_deadline approaches)
- **Component**: Rating interface (1-5 scale)
- **Technical Flow**:
  ```
  Staff self-assessment:
    -- Rate objectives
    UPDATE workplan_objectives
    SET
      staff_rating = 4,
      staff_comment = 'Successfully delivered...',
      status = 'completed'
    WHERE workplan_id = workplanId

    -- Rate competencies
    UPDATE workplan_competencies
    SET
      staff_rating = 4,
      staff_comment = 'Demonstrated strong...'
    WHERE workplan_id = workplanId

    -- Overall comments
    UPDATE workplans
    SET
      staff_achievements_comment = 'Key achievements...',
      staff_challenges_comment = 'Main challenges faced...',
      staff_support_comment = 'Support needed for next year...',
      end_year_staff_signed_at = NOW()
    WHERE id = workplanId

  Supervisor assessment:
    -- Rate objectives (supervisor perspective)
    UPDATE workplan_objectives
    SET
      supervisor_rating = 5,
      supervisor_comment = 'Exceeded expectations...'
    WHERE workplan_id = workplanId

    -- Rate competencies
    UPDATE workplan_competencies
    SET
      supervisor_rating = 4,
      supervisor_comment = 'Strong performance...'
    WHERE workplan_id = workplanId

    -- Overall evaluation
    UPDATE workplans
    SET
      supervisor_achievements_comment = 'Outstanding delivery...',
      supervisor_challenges_comment = 'Managed challenges well...',
      supervisor_support_comment = 'Recommend advanced training...',
      overall_rating = 4,
      mandatory_training_completed = true,
      end_year_supervisor1_signed_at = NOW(),
      end_year_supervisor2_signed_at = NOW(),
      status = 'completed',
      current_phase = 'completed'
    WHERE id = workplanId
  ```

### Step 7: Analytics & Reporting (HR)
- **Page**: `src/pages/AdminPerformanceCycles.tsx`
- **Queries**:
  ```sql
  -- Cycle completion status
  SELECT
    pc.name AS cycle,
    COUNT(w.id) AS total_workplans,
    COUNT(CASE WHEN w.status = 'completed' THEN 1 END) AS completed,
    COUNT(CASE WHEN w.current_phase = 'begin_year' THEN 1 END) AS begin_year,
    COUNT(CASE WHEN w.current_phase = 'mid_year' THEN 1 END) AS mid_year,
    COUNT(CASE WHEN w.current_phase = 'end_year' THEN 1 END) AS end_year
  FROM performance_cycles pc
  LEFT JOIN workplans w ON w.cycle_id = pc.id
  GROUP BY pc.id, pc.name
  ORDER BY pc.start_date DESC;

  -- Average ratings by division
  SELECT
    u.division,
    AVG(w.overall_rating) AS avg_rating,
    COUNT(w.id) AS workplan_count
  FROM workplans w
  JOIN users u ON w.staff_id = u.id
  WHERE w.overall_rating IS NOT NULL
  GROUP BY u.division
  ORDER BY avg_rating DESC;

  -- Objective completion rate
  SELECT
    wo.status,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
  FROM workplan_objectives wo
  JOIN workplans w ON wo.workplan_id = w.id
  WHERE w.cycle_id = currentCycleId
  GROUP BY wo.status;
  ```

### RLS Policies (Security)
```sql
-- Staff can view own workplan
CREATE POLICY "staff_view_own_workplan" ON workplans
FOR SELECT USING (
  staff_id = auth.uid()
  OR supervisor1_id = auth.uid()
  OR supervisor2_id = auth.uid()
);

-- HR can view all workplans
CREATE POLICY "hr_view_all_workplans" ON workplans
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
);

-- Staff can update own workplan
CREATE POLICY "staff_update_own_workplan" ON workplans
FOR UPDATE USING (
  staff_id = auth.uid()
  OR supervisor1_id = auth.uid()
  OR supervisor2_id = auth.uid()
);
```

**Complete Technical Stack**:
```
Frontend:
  Performance.tsx (staff dashboard)
  → List of workplans by cycle
  → Progress indicators

  WorkplanDetail.tsx (main interface)
  → Tab-based navigation
  → Objective editor
  → Competency ratings
  → Signature workflow
  → Real-time validation

  AdminPerformanceCycles.tsx (HR admin)
  → Cycle management
  → Analytics dashboard
  → Export functionality

Backend:
  Supabase Database
  → 7 tables (performance_cycles, workplans, etc.)
  → Complex RLS policies
  → Foreign key constraints
  → Triggers (updated_at)

  Components:
  → WorkplanStatusCard.tsx (status display)
  → ObjectiveEditor (CRUD for objectives)
  → CompetencyRating (1-5 scale interface)
  → SignaturePanel (multi-step signature)
```

---

This completes the comprehensive documentation of user flows and technical interactions in UNICCConnect.
