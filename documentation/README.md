# UNICCConnect Documentation

This directory contains comprehensive technical documentation for the UNICCConnect (HireFlow) recruitment platform.

## Documentation Structure

### 01. Solution Architecture Overview
**File**: [01-solution-architecture-overview.md](./01-solution-architecture-overview.md)

Covers the high-level architecture, technology stack, deployment pipeline, and infrastructure:
- System architecture diagram
- Frontend stack (React, TypeScript, Vite, Tailwind, shadcn/ui)
- Backend stack (Supabase, PostgreSQL, Edge Functions)
- Hosting & deployment (AWS Amplify, CI/CD)
- Security architecture
- Scalability considerations
- Monitoring & observability

**Intended Audience**: Technical architects, DevOps engineers, senior developers

---

### 02. Data Model & Mental Model
**File**: [02-data-model-and-mental-model.md](./02-data-model-and-mental-model.md)

Provides a comprehensive understanding of the domain model and database schema:
- Recruitment pipeline mental model
- Core domain entities (Requisitions, Jobs, Applications, Candidates, Interviews)
- Complete database schema (20+ tables)
- Entity relationships and cardinality
- Important enums and status fields
- Key data patterns (JSONB, audit trails, RLS, approval workflows)
- Entity relationship diagrams

**Intended Audience**: Backend developers, database administrators, product managers, business analysts

---

### 03. User Flows & Technical Interactions
**File**: [03-user-flows-and-technical-interactions.md](./03-user-flows-and-technical-interactions.md)

Detailed walkthrough of main user journeys with technical implementation details:
- **Flow 1**: Job Requisition Creation & Approval (multi-level approval workflow)
- **Flow 2**: Candidate Application Submission (job search to application)
- **Flow 3**: Video Interview Assignment & Submission (bulk assignment to candidate recording)
- **Flow 4**: Panel Interview Scheduling & Feedback (panel setup to consolidated report)
- **Flow 5**: Application Scoring & Stage Progression (auto-screening to shortlist)
- **Flow 6**: Talent Pool Search (advanced search and candidate management)
- **Flow 7**: Performance Management (ePMDS workplan lifecycle from begin-year to completion)
- Cross-cutting concerns (auth, real-time, caching, error handling, file uploads)

**Intended Audience**: Full-stack developers, QA engineers, UX designers, product managers

---

### 04. Code Analysis & Issues
**File**: [04-code-analysis-and-issues.md](./04-code-analysis-and-issues.md)

Comprehensive security, quality, and architecture analysis of the codebase:
- Security issues (exposed credentials, npm vulnerabilities, authentication)
- Code quality issues (TypeScript configuration, logging, technical debt)
- Architecture and design patterns
- Configuration issues
- Best practices and recommendations
- Priority action items

**Intended Audience**: Security engineers, DevOps, technical leads, development team

---

### 05. EKS Migration Strategy
**File**: [05-eks-migration-strategy.md](./05-eks-migration-strategy.md)

Migration strategy and planning for moving to Amazon EKS:
- Current architecture assessment
- Target EKS architecture
- Migration phases and timelines
- Infrastructure requirements
- Risk assessment and mitigation

**Intended Audience**: DevOps engineers, infrastructure team, technical architects

---

### 06. OWASP Security Analysis
**File**: [06-owasp-security-analysis.md](./06-owasp-security-analysis.md)

Comprehensive OWASP Top 10 2021 security assessment:
- Detailed analysis of all OWASP Top 10 categories
- Critical, high, and medium-risk findings
- Security strengths and positive controls
- 4-phase remediation roadmap (328 hours over 4 months)
- Compliance considerations (GDPR, ISO 27001, SOC 2)
- Security metrics and testing recommendations
- Complete security checklist

**Intended Audience**: Security engineers, CISO, compliance officers, development team, management

---

## How to Use This Documentation

### For New Developers
1. Start with **Solution Architecture Overview** to understand the system at a high level
2. Read **Data Model & Mental Model** to understand the domain and database
3. Dive into **User Flows** for the specific features you'll be working on
4. Review **Code Analysis & Issues** to understand technical debt and priorities

### For DevOps/Infrastructure
- Focus on **Solution Architecture Overview** sections:
  - Deployment Pipeline
  - Security Architecture
  - Scalability Considerations
  - Monitoring & Observability
- **CRITICAL**: Review **OWASP Security Analysis** for immediate security action items and remediation roadmap
- Review **Code Analysis & Issues** for code quality and technical debt

### For Product/Business Stakeholders
- Read **Data Model & Mental Model** for the recruitment pipeline mental model
- Review **User Flows** to understand how users interact with the system

### For QA/Testing
- Use **User Flows** as the basis for test scenarios
- Reference **Data Model** to understand data dependencies and edge cases

---

## Updating Documentation

When making significant changes to the system:

1. **Architecture Changes**: Update `01-solution-architecture-overview.md`
   - New technologies or dependencies
   - Infrastructure changes
   - Security policy updates

2. **Schema Changes**: Update `02-data-model-and-mental-model.md`
   - New tables or significant column additions
   - Changed relationships
   - New enums or status fields

3. **Feature Changes**: Update `03-user-flows-and-technical-interactions.md`
   - New user flows
   - Modified workflows
   - Updated technical implementations

4. **Security/Quality Updates**: Update `04-code-analysis-and-issues.md` or `06-owasp-security-analysis.md`
   - Resolved security issues
   - Fixed vulnerabilities
   - Addressed technical debt
   - New issues discovered
   - Updated remediation status

---

## Additional Resources

### Code References
All documentation includes references to source files using relative paths:
- Pages: `src/pages/*.tsx`
- Components: `src/components/*.tsx`
- Database migrations: `supabase/migrations/*.sql`
- Edge functions: `supabase/functions/*/`

### External Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## Contributing to Documentation

### Style Guidelines
- Use clear, concise language
- Include code examples where helpful
- Reference actual file paths from the codebase
- Use diagrams for complex concepts (ASCII art is acceptable)
- Keep technical depth appropriate for the intended audience

### Formatting
- Use Markdown formatting consistently
- Include table of contents for long documents
- Use code blocks with language identifiers (```typescript, ```sql, etc.)
- Use hierarchical headings (H2 for main sections, H3 for subsections)

### Review Process
Documentation changes should be reviewed alongside code changes:
- Include documentation updates in the same PR as code changes
- Request review from both technical and non-technical stakeholders when appropriate
- Update version history or changelog when making significant documentation updates

---

## Version History

| Date       | Version | Changes                                    | Author |
|------------|---------|---------------------------------------------|--------|
| 2025-12-01 | 1.0     | Initial comprehensive documentation created | Claude |
| 2025-12-23 | 1.1     | Added Code Analysis & Issues report         | Claude |
| 2025-12-23 | 1.2     | Updated data model with ePMDS system (7 new tables), internship fields, and Performance Management user flow | Claude |
| 2026-01-28 | 1.3     | Added OWASP Security Analysis (NCCNNCT-52) | Pablo ARRIBAS |

---

## Contact

For questions or suggestions regarding this documentation:
- **Technical Questions**: Development team
- **Business/Process Questions**: Product team
- **Documentation Issues**: Create a GitHub issue

---

## License

This documentation is proprietary to UNICC and is intended for internal use only.
