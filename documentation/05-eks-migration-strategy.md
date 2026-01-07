# EKS Migration Strategy

## Overview

This document outlines the migration strategy for transitioning UNICCConnect (HireFlow) from AWS Amplify + Supabase Cloud to a self-hosted deployment on AWS EKS. The migration preserves all existing functionality while enabling:

- Deployment via Bitbucket Pipelines
- Self-hosted Supabase as a shared platform for multiple projects
- Deno runtime for Edge Functions on EKS
- Continued development using Lovable (via GitHub mirroring)

## Architecture Comparison

### Current State

```
Lovable → GitHub → AWS Amplify (Frontend)
                 → Supabase Cloud (Backend, Auth, Storage, Functions)
```

### Target State

```
Lovable → GitHub ←→ Bitbucket (mirror) → Bitbucket Pipelines → AWS EKS
                                                                  ├── Frontend (nginx)
                                                                  ├── Supabase Platform (shared)
                                                                  │   ├── PostgreSQL (RDS)
                                                                  │   ├── GoTrue (Auth)
                                                                  │   ├── PostgREST (API)
                                                                  │   ├── Storage API
                                                                  │   └── Realtime
                                                                  └── Deno Functions (containerized)
```

## Migration Phases

### Phase 1: Repository Mirroring Setup

**Objective**: Establish bidirectional sync between GitHub and Bitbucket while maintaining Lovable compatibility.

**Steps**:

1. Create Bitbucket repository mirroring the existing GitHub repository
2. Configure automatic sync from GitHub to Bitbucket (push-based or scheduled)
3. Validate that commits from Lovable (pushed to GitHub) appear in Bitbucket
4. Establish branch protection rules on both repositories (main, staging, develop)

**Git Flow**:

```
Developer workflow:
  Local → GitHub → (auto-mirror) → Bitbucket → Pipeline triggers

Lovable workflow:
  Lovable → GitHub → (auto-mirror) → Bitbucket → Pipeline triggers
```

**Safeguards**:

- GitHub remains source of truth for Lovable
- Bitbucket is read-only mirror (no direct pushes)
- Mirror sync runs on schedule or webhook trigger
- Alerting on sync failures

---

### Phase 2: Supabase Platform Deployment

**Objective**: Deploy self-hosted Supabase on EKS as a shared platform service.

**Components to Deploy**:

| Service | Purpose | External Dependency |
|---------|---------|---------------------|
| PostgreSQL | Database | AWS RDS (managed) |
| GoTrue | Authentication + MFA | SMTP for emails |
| PostgREST | Auto-generated REST API | None |
| Storage API | File uploads/downloads | AWS S3 |
| Realtime | WebSocket subscriptions | None |
| Kong | API Gateway | None |
| Studio | Admin dashboard | None (optional) |

**Steps**:

1. Provision AWS RDS PostgreSQL instance (Multi-AZ for production)
2. Create S3 bucket for file storage with appropriate IAM policies
3. Deploy Supabase services to EKS using official Docker images
4. Configure Kong API Gateway for routing and rate limiting
5. Generate project credentials (anon key, service role key, JWT secret)
6. Configure SMTP for authentication emails (password reset, verification)
7. Enable MFA/TOTP in GoTrue configuration
8. Deploy Supabase Studio for database administration

**Safeguards**:

- RDS automated backups with 7-day retention
- S3 versioning enabled
- Secrets stored in AWS Secrets Manager or K8s Secrets
- Network policies restricting inter-service communication
- Health checks and readiness probes on all services

---

### Phase 3: Database Migration

**Objective**: Migrate schema and data from Supabase Cloud to self-hosted PostgreSQL.

**Steps**:

1. Export schema from Supabase Cloud using pg_dump (schema only)
2. Apply all 217 migration files from `supabase/migrations/` to RDS
3. Verify RLS policies are correctly applied
4. Verify all database functions (RPC calls) are present
5. Export data from Supabase Cloud (during maintenance window)
6. Import data to RDS PostgreSQL
7. Validate row counts and data integrity
8. Update sequences to continue from correct values

**Safeguards**:

- Run migration on staging environment first
- Create RDS snapshot before data import
- Validate critical queries return expected results
- Test RLS policies with different user roles
- Parallel run period: keep Supabase Cloud active during validation

---

### Phase 4: Deno Functions Containerization

**Objective**: Deploy existing Edge Functions as containerized Deno services on EKS.

**Approach**:

Each function (or logical group of functions) becomes a containerized service using the official `denoland/deno` Docker image. Minimal code changes are required — primarily updating environment variable references and adding health check endpoints for Kubernetes probes.

**Function Groups** (recommended grouping for deployment):

| Service | Functions Included |
|---------|-------------------|
| email-service | send-video-invite, send-application-confirmation, send-pd-reminder, send-assessment-invite, send-bulk-talent-email, send-chief-hr-review-notification, send-hm-review-reminder, send-job-alert, send-requisition-notification, test-email-notification |
| document-service | export-phf-pdf, generate-requisition-pdf, parse-phf-document, pdf-to-images, pdf-page-image |
| scoring-service | score-application, trigger-batch-scoring, categorize-skills, generate-assessment-reply, generate-feedback-template |
| import-service | import-users-csv, import-staff-masterdb, import-whed-universities, import-user-skills |
| video-service | upload-video-answer, video-assignment-webhook, simulate-video-submissions, generate-fake-video-responses |
| utility-service | file-proxy, sync-calendar, create-audit-log, convert-requisition-to-job, notify-admin-new-signup |

**Steps**:

1. Create Dockerfile for each function group
2. Update functions to read PORT from environment variable
3. Add `/health` endpoint to each function for K8s probes
4. Build and push images to AWS ECR
5. Deploy as K8s Deployments with appropriate resource limits
6. Configure K8s Services for internal communication
7. Set up Ingress or API Gateway routing

**Safeguards**:

- Resource limits prevent runaway containers
- Horizontal Pod Autoscaler for traffic spikes
- Liveness and readiness probes
- Structured logging for observability
- Secrets injected via K8s Secrets (API keys for Resend, OpenAI)

---

### Phase 5: Frontend Deployment

**Objective**: Deploy React frontend to EKS with nginx.

**Steps**:

1. Create Dockerfile (multi-stage: build with Node, serve with nginx)
2. Configure nginx for SPA routing (all routes → index.html)
3. Build and push image to AWS ECR
4. Deploy as K8s Deployment with nginx container
5. Configure K8s Service and Ingress
6. Set up TLS termination (AWS ALB or cert-manager)
7. Configure CDN (CloudFront) in front of Ingress for caching

**Safeguards**:

- Multiple replicas for high availability
- Rolling update strategy for zero-downtime deployments
- Health checks on nginx
- Static asset caching headers

---

### Phase 6: Frontend Configuration Updates

**Objective**: Update frontend to connect to self-hosted services.

**Files to Modify**:

| File | Change |
|------|--------|
| `src/integrations/supabase/client.ts` | Update SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to point to self-hosted endpoint |
| Environment variables | Add VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY for environment-specific configuration |

**Configuration Changes**:

Since we're maintaining the full Supabase stack (self-hosted), including the Functions API, the Supabase client SDK works identically to the cloud version. The only change needed is updating the endpoint URL and API keys:

```typescript
// Before (Supabase Cloud)
const SUPABASE_URL = "https://cxpnvbphjpntrvvgjhli.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// After (Self-hosted)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://supabase.eks.example.com";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "new-anon-key";
```

**No Function Invocation Changes Required**:

All 48 existing `supabase.functions.invoke()` calls remain unchanged. The Supabase Functions API (part of the self-hosted stack) handles routing to the containerized Deno services automatically through Kong API Gateway.

**Safeguards**:

- Environment-specific configuration (dev/staging/prod)
- Feature flags for gradual rollout
- Fallback to Supabase Cloud during transition (if needed)
- Backward compatibility maintained throughout migration

---

### Phase 7: CI/CD Pipeline Setup

**Objective**: Configure Bitbucket Pipelines for automated builds and deployments.

**Pipeline Stages**:

1. **Build & Test**: Install dependencies, run linting, run unit tests, build frontend, build Docker images
2. **Push Images**: Authenticate to AWS ECR, push frontend image, push function images
3. **Deploy to Environment**: Connect to EKS cluster, apply K8s manifests or update image tags, wait for rollout completion, run smoke tests

**Branch Strategy**:

| Branch | Environment | Trigger |
|--------|-------------|---------|
| develop | Development | Auto on push |
| staging | Staging | Auto on push |
| main | Production | Manual approval required |

**Safeguards**:

- Separate AWS credentials per environment
- Manual approval gate for production
- Rollback capability (keep previous image tags)
- Slack/Teams notifications on pipeline status
- Pipeline timeout limits

---

### Phase 8: Cutover and Validation

**Objective**: Switch production traffic from Amplify/Supabase Cloud to EKS.

**Pre-Cutover Checklist**:

- [ ] All services healthy in EKS production namespace
- [ ] Database migration complete and validated
- [ ] Storage files migrated to S3
- [ ] DNS TTL lowered (24-48 hours before cutover)
- [ ] Rollback plan documented and tested
- [ ] Stakeholders notified of maintenance window

**Cutover Steps**:

1. Enable maintenance mode on current production (optional)
2. Final data sync from Supabase Cloud to RDS
3. Update DNS to point to EKS Ingress/ALB
4. Verify application functionality
5. Monitor error rates and performance
6. Disable Supabase Cloud access (after validation period)

**Rollback Procedure**:

1. Revert DNS to AWS Amplify
2. Restore Supabase Cloud access
3. Document issues for resolution

**Safeguards**:

- Blue/green deployment: keep old environment running
- 24-48 hour parallel run before decommissioning old environment
- Real-time monitoring during cutover
- On-call team during cutover window

---

## Code Changes Summary

**Why Minimal Changes?**

By maintaining the full Supabase stack (self-hosted) and Deno runtime for Edge Functions, the application code remains largely unchanged. The Supabase client SDK and all APIs work identically whether connecting to Supabase Cloud or a self-hosted instance.

**Required Changes**:

1. **Frontend Configuration** (`src/integrations/supabase/client.ts`):
   - Update `SUPABASE_URL` to point to self-hosted endpoint
   - Update `SUPABASE_PUBLISHABLE_KEY` with new anon key from self-hosted instance
   - Use environment variables for multi-environment support

2. **Edge Functions** (30+ Deno functions):
   - Add `/health` endpoint for Kubernetes health checks
   - Ensure `PORT` environment variable is read (if not already)
   - **No business logic changes required**

**No Changes Required**:

- ❌ Database queries and RPC calls (PostgreSQL remains PostgreSQL)
- ❌ Row Level Security (RLS) policies
- ❌ Authentication flows (GoTrue handles auth identically)
- ❌ Storage API calls (Storage API is self-hosted)
- ❌ Realtime subscriptions
- ❌ Function invocations (48 `supabase.functions.invoke()` calls work as-is)

**New Infrastructure Files**:

- Dockerfiles for frontend and function services
- Kubernetes manifests (Deployments, Services, Ingress)
- nginx configuration for SPA routing
- Bitbucket Pipelines CI/CD configuration

---

## Shared Supabase Platform for Multiple Projects

The self-hosted Supabase deployment is designed as a shared platform for multiple projects, amortizing operational costs across teams.

**Multi-Project Setup**:

- Single Supabase platform deployment on EKS
- Separate PostgreSQL database per project (on same RDS instance)
- Separate JWT secrets and API keys per project
- S3 bucket with project prefixes for storage isolation
- Kong routing by subdomain or path prefix

**Onboarding New Projects**:

1. Create new database in RDS
2. Generate new JWT secret and API keys
3. Create S3 prefix and bucket policies
4. Add Kong route configuration
5. Provide credentials to project team

---

## Operational Considerations

### Monitoring

- Prometheus metrics from all services
- Grafana dashboards for visualization
- Alert rules for error rates, latency, resource usage
- Centralized logging (CloudWatch, ELK, or similar)

### Backup Strategy

| Component | Backup Method | Retention |
|-----------|---------------|-----------|
| PostgreSQL (RDS) | Automated snapshots | 7 days |
| S3 Storage | Versioning + cross-region replication | 30 days |
| K8s Manifests | Git repository | Indefinite |
| Secrets | AWS Secrets Manager versioning | 30 days |

### Disaster Recovery

- RDS Multi-AZ for database failover
- EKS nodes across multiple availability zones
- S3 cross-region replication (optional)
- Documented runbooks for recovery scenarios

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Repository Mirroring | 1-2 days | None |
| Phase 2: Supabase Platform | 3-5 days | EKS cluster, RDS, S3 |
| Phase 3: Database Migration | 2-3 days | Phase 2 |
| Phase 4: Deno Functions | 3-5 days | Phase 2, ECR |
| Phase 5: Frontend Deployment | 1-2 days | ECR, Ingress |
| Phase 6: Frontend Config | 1-2 days | Phase 4, Phase 5 |
| Phase 7: CI/CD Pipeline | 2-3 days | All previous phases |
| Phase 8: Cutover | 1 day | All previous phases |

**Total Estimated Duration**: 2-3 weeks (with buffer for issues)

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database migration data loss | Low | High | Multiple backups, validation queries, parallel run |
| Auth/MFA incompatibility | Medium | High | Test thoroughly in staging, document GoTrue config |
| Function invocation failures | Medium | Medium | Wrapper utility, comprehensive testing |
| Performance degradation | Low | Medium | Load testing before cutover, monitoring |
| Lovable generates incompatible code | Medium | Low | Manual review of Lovable commits, team awareness |

---

## Post-Migration Tasks

1. Update Confluence documentation with new architecture
2. Update runbooks for new infrastructure
3. Train team on EKS/kubectl operations
4. Decommission AWS Amplify hosting
5. Decommission Supabase Cloud project (after validation period)
6. Document lessons learned

---

*For the current architecture details, see [01-solution-architecture-overview.md](01-solution-architecture-overview.md). For data model information, see [02-data-model-and-mental-model.md](02-data-model-and-mental-model.md).*
