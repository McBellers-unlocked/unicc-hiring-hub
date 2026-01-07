# Solution Architecture Overview

## Executive Summary

UNICCConnect (HireFlow) is a cloud-native, full-stack recruitment platform built on modern web technologies. The system employs a JAMstack architecture with a statically-deployed React frontend, a Supabase backend providing PostgreSQL database and serverless functions, and AWS Amplify for hosting and continuous deployment.

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   React 18 SPA (TypeScript + Vite)                     │ │
│  │   • Tailwind CSS + shadcn/ui components                │ │
│  │   • React Query (server state)                         │ │
│  │   • React Router (client-side routing)                 │ │
│  │   • React Hook Form + Zod (forms/validation)           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│               HOSTING & CDN LAYER                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   AWS Amplify                                          │ │
│  │   • Static hosting + CDN                               │ │
│  │   • CI/CD from GitHub (dev/staging/main branches)      │ │
│  │   • Environment variable injection                     │ │
│  │   • SSL/TLS termination                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS/WSS
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND LAYER (Supabase)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   PostgreSQL Database                                  │ │
│  │   • Row-Level Security (RLS) policies                  │ │
│  │   • 20+ core tables (jobs, applications, candidates)   │ │
│  │   • Audit logging triggers                             │ │
│  │   • Full-text search indexes                           │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   Supabase Auth                                        │ │
│  │   • Email/password authentication                      │ │
│  │   • JWT token management                               │ │
│  │   • Session handling                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   Edge Functions (Deno Runtime)                        │ │
│  │   • PDF generation (requisitions, PHF export)          │ │
│  │   • Email notifications (SendGrid integration)         │ │
│  │   • PHF document parsing                               │ │
│  │   • Video assignment webhooks                          │ │
│  │   • Data migration utilities                           │ │
│  │   30+ serverless functions                             │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   Supabase Storage                                     │ │
│  │   • File uploads (CVs, PHFs, certificates)             │ │
│  │   • Document storage                                   │ │
│  │   • Generated PDFs                                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               EXTERNAL SERVICES                              │
│  • Azure Blob Storage (video recordings)                    │
│  • SendGrid (email delivery)                                │
│  • PDF processing services                                  │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Layer

The frontend is a Single Page Application (SPA) built with:

- **React 18** with **TypeScript** for type-safe component development
- **Vite 5** as the build tool, providing fast Hot Module Replacement (HMR) and optimized production builds
- **Tailwind CSS 3** for utility-first styling
- **shadcn/ui** component library providing 80+ reusable UI primitives
- **React Query** for server state management, caching, and data synchronization
- **React Router v6** for client-side routing
- **React Hook Form + Zod** for type-safe form handling and validation

### Backend Layer (Supabase)

The backend infrastructure is provided by Supabase:

- **PostgreSQL 15+** as the primary database with Row-Level Security (RLS)
- **Supabase Auth** for JWT-based authentication and session management
- **Edge Functions** running on Deno for serverless compute (30+ functions)
- **Supabase Storage** for file management with access control
- **Real-time subscriptions** via WebSockets for live data updates

### Hosting & Deployment

- **AWS Amplify** hosts the static frontend with global CDN distribution
- **GitHub** provides version control and triggers CI/CD pipelines
- **Custom domains** with automatic SSL/TLS certificate management

### External Integrations

- **Azure Blob Storage** for video file storage and streaming
- **SendGrid** for transactional email delivery
- **PDF processing libraries** for document generation

## Architectural Patterns

### JAMstack Architecture

The application follows JAMstack principles:
- **JavaScript**: React application running in the browser
- **APIs**: Supabase provides RESTful and real-time APIs
- **Markup**: Pre-built static HTML served from CDN

This architecture provides:
- Fast page loads (static assets from CDN)
- Better security (reduced attack surface)
- Simplified scaling (frontend scales automatically via CDN)
- Developer experience (clear separation of concerns)

### Row-Level Security (RLS)

All data access is secured at the database level using PostgreSQL RLS policies. Each table has policies that enforce:
- Candidates can only view their own applications
- HR staff can access applications for jobs they manage
- Admins have full access
- Panel members can only view assigned interviews

Example policy structure:
```sql
CREATE POLICY "candidates_view_own"
ON applications FOR SELECT
USING (candidate_id IN (
  SELECT id FROM candidates WHERE email = auth.jwt() ->> 'email'
));
```

### Optimistic UI Updates

The application uses React Query's optimistic update pattern:
1. User action triggers mutation
2. UI updates immediately (optimistic)
3. Request sent to backend
4. On success: optimistic update confirmed
5. On error: rollback to previous state and show error

This provides a responsive user experience even with network latency.

### Role-Based Access Control (RBAC)

The system implements hierarchical role-based permissions:

**Roles**:
- **Admin**: Full system access
- **Chief of HR**: Approve requisitions, oversight of all recruitment
- **HR Assistant**: Manage jobs, applications, and recruitment workflows
- **Hiring Manager**: Create requisitions, review candidates
- **Panel Member**: Conduct interviews, submit evaluations
- **Candidate**: Apply to jobs, track application status

**Access Control**: Enforced at three levels:
1. **Frontend**: Component-level role checks hide/show UI elements
2. **API**: Supabase RLS policies filter data queries
3. **Functions**: Edge functions validate user roles before execution

### Event Sourcing for Audit

The system maintains comprehensive audit trails through event logging:
- **stage_events** table tracks all application status changes
- **video_events** table tracks video assignment lifecycle
- **audit_logs** table captures all create/update/delete operations

This enables:
- Complete reconstruction of application history
- Compliance with data governance requirements
- Debugging and troubleshooting
- Analytics on recruitment pipeline velocity

### Token-Based Access

Video interview assignments use secure token-based access:
- Each assignment generates a unique, cryptographically secure token
- Candidates access video interviews via tokenized URLs (no login required)
- Tokens expire after deadline
- Activity tracking (opened_at, last_activity_at) prevents abuse

## Data Flow

### Typical Request Flow

```
1. User Action (e.g., click "Submit Application")
   ↓
2. React Component event handler
   ↓
3. React Query mutation hook
   ↓
4. Supabase Client (JavaScript SDK)
   ↓
5. HTTPS request to Supabase API
   ↓
6. PostgreSQL query execution
   ↓
7. Row-Level Security policy check
   ↓
8. Database triggers (audit logs, timestamps)
   ↓
9. Response data returned
   ↓
10. React Query cache update
   ↓
11. Component re-render with new data
```

### Real-Time Data Flow

For live updates (e.g., application status changes):

```
1. Database change occurs (INSERT/UPDATE)
   ↓
2. PostgreSQL triggers Supabase real-time notification
   ↓
3. WebSocket message sent to subscribed clients
   ↓
4. React component receives update
   ↓
5. React Query cache invalidated
   ↓
6. Component re-fetches fresh data
   ↓
7. UI updates automatically
```

## Security Architecture

### Authentication & Authorization

**Authentication Flow**:
1. User enters email/password
2. Supabase Auth validates credentials
3. JWT access token + refresh token issued
4. Tokens stored in browser (httpOnly cookies preferred, localStorage fallback)
5. Access token included in all API requests
6. Backend validates JWT signature and expiry

**Session Management**:
- Access tokens expire after 1 hour
- Refresh tokens used to obtain new access tokens
- Automatic token refresh handled by Supabase client
- Logout invalidates tokens server-side

### Data Security

**Frontend Protection**:
- All API keys prefixed with `VITE_` (only public keys exposed)
- React's built-in XSS protection via JSX escaping
- Content Security Policy (CSP) headers
- HTTPS-only communication enforced

**Backend Protection**:
- Row-Level Security on all tables (zero-trust data access)
- Prepared statements prevent SQL injection
- File upload validation (type, size, content)
- Virus scanning on uploaded files
- Rate limiting on API endpoints

**Network Security**:
- SSL/TLS 1.3 encryption for all traffic
- CORS policies restrict API access to allowed origins
- DDoS protection via AWS Amplify and Supabase infrastructure

### Sensitive Data Handling

- **Passwords**: Hashed with bcrypt, never stored in plain text
- **Personal data**: Encrypted at rest in PostgreSQL
- **File storage**: Access control via signed URLs with expiration
- **Audit logs**: Immutable records of all sensitive operations

## Deployment Architecture

### CI/CD Pipeline

```
Developer commits code
   ↓
Git push to GitHub (dev/staging/main branch)
   ↓
AWS Amplify webhook triggered
   ↓
Amplify build environment spins up
   ↓
Install dependencies (npm install)
   ↓
Inject environment variables
   ↓
Build production assets (npm run build)
   ↓
Optimize assets (minification, tree-shaking)
   ↓
Deploy to CDN edge locations
   ↓
Invalidate previous cache
   ↓
Health check on new deployment
   ↓
Live environment updated (zero downtime)
```

### Environment Strategy

The system maintains three isolated environments:

**Development** (`dev` branch):
- URL: `dev.uniccconnect.com`
- Purpose: Active development and feature testing
- Database: Separate Supabase project (dev)
- Auto-deploys on every commit to `dev` branch

**Staging** (`staging` branch):
- URL: `staging.uniccconnect.com`
- Purpose: QA testing and UAT (User Acceptance Testing)
- Database: Separate Supabase project (staging), mirrors production schema
- Auto-deploys on merge to `staging` branch

**Production** (`main` branch):
- URL: `uniccconnect.com`
- Purpose: Live environment for end users
- Database: Production Supabase project with backups
- Auto-deploys on merge to `main` branch (after approval gates)

### Build Process

**Vite Build Optimization**:
- Code splitting: Each route loaded on demand
- Tree shaking: Unused code eliminated
- Asset optimization: Images compressed, CSS purged
- Bundle analysis: Monitors bundle size
- Source maps: Generated for production debugging

**Build Artifacts**:
- `index.html` - Entry point
- `/assets/*.js` - JavaScript bundles (hashed filenames)
- `/assets/*.css` - Stylesheets (hashed filenames)
- `/assets/images/*` - Optimized images
- Static assets served from CDN with aggressive caching

## Application Architecture

### Frontend Structure

```
src/
├── components/
│   ├── dashboard/           # Role-specific dashboards
│   │   ├── HRAdminDashboard.tsx
│   │   ├── ChiefHRDashboard.tsx
│   │   ├── HiringManagerDashboard.tsx
│   │   ├── PanelMemberDashboard.tsx
│   │   └── CandidateDashboard.tsx
│   ├── profile/             # Candidate profile components
│   ├── talent-pool/         # Talent pool search UI
│   ├── analytics/           # Analytics visualizations
│   ├── job-wizard/          # Job creation wizard
│   ├── ui/                  # shadcn/ui primitives (Button, Dialog, etc.)
│   └── [workflow components] # Application, video, panel interview components
├── hooks/
│   ├── useAuth.tsx          # Authentication hook
│   ├── useFieldComments.tsx # Field-level comments
│   ├── use-toast.ts         # Toast notifications
│   └── use-mobile.tsx       # Responsive design helper
├── integrations/
│   └── supabase/
│       ├── client.ts        # Supabase client configuration
│       └── types.ts         # Generated TypeScript types
├── lib/
│   ├── utils.ts             # Utility functions
│   ├── documentParser.ts    # PHF parsing logic
│   ├── phfDataMapping.ts    # PHF field mapping
│   └── [domain utilities]   # Education levels, country data, etc.
├── pages/                   # Route-level components (40+ pages)
│   ├── Index.tsx            # Dashboard router
│   ├── Auth.tsx             # Login/signup
│   ├── Jobs.tsx             # Job listings
│   ├── JobApplication.tsx   # Application form
│   ├── AdminApplications.tsx# Application management
│   └── [feature pages]      # Requisitions, interviews, talent pool, etc.
├── App.tsx                  # Root component with providers
└── main.tsx                 # Application entry point
```

### Backend Structure

```
supabase/
├── migrations/              # Database schema migrations (chronological)
│   ├── 20250902*.sql       # Initial schema
│   ├── 20250903*.sql       # Application workflow
│   ├── 20250904*.sql       # Video interviews
│   └── [subsequent migrations]
├── functions/               # Edge functions
│   ├── send-video-invite/  # Email video interview invitations
│   ├── generate-requisition-pdf/ # PDF generation
│   ├── parse-phf-document/ # PHF parsing
│   ├── convert-requisition-to-job/ # Requisition conversion
│   ├── file-proxy/         # Azure Blob upload proxy
│   └── [30+ functions]
└── config.toml             # Supabase configuration
```

## Performance & Scalability

### Frontend Performance

**Code Splitting**:
- Route-based splitting via React Router lazy loading
- Dynamic imports for heavy components (PDF viewer, video recorder)
- Vendor chunks separated from application code

**Rendering Optimization**:
- Virtual scrolling for large lists (1000+ items)
- Debounced search inputs (500ms delay)
- Memoized calculations with `useMemo` and `useCallback`
- React.memo for expensive component renders

**Asset Optimization**:
- WebP format for images with fallbacks
- Responsive images (multiple sizes)
- SVG for icons and logos
- Lazy loading for below-the-fold images

### Backend Performance

**Database Optimization**:
- Full-text search indexes (GIN) on candidate fields
- Foreign key indexes for join performance
- Connection pooling (Supabase manages pool)
- Query optimization (selective column fetching)

**Caching Strategy**:
- React Query caches API responses (5 min default stale time)
- CDN caches static assets (1 year expiry)
- Browser caches with cache-busting via hashed filenames
- Database query result caching (Supabase internal)

**Function Performance**:
- Edge functions deployed globally (low latency)
- Cold start mitigation (minimal dependencies)
- Asynchronous processing for non-blocking operations
- Parallel execution for independent tasks

### Storage & Delivery

**Content Delivery**:
- Static assets served from AWS CloudFront CDN
- Global edge locations for low-latency access
- Gzip/Brotli compression for text assets
- HTTP/2 for multiplexed connections

**File Storage**:
- Supabase Storage for documents (CVs, PHFs)
- Azure Blob Storage for videos (streaming optimized)
- Progressive loading for large PDFs
- Signed URLs with expiration for security

## Monitoring & Operations

### System Monitoring

**Supabase Dashboard**:
- Database performance metrics (query time, connection count)
- API request volume and error rates
- Storage usage and bandwidth
- Edge function execution logs and errors

**AWS Amplify Console**:
- Build success/failure logs
- Deployment history and rollback capability
- Custom domain configuration and SSL status
- Traffic analytics (requests, bandwidth)

**Application-Level Monitoring**:
- Audit logs table for all critical operations
- Browser console logging (errors, warnings)
- User session tracking
- Application error boundaries catch React errors

### Backup & Recovery

**Database Backups**:
- Automatic daily backups (Supabase)
- Point-in-time recovery (7-day window)
- Manual backup capability via Supabase dashboard
- Backup verification via restore testing

**Storage Backups**:
- Azure Blob Storage geo-replication
- Redundant storage across availability zones
- Snapshot capability for point-in-time recovery

**Application Rollback**:
- Amplify maintains deployment history
- One-click rollback to previous version
- Zero-downtime rollback process
- Git history allows rebuild from any commit

### Disaster Recovery Procedures

**Database Recovery**:
1. Access Supabase dashboard
2. Navigate to Database → Backups
3. Select backup timestamp
4. Initiate restore process
5. Verify data integrity
6. Update application if schema changed

**Application Recovery**:
1. Access Amplify console
2. View deployment history
3. Select stable version
4. Click "Redeploy"
5. Monitor build and deployment
6. Verify application functionality

## Cost Structure

### Infrastructure Costs

**Supabase** (Primary Backend):
- Pro Plan: $25/month base fee
- Database: Included up to 8GB, then usage-based
- Storage: $0.021/GB/month
- Bandwidth: $0.09/GB
- Edge Functions: Included up to 500K requests/month

**AWS Amplify** (Frontend Hosting):
- Build minutes: $0.01/minute (first 1000 free)
- Hosting: $0.15/GB served
- Custom domain: Included
- SSL certificates: Included

**Azure Blob Storage** (Video Storage):
- Storage: ~$0.02/GB/month (hot tier)
- Bandwidth: ~$0.087/GB egress
- Operations: Per-request pricing (minimal)

**SendGrid** (Email):
- Free tier: 100 emails/day
- Essentials plan: $19.95/month for 50K emails

### Optimization Strategies

**Asset Compression**:
- Brotli compression for text assets (20-25% smaller than Gzip)
- WebP images with fallback (30% smaller than JPEG)
- Minified JavaScript and CSS
- Tree-shaking removes unused code

**Caching**:
- Aggressive CDN caching (reduces bandwidth)
- React Query caching (reduces API calls)
- Browser caching (reduces repeat requests)

**Database Efficiency**:
- Connection pooling (reduces connection overhead)
- Selective column queries (reduces data transfer)
- Indexed queries (faster execution)

**Data Lifecycle**:
- Archive old applications after retention period
- Compress historical data
- Delete temporary files after processing
