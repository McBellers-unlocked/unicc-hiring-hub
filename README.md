# UNICCConnect

UNICCConnect is the unified HR selection, assessment, and workflow automation platform for the **United Nations International Computing Centre (UNICC)**.

It supports the full selection lifecycle from job requisition through panel review and recommendation, with deep automation, secure data handling, and rich tools for HR, hiring managers, and governance bodies.

This repository contains the **frontend application**, built with **React, TypeScript, Vite, Tailwind, shadcn/ui**, and integrated with a **Supabase** backend and **AWS Amplify** hosting.

---

## 1. Purpose & scope

UNICCConnect is designed to:

- Standardize and digitize UNICC’s selection workflows.
- Reduce bottlenecks between PD formulation, recruitment, and selection.
- Automate repetitive tasks (scoring, video assignments, document generation).
- Provide transparent, auditable decision trails for HR and review committees.
- Serve as a scalable foundation for wider use across the UN system.

This document targets internal developers, architects, and HR stakeholders who work on or with UNICCConnect.

---

## 2. Core systems

### 🔐 Authentication & security
- Multi-factor ready authentication.
- Role-based access control (6+ roles, e.g. HR Admin, Chief HR, Hiring Manager, Panel Member, Candidate, Observer).
- Account and session security controls aligned with UNICC practices.

### 📋 Job requisition management
- Multi-step requisition workflows with approvals (Hiring Manager → Chief HR → HR).
- Requirements checklists, templates, and workflow timelines.
- Visual tracking of requisition status and dependencies.

### 💼 Job posting & management
- Internal vs external posting controls.
- Job creation wizard with reusable templates and guidance.
- Integration with application and shortlisting workflows.

### 👥 Candidate & application management
- PHF import and parsing into structured data.
- Manual and automated application scoring.
- Talent pool integration with flags, notes, and history.

### 🎥 Video interview system
- Question bank and interview template management.
- Bulk video assignment for long/shortlists.
- Recording, playback, and rating interfaces for panel members.

### 📊 Panel Interview management
- Panel and review committee configuration.
- Scheduling support, attendance tracking, and coverage dashboards.
- Feedback forms, score matrices, and consolidated panel reports.

### 📈 Analytics & reporting
- Hiring funnel analytics and conversion metrics.
- Dashboard views for HR Admins, Chiefs, Hiring Managers, Panel Members, and Candidates.
- Drill-downs from aggregate statistics to requisition or candidate level.

### 📄 Document management
- PDF parsing and generation.
- Document viewers including image-based and text-based viewers.
- Track-changes and diff-style views for PDs and other critical docs.
- Final document review dialogs and approval flows.

### ✉️ Communication system
- Job alerts and subscription-style notifications.
- Workflow notifications (e.g. new application, evaluation requested, video assigned).
- Field-level commenting and contextual discussion.

### 🔍 Talent pool
- Advanced search and filtering across historical candidates.
- Saved searches and candidate flags.
- Profile views including analytics, work history, skills, and education.

---

## 3. Technical complexity (at a Glance)

UNICCConnect is a non-trivial, production-grade system with:

- **40+ pages/routes**
- **80+ custom React components** (excluding base UI primitives)
- **30+ serverless/edge functions** in the backend
- A **complex PostgreSQL schema** with row-level security (RLS)
- Document parsing and PDF generation pipelines
- Real-time collaboration elements (status updates, notifications)
- Full audit logging for key user and system actions

---

## 4. High-Level architecture

### Frontend

- **React 18 + TypeScript**
- **Vite** for fast dev/build pipeline
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for composable UI primitives (see `components/ui`)
- **React Query** for server state and caching
- **React Hook Form + Zod** for typed form handling and validation

Key domains are grouped under feature folders, e.g.:

- `components/dashboard` – HR, Chief, Hiring Manager, Panel Member, Candidate dashboards.
- `components/profile` – candidate profile sections, analytics, and completion widgets.
- `components/talent-pool` – talent pool views and search interfaces.
- `components` (root) – core workflow components such as:
  - `HiringFunnelDashboard.tsx`
  - `InterviewPanelReport.tsx`
  - `InterviewScoreMatrix.tsx`
  - `RequirementsChecklist.tsx`
  - `ReviewCommittee*` components
  - `Video*` components (video assignment, interview, rating, recorder)
- `components/ui` – shadcn-based primitives (buttons, dialogs, tabs, tables, toasts, etc.).
- `integrations/supabase` – Supabase client setup, auth integration, and typed queries.
- `hooks` – shared React hooks (auth, role, feature state, data fetching).
- `lib` – utilities, helper functions, constants, and configuration.
- `pages` – route-level composition of feature modules.

### Backend (Supabase)

> Not contained in this repo, but critical for understanding the frontend integration.

- PostgreSQL with RLS for data security.
- Stored procedures and edge functions for:
  - Candidate scoring and ranking.
  - Stage transitions and workflow rules.
  - PDF generation and document management.
  - Audit logging and notification triggers.

### Deployment (AWS Amplify)

- Frontend deployed as a static SPA via **AWS Amplify**.
- Continuous deployment from GitHub branches (e.g. `dev`, `staging`, `main`).
- Environment-specific configuration managed via Amplify environment variables.

---

## 5. Directory structure (Frontend)

```txt
src/
├── components/
│   ├── dashboard/           # HR, Chief, Hiring Manager, Panel, Candidate dashboards
│   ├── profile/             # Candidate profile sections & analytics
│   ├── talent-pool/         # Talent pool search & results UI
│   ├── ui/                  # shadcn/ui primitives (button, dialog, table, etc.)
│   ├── ...                  # Workflow components (video, scoring, review, documents)
├── hooks/                   # Shared hooks (auth, role, query helpers)
├── integrations/
│   └── supabase/            # Supabase client and integration helpers
├── lib/                     # Utils, configuration, helpers
├── pages/                   # Route-level components
├── App.tsx                  # Root component
└── main.tsx                 # Application entry point

6. Local Development
Prerequisites

Node.js v18+

npm v9+

Access to the relevant Supabase project credentials

Setup
git clone <REPO_URL>
cd uniccconnect
npm install
npm run dev


The development server runs at:

http://localhost:5173

7. Environment Variables

Create a .env or .env.local at the project root:

VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_APP_ENV=development
VITE_API_ENDPOINT=<optional-extra-api-endpoint>


For AWS Amplify, configure these in the Amplify Console → Environment variables for each environment (dev/staging/prod).

8. Deployment Workflow (AWS Amplify)

Merge or push changes to the connected branch (dev, staging, or main).

Amplify builds the Vite application and injects environment variables.

On success, the new version is deployed and made available at the environment URL.

Typical environments:

Environment	Branch	Purpose
Dev	dev	Active development/testing
Staging	staging	QA and UAT
Production	main	Live UNICCConnect environment
9. Observability & Audit

Frontend surfaces audit log views via components such as ApplicationAuditViewer.tsx and AuditLogViewer.tsx.

Backend records:

Stage transitions (e.g. Longlist → Shortlist → Panel).

Evaluations, scores, and recommendations.

Video assignment and completion events.

Key document lifecycle events (creation, updates, approvals).

10. Roadmap (Internal)

Near-term focus (next 1–2 quarters)

Enhanced analytics for DEI and pipeline velocity.

Improved video interview workflows and evaluator UX.

Normalization and calibration of scoring across panels.

Deeper integration with UNICC HR Operations systems.

Longer-term

Full SSO / federated identity integration.

System-wide rollout across additional UN entities.

Talent intelligence features (recommendations, skills graphs).

Expanded reporting suite (exportable dashboards, scheduled reports).

11. Contacts & Contributions

Business Owner: UNICC HR – Talent Management

Product & Process: HR Selection / Recruitment Leads

Technical: UNICC development teams & platform services

Please coordinate changes through the agreed branching strategy and review process (pull requests, code review, and QA sign-off) before merging to main.
