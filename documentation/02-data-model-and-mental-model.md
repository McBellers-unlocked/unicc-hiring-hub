# Data Model & Mental Model

## Mental Model: Recruitment Pipeline

UNICCConnect follows a **staged recruitment funnel** with approval workflows:

```
REQUISITION PHASE          APPLICATION PHASE           INTERVIEW PHASE
┌─────────────┐           ┌─────────────┐            ┌─────────────┐
│  Initial    │           │ Application │            │  Longlist   │
│  Request    │──────────▶│  Received   │───────────▶│             │
│             │           │             │            │             │
└─────────────┘           └─────────────┘            └─────────────┘
       │                         │                          │
       ▼                         ▼                          ▼
┌─────────────┐           ┌─────────────┐            ┌─────────────┐
│ Approval    │           │  Screening  │            │  Shortlist  │
│ Workflow    │           │  (Auto +    │            │             │
│ (4 levels)  │           │   Manual)   │            │             │
└─────────────┘           └─────────────┘            └─────────────┘
       │                                                    │
       ▼                                                    ▼
┌─────────────┐                                    ┌─────────────┐
│ Job Created │                                    │ Pre-Recorded│
│ & Posted    │                                    │   Video     │
└─────────────┘                                    └─────────────┘
                                                           │
                                                           ▼
                                                   ┌─────────────┐
                                                   │   Panel     │
                                                   │  Interview  │
                                                   └─────────────┘
                                                           │
                                                           ▼
                                              ┌────────────────────┐
                                              │ Offer / Roster /   │
                                              │    Rejected        │
                                              └────────────────────┘
```

## Core Domain Entities

### 1. Job Requisition
**Concept**: A formal request to hire, requiring multiple approvals before becoming a job posting.

**Lifecycle**:
1. **Draft** → Hiring Manager creates initial request
2. **Pending Approval** → Routed through approval chain:
   - Finance Controller
   - Chief of Division
   - Deputy Director
   - Director
3. **Approved** → Converted to Job Posting by HR
4. **Rejected** → Returned to Hiring Manager with comments

**Key Fields**:
- Position details (title, grade, duty station, nature)
- Competencies (global, core, management, leadership)
- Requirements (education, experience, languages)
- Approval status per level + timestamps
- Internship length (for internship positions)

**Database Table**: `job_requisitions`

### 2. Job
**Concept**: A published vacancy that candidates can apply to.

**Key Fields**:
- Title, category, notice number, grade
- Description (markdown), requirements (markdown)
- Posting dates (issue_date, closing_date)
- Status (active, paused, closed)
- Attachments configuration (CV required, motivation letter, etc.)

**Relationships**:
- Has many **applications**
- Has many **requirements** (essential/desirable)
- Has many **competencies**
- Has many **language requirements**
- Has many **hiring managers** (M:M)
- Has many **panel members** (M:M)

**Database Table**: `jobs`

### 3. Candidate
**Concept**: A person who has applied or may apply to jobs. Separate from user accounts.

**Key Fields**:
- Basic info (name, email, phone, location)
- Professional (current_position, years_of_experience)
- Work experience (JSONB array)
- Skills (JSONB array)
- Languages (JSONB array)
- Education (JSONB array)

**Relationships**:
- Has many **applications**
- Has many **notes** (from HR)
- Has many **flags** (talent pool categorization)

**Database Table**: `candidates`

### 4. Application
**Concept**: A candidate's submission for a specific job.

**Status Progression**:
```
Application → Longlist → Shortlist → Pre-Recorded Video →
Panel Interview → Offer / Roster / Rejected
```

**Key Fields**:
- Status (enum with 8 states)
- Files (JSONB: cv, motivation_letter, phf, certificates)
- Answers (JSONB: killer questions, custom fields)
- Consents (JSONB: GDPR, data processing)
- Flags (suggested_for_longlist, source)

**Relationships**:
- Belongs to **job**
- Belongs to **candidate**
- Has many **stage_events** (audit trail)
- Has many **evaluations**
- Has one **video_assignment**
- Has many **panel_interviews**
- Has one **interview_panel_report**

**Database Table**: `applications`

### 5. Video Assignment
**Concept**: A pre-recorded video interview invitation sent to a candidate.

**Workflow**:
1. HR creates **video_question_set** for job
2. Bulk assign to applications (longlist/shortlist)
3. System generates secure **token** and sends email
4. Candidate accesses via token (no login required)
5. Records answers (with retake limits)
6. Videos uploaded to Azure Blob
7. Status updates: NotStarted → LinkOpened → InProgress → Completed

**Key Fields**:
- Status (enum: 6 states)
- Token (unique, secure URL parameter)
- Timing (deadline_at, opened_at, started_at, completed_at)
- Retakes tracking (per question)

**Database Tables**: `video_assignments`, `video_answers`, `video_ratings`, `video_events`

### 6. Panel Interview
**Concept**: A scheduled in-person or virtual interview with multiple panelists.

**Workflow**:
1. HR configures **panel composition** (job level)
   - System validates diversity requirements
2. Panel members set **availability slots**
3. HR sends **invitation** to candidates
4. Candidates **book** a slot
5. Panel members submit **feedback forms**
6. HR generates **consolidated report**

**Diversity Rules** (enforced by database function):
- Minimum 3 members
- At least 1 male and 1 female (required)
- Different divisions (required)
- Different duty stations (recommended)
- Different nationalities (recommended)
- Required roles: Hiring Manager, HR Rep

**Database Tables**: `panel_interviews`, `panel_interview_participants`, `panel_interview_time_slots`, `panel_interview_invitations`

### 7. User (Staff)
**Concept**: Internal UNICC staff with system access.

**Roles** (enum `user_role`):
- **Admin**: Full system access
- **HR Assistant**: Manage jobs, applications, requisitions
- **Chief of HR**: Approve requisitions, oversee pipeline
- **Hiring Manager**: Create requisitions, review candidates
- **Panel Member**: Conduct interviews, submit feedback
- **Candidate**: Apply to jobs, track applications

**Role Hierarchy** (for access control):
```
Admin > Chief of HR > HR Assistant
             ↓
        Hiring Manager → Panel Member
             ↓
         Candidate
```

**Database Table**: `users`

### 8. Performance Workplan (ePMDS)
**Concept**: Annual performance management system for staff evaluation.

**Lifecycle Phases**:
1. **Begin Year** → Staff and supervisor(s) agree on objectives, competencies, and learning plan
2. **Mid Year** → Progress review and adjustments
3. **End Year** → Final evaluation with ratings and comments
4. **Completed** → Archived for records

**Key Components**:
- **Performance Cycle**: Annual period with deadlines for each phase
- **Workplan**: Links staff member to 1-2 supervisors
- **Objectives**: 3-5 SMART objectives linked to Programme Budget outputs
- **Competencies**: Mandatory and optional competency ratings
- **Team Objectives**: Learning organization and respectful workplace goals
- **Learning Plan**: Development areas, methods, and outcomes

**Signature Workflow**:
- Each phase requires signatures from staff, supervisor 1, and supervisor 2 (if applicable)
- Timestamps tracked for compliance and audit

**Database Tables**: `performance_cycles`, `workplans`, `workplan_objectives`, `workplan_competencies`, `workplan_team_objectives`, `workplan_learning_plans`, `budget_outputs`

## Complete Database Schema

### Core Tables

#### Users & Authentication
- **`users`** - User profiles with roles and metadata
- **`signup_attempts`** - Track signup attempts and prevent abuse

#### Jobs & Requisitions
- **`job_requisitions`** - Job requisition/approval workflow
- **`requisition_field_comments`** - Comments on specific requisition fields
- **`jobs`** - Job postings
- **`job_requirements`** - Job criteria/requirements
- **`job_competencies`** - Competency requirements
- **`job_language_requirements`** - Language requirements
- **`killer_questions`** - Screening questions
- **`job_hiring_managers`** - Job-specific hiring manager assignments
- **`job_review_committee_members`** - Review committee assignments
- **`job_email_alerts`** - Email alert subscriptions for job postings

#### Candidates & Applications
- **`candidates`** - Candidate profiles
- **`applications`** - Job applications
- **`stage_events`** - Application stage change history
- **`screening_scores`** - AI/automated screening results
- **`candidate_notes`** - Private HR notes on candidates
- **`candidate_flags`** - Candidate talent pool flags
- **`talent_pool_searches`** - Saved search criteria

#### Video Interviews
- **`video_question_sets`** - Pre-recorded video question sets
- **`video_assignments`** - Video interview invitations
- **`video_answers`** - Individual video responses
- **`video_ratings`** - Manager ratings on videos
- **`video_events`** - Video assignment event log

#### Panel Interviews
- **`panel_interviews`** - Panel interview sessions
- **`panel_interview_participants`** - Panel members for interviews
- **`external_panel_members`** - External panel members
- **`job_interview_panel_members`** - Job-level panel composition
- **`panel_interview_time_slots`** - Available interview time slots
- **`panel_interview_invitations`** - Candidate interview invitations
- **`interview_panel_reports`** - Panel interview summary reports

#### Evaluations & Feedback
- **`evaluations`** - General application evaluations
- **`feedback_form_templates`** - Reusable feedback templates
- **`feedback_form_responses`** - Completed feedback forms

#### Interview Questions & Collaboration
- **`job_interview_questions`** - Job-specific interview question bank
- **`job_interview_question_contributors`** - Question collaboration tracking
- **`job_interview_question_requirements`** - Links questions to requirements
- **`job_interview_question_competencies`** - Links questions to competencies

#### Communication & Audit
- **`email_threads`** - Email conversation tracking
- **`email_send_log`** - Email delivery tracking
- **`audit_logs`** - System audit trail

#### System Settings
- **`system_settings`** - Configuration key-value store

#### Performance Management (ePMDS)
- **`performance_cycles`** - Annual performance management cycles
- **`workplans`** - Staff workplans with objectives and competencies
- **`budget_outputs`** - Programme Budget outputs reference table
- **`workplan_objectives`** - SMART objectives (3-5 per workplan)
- **`workplan_competencies`** - Competency ratings for staff
- **`workplan_team_objectives`** - Team goals and contributions
- **`workplan_learning_plans`** - Learning and development plans

## Key Relationships

### Job Workflow
```
job_requisitions → jobs → applications → stage_events
                    ↓
         job_requirements, job_competencies,
         job_language_requirements, killer_questions
```

### Application Flow
```
candidates → applications → screening_scores
                    ↓
              stage_events (tracking)
                    ↓
         ┌─────────┼──────────┐
         ↓         ↓          ↓
   video_assignments  panel_interviews  evaluations
         ↓               ↓              ↓
   video_answers    feedback_form_responses
```

### Panel Interview Flow
```
job → job_interview_panel_members (composition)
       ↓
   panel_interview_time_slots (availability)
       ↓
   panel_interview_invitations (candidate invitation)
       ↓
   panel_interviews → panel_interview_participants
       ↓
   feedback_form_responses, interview_panel_reports
```

### Many-to-Many Relationships
- **Jobs ↔ Users:** `job_hiring_managers`, `job_review_committee_members`, `job_interview_panel_members`
- **Panel Interviews ↔ Users/External:** `panel_interview_participants`
- **Jobs ↔ Questions:** `job_interview_questions` → requirements/competencies

### Performance Management Flow
```
performance_cycles → workplans → workplan_objectives
                         ↓           ↓
                    workplan_competencies  ← budget_outputs (reference)
                         ↓
                    workplan_team_objectives
                         ↓
                    workplan_learning_plans

All linked via workplan_id
Staff, Supervisor1, Supervisor2 (users FK)
```

## Important Enums & Status Fields

### Application Lifecycle
- **application_status:** Application → Longlist → Shortlist → Pre-Recorded Video → Panel Interview → Offer → Roster | Rejected

### User Roles
- **user_role:** Admin, HR Assistant, Chief of HR, Hiring Manager, Panel Member, Candidate

### Recommendation Outcomes
- **recommendation:** Yes, No, Reserve, Roster

### Video Interview Statuses
- **video_assignment_status:** NotStarted, LinkOpened, InProgress, Completed, Expired, Failed
- **video_event_type:** InviteSent, LinkOpened, Started, AnswerUploaded, Completed, Expired, ReminderSent, Failed

### Panel Member Roles
- **panel_member_role:** Hiring Manager, Additional Panel Member, Subject Matter Expert, HR Rep

### Performance Management Statuses
- **performance_cycle_status:** draft, active, completed, archived
- **workplan_status:** draft, in_progress, pending_supervisor, approved, completed
- **workplan_phase:** begin_year, mid_year, end_year, completed
- **objective_status:** not_started, on_track, delayed, completed, cancelled

### Other Enums
- **input_type:** boolean, single, multi, text (for killer questions)
- **killer_question_rule:** yes_required, no_required, custom

## Key Data Patterns

### 1. JSONB for Flexibility
Used for semi-structured data that varies by context:
- Application files, answers, consents
- Candidate skills, work experience
- Video question sets, feedback forms
- Competencies, approval comments

**Example - Application Files**:
```json
{
  "cv": "https://storage.supabase.co/...",
  "motivation_letter": "https://storage.supabase.co/...",
  "phf": "https://storage.supabase.co/...",
  "certificates": [
    "https://storage.supabase.co/...",
    "https://storage.supabase.co/..."
  ]
}
```

### 2. Audit Trail
Three mechanisms:
- **stage_events**: Application status changes
- **video_events**: Video assignment lifecycle
- **audit_logs**: System-wide change tracking (before/after state)

**Example Query**:
```sql
SELECT * FROM stage_events
WHERE application_id = '...'
ORDER BY at DESC;
```

### 3. Row-Level Security (RLS)
Access control enforced at database level:

```sql
-- Example: Candidates can only see their own applications
CREATE POLICY "Candidates see own applications"
ON applications FOR SELECT
USING (
  candidate_id IN (
    SELECT id FROM candidates
    WHERE email = auth.jwt() ->> 'email'
  )
);
```

### 4. Approval Workflows
Requisitions track 4 approval levels:
- Each level has: `_approval`, `_approved_by`, `_approved_at`
- Status progresses: draft → pending_finance → pending_division → ... → approved

**Example**:
```sql
UPDATE job_requisitions
SET
  finance_controller_approval = TRUE,
  finance_controller_approved_by = '...',
  finance_controller_approved_at = NOW(),
  status = 'pending_division'
WHERE id = '...';
```

### 5. Token-Based Access
Video assignments use secure tokens:
- No authentication required for candidates
- One-time use (soft expiry via deadline)
- Activity tracking (opened_at, last_activity_at)

**Example**:
```sql
SELECT * FROM video_assignments
WHERE token = 'abc123...'
AND deadline_at > NOW();
```

### 6. Panel Composition Validation
Enforced via database function `validate_panel_composition()`:
- Minimum size (3+ members)
- Gender balance (required)
- Division diversity (required)
- Geographic/nationality diversity (recommended)
- Required roles (Hiring Manager, HR Rep)

## Entity Relationship Diagram (Detailed)

```
┌──────────────┐
│    users     │
│--------------│
│ id (PK)      │
│ email        │
│ role         │◀────────────────┐
│ name         │                 │
│ department   │                 │
│ division     │                 │
└──────────────┘                 │
       │ 1                       │
       │ creates                 │
       ▼ *                       │
┌──────────────┐         ┌──────────────┐
│job_requisitions│ converts│     jobs     │
│--------------│   to     │--------------│
│ id (PK)      │─────────▶│ id (PK)      │
│ reference_no │          │ title        │
│ status       │          │ slug         │
│ position_... │          │ status       │
│ competencies │          │ description  │
│ fc_approval  │          └──────────────┘
│ cod_approval │                 │ 1
│ dd_approval  │                 │ has
│ dir_approval │                 ▼ *
└──────────────┘          ┌──────────────┐
                          │ applications │
┌──────────────┐          │--------------│
│  candidates  │          │ id (PK)      │
│--------------│          │ job_id (FK)  │
│ id (PK)      │◀─────────│ candidate_id │
│ email        │  1    *  │ status       │
│ name         │          │ files        │
│ skills       │          │ answers      │
│ work_exp     │          │ consents     │
│ languages    │          └──────────────┘
└──────────────┘                 │ 1
       │ 1                       │ has
       │                         ▼ *
       ▼ *                ┌──────────────┐
┌──────────────┐          │stage_events  │
│candidate_    │          │--------------│
│  notes       │          │ id (PK)      │
│--------------│          │ application_ │
│ id (PK)      │          │ from_stage   │
│ candidate_id │          │ to_stage     │
│ created_by   │          │ by_user      │
│ note         │          │ at           │
└──────────────┘          └──────────────┘

┌──────────────┐          ┌──────────────┐
│applications  │          │video_        │
│              │──────────│ assignments  │
└──────────────┘  1    1  │--------------│
                          │ id (PK)      │
                          │ application_ │
                          │ token        │
                          │ status       │
                          │ deadline_at  │
                          └──────────────┘
                                 │ 1
                                 │ has
                                 ▼ *
                          ┌──────────────┐
                          │video_answers │
                          │--------------│
                          │ id (PK)      │
                          │ application_ │
                          │ question_id  │
                          │ url          │
                          │ transcript   │
                          └──────────────┘

┌──────────────┐
│     jobs     │
└──────────────┘
       │ 1
       │ has
       ▼ *
┌──────────────────────┐
│job_interview_panel_  │
│       members        │
│----------------------│
│ job_id (FK)          │
│ user_id (FK)         │
│ panel_role           │
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│panel_interview_      │
│     time_slots       │
│----------------------│
│ id (PK)              │
│ job_id (FK)          │
│ panel_member_ids     │
│ slot_datetime        │
│ status               │
└──────────────────────┘
       │ 1
       │ booked
       ▼ *
┌──────────────────────┐
│  panel_interviews    │
│----------------------│
│ id (PK)              │
│ application_id (FK)  │
│ scheduled_at         │
│ location             │
│ meeting_link         │
└──────────────────────┘
       │ 1
       │ has
       ▼ *
┌──────────────────────┐
│feedback_form_        │
│    responses         │
│----------------------│
│ id (PK)              │
│ application_id (FK)  │
│ evaluator_id (FK)    │
│ responses (JSONB)    │
│ recommendation       │
└──────────────────────┘
```

## Data Architecture Insights

The database follows a **sophisticated recruitment workflow** with:

1. **Multi-stage approval process** for job requisitions
2. **Flexible application pipeline** with configurable stages
3. **Dual interview modes** (video + panel)
4. **Comprehensive evaluation system** with templates and scoring
5. **Strong audit trail** and compliance features
6. **Role-based access control** with fine-grained permissions
7. **Talent pool functionality** for candidate relationship management
8. **Panel diversity validation** for fair hiring practices
9. **Collaborative interview question bank** with attribution
10. **Email tracking and communication logging**

The schema demonstrates enterprise-grade ATS (Applicant Tracking System) design with focus on UN/international organization requirements (e.g., panel composition rules, multiple approval levels, roster management).
