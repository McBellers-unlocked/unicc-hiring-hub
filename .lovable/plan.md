

## Create Rich Fake External Candidate Profile

### Approach
Insert a single candidate record into the `candidates` table via a SQL migration. The record will be an **External** candidate with rich, realistic data including 4 work experiences, 2 degrees, Azure/AWS certifications, and associated cloud skills.

### Data Details

**Identity & Contact:**
- Name: Sarah Chen
- Email: sarah.chen.demo@example.com
- Location: Singapore
- Phone: +65 9123 4567
- Candidate type: External
- Gender: Female
- Present nationality: Singaporean
- Years of experience: 12
- Availability: Immediately available
- Willing to relocate: Yes
- LinkedIn: https://linkedin.com/in/sarah-chen-demo

**Professional Summary:**
A concise paragraph highlighting 12+ years in cloud infrastructure, DevOps, and security across fintech and enterprise environments.

**4 Work Experiences (JSON in `work_experience`):**
1. **Senior Cloud Architect** — DBS Bank, Singapore (2021-Present): Led multi-cloud strategy across AWS and Azure, managed team of 8, reduced infrastructure costs by 35%
2. **Cloud Infrastructure Engineer** — Grab Holdings, Singapore (2018-2021): Designed Kubernetes-based microservices platform on AWS, implemented CI/CD pipelines
3. **DevOps Engineer** — Accenture, London (2015-2018): Built automated deployment pipelines for UN agency clients, managed hybrid cloud environments
4. **Systems Administrator** — Barclays, London (2013-2015): Managed Windows/Linux server fleet, implemented monitoring with Nagios/Grafana

**2 Education Entries (JSON in `education`):**
1. **Master's Degree** in Cloud Computing & Distributed Systems — National University of Singapore (2017-2019)
2. **Bachelor's Degree** in Computer Science — Imperial College London (2009-2013)

**Skills (JSON array in `skills`):**
AWS, Microsoft Azure, Kubernetes, Docker, Terraform, Ansible, CI/CD, Python, Linux, Networking, Cloud Security, Infrastructure as Code, Microservices Architecture, Monitoring & Observability, Serverless Computing

**Certifications (JSON in `certifications`):**
1. AWS Solutions Architect – Professional (Amazon, 2023)
2. AWS DevOps Engineer – Professional (Amazon, 2022)
3. Microsoft Certified: Azure Solutions Architect Expert (Microsoft, 2023)
4. Microsoft Certified: Azure DevOps Engineer Expert (Microsoft, 2021)
5. Certified Kubernetes Administrator – CKA (CNCF, 2022)
6. HashiCorp Certified: Terraform Associate (HashiCorp, 2021)

**Languages:**
- English: Fluent
- Mandarin: Native
- Malay: Intermediate

**UN Experience:** false (external candidate)

**Slug:** sarah-chen-demo

**Profile completion:** 95%

### Implementation
Single SQL INSERT via database migration tool. No code changes needed — the talent pool query (`select("*")` from candidates) will pick it up automatically.

