

# Product Spec Document Generator for Account Managers

## Overview
Create a downloadable product specification document that account managers can use to pitch and sell the platform. This will be a standalone page that renders a comprehensive product overview and lets users download it as a styled HTML-to-PDF document.

## Approach
Build a new page at `/product-spec` that renders a polished, print-ready product specification document with a "Download as PDF" button. The document will use the browser's native `window.print()` with print-specific CSS for clean PDF output (no external PDF library needed).

## Document Structure

The product spec will cover these sections:

1. **Executive Summary** — What the platform is, who it serves, key value proposition
2. **Platform Modules** — Each major module with description and key capabilities:
   - Recruitment & Hiring (requisitions, job postings, applications, scoring)
   - Video Interviews (async interviews, panel reviews, AI analysis)
   - Assessment Series (multi-stage assessments, builder, scoring)
   - Talent Pool (candidate database, flags, notes, search)
   - Skills Framework (679 skills, AI categorization, OSS tracking)
   - Analytics & Reporting (dashboards, charts, data exports)
   - HR Operations (appointments, contracts, separations, document repository)
   - Performance Management (cycles, workplans, reviews)
   - Organization Chart (interactive org tree visualization)
3. **Technical Architecture** — Stack overview, security features, scalability
4. **Security & Compliance** — Auth (MFA), RLS, audit logging, data isolation
5. **Integration Capabilities** — Supabase, email (Resend), AI (Gemini), storage
6. **Open Source Foundation** — List of key OSS technologies used
7. **Deployment Options** — Current AWS Amplify, planned EKS migration

## Technical Implementation

### Files to create
1. **`src/pages/ProductSpec.tsx`** — Full product spec page with print-optimized layout, a "Download PDF" button (uses `window.print()`), and all content sections
2. **`src/pages/ProductSpec.print.css`** — Print-specific styles imported in the component for clean PDF output (hide nav, margins, page breaks)

### Files to modify
1. **`src/App.tsx`** — Add route `/product-spec` (accessible without auth so AMs can share the link)

### Design details
- Clean, professional layout using existing shadcn/ui components
- UNICC branding colors
- Print styles that hide the navbar, sidebar, and download button when printing
- Page break hints between major sections for clean PDF pages
- The page will be publicly accessible (no auth required) so the URL itself can be shared

