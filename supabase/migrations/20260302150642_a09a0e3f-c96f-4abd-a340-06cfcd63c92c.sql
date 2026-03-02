
INSERT INTO candidates (
  name, first_name, last_name, email, phone, location, gender,
  present_nationality, candidate_type, un_experience,
  years_of_experience, availability_status, willing_to_relocate,
  linkedin_url, slug, profile_completion_percentage,
  current_position, current_organization,
  professional_summary,
  work_experience,
  education,
  skills,
  certifications,
  languages
) VALUES (
  'Sarah Chen',
  'Sarah',
  'Chen',
  'sarah.chen.demo@example.com',
  '+65 9123 4567',
  'Singapore',
  'Woman',
  'Singaporean',
  'External',
  false,
  12,
  'Immediately available',
  true,
  'https://linkedin.com/in/sarah-chen-demo',
  'sarah-chen-demo',
  95,
  'Senior Cloud Architect',
  'DBS Bank',
  'Seasoned cloud infrastructure leader with 12+ years of experience spanning DevOps, multi-cloud architecture, and security across fintech and enterprise environments. Proven track record of designing resilient, cost-optimised platforms on AWS and Azure, leading cross-functional engineering teams, and driving digital transformation initiatives for global organisations.',
  '[
    {"position":"Senior Cloud Architect","company":"DBS Bank","organization":"DBS Bank","start_date":"2021-03-01","end_date":null,"is_present":true,"description":"Leading multi-cloud strategy across AWS and Azure for Southeast Asia''s largest bank. Managing a team of 8 cloud engineers, architecting disaster-recovery solutions, and reducing infrastructure costs by 35% through reserved-instance optimisation and workload right-sizing. Spearheaded zero-trust network architecture rollout across 12 regional offices.","responsibilities":["Define and execute enterprise cloud strategy across AWS and Azure","Lead team of 8 cloud engineers with mentoring and performance reviews","Architect disaster-recovery and business-continuity solutions","Reduce infrastructure spend by 35% via reserved-instance and right-sizing programmes","Design and roll out zero-trust network architecture across 12 offices"]},
    {"position":"Cloud Infrastructure Engineer","company":"Grab Holdings","organization":"Grab Holdings","start_date":"2018-06-01","end_date":"2021-02-28","is_present":false,"description":"Designed and maintained Kubernetes-based microservices platform on AWS serving 200M+ users. Built CI/CD pipelines with Jenkins, ArgoCD, and Terraform, cutting deployment time from 2 hours to 15 minutes. Implemented observability stack with Prometheus, Grafana, and ELK.","responsibilities":["Design Kubernetes-based microservices platform on AWS","Build CI/CD pipelines with Jenkins, ArgoCD, and Terraform","Implement observability stack (Prometheus, Grafana, ELK)","Manage infrastructure-as-code for 150+ microservices","Conduct capacity planning and cost forecasting"]},
    {"position":"DevOps Engineer","company":"Accenture","organization":"Accenture","start_date":"2015-09-01","end_date":"2018-05-31","is_present":false,"description":"Built automated deployment pipelines for UN agency and NGO clients, managing hybrid cloud environments spanning on-premises data centres and AWS/Azure. Led infrastructure migrations for three large-scale projects, improving deployment reliability from 82% to 99.5%.","responsibilities":["Build automated deployment pipelines for UN agency clients","Manage hybrid cloud environments (on-prem + AWS/Azure)","Lead infrastructure migrations for large-scale projects","Improve deployment reliability from 82% to 99.5%","Write Ansible playbooks and Terraform modules for repeatable provisioning"]},
    {"position":"Systems Administrator","company":"Barclays","organization":"Barclays","start_date":"2013-07-01","end_date":"2015-08-31","is_present":false,"description":"Managed a fleet of 500+ Windows and Linux servers across two UK data centres. Implemented monitoring with Nagios and Grafana, reducing mean-time-to-detection by 60%. Automated routine patching and compliance reporting with PowerShell and Bash scripts.","responsibilities":["Manage 500+ Windows/Linux servers across two data centres","Implement monitoring with Nagios and Grafana","Automate patching and compliance reporting","Provide L2/L3 support for production incidents","Maintain Active Directory and DNS infrastructure"]}
  ]'::jsonb,
  '[
    {"degree":"Master''s Degree","field":"Cloud Computing & Distributed Systems","institution":"National University of Singapore","start_date":"2017-08-01","end_date":"2019-06-30","year":"2019"},
    {"degree":"Bachelor''s Degree","field":"Computer Science","institution":"Imperial College London","start_date":"2009-09-01","end_date":"2013-06-30","year":"2013"}
  ]'::jsonb,
  '["AWS","Microsoft Azure","Kubernetes","Docker","Terraform","Ansible","CI/CD","Python","Linux","Networking","Cloud Security","Infrastructure as Code","Microservices Architecture","Monitoring & Observability","Serverless Computing"]'::jsonb,
  '[
    {"name":"AWS Solutions Architect – Professional","issuer":"Amazon Web Services","year":"2023"},
    {"name":"AWS DevOps Engineer – Professional","issuer":"Amazon Web Services","year":"2022"},
    {"name":"Microsoft Certified: Azure Solutions Architect Expert","issuer":"Microsoft","year":"2023"},
    {"name":"Microsoft Certified: Azure DevOps Engineer Expert","issuer":"Microsoft","year":"2021"},
    {"name":"Certified Kubernetes Administrator (CKA)","issuer":"Cloud Native Computing Foundation","year":"2022"},
    {"name":"HashiCorp Certified: Terraform Associate","issuer":"HashiCorp","year":"2021"}
  ]'::jsonb,
  '[
    {"language":"English","proficiency":"Fluent"},
    {"language":"Mandarin","proficiency":"Native"},
    {"language":"Malay","proficiency":"Intermediate"}
  ]'::jsonb
);
