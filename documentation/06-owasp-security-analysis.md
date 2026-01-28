# OWASP Security Analysis - UNICCConnect (HireFlow)

**Document Version:** 1.0
**Date:** January 28, 2026
**Analysis Based On:** OWASP Top 10 2021
**System:** UNICCConnect Recruitment Platform
**Technology Stack:** React 18, TypeScript, Supabase (PostgreSQL), AWS Amplify, Deno Edge Functions

---

## Executive Summary

### Overall Security Posture: **MODERATE RISK** ⚠️

UNICCConnect demonstrates a modern, well-architected recruitment platform with several strong security foundations, including Row-Level Security (RLS) policies, JWT-based authentication, and encryption at rest. However, the analysis identified critical vulnerabilities and security gaps that require immediate attention.

### Risk Distribution
- **🔴 Critical Findings:** 2
- **🟠 High Findings:** 4
- **🟡 Medium Findings:** 8
- **🟢 Low Findings:** 3
- **✅ Security Strengths:** 6

### Key Recommendations Priority
1. **IMMEDIATE (24-48 hours):** Rotate exposed credentials, fix credential management
2. **SHORT-TERM (1 week):** Address authentication gaps, fix npm vulnerabilities
3. **MEDIUM-TERM (1 month):** Implement comprehensive security controls, enhance monitoring
4. **LONG-TERM (3 months):** Security hardening, compliance enhancements

---

## Detailed OWASP Top 10 Analysis

### A01:2021 – Broken Access Control

**Risk Rating:** 🟠 **HIGH**

#### Findings

**1. Hardcoded Email-Based Authorization Logic** 🟠 HIGH
- **Location:** `/supabase/migrations/20251218141959_46e09278-ff30-491b-9609-c55ab863d631.sql`
- **Issue:** The `can_approve_as_chief` database function contains hardcoded email addresses for approval authorization:
  ```sql
  CASE v_user_email
    WHEN 'soni@unicc.org' THEN RETURN v_req_division = 'CS';
    WHEN 'sethi@unicc.org' THEN RETURN v_req_division = 'DS';
    -- ... more hardcoded emails
  ```
- **Impact:**
  - Changes to approver permissions require database migrations
  - No audit trail for permission changes
  - Difficult to maintain as organization grows
  - Risk of stale permissions if employees leave
- **Evidence:** Lines 65-92 in migration file

**2. Client-Side Role Assignment** 🟡 MEDIUM
- **Location:** `/src/hooks/useAuth.tsx`
- **Issue:** Chief Division role assignment logic exists in frontend code:
  ```typescript
  const chiefDivisionEmails = [
    'grecuccio@unicc.org',
    'liuzzi@unicc.org',
    'sethi@unicc.org',
    'soni@unicc.org',
  ];
  if (email && chiefDivisionEmails.includes(email.toLowerCase())) {
    roles.push('Chief of Division');
  }
  ```
- **Impact:**
  - Role logic duplicated between client and server
  - Potential for desynchronization
  - Client-side logic can be manipulated
- **Evidence:** Lines 47-56 in `useAuth.tsx`

**3. Unauthenticated Edge Functions** 🟠 HIGH
- **Location:** `/supabase/config.toml`
- **Issue:** Multiple production functions have `verify_jwt = false`:
  - `video-assignment-webhook`
  - `send-video-invite`
  - `convert-requisition-to-job`
  - `send-requisition-notification`
  - Plus 10+ other functions
- **Impact:**
  - Functions can be invoked without authentication
  - Potential for unauthorized actions
  - No rate limiting on public endpoints
  - Vulnerable to abuse and replay attacks

**4. Missing Function-Level Authorization Checks** 🟡 MEDIUM
- **Issue:** Some edge functions lack explicit authorization verification beyond JWT validation
- **Impact:** Potential horizontal privilege escalation if a user manipulates IDs in requests

#### Positive Controls
✅ **Row-Level Security (RLS) Extensively Implemented**
- 475+ RLS policies across 74 migration files
- Comprehensive policy coverage for all tables
- Example policy structure:
  ```sql
  CREATE POLICY "candidates_view_own"
  ON applications FOR SELECT
  USING (candidate_id IN (
    SELECT id FROM candidates WHERE email = auth.jwt() ->> 'email'
  ));
  ```

✅ **Role-Based Access Control (RBAC)**
- 6 distinct roles: Admin, Chief of HR, HR Assistant, Hiring Manager, Panel Member, Candidate
- Hierarchical permission structure
- Database-enforced via RLS policies

#### Recommendations

**IMMEDIATE:**
1. Create `approval_permissions` table to replace hardcoded email logic
2. Implement admin UI for managing approvers and permissions
3. Add audit logging for all permission changes

**SHORT-TERM:**
1. Enable JWT verification (`verify_jwt = true`) for all production functions
2. Implement webhook signature validation for external webhooks
3. Move role assignment logic entirely to backend
4. Add function-level authorization checks in edge functions

**MEDIUM-TERM:**
1. Implement attribute-based access control (ABAC) for complex scenarios
2. Add automated tests for access control policies
3. Conduct access control audit of all endpoints
4. Implement principle of least privilege review

---

### A02:2021 – Cryptographic Failures

**Risk Rating:** 🔴 **CRITICAL**

#### Findings

**1. Exposed Credentials in Source Control** 🔴 CRITICAL
- **Location:** `/.env` file (tracked in git)
- **Issue:**
  - `.env` file NOT in `.gitignore` (only `*.local` is ignored)
  - Contains Supabase URL and publishable API key
  - Credentials committed to version control
  - Also hardcoded in `/src/integrations/supabase/client.ts`:
    ```typescript
    const SUPABASE_URL = "https://cxpnvbphjpntrvvgjhli.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
    ```
- **Impact:**
  - Anyone with repository access has API access
  - Credentials exposed in git history
  - Potential for unauthorized database access
  - Service abuse possible
- **Evidence:** `.env` file exists and is tracked (not in `.gitignore`)

**2. Token Storage in localStorage** 🟡 MEDIUM
- **Location:** `/src/integrations/supabase/client.ts`
- **Issue:** Authentication tokens stored in localStorage instead of httpOnly cookies:
  ```typescript
  auth: {
    storage: localStorage,
    persistSession: true,
  }
  ```
- **Impact:**
  - Vulnerable to XSS attacks
  - Tokens accessible to JavaScript
  - No protection against token theft via XSS
- **Mitigation:** While React provides XSS protection, defense-in-depth suggests httpOnly cookies

**3. No Explicit Data-at-Rest Encryption Configuration** 🟢 LOW
- **Observation:** Relies on Supabase default encryption
- **Impact:** Minimal - Supabase provides encryption at rest by default
- **Recommendation:** Document encryption configuration for compliance

#### Positive Controls
✅ **TLS/SSL Encryption Enforced**
- All traffic over HTTPS
- AWS Amplify handles SSL/TLS termination
- Supabase connections encrypted in transit

✅ **Password Security**
- Supabase Auth handles password hashing (bcrypt)
- No plain-text passwords stored
- Password reset functionality uses secure tokens

✅ **Signed URLs for File Access**
- Temporary signed URLs for file downloads
- Time-limited access to storage objects
- Prevents direct file access

#### Recommendations

**IMMEDIATE (Within 24 hours):**
1. Add `.env` to `.gitignore`:
   ```gitignore
   .env
   .env.local
   .env.*.local
   ```
2. Rotate exposed Supabase credentials immediately
3. Remove hardcoded credentials from `client.ts`
4. Use environment variables exclusively (`import.meta.env.VITE_*`)
5. Scrub git history using BFG Repo-Cleaner or git-filter-repo

**SHORT-TERM:**
1. Implement httpOnly cookie storage for tokens
2. Add pre-commit hooks to prevent credential commits
3. Set up secret scanning (GitHub Secret Scanning, GitGuardian)

**MEDIUM-TERM:**
1. Implement field-level encryption for PII (personal identifiable information)
2. Document all encryption mechanisms for compliance
3. Add key rotation procedures

---

### A03:2021 – Injection

**Risk Rating:** 🟢 **LOW**

#### Findings

**1. Potential SQL Injection via Dynamic Queries** 🟢 LOW
- **Assessment:** Low risk due to Supabase client library's parameterized queries
- **Observation:** All database queries use Supabase client which uses prepared statements
- **Example (SAFE):**
  ```typescript
  await supabase
    .from('applications')
    .select('*')
    .eq('job_id', jobId)
  ```

**2. No Evidence of Command Injection** ✅
- Edge functions properly handle inputs
- No shell command execution found
- Deno runtime provides sandboxing

**3. Limited Use of dangerouslySetInnerHTML** 🟡 MEDIUM
- **Files:** 5 files use `dangerouslySetInnerHTML`
  - `/src/pages/JobDetail.tsx` - Job descriptions (markdown)
  - `/src/components/DocumentViewer.tsx` - PDF content display
  - `/src/components/EditableTrackChangesField.tsx` - Rich text editing
  - `/src/components/ui/chart.tsx` - Chart rendering
- **Mitigation:** DOMPurify library is used in at least one location:
  ```typescript
  import DOMPurify from 'dompurify';
  return DOMPurify.sanitize(highlighted, {...});
  ```
- **Risk:** Inconsistent sanitization across components

#### Positive Controls
✅ **Parameterized Queries**
- Supabase client uses prepared statements
- No raw SQL in frontend code
- Database functions use proper parameter binding

✅ **React's Built-in XSS Protection**
- JSX escaping by default
- Limited use of unsafe HTML rendering

✅ **Input Validation with Zod**
- TypeScript + Zod schema validation
- Client-side and server-side validation
- Type-safe form handling

✅ **DOMPurify Available**
- Library included in dependencies
- Used in at least one component

#### Recommendations

**SHORT-TERM:**
1. Audit all uses of `dangerouslySetInnerHTML`
2. Ensure DOMPurify sanitization before all HTML rendering
3. Create wrapper component for safe HTML rendering:
   ```typescript
   const SafeHTML = ({ html }) => (
     <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
   );
   ```

**MEDIUM-TERM:**
1. Add ESLint rule to flag `dangerouslySetInnerHTML` usage
2. Prefer `react-markdown` over HTML rendering where possible
3. Implement Content Security Policy (CSP) headers
4. Add input validation tests for all forms

---

### A04:2021 – Insecure Design

**Risk Rating:** 🟡 **MEDIUM**

#### Findings

**1. Test/Debug Functions in Production Code** 🟠 HIGH
- **Location:** `/supabase/functions/` directory
- **Issue:** Multiple test/simulation functions present:
  - `generate-test-applicants` - Creates fake test data
  - `cleanup-test-applicants` - Removes test data
  - `simulate-video-submissions` - Simulates video uploads
  - `simulate-slot-bookings` - Simulates interview bookings
  - `generate-fake-video-responses` - Creates fake videos
  - `test-email-notification` - Email testing
- **Impact:**
  - Can pollute production database
  - Increase attack surface
  - Confuse monitoring/logging
  - Potential for accidental execution
- **Evidence:** Functions exist in production codebase without environment gating

**2. Token-Based Video Access Without Additional Verification** 🟡 MEDIUM
- **Location:** Video interview flow
- **Design:** Candidates access video interviews via URL token only (no login required)
- **Current Controls:**
  - Cryptographically secure tokens (UUIDs)
  - Expiration via deadline
  - Activity tracking (opened_at, last_activity_at)
- **Risk:** Token leak could allow unauthorized access
- **Recommendation:** Add additional verification (email confirmation, CAPTCHA)

**3. No Rate Limiting Implementation** 🟡 MEDIUM
- **Issue:** No evidence of rate limiting on:
  - Login attempts
  - API endpoints
  - File uploads
  - Video submission
- **Impact:** Vulnerable to brute force and DoS attacks
- **Evidence:** No rate limiting middleware or configuration found

**4. Missing Security Headers** 🟡 MEDIUM
- **Issue:** No evidence of security headers configuration:
  - Content-Security-Policy (CSP)
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security (HSTS)
  - Referrer-Policy
- **Impact:** Increased XSS and clickjacking risk

#### Positive Controls
✅ **Secure Token Generation**
- Cryptographically secure UUIDs for video assignments
- Non-guessable, unique tokens

✅ **Multi-Stage Approval Workflow**
- 4-level approval chain for job requisitions
- Audit trail at each stage
- Proper segregation of duties

✅ **Panel Interview Diversity Validation**
- Database function validates panel composition
- Enforces diversity requirements (gender, division, nationality)
- Example:
  ```sql
  CREATE FUNCTION validate_panel_composition(p_job_id UUID)
  -- Checks: min 3 members, gender balance, division diversity
  ```

✅ **Comprehensive Audit Logging**
- `stage_events` table for application status changes
- `video_events` table for video assignment lifecycle
- `audit_logs` table for system-wide changes
- Complete reconstruction of history possible

#### Recommendations

**IMMEDIATE:**
1. Remove test functions from production deployment OR
2. Gate test functions with environment checks:
   ```typescript
   if (Deno.env.get('ENVIRONMENT') !== 'production') {
     // test function logic
   }
   ```

**SHORT-TERM:**
1. Implement rate limiting:
   - Login: 5 attempts per 15 minutes
   - API: 100 requests per minute per user
   - File upload: 10 files per hour
2. Add additional video access verification (email + token)
3. Implement security headers via Amplify configuration
4. Add CAPTCHA to public forms

**MEDIUM-TERM:**
1. Implement distributed rate limiting (Redis-based)
2. Add WAF (Web Application Firewall) rules
3. Implement anomaly detection for suspicious patterns
4. Create separate staging environment for test functions
5. Add request signing for webhook validation

---

### A05:2021 – Security Misconfiguration

**Risk Rating:** 🟠 **HIGH**

#### Findings

**1. TypeScript Strict Mode Disabled** 🟡 MEDIUM
- **Location:** `/tsconfig.json`
- **Configuration:**
  ```json
  {
    "noImplicitAny": false,
    "noUnusedParameters": false,
    "noUnusedLocals": false,
    "strictNullChecks": false
  }
  ```
- **Impact:**
  - Reduced type safety
  - Potential runtime errors from null/undefined access
  - Harder to catch bugs at compile time
  - Lower code maintainability

**2. CORS Wildcard Configuration** 🟡 MEDIUM
- **Location:** Edge functions (e.g., `/supabase/functions/video-assignment-webhook/index.ts`)
- **Configuration:**
  ```typescript
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
  };
  ```
- **Impact:** Allows requests from any origin
- **Risk:** Potential CSRF attacks, data leakage
- **Recommendation:** Restrict to known domains

**3. Excessive Console Logging** 🟡 MEDIUM
- **Finding:** 211 `console.log` statements in source code
- **Impact:**
  - Potential information leakage in production
  - Performance overhead
  - Cluttered browser console for users
- **Evidence:** Found via code analysis
- **Examples throughout codebase:**
  ```typescript
  console.log('User role:', userProfile?.role);
  console.log('Application data:', application);
  ```

**4. npm Package Vulnerabilities** 🔴 CRITICAL
- **Issue:** Known vulnerabilities in dependencies
- **Affected Packages:**
  - `xlsx` - HIGH severity (Prototype Pollution, ReDoS)
  - `mdast-util-to-hast` - MODERATE severity (Unsanitized class attribute)
- **Impact:**
  - Prototype pollution can lead to security bypasses
  - ReDoS can cause denial of service
- **Evidence:** From npm audit results in code analysis document

**5. Generic Package Name** 🟢 LOW
- **Location:** `/package.json`
- **Issue:** Package name is `vite_react_shadcn_ts` (boilerplate name)
- **Impact:** Minimal - confusion only
- **Recommendation:** Update to `unicc-hireflow`

#### Positive Controls
✅ **Environment Separation**
- Three isolated environments: dev, staging, production
- Separate Supabase projects per environment
- Environment-specific configuration

✅ **Dependency Management**
- Structured package.json with version pinning
- DOMPurify included for XSS prevention
- Modern, maintained dependencies

✅ **Build Optimization**
- Vite for optimized builds
- Code splitting implemented
- Asset optimization (minification, tree-shaking)

#### Recommendations

**IMMEDIATE:**
1. Fix npm vulnerabilities:
   ```bash
   npm audit fix
   ```
2. Evaluate alternatives to `xlsx` library (e.g., `exceljs`)
3. Add npm audit to CI/CD pipeline

**SHORT-TERM:**
1. Enable TypeScript strict mode gradually:
   - Start with `strictNullChecks`
   - Add `noImplicitAny`
   - Clean up violations file by file
2. Replace CORS wildcard with specific origins:
   ```typescript
   const allowedOrigins = [
     'https://uniccconnect.com',
     'https://staging.uniccconnect.com'
   ];
   ```
3. Implement structured logging:
   - Use logging library (winston, pino)
   - Environment-based log levels
   - Remove console.log in production

**MEDIUM-TERM:**
1. Add ESLint rules:
   - `no-console`
   - `@typescript-eslint/strict-boolean-expressions`
   - Security plugins (eslint-plugin-security)
2. Implement dependency scanning (Snyk, Dependabot)
3. Add security headers configuration
4. Create security configuration checklist

---

### A06:2021 – Vulnerable and Outdated Components

**Risk Rating:** 🟠 **HIGH**

#### Findings

**1. High-Severity Vulnerability in xlsx** 🔴 CRITICAL
- **Package:** `xlsx` (any version)
- **Vulnerabilities:**
  - Prototype Pollution
  - Regular Expression Denial of Service (ReDoS)
- **Usage:** Excel file parsing/generation (package.json line 76)
- **Impact:**
  - Attackers can pollute object prototypes
  - ReDoS can cause application freeze
  - May affect PHF document parsing

**2. Moderate Vulnerability in mdast-util-to-hast** 🟡 MEDIUM
- **Package:** `mdast-util-to-hast` versions 13.0.0 - 13.2.0
- **Vulnerability:** Unsanitized class attribute
- **Impact:** Potential XSS via markdown rendering
- **Usage:** Markdown processing (transitive dependency)

**3. No Automated Dependency Scanning** 🟡 MEDIUM
- **Issue:** No evidence of automated vulnerability scanning in CI/CD
- **Recommendation:** Implement Dependabot, Snyk, or GitHub Advanced Security

#### Positive Controls
✅ **Modern, Maintained Stack**
- React 18 (latest stable)
- TypeScript 5.x
- Vite 5.x
- Supabase client SDK up-to-date
- Regular dependency updates evident in git history

✅ **Structured Dependency Management**
- package-lock.json for deterministic installs
- No deprecated packages observed
- Active maintenance of codebase

#### Recommendations

**IMMEDIATE:**
1. Run `npm audit fix` to address moderate vulnerabilities
2. Replace `xlsx` with safer alternative:
   - Option A: `exceljs` (more secure, actively maintained)
   - Option B: `@sheet/csv` (if only CSV needed)
   - Option C: Server-side processing with validation
3. Test Excel/PHF functionality after replacement

**SHORT-TERM:**
1. Enable GitHub Dependabot:
   ```yaml
   # .github/dependabot.yml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
       open-pull-requests-limit: 10
   ```
2. Add npm audit to CI/CD pipeline:
   ```yaml
   - name: Security Audit
     run: npm audit --audit-level=high
   ```
3. Document all third-party dependencies and their purposes

**MEDIUM-TERM:**
1. Implement automated security scanning (Snyk)
2. Create dependency update schedule (monthly reviews)
3. Add security review process for new dependencies
4. Implement SCA (Software Composition Analysis) in pipeline
5. Create vulnerability response playbook

---

### A07:2021 – Identification and Authentication Failures

**Risk Rating:** 🟡 **MEDIUM**

#### Findings

**1. Multi-Factor Authentication (MFA) Not Enforced** 🟡 MEDIUM
- **Observation:** MFA is supported but not required
- **Location:** `/src/hooks/useAuth.tsx` shows MFA handling logic but no enforcement
- **Evidence:**
  ```typescript
  // Check if user has MFA enabled
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp?.length > 0) {
    setMfaRequired(true);
  }
  ```
- **Impact:** Users with privileged roles (Admin, HR, Director) can operate without MFA
- **Risk:** Account takeover via compromised passwords

**2. No Password Complexity Requirements Visible** 🟡 MEDIUM
- **Issue:** No evidence of password policy enforcement
- **Expected Controls:**
  - Minimum length (12+ characters)
  - Complexity requirements
  - Password history
  - Breach password checking
- **Note:** May be handled by Supabase Auth (requires verification)

**3. Session Management Observations** 🟢 LOW
- **Token Refresh:** Automatic token refresh implemented
- **Session Storage:** localStorage (previously discussed in A02)
- **Session Timeout:** Relies on Supabase defaults (1 hour access token)
- **Recommendation:** Consider shorter timeout for admin roles

**4. No Account Lockout Visible** 🟡 MEDIUM
- **Issue:** No evidence of account lockout after failed login attempts
- **Impact:** Vulnerable to brute force attacks
- **Recommendation:** Implement progressive delays and lockout

#### Positive Controls
✅ **JWT-Based Authentication**
- Secure token-based authentication
- Access tokens with 1-hour expiry
- Refresh token mechanism
- Supabase Auth handles token validation

✅ **Supabase Auth Security**
- Industry-standard bcrypt password hashing
- Secure password reset flow
- Email verification for new accounts
- Built-in protection against common attacks

✅ **Role-Based Session Management**
- User roles fetched after authentication
- Role verification for each request
- Session tied to user profile

✅ **MFA Support Implemented**
- TOTP-based MFA available
- Graceful handling of MFA challenges
- User can enroll MFA factors

#### Recommendations

**SHORT-TERM:**
1. **Enforce MFA for privileged roles:**
   ```typescript
   // Require MFA for Admin, HR, Director
   if (['Admin', 'HR Assistant', 'Chief of HR', 'Director'].includes(role)) {
     if (!hasMFAEnabled) {
       requireMFASetup();
     }
   }
   ```
2. Implement progressive rate limiting on login attempts
3. Add CAPTCHA after 3 failed attempts
4. Display last login information to users

**MEDIUM-TERM:**
1. Enforce password complexity:
   - Minimum 12 characters
   - Mix of upper/lower/numbers/symbols
   - Check against breach databases (HaveIBeenPwned API)
2. Implement account lockout policy:
   - 5 failed attempts → 15-minute lockout
   - Admin notification for repeated failures
3. Add session management features:
   - View active sessions
   - Remote session termination
   - Anomaly detection (unusual locations/devices)
4. Implement adaptive authentication (risk-based)

**LONG-TERM:**
1. Consider passwordless authentication (WebAuthn)
2. Implement device fingerprinting
3. Add behavioral biometrics
4. SSO integration for enterprise customers

---

### A08:2021 – Software and Data Integrity Failures

**Risk Rating:** 🟡 **MEDIUM**

#### Findings

**1. No Subresource Integrity (SRI) for CDN Assets** 🟡 MEDIUM
- **Issue:** Frontend assets served from CDN without integrity checks
- **Impact:** Potential CDN compromise could inject malicious code
- **Recommendation:** Add SRI hashes to script tags:
  ```html
  <script src="..." integrity="sha384-..." crossorigin="anonymous"></script>
  ```

**2. CI/CD Pipeline Security** 🟢 LOW-RISK
- **Positive:** AWS Amplify provides isolated build environment
- **Positive:** Separate branches for dev/staging/production
- **Concern:** No evidence of build artifact signing
- **Recommendation:** Implement build provenance tracking

**3. Database Migration Integrity** ✅
- **Positive:** Sequential, versioned migrations (233 files)
- **Positive:** Timestamp-based ordering
- **Positive:** Supabase manages migration checksums
- **Evidence:** Structured migration files in `/supabase/migrations/`

**4. File Upload Validation** 🟡 MEDIUM
- **Issue:** Limited evidence of comprehensive file validation
- **Observed Controls:**
  - File type checking (CV, PDF expected)
  - Size limits likely present
- **Missing:**
  - Content validation (magic byte checking)
  - Virus scanning
  - Metadata stripping
- **Risk:** Malicious file upload (though mitigated by storage in Supabase/Azure)

**5. No Evidence of Code Signing** 🟢 LOW
- **Issue:** Edge functions not code-signed
- **Impact:** Potential function tampering
- **Note:** Deno runtime provides some protection
- **Recommendation:** Implement function deployment verification

#### Positive Controls
✅ **Version Control Integrity**
- Git provides cryptographic integrity
- All code changes tracked in version control
- GitHub commit signing available (not verified if enabled)

✅ **Immutable Audit Logs**
- Audit trail tables track all changes
- Before/after state captured
- Timestamp and user attribution

✅ **Structured Deployment Pipeline**
- AWS Amplify automated deployments
- Branch-based deployment strategy
- Build artifacts generated consistently

✅ **Supabase Storage Integrity**
- File hashing built-in
- Signed URLs prevent tampering
- Encryption at rest

#### Recommendations

**SHORT-TERM:**
1. Implement comprehensive file upload validation:
   ```typescript
   // Validate file type by magic bytes, not extension
   const validateFile = async (file) => {
     const magicBytes = await readMagicBytes(file);
     return allowedMagicBytes.includes(magicBytes);
   };
   ```
2. Add virus scanning for uploads:
   - ClamAV integration
   - Cloud-based scanning (AWS S3 + Lambda)
3. Implement SRI for CDN assets
4. Enable Git commit signing for sensitive repos

**MEDIUM-TERM:**
1. Add build artifact signing and verification
2. Implement code signing for edge functions
3. Add supply chain security scanning (GitHub Advanced Security)
4. Document software bill of materials (SBOM)
5. Implement file metadata stripping

**LONG-TERM:**
1. Implement reproducible builds
2. Add provenance attestation (SLSA framework)
3. Implement tamper-evident logging
4. Add runtime integrity monitoring

---

### A09:2021 – Security Logging and Monitoring Failures

**Risk Rating:** 🟡 **MEDIUM**

#### Findings

**1. Limited Centralized Logging** 🟡 MEDIUM
- **Issue:** No evidence of centralized logging infrastructure
- **Observed:**
  - 211 console.log statements (as security events not suitable)
  - Database audit logs (good, but limited to data changes)
  - No application-level security event logging
- **Missing Events:**
  - Failed login attempts
  - Authorization failures
  - Input validation failures
  - Security-relevant configuration changes
- **Impact:** Difficult to detect and respond to attacks

**2. No Security Monitoring/SIEM** 🟠 HIGH
- **Issue:** No evidence of security monitoring or SIEM integration
- **Missing Capabilities:**
  - Real-time threat detection
  - Anomaly detection
  - Alert correlation
  - Incident response automation
- **Impact:** Delayed threat detection and response

**3. Insufficient Audit Trail for Authentication Events** 🟡 MEDIUM
- **Issue:** Limited authentication event logging
- **Observed:** Basic Supabase Auth logging
- **Missing:**
  - Failed login attempts tracking
  - Session anomaly detection
  - Account enumeration attempts
  - Password reset abuse detection

**4. No Evidence of Log Retention Policy** 🟢 LOW
- **Issue:** No documented log retention requirements
- **Recommendation:** Define retention based on compliance needs (typically 1-3 years)

**5. Log Integrity Not Addressed** 🟡 MEDIUM
- **Issue:** Audit logs stored in PostgreSQL tables
- **Risk:** Privileged users could potentially modify logs
- **Recommendation:** Implement immutable logging (append-only, write-once)

#### Positive Controls
✅ **Comprehensive Database Audit Logging**
- Three audit mechanisms:
  - `stage_events` - Application status changes
  - `video_events` - Video assignment lifecycle
  - `audit_logs` - System-wide change tracking
- Before/after state capture
- User attribution for all changes
- Timestamp tracking

✅ **Supabase Monitoring Dashboard**
- Database performance metrics
- API request volume
- Error rates
- Edge function execution logs
- Storage usage tracking

✅ **AWS Amplify Console Logging**
- Build logs
- Deployment history
- Access logs
- Performance metrics

#### Recommendations

**SHORT-TERM:**
1. **Implement structured logging library:**
   ```typescript
   import winston from 'winston';

   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.Console(),
       new winston.transports.File({ filename: 'security.log' })
     ]
   });

   // Security event logging
   logger.warn('Failed login attempt', {
     email,
     ip: req.ip,
     timestamp: new Date()
   });
   ```

2. **Define security events to log:**
   - Authentication: Login (success/failure), logout, MFA challenges
   - Authorization: Permission denied, role changes
   - Data Access: Sensitive data viewed/downloaded
   - Configuration: Security setting changes
   - Input: Validation failures, potential injection attempts
   - File Operations: Upload, download, delete

3. **Implement log forwarding to SIEM:**
   - CloudWatch Logs for AWS resources
   - Datadog, Splunk, or ELK stack for application logs

**MEDIUM-TERM:**
1. Implement real-time security monitoring:
   - Failed login rate alerts
   - Unusual access pattern detection
   - Data exfiltration monitoring
   - Privilege escalation detection

2. Create incident response playbook:
   - Automated alert routing
   - Escalation procedures
   - Evidence preservation
   - Communication templates

3. Implement log aggregation and correlation:
   - Centralized log management
   - Cross-system event correlation
   - Automated anomaly detection

4. Add user activity monitoring:
   - Session replay for security events
   - Admin action logging
   - Privileged operation audit trail

**LONG-TERM:**
1. Implement AI-based threat detection
2. Add user and entity behavior analytics (UEBA)
3. Implement Security Operations Center (SOC) integration
4. Add compliance reporting automation
5. Implement log immutability (WORM storage)

---

### A10:2021 – Server-Side Request Forgery (SSRF)

**Risk Rating:** 🟢 **LOW**

#### Findings

**1. Limited External Request Functionality** ✅
- **Observation:** Application primarily interacts with known services:
  - Supabase (database, auth, storage)
  - SendGrid (email)
  - Azure Blob Storage (video storage)
- **Risk:** Low SSRF risk due to limited outbound requests
- **Evidence:** No user-controlled URL inputs found in edge functions

**2. File Proxy Function** 🟡 MEDIUM
- **Location:** `/supabase/functions/file-proxy/index.ts`
- **Purpose:** Proxies file uploads to Azure Blob Storage
- **Concern:** Proxy functions can be SSRF vectors if not properly validated
- **Recommendation:** Review implementation for:
  - URL validation
  - Destination whitelisting
  - Response size limits
  - Timeout configuration

**3. PDF Processing Services** 🟢 LOW
- **Functions:** `parse-phf-document`, `pdf-to-images`, `pdf-page-image`
- **Risk:** PDF parsing libraries can be exploited
- **Mitigation:** Deno runtime sandboxing provides isolation
- **Recommendation:** Keep PDF libraries updated

**4. No Webhook URL Validation** 🟡 MEDIUM
- **Issue:** Video assignment webhook endpoint accepts callbacks
- **Location:** `video-assignment-webhook`
- **Risk:** Could be exploited for SSRF if webhook URLs are user-controlled
- **Recommendation:** Validate webhook origins

#### Positive Controls
✅ **Deno Runtime Sandboxing**
- Edge functions run in isolated Deno environment
- Limited file system access
- Network access controlled
- Reduces SSRF impact

✅ **Known Service Integration**
- Hardcoded service URLs
- No user-controlled URLs in requests
- API keys managed securely

✅ **Supabase Client Abstraction**
- Database access via client library
- No raw connection strings exposed
- Connection pooling managed

#### Recommendations

**SHORT-TERM:**
1. Review and test `file-proxy` function:
   ```typescript
   // Implement URL whitelist
   const allowedHosts = ['blob.core.windows.net'];

   const isAllowedUrl = (url) => {
     const hostname = new URL(url).hostname;
     return allowedHosts.some(host => hostname.endsWith(host));
   };
   ```

2. Add webhook signature validation:
   ```typescript
   // Validate webhook signatures
   const validateWebhook = (payload, signature, secret) => {
     const expectedSignature = hmac(secret, payload);
     return timingSafeEqual(signature, expectedSignature);
   };
   ```

3. Implement request timeout and size limits:
   ```typescript
   fetch(url, {
     timeout: 5000, // 5 seconds
     size: 10485760 // 10MB max
   });
   ```

**MEDIUM-TERM:**
1. Implement egress filtering at network level
2. Add request logging for all external calls
3. Implement destination domain whitelisting
4. Add SSRF protection in WAF rules
5. Regular security testing for SSRF vulnerabilities

**LONG-TERM:**
1. Implement service mesh for microservices architecture
2. Add network segmentation
3. Implement Zero Trust network architecture

---

## Additional Security Concerns

### Business Logic Vulnerabilities

**Risk Rating:** 🟡 **MEDIUM**

#### Findings

**1. Race Conditions in Panel Interview Slot Booking** 🟡 MEDIUM
- **Issue:** Multiple candidates could potentially book the same slot simultaneously
- **Location:** Panel interview booking flow
- **Current Mitigation:** Optimistic UI updates and database transaction
- **Recommendation:** Implement database-level locking or use `SELECT FOR UPDATE`

**2. Token Reuse in Video Assignments** 🟢 LOW-RISK
- **Observation:** Video tokens are single-use by status, not explicit flag
- **Current Control:** Status progression prevents reuse
- **Recommendation:** Add explicit `used` flag for clarity

**3. Application Status Manipulation** 🟢 LOW-RISK
- **Control:** RLS policies prevent unauthorized status changes
- **Audit:** All changes logged in `stage_events`
- **Assessment:** Well-controlled

#### Recommendations

**SHORT-TERM:**
1. Add pessimistic locking for slot booking:
   ```sql
   SELECT * FROM panel_interview_time_slots
   WHERE id = $1 AND status = 'available'
   FOR UPDATE SKIP LOCKED;
   ```

2. Implement business logic validation tests
3. Add concurrency test scenarios

---

## Security Strengths

The solution demonstrates several security best practices:

### ✅ 1. Defense in Depth
- **Multiple layers:** Frontend validation, API validation, RLS policies, database constraints
- **Audit trail:** Comprehensive logging at multiple levels
- **Segregation of duties:** Multi-level approval workflows

### ✅ 2. Modern Security Architecture
- **JWT-based authentication:** Industry-standard, stateless
- **Row-Level Security:** Database-level access control
- **Edge Functions:** Serverless, isolated execution
- **Encrypted communications:** TLS/SSL throughout

### ✅ 3. Secure Development Practices
- **Type safety:** TypeScript throughout codebase
- **Input validation:** Zod schemas for all forms
- **Version control:** Git with structured branching
- **Environment separation:** Dev/staging/production isolation

### ✅ 4. Data Protection
- **Encryption at rest:** Supabase default encryption
- **Encryption in transit:** HTTPS/WSS for all communications
- **Signed URLs:** Time-limited access to storage
- **Password security:** Bcrypt hashing via Supabase Auth

### ✅ 5. Compliance-Ready Features
- **Audit logs:** Immutable audit trail
- **Data retention:** Structured data lifecycle
- **GDPR considerations:** Consent tracking, data access controls
- **Panel diversity enforcement:** Fair hiring practices validation

### ✅ 6. Scalable Security
- **CDN distribution:** AWS Amplify for DDoS protection
- **Connection pooling:** Managed by Supabase
- **Caching strategy:** React Query reduces load
- **Rate limiting infrastructure:** Foundation for implementation

---

## Risk Summary Matrix

| OWASP Category | Risk Rating | Critical Findings | High Findings | Medium Findings |
|---|---|---|---|---|
| A01: Broken Access Control | 🟠 HIGH | 0 | 2 | 2 |
| A02: Cryptographic Failures | 🔴 CRITICAL | 1 | 0 | 1 |
| A03: Injection | 🟢 LOW | 0 | 0 | 1 |
| A04: Insecure Design | 🟡 MEDIUM | 0 | 1 | 3 |
| A05: Security Misconfiguration | 🟠 HIGH | 1 | 0 | 3 |
| A06: Vulnerable Components | 🟠 HIGH | 1 | 0 | 2 |
| A07: Auth Failures | 🟡 MEDIUM | 0 | 0 | 4 |
| A08: Integrity Failures | 🟡 MEDIUM | 0 | 0 | 3 |
| A09: Logging Failures | 🟡 MEDIUM | 0 | 1 | 3 |
| A10: SSRF | 🟢 LOW | 0 | 0 | 2 |
| **TOTAL** | | **3** | **4** | **24** |

---

## Remediation Roadmap

### Phase 1: IMMEDIATE (24-48 hours) 🔴

**Priority:** Critical security issues that pose immediate risk

1. **Rotate Exposed Credentials**
   - Rotate Supabase project keys
   - Update all environments with new credentials
   - Notify team of security incident

2. **Fix Credential Management**
   - Add `.env` to `.gitignore`
   - Remove hardcoded credentials from `client.ts`
   - Use environment variables exclusively
   - Scrub git history with BFG Repo-Cleaner

3. **Address Critical npm Vulnerabilities**
   - Run `npm audit fix`
   - Replace or update `xlsx` library
   - Test Excel/PHF functionality

**Estimated Effort:** 4-8 hours
**Risk Reduction:** HIGH

---

### Phase 2: SHORT-TERM (1 week) 🟠

**Priority:** High-risk issues requiring immediate planning and implementation

1. **Authentication & Authorization (16 hours)**
   - Enable JWT verification for all production functions
   - Implement webhook signature validation
   - Move role logic entirely to backend
   - Create approval permissions table
   - Add function-level authorization checks

2. **Security Configuration (12 hours)**
   - Fix CORS wildcard (restrict to known domains)
   - Enable TypeScript `strictNullChecks`
   - Implement structured logging (replace console.log)
   - Add security headers via Amplify config
   - Remove/gate test functions from production

3. **Input Validation & Output Encoding (8 hours)**
   - Audit all `dangerouslySetInnerHTML` uses
   - Ensure DOMPurify sanitization everywhere
   - Create SafeHTML wrapper component
   - Add ESLint rules for unsafe patterns

4. **Monitoring & Detection (8 hours)**
   - Implement security event logging
   - Define critical security events
   - Set up log forwarding to SIEM/CloudWatch
   - Create initial alert rules

**Estimated Effort:** 44 hours (1 week)
**Risk Reduction:** HIGH

---

### Phase 3: MEDIUM-TERM (1 month) 🟡

**Priority:** Medium-risk issues and security enhancements

1. **Access Control Enhancements (20 hours)**
   - Build admin UI for permission management
   - Add audit logging for permission changes
   - Implement attribute-based access control (ABAC)
   - Add automated access control tests

2. **Authentication Hardening (16 hours)**
   - Enforce MFA for privileged roles
   - Implement progressive rate limiting
   - Add CAPTCHA after failed attempts
   - Implement password complexity requirements
   - Add account lockout policy
   - Display last login information

3. **Application Security (24 hours)**
   - Implement rate limiting (login, API, uploads)
   - Add comprehensive file upload validation
   - Integrate virus scanning (ClamAV or cloud-based)
   - Implement SRI for CDN assets
   - Add security headers (CSP, HSTS, etc.)
   - Implement pessimistic locking for slot booking

4. **Dependency Management (8 hours)**
   - Enable GitHub Dependabot
   - Add npm audit to CI/CD
   - Implement Snyk or similar scanning
   - Create dependency update schedule
   - Document security review process

5. **Monitoring & Incident Response (16 hours)**
   - Implement real-time security monitoring
   - Create incident response playbook
   - Add user activity monitoring
   - Implement log aggregation and correlation

**Estimated Effort:** 84 hours (3 weeks)
**Risk Reduction:** MEDIUM-HIGH

---

### Phase 4: LONG-TERM (3 months) 🟢

**Priority:** Strategic security improvements and compliance

1. **Security Architecture (40 hours)**
   - Complete TypeScript strict mode migration
   - Implement Zero Trust architecture
   - Add network segmentation
   - Implement service mesh (if adopting microservices)

2. **Advanced Authentication (32 hours)**
   - Consider passwordless authentication (WebAuthn)
   - Implement device fingerprinting
   - Add behavioral biometrics
   - SSO integration for enterprise

3. **Monitoring & Analytics (40 hours)**
   - Implement AI-based threat detection
   - Add UEBA (User and Entity Behavior Analytics)
   - SOC integration
   - Compliance reporting automation

4. **Software Supply Chain Security (24 hours)**
   - Implement build artifact signing
   - Add provenance attestation (SLSA)
   - Implement reproducible builds
   - Runtime integrity monitoring

5. **Data Protection (24 hours)**
   - Implement field-level encryption for PII
   - Add key rotation procedures
   - Implement log immutability (WORM)
   - Enhanced backup encryption

6. **Compliance & Documentation (32 hours)**
   - Security architecture documentation
   - Threat model development
   - Security control testing
   - Penetration testing
   - Compliance gap analysis (ISO 27001, SOC 2)

**Estimated Effort:** 192 hours (2-3 months)
**Risk Reduction:** MEDIUM (Strategic)

---

## Total Remediation Effort Estimate

| Phase | Duration | Effort | Priority |
|---|---|---|---|
| Phase 1: Immediate | 24-48 hours | 8 hours | 🔴 Critical |
| Phase 2: Short-term | 1 week | 44 hours | 🟠 High |
| Phase 3: Medium-term | 1 month | 84 hours | 🟡 Medium |
| Phase 4: Long-term | 3 months | 192 hours | 🟢 Strategic |
| **TOTAL** | **4 months** | **328 hours** | |

---

## Compliance Considerations

### GDPR (General Data Protection Regulation)

**Current Status:** Partially Compliant

**Strengths:**
✅ Consent tracking (application consents JSONB field)
✅ Data access controls via RLS
✅ Audit logging for data access
✅ Right to access (candidate can view own data)

**Gaps:**
❌ No documented data retention policy
❌ No automated data deletion process
❌ No data portability feature
❌ No breach notification procedure
❌ No DPO (Data Protection Officer) documented

**Recommendations:**
1. Document data retention schedules
2. Implement automated data deletion
3. Add data export functionality
4. Create GDPR compliance documentation
5. Establish breach notification procedures

### ISO 27001 Information Security Management

**Current Status:** Foundational controls present

**Implemented Controls:**
✅ Access control (A.9)
✅ Cryptography (A.10)
✅ Operational security (A.12 - partial)
✅ System acquisition and development (A.14 - partial)

**Missing Controls:**
❌ Information security policies (A.5)
❌ Asset management (A.8)
❌ Incident management (A.16)
❌ Business continuity (A.17)
❌ Compliance (A.18)

**Recommendations:**
1. Develop information security policy framework
2. Create asset inventory and classification
3. Establish incident response procedures
4. Develop business continuity plan
5. Conduct ISO 27001 gap analysis

### SOC 2 Trust Services Criteria

**Current Status:** Partial alignment

**Security Criteria Status:**
✅ Logical access controls
✅ Encryption
⚠️ Monitoring (needs enhancement)
❌ Change management documentation
❌ Risk assessment process

**Recommendations:**
1. Document change management process
2. Formalize risk assessment procedures
3. Enhance monitoring and alerting
4. Create control testing procedures
5. Engage SOC 2 auditor for gap analysis

---

## Testing Recommendations

### Security Testing Program

**1. Static Application Security Testing (SAST)**
- Tool: SonarQube, Snyk Code, or Semgrep
- Frequency: Every commit (CI/CD integration)
- Focus: Code vulnerabilities, secrets detection

**2. Dynamic Application Security Testing (DAST)**
- Tool: OWASP ZAP, Burp Suite, or Acunetix
- Frequency: Weekly on staging environment
- Focus: Runtime vulnerabilities, OWASP Top 10

**3. Software Composition Analysis (SCA)**
- Tool: Snyk, Dependabot, or WhiteSource
- Frequency: Daily dependency checks
- Focus: Vulnerable dependencies

**4. Penetration Testing**
- Frequency: Annually or after major releases
- Scope: Full application, infrastructure, APIs
- Type: Gray-box testing with credentials

**5. Security Code Review**
- Frequency: All pull requests
- Focus: Security-critical code paths
- Tool: GitHub Security Code Scanning

**6. Infrastructure Security Scanning**
- Tool: AWS Security Hub, Prowler
- Frequency: Weekly
- Focus: Cloud misconfigurations

---

## Security Metrics & KPIs

### Recommended Security Metrics

**1. Vulnerability Metrics**
- Time to detect vulnerabilities (Target: < 24 hours)
- Time to remediate critical vulnerabilities (Target: < 48 hours)
- Time to remediate high vulnerabilities (Target: < 1 week)
- Number of open vulnerabilities by severity

**2. Authentication Metrics**
- Failed login attempts per hour
- MFA adoption rate (Target: 100% for privileged roles)
- Password reset requests per day
- Account lockout events

**3. Access Control Metrics**
- Authorization failures per day
- Privilege escalation attempts
- RLS policy violations
- Unusual data access patterns

**4. Monitoring Metrics**
- Mean time to detect (MTTD) incidents (Target: < 1 hour)
- Mean time to respond (MTTR) (Target: < 4 hours)
- False positive rate (Target: < 10%)
- Security alert volume

**5. Compliance Metrics**
- Audit log completeness (Target: 100%)
- Policy compliance rate
- Security training completion rate
- Incident response drill frequency

---

## Conclusion

UNICCConnect (HireFlow) is a well-architected, feature-rich recruitment platform built on modern, secure technologies. The solution demonstrates strong foundational security practices including:

- ✅ Comprehensive Row-Level Security (RLS) implementation
- ✅ JWT-based authentication with MFA support
- ✅ Extensive audit logging and compliance features
- ✅ Secure multi-stage approval workflows
- ✅ Modern, maintainable tech stack

However, the analysis identified **3 critical** and **4 high-risk** findings that require immediate attention:

### Critical Actions Required:
1. **Credential Management** - Rotate exposed Supabase credentials and fix .env handling
2. **npm Vulnerabilities** - Address high-severity vulnerabilities in `xlsx` package
3. **Access Control** - Fix hardcoded authorization logic and enable JWT verification

### Overall Assessment:

With the identified issues remediated according to the phased roadmap, UNICCConnect can achieve a **strong security posture** appropriate for handling sensitive recruitment data. The recommended 4-phase remediation approach will:

- **Eliminate critical vulnerabilities** (Phase 1-2: 2 weeks)
- **Strengthen authentication and access control** (Phase 2-3: 5 weeks)
- **Enhance monitoring and incident response** (Phase 3: 1 month)
- **Achieve strategic security maturity** (Phase 4: 3 months)

Total estimated effort: **328 hours** over **4 months**

### Risk Acceptance:
Some residual risks will remain even after remediation. These should be formally documented and accepted by management, with compensating controls where appropriate.

---

## Document Approval

This security analysis should be reviewed and approved by:

- [ ] Chief Information Security Officer (CISO)
- [ ] IT Director
- [ ] Development Team Lead
- [ ] Chief of HR (as system owner)
- [ ] Legal/Compliance Officer

---

## Appendix A: References

**OWASP Resources:**
- OWASP Top 10 2021: https://owasp.org/Top10/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Testing Guide: https://owasp.org/www-project-web-security-testing-guide/

**Technology Documentation:**
- Supabase Security: https://supabase.com/docs/guides/platform/security
- React Security: https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
- Deno Security: https://deno.land/manual/runtime/permission_apis

**Compliance Frameworks:**
- GDPR: https://gdpr.eu/
- ISO 27001: https://www.iso.org/isoiec-27001-information-security.html
- SOC 2: https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report.html

---

## Appendix B: Security Checklist

**Immediate Actions:**
- [ ] Rotate Supabase credentials
- [ ] Add .env to .gitignore
- [ ] Scrub git history of credentials
- [ ] Fix npm vulnerabilities (xlsx)
- [ ] Run npm audit fix

**Short-term Actions:**
- [ ] Enable JWT verification on all functions
- [ ] Create approval permissions table
- [ ] Fix CORS wildcard configuration
- [ ] Enable TypeScript strictNullChecks
- [ ] Implement structured logging
- [ ] Audit dangerouslySetInnerHTML usage
- [ ] Add security event logging
- [ ] Remove/gate test functions

**Medium-term Actions:**
- [ ] Enforce MFA for privileged roles
- [ ] Implement rate limiting
- [ ] Add file upload validation
- [ ] Implement virus scanning
- [ ] Add security headers
- [ ] Create incident response playbook
- [ ] Enable Dependabot
- [ ] Add npm audit to CI/CD

**Long-term Actions:**
- [ ] Complete TypeScript strict mode
- [ ] Implement UEBA
- [ ] Add SOC integration
- [ ] Conduct penetration testing
- [ ] Implement build signing
- [ ] Add field-level encryption
- [ ] Achieve compliance certifications

---

**Document End**

*This analysis was conducted using Claude Code AI on January 28, 2026, based on static code analysis, architecture review, and OWASP Top 10 2021 framework. A dynamic penetration test is recommended to validate findings and discover runtime vulnerabilities.*
