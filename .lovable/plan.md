# Interactive Workflow Documentation (Single-Page HTML)

Build a self-contained HTML file that visualizes the **Recruitment lifecycle** as a clickable Cytoscape.js graph of high-level modules. A side panel lists actions; clicking one highlights the participating nodes and animates edges in sequence, with annotations showing payload, auth/RLS gates, and DB tables touched.

## Deliverable

One file: `/mnt/documents/workflow-explorer.html`
- Self-contained: Cytoscape.js + dagre layout loaded from CDN, no build step
- Drives entirely off an embedded `WORKFLOWS_JSON` constant — editable to add/modify flows
- Light/dark friendly, UNIQTalent brand color `#009CDE` for highlights

## Layout

```text
+----------------------------------------------------------+
|  UNIQTalent — Workflow Explorer        [search actions]  |
+------------------+---------------------------------------+
|  ACTIONS         |                                       |
|  > Submit Req    |        Cytoscape graph                |
|    Approve PD    |        (nodes = modules,              |
|    Publish Job   |         edges fade to 10% until       |
|    Apply to Job  |         an action is selected)        |
|    AI Score      |                                       |
|    Invite Video  |                                       |
|    ...           |                                       |
+------------------+---------------------------------------+
|  STEP DETAILS (selected action, step N of M)             |
|  From: HiringManagerReview  ->  To: send-chief-hr-...    |
|  Payload: { requisitionId, reviewerId }                  |
|  Auth/RLS: requires role 'hiring_manager' AND own req    |
|  DB: UPDATE job_requisitions SET hr_review_status=...    |
|  [Prev] [Auto-play] [Next]                               |
+----------------------------------------------------------+
```

## High-level nodes (~20)

Grouped by layer (Cytoscape compound nodes):

- **UI Layer**: `JobRequisitions`, `ChiefHRReview`, `Jobs (public)`, `JobApplication`, `MyApplications`, `JobManagement`, `VideoInterview`, `BookInterviewSlot`, `ReviewCommittee`, `EmailHub`
- **Edge Functions**: `convert-requisition-to-job`, `send-requisition-notification`, `send-chief-hr-review-notification`, `send-application-confirmation`, `trigger-batch-scoring`, `send-video-invite`, `upload-video-answer`, `video-assignment-webhook`
- **Data/Infra**: `Supabase Auth`, `Postgres + RLS`, `Supabase Storage`, `Lovable AI Gateway`, `Resend`

## Workflows in v1 (Recruitment lifecycle)

Each is one entry in `WORKFLOWS_JSON.actions[]`, ordered steps with `{from, to, label, payload, auth, db}`:

1. Submit job requisition (HM)
2. Chief HR review & route to Director
3. Director approval -> convert to job posting
4. Publish vacancy
5. Candidate applies
6. Auto AI scoring (pg_net trigger -> batch)
7. Bulk video assignment + invite email
8. Candidate records video answer (upload to Storage)
9. Schedule panel interview slot
10. Panel interview feedback submission
11. Review committee approval
12. Offer email send

## JSON schema (drives everything)

```json
{
  "nodes": [
    { "id": "JobRequisitions", "label": "Job Requisitions", "layer": "ui", "file": "src/pages/JobRequisitions.tsx" }
  ],
  "actions": [
    {
      "id": "submit-requisition",
      "title": "Submit Job Requisition",
      "summary": "Hiring manager submits a new requisition for HR review.",
      "steps": [
        {
          "from": "JobRequisitions",
          "to": "Postgres + RLS",
          "label": "INSERT requisition",
          "payload": "{ title, division, grade, contractType, dutyStation }",
          "auth": "Authenticated user; RLS allows insert when created_by = auth.uid()",
          "db": "INSERT job_requisitions; trigger sets initial hr_review_status='pending'"
        },
        {
          "from": "JobRequisitions",
          "to": "send-requisition-notification",
          "label": "invoke()",
          "payload": "{ requisitionId }",
          "auth": "JWT forwarded; function verifies role",
          "db": "SELECT job_requisitions; SELECT users for HR focal points"
        },
        {
          "from": "send-requisition-notification",
          "to": "Resend",
          "label": "send email",
          "payload": "{ to: hrFocals, cc: hraffiliatemanagement, subject, html }",
          "auth": "RESEND_API_KEY (server-only)",
          "db": "—"
        }
      ]
    }
  ]
}
```

## Interaction behavior

- **Click action** -> dim all edges/nodes to 10% opacity, then walk steps:
  - Highlight `from` node, animate edge to `to` node in brand color, highlight `to` node
  - Show step details panel
- **Auto-play** button steps every 1.5s; **Prev/Next** for manual stepping
- **Hover node** -> tooltip with module description and source file path
- **Search** filters action list

## Technical details

- Single `<script>` block. CDN: `cytoscape@3`, `cytoscape-dagre@2`, `dagre@0.8`
- Layout: `dagre` top-down, with compound parent nodes for layer grouping
- Styling: inline `<style>`; CSS vars for theme; uses HSL values
- Edge animation: increment `line-color` + `width` via `cy.style().update()` and `ele.animate()`
- No external assets required; file opens directly in any browser

## Out of scope (v1)

- HR Operations, Assessments, Auth, Email Hub, Skills workflows (structure supports adding them later by appending to `WORKFLOWS_JSON.actions[]`)
- File path / line range annotations
- Persisting JSON externally (it's embedded; user can edit the HTML to extend)

## File QA

After generating, open the HTML in a headless browser, screenshot it, click 2 actions, screenshot each, and confirm: graph renders, no JS console errors, edge highlight visible, step details populate.
