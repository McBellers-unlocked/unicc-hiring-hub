
## Plan: Add Assessment Type Selector for Research Exercise Support

### Problem Identified

The Assessment Builder (`/admin/assessments/new`) currently only supports the inbox simulation workflow. It shows 4 tabs (Basics, Emails, Curveball, Preview) but doesn't have a way to select the assessment type. The database already supports `assessment_type` with values `inbox_simulation` and `research_exercise`, but the UI doesn't use it.

### Solution

Add an **Assessment Type** selector to the Basics tab that switches the form between:

1. **Inbox Simulation** (current flow) - Emails, curveball, time in minutes
2. **Research Exercise** (new flow) - Document upload, time in hours, no emails

---

### Changes to AssessmentBuilder.tsx

**1. Add new state variables:**

| State | Type | Purpose |
|-------|------|---------|
| `assessmentType` | `"inbox_simulation" \| "research_exercise"` | Track selected type |
| `timeLimitHours` | `number` | For research exercises (e.g., 48) |
| `referenceDocumentUrl` | `string` | URL of uploaded contract/document |
| `referenceDocumentName` | `string` | Display name for the document |

**2. Update Basics tab to include:**

- Assessment Type selector at the top (Inbox Simulation / Research Exercise)
- Conditional fields based on type:
  - **Inbox Simulation**: Time limit in minutes, availability window
  - **Research Exercise**: Time limit in hours, reference document upload

**3. Update tabs visibility:**

- Show all 4 tabs for Inbox Simulation
- Show only 2 tabs (Basics, Preview) for Research Exercise

**4. Update save mutation:**

- Include `assessment_type`, `time_limit_hours`, `reference_document_url`, `reference_document_name` in the data

**5. Update useEffect to load existing type:**

- Set `assessmentType` from `assessment.assessment_type`
- Load research exercise fields when editing

---

### UI Changes

**Before (Inbox Simulation only):**
```
[ 1. Basics ] [ 2. Emails ] [ 3. Curveball ] [ 4. Preview ]
```

**After (with type selector):**

For Inbox Simulation:
```
Assessment Type: [Inbox Simulation ▼]

[ 1. Basics ] [ 2. Emails ] [ 3. Curveball ] [ 4. Preview ]

Time Limit: [90] minutes
```

For Research Exercise:
```
Assessment Type: [Research Exercise ▼]

[ 1. Basics ] [ 2. Preview ]

Time Limit: [48] hours
Reference Document: [Upload Contract] or [Download: Contract.pdf]
```

---

### Basics Tab Layout for Research Exercise

```
+------------------------------------------+
| Assessment Type                          |
| [◉ Research Exercise ▼]                  |
|                                          |
| Assessment Title *                       |
| [Contract Review Exercise          ]     |
|                                          |
| Description                              |
| [Review and redraft the contract...]     |
|                                          |
| Candidate Instructions                   |
| [You have 48 hours to review...]         |
|                                          |
| Time Limit (hours)      Status           |
| [48]                    [Draft ▼]        |
|                                          |
| Reference Document                       |
| [Upload Document] or [Contract.pdf ✓]    |
| (This is the document candidates will    |
|  download and work with)                 |
+------------------------------------------+
```

---

### Technical Details

**File to modify:** `src/pages/AssessmentBuilder.tsx`

**Key changes:**

1. **State additions** (after line 57):
```typescript
const [assessmentType, setAssessmentType] = useState<"inbox_simulation" | "research_exercise">("inbox_simulation");
const [timeLimitHours, setTimeLimitHours] = useState(48);
const [referenceDocumentUrl, setReferenceDocumentUrl] = useState("");
const [referenceDocumentName, setReferenceDocumentName] = useState("");
```

2. **Update useEffect** (around line 86-119):
   - Add loading of `assessment.assessment_type`
   - Add loading of `assessment.time_limit_hours`
   - Add loading of `assessment.reference_document_url`
   - Add loading of `assessment.reference_document_name`

3. **Update save mutation** (around line 124-134):
   - Include `assessment_type: assessmentType`
   - Include `time_limit_hours: timeLimitHours` for research exercises
   - Include `reference_document_url` and `reference_document_name`
   - Skip email saving for research exercises

4. **Update Tabs** (around line 287-293):
   - Conditionally show 2 or 4 tabs based on `assessmentType`

5. **Update Basics tab** (around line 295-403):
   - Add Assessment Type selector at top of the form
   - Show different timing fields based on type
   - Add document upload section for research exercises

6. **Add document upload functionality:**
   - Upload to `assessment-documents` bucket
   - Display uploaded document with download link

---

### Storage Bucket Usage

The `assessment-documents` bucket (already created in migration) will store:
- Reference documents uploaded by admin
- Path pattern: `reference/{assessmentId}/{filename}`

---

### Expected Result

After this change:
1. Go to `/admin/assessments/new`
2. Select "Research Exercise" from the Assessment Type dropdown
3. The form changes to show:
   - Time limit in hours (not minutes)
   - Document upload field
   - Only Basics and Preview tabs (no Emails/Curveball)
4. Upload a contract document
5. Save the assessment
6. Add this assessment to a Series as Part 2
