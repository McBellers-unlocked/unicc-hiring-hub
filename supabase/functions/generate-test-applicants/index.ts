import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Male first names
const maleFirstNames = [
  "James", "David", "Michael", "Alexander", "William", "Chen", "Raj", "Ahmed",
  "Lucas", "Mohammed", "John", "Robert", "Daniel", "Thomas", "Christopher", "Matthew",
  "Andrew", "Ryan", "Brandon", "Jonathan", "Kevin", "Eric", "Brian", "Jason",
  "Jacob", "Nicholas", "Nathan", "Tyler", "Aaron", "Adam", "Justin", "Patrick",
  "Sean", "Mark", "Steven", "Peter", "Carlos", "Luis", "Diego", "Antonio"
];

// Female first names
const femaleFirstNames = [
  "Maria", "Sophie", "Emma", "Olivia", "Isabella", "Fatima", "Yuki", "Ana",
  "Priya", "Elena", "Sarah", "Jennifer", "Amanda", "Jessica", "Ashley", "Emily",
  "Samantha", "Nicole", "Rachel", "Laura", "Stephanie", "Michelle", "Kimberly", "Rebecca",
  "Angela", "Melissa", "Amy", "Christina", "Elizabeth", "Katherine", "Lauren", "Victoria"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Martinez", "Rodriguez",
  "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee",
  "Thompson", "White", "Harris", "Clark", "Lewis", "Walker", "Hall", "Allen",
  "Wong", "Khan", "Patel", "Singh", "Kumar", "Nguyen", "Kim", "Park",
  "Chen", "Liu", "Zhang", "Wang", "Mueller", "Schmidt", "Johansson", "Andersson"
];

const companies = [
  "Microsoft", "Google", "Amazon", "IBM", "Accenture", "Deloitte", "KPMG", "PwC",
  "Cisco Systems", "Oracle", "SAP", "McKinsey", "Boston Consulting Group", "Bain",
  "JPMorgan Chase", "Bank of America", "Goldman Sachs", "HSBC", "Barclays",
  "Salesforce", "ServiceNow", "Atlassian", "Zoom", "Slack", "Shopify", "Stripe"
];

const unOrganizations = [
  "UNICEF", "WHO", "UNHCR", "UNDP", "WFP", "UNESCO", "ILO", "FAO", "UNEP",
  "UNODC", "UNOPS", "UN Women", "UNFPA", "UNICC", "ITU", "WIPO", "IAEA", "IOM"
];

const universities = [
  "MIT", "Stanford University", "Carnegie Mellon University", "UC Berkeley", "Oxford University",
  "Cambridge University", "Imperial College London", "ETH Zurich", "TU Munich",
  "National University of Singapore", "University of Tokyo", "Tsinghua University",
  "IIT Delhi", "University of Toronto", "Georgia Tech", "University of Illinois",
  "Cornell University", "Columbia University", "University of Washington", "TU Delft",
  "INSEAD", "London Business School", "Wharton School", "Harvard Business School"
];

// ============= CYBERSECURITY CONTENT (Legacy) =============
const securitySkills = [
  "Penetration Testing", "Vulnerability Assessment", "Burp Suite", "Metasploit", "Kali Linux",
  "OWASP Top 10", "Network Security", "Web Application Security", "API Security", "Cloud Security",
  "Python", "Bash Scripting", "PowerShell", "Incident Response", "Malware Analysis",
  "Security Auditing", "Compliance (ISO 27001, NIST)", "Risk Assessment", "Threat Modeling",
  "SIEM (Splunk, QRadar)", "Container Security", "Kubernetes Security", "AWS Security",
  "Azure Security", "DevSecOps", "Source Code Analysis", "Red Teaming", "Blue Teaming"
];

const securityCertifications = [
  "OSCP", "CEH", "CISSP", "Security+", "GPEN", "GWAPT", "CREST CRT", "OSWE", "GCIH", "GCFA"
];

const securityJobTitles = {
  exceeds: [
    "Chief Information Security Officer", "Director of Cybersecurity", "Head of Security Operations",
    "Principal Security Architect", "Senior Security Manager", "VP of Information Security"
  ],
  meets: [
    "Cybersecurity Manager", "Security Operations Lead", "Senior Penetration Tester",
    "Security Analyst Team Lead", "Information Security Officer", "Senior Security Consultant"
  ],
  close: [
    "Cybersecurity Analyst", "Security Operations Analyst", "Penetration Tester",
    "Vulnerability Analyst", "Security Consultant", "SOC Analyst"
  ],
  far: [
    "Accountant", "Legal Assistant", "Marketing Specialist", "Customer Support Representative",
    "Sales Associate", "Administrative Assistant", "Data Entry Clerk"
  ]
};

// ============= PRODUCT DELIVERY CONTENT =============
const productDeliverySkills = {
  exceeds: [
    "Product Development", "Product Lifecycle Management", "Business Model Canvas",
    "Project Portfolio Management", "Digital Diplomacy", "Digital Payment Solutions",
    "RSI (Remote Simultaneous Interpretation)", "Event Management", "Agile/Scrum Master",
    "Process Design & Optimization", "KPI Development", "Strategic Roadmapping",
    "Stakeholder Management", "Requirements Engineering", "Service Delivery Excellence",
    "Design Thinking", "Business Case Development", "OKR Methodology", "Lean Six Sigma"
  ],
  meets: [
    "Product Management", "Business Analysis", "Agile Methodologies", 
    "Product Strategy", "Market Analysis", "Process Improvement",
    "Event Coordination", "Technical Documentation", "Jira", "ClickUp",
    "Requirements Gathering", "User Story Writing", "Sprint Planning",
    "Stakeholder Communication", "Product Roadmapping", "Competitive Analysis"
  ],
  close: [
    "Project Coordination", "Meeting Facilitation", "Documentation",
    "Basic Jira Usage", "PowerPoint", "Excel", "Customer Service",
    "Team Collaboration", "Report Writing", "Scheduling", "Data Entry"
  ],
  far: [
    "Penetration Testing", "Network Security", "Vulnerability Assessment",
    "Accounting", "Legal Research", "Graphic Design", "Sales", "Payroll Processing",
    "Inventory Management", "Forklift Operation", "Carpentry"
  ]
};

const productDeliveryCertifications = {
  exceeds: [
    "PMP", "PRINCE2 Practitioner", "Certified Scrum Master (CSM)", "SAFe Agilist",
    "Lean Six Sigma Black Belt", "CBAP", "Product Management Certificate (Stanford)"
  ],
  meets: [
    "PRINCE2 Foundation", "Scrum Fundamentals", "CAPM", "Google Project Management",
    "Agile Certified Practitioner", "Lean Six Sigma Green Belt"
  ],
  close: [
    "Microsoft Office Specialist", "Google Workspace Certification", "Basic Excel Certificate"
  ],
  far: [
    "OSCP", "CEH", "CISSP", "CPA", "Bar Exam", "Real Estate License"
  ]
};

const productDeliveryJobTitles = {
  exceeds: [
    "Head of Product Delivery", "Director of Digital Solutions", "Senior Product Manager",
    "Portfolio Management Lead", "Chief Product Officer", "VP of Product Development",
    "Director of Business Development", "Head of Digital Transformation"
  ],
  meets: [
    "Product Manager", "Project Portfolio Analyst", "Digital Solutions Specialist",
    "Business Development Officer", "Product Owner", "Delivery Manager",
    "Technical Product Manager", "Associate Product Director"
  ],
  close: [
    "Project Coordinator", "Business Analyst", "Event Coordinator",
    "Junior Product Associate", "Project Assistant", "Administrative Officer",
    "Operations Associate", "Team Coordinator"
  ],
  far: [
    "Security Analyst", "Accountant", "Legal Assistant", "Sales Representative",
    "Customer Support Agent", "Data Entry Clerk", "Warehouse Supervisor"
  ]
};

const productDeliveryDuties = {
  exceeds: [
    "Led end-to-end product development lifecycle for 5+ digital products serving UN agencies, including Digital Diplomacy platforms and digital payment solutions with 500,000+ users globally",
    "Managed strategic portfolio of 15+ concurrent projects valued at $10M+ using Business Model Canvas and strategic analysis frameworks, achieving 98% on-time delivery",
    "Designed and optimized end-to-end service delivery processes for RSI (Remote Simultaneous Interpretation) supporting 200+ multilingual events annually across 6 UN official languages",
    "Developed comprehensive product roadmaps with measurable KPIs, achieving 95% on-time delivery and 40% improvement in user satisfaction scores",
    "Established Digital Diplomacy requirement analysis frameworks adopted across 8 UN agencies, enabling standardized digital engagement for international conferences",
    "Pioneered new business solution development methodologies that reduced time-to-market by 35% while maintaining quality standards",
    "Led cross-functional teams of 20+ members across multiple time zones, facilitating Agile ceremonies and ensuring alignment with strategic objectives",
    "Presented quarterly business reviews to C-level executives and board members, translating technical achievements into business value metrics"
  ],
  meets: [
    "Managed product development for 3 digital solutions, coordinating with cross-functional teams of 8-12 members across 4 departments",
    "Utilized Business Model Canvas for strategic product planning and market positioning, developing 5+ successful business cases",
    "Coordinated project portfolio of 8 concurrent initiatives with international stakeholders across Europe, Asia, and North America",
    "Supported Digital Diplomacy events including conference management and interpretation services for 50+ multilingual meetings annually",
    "Conducted process optimization initiatives resulting in 30% efficiency improvements in service delivery workflows",
    "Developed and maintained product roadmaps with clear milestones, dependencies, and resource requirements",
    "Facilitated stakeholder workshops and requirements gathering sessions, documenting user stories and acceptance criteria",
    "Implemented Agile/Scrum methodologies for development teams, conducting sprint planning, daily standups, and retrospectives"
  ],
  close: [
    "Contributed to product development initiatives as team member, assisting senior product managers with documentation and coordination",
    "Participated in project management activities using standard methodologies, tracking tasks and deadlines in Jira",
    "Supported event coordination and logistics for organizational meetings, managing calendars and participant communications",
    "Assisted with business analysis and requirements documentation, conducting interviews with stakeholders",
    "Gained exposure to digital solutions and service delivery through shadowing senior team members",
    "Prepared presentations and reports for team meetings, compiling data and creating visualizations",
    "Attended Agile ceremonies as observer, learning sprint planning and retrospective processes",
    "Helped maintain project documentation and status reports for management review"
  ],
  far: [
    "Monitored security events and alerts using SIEM tools, investigating potential threats",
    "Conducted vulnerability assessments of network infrastructure and web applications",
    "Managed accounting records and financial reporting for department budgets",
    "Provided customer support via phone and email, resolving tier-1 inquiries",
    "Processed sales orders and maintained customer relationship management systems",
    "Performed data entry and document filing for administrative operations",
    "Supervised warehouse operations including inventory management and shipping"
  ]
};

const productDeliveryEducation = {
  exceeds: [
    { degree: "MBA", field: "Technology Management" },
    { degree: "Master of Science", field: "Product Management" },
    { degree: "Executive MBA", field: "Digital Transformation" },
    { degree: "Master of Business Administration", field: "Innovation and Entrepreneurship" },
    { degree: "Master of Science", field: "Information Systems" }
  ],
  meets: [
    { degree: "Bachelor of Business Administration", field: "Management" },
    { degree: "Bachelor of Science", field: "Business Information Systems" },
    { degree: "Master of Arts", field: "International Relations" },
    { degree: "Bachelor of Commerce", field: "Marketing" },
    { degree: "Bachelor of Science", field: "Computer Science" }
  ],
  close: [
    { degree: "Bachelor of Arts", field: "Communications" },
    { degree: "Bachelor of Science", field: "General Studies" },
    { degree: "Associate Degree", field: "Business Administration" },
    { degree: "Bachelor of Arts", field: "Psychology" }
  ],
  far: [
    { degree: "Bachelor of Science", field: "Cybersecurity" },
    { degree: "Bachelor of Arts", field: "Fine Arts" },
    { degree: "Bachelor of Science", field: "Accounting" },
    { degree: "High School Diploma", field: "" }
  ]
};

// ============= COMMON DATA =============
const supervisorTitles = [
  "Chief Product Officer", "Director of Digital Solutions", "Head of Service Delivery",
  "VP of Product", "Principal Product Manager", "Senior Technical Lead",
  "Division Chief", "Programme Manager", "Director of Operations", "Head of Innovation"
];

const cities = [
  { city: "Geneva", country: "Switzerland", addresses: ["15 Route de Ferney", "48 Avenue Giuseppe-Motta"] },
  { city: "New York", country: "United States", addresses: ["405 East 42nd Street", "One UN Plaza"] },
  { city: "London", country: "United Kingdom", addresses: ["10 Whitfield Street", "1 Canada Square"] },
  { city: "Paris", country: "France", addresses: ["7 Place de Fontenoy", "1 Rue Miollis"] },
  { city: "Berlin", country: "Germany", addresses: ["Platz der Luftbrücke 5", "Friedrichstraße 60"] },
  { city: "Nairobi", country: "Kenya", addresses: ["UN Complex Gigiri", "Limuru Road"] },
  { city: "Bangkok", country: "Thailand", addresses: ["UN Building, Rajdamnern Nok Avenue"] },
  { city: "Vienna", country: "Austria", addresses: ["Vienna International Centre", "Wagramer Strasse 5"] },
  { city: "Rome", country: "Italy", addresses: ["Via delle Terme di Caracalla", "Viale Aventino 45"] },
  { city: "Copenhagen", country: "Denmark", addresses: ["Marmorvej 51", "UN City"] }
];

const nationalities = [
  "American", "British", "Canadian", "Australian", "German", "French", "Italian", "Spanish",
  "Brazilian", "Mexican", "Indian", "Chinese", "Japanese", "South Korean", "Nigerian", "South African",
  "Egyptian", "Kenyan", "Swiss", "Dutch", "Swedish", "Norwegian"
];

// Helper functions
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  const prefixes = ["+1", "+44", "+33", "+49", "+41", "+254", "+91", "+61", "+65", "+39"];
  const prefix = randomItem(prefixes);
  const number = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
  return `${prefix} ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
}

function generateSupervisor(company: string): { name: string; title: string; email: string; phone: string } {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const firstName = randomItem(gender === 'male' ? maleFirstNames : femaleFirstNames);
  const lastName = randomItem(lastNames);
  const title = randomItem(supervisorTitles);
  const domain = company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10) + ".org";
  
  return {
    name: `${firstName} ${lastName}`,
    title,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
    phone: generatePhone()
  };
}

// Updated to use quality tiers
type QualityTier = 'exceeds' | 'meets' | 'close' | 'far';

function determineQualityDistribution(index: number, totalCount: number): QualityTier {
  // Target distribution: 10% exceed, 30% meet, 40% close, 20% far
  const exceedsThreshold = Math.floor(totalCount * 0.10);
  const meetsThreshold = Math.floor(totalCount * 0.40);  // cumulative 10% + 30%
  const closeThreshold = Math.floor(totalCount * 0.80);  // cumulative 10% + 30% + 40%
  
  if (index < exceedsThreshold) return 'exceeds';
  if (index < meetsThreshold) return 'meets';
  if (index < closeThreshold) return 'close';
  return 'far';
}

function determineGender(index: number, totalCount: number): 'Man' | 'Woman' {
  // Roughly 50/50 split
  return index % 2 === 0 ? 'Man' : 'Woman';
}

function shouldHaveUNExperience(quality: QualityTier): boolean {
  // Exceeds and meets are more likely to have UN experience
  if (quality === 'exceeds') return Math.random() > 0.2;  // 80% chance
  if (quality === 'meets') return Math.random() > 0.5;    // 50% chance
  if (quality === 'close') return Math.random() > 0.8;    // 20% chance
  return false;  // far candidates don't have UN experience
}

function shouldHaveUNRelatives(index: number): boolean {
  return index % 10 === 0;
}

// Generate duties based on job type and quality
function generateDutiesForJobType(quality: QualityTier, jobType: string): string {
  if (jobType === 'product_delivery') {
    const duties = randomItems(productDeliveryDuties[quality], 4);
    return duties.map(d => `• ${d}`).join('\n\n');
  }
  
  // Legacy cybersecurity duties for backward compatibility
  const baseDuties = {
    exceeds: [
      "Directed enterprise security strategy, managing teams of 15+ professionals across multiple security domains",
      "Presented security metrics and strategic initiatives to executive leadership and board of directors",
      "Led red team operations simulating nation-state adversaries to test organizational resilience"
    ],
    meets: [
      "Conducted comprehensive penetration testing of web applications, APIs, and network infrastructure",
      "Managed vulnerability remediation programs tracking 1000+ findings across the organization",
      "Developed incident response procedures and led tabletop exercises for security team"
    ],
    close: [
      "Monitored security events and alerts using SIEM tools, escalating potential incidents",
      "Assisted senior analysts with vulnerability scanning and basic penetration testing",
      "Maintained security documentation and supported compliance audit activities"
    ],
    far: [
      "Processed customer orders and maintained sales records in CRM system",
      "Handled administrative tasks including scheduling, filing, and correspondence",
      "Managed inventory and coordinated shipping logistics"
    ]
  };
  
  const duties = randomItems(baseDuties[quality], 4);
  return duties.map(d => `• ${d}`).join('\n\n');
}

// Generate skills based on job type and quality
function getSkillsForJobType(quality: QualityTier, jobType: string): string[] {
  if (jobType === 'product_delivery') {
    const skillPool = productDeliverySkills[quality];
    const count = quality === 'exceeds' ? randomInt(8, 12) : 
                  quality === 'meets' ? randomInt(6, 8) :
                  quality === 'close' ? randomInt(4, 6) : randomInt(2, 4);
    return randomItems(skillPool, count);
  }
  
  // Legacy cybersecurity skills
  return randomItems(securitySkills, randomInt(4, 8));
}

// Generate certifications based on job type and quality
function getCertificationsForJobType(quality: QualityTier, jobType: string): string[] {
  if (jobType === 'product_delivery') {
    const certPool = productDeliveryCertifications[quality];
    const count = quality === 'exceeds' ? randomInt(3, 5) : 
                  quality === 'meets' ? randomInt(2, 3) :
                  quality === 'close' ? randomInt(0, 1) : 0;
    return randomItems(certPool, count);
  }
  
  // Legacy cybersecurity certs
  return randomItems(securityCertifications, quality === 'exceeds' ? randomInt(3, 5) : randomInt(1, 3));
}

// Generate job title based on job type and quality
function getJobTitleForJobType(quality: QualityTier, jobType: string): string {
  if (jobType === 'product_delivery') {
    return randomItem(productDeliveryJobTitles[quality]);
  }
  return randomItem(securityJobTitles[quality]);
}

// Generate motivation letter based on job type and quality
function generateMotivationLetter(skills: string[], yearsOfExp: number, firstName: string, lastName: string, quality: QualityTier, jobType: string): string {
  if (jobType === 'product_delivery') {
    return generateProductDeliveryMotivationLetter(skills, yearsOfExp, firstName, lastName, quality);
  }
  return generateSecurityMotivationLetter(skills, yearsOfExp, firstName, lastName);
}

function generateProductDeliveryMotivationLetter(skills: string[], yearsOfExp: number, firstName: string, lastName: string, quality: QualityTier): string {
  const intros = {
    exceeds: `I am writing to express my strong interest in the Associate Product Delivery and Development Officer position at UNICC. With ${yearsOfExp} years of progressive experience in product development, digital solutions, and service delivery across international organizations, I am confident in my ability to make an immediate and significant impact on your team.`,
    meets: `I am excited to apply for the Associate Product Delivery and Development Officer role at UNICC. With ${yearsOfExp} years of experience in product management and project delivery, I am eager to contribute my skills to support the UN's digital transformation initiatives.`,
    close: `I am writing to apply for the Associate Product Delivery and Development Officer position at UNICC. While my ${yearsOfExp} years of professional experience has been in related fields, I am motivated to transition into product delivery and believe my transferable skills would be valuable.`,
    far: `I am interested in the Associate Product Delivery and Development Officer position at UNICC. Although my background is primarily in different fields, I am eager to learn and transition into product delivery work.`
  };

  const bodies = {
    exceeds: `Throughout my career, I have led end-to-end product development initiatives that directly align with this role's requirements. I have extensive experience with Digital Diplomacy platforms, having designed and launched solutions supporting international conferences with 500+ participants and real-time interpretation in all 6 UN official languages.

My expertise in Business Model Canvas methodology has enabled me to develop compelling business cases that secured $10M+ in funding for digital transformation projects. I have successfully managed project portfolios of 15+ concurrent initiatives, consistently achieving 95%+ on-time delivery rates.

I have hands-on experience with Remote Simultaneous Interpretation (RSI) platforms, having optimized service delivery processes that now support 200+ multilingual events annually. My work in process design and optimization has resulted in measurable efficiency gains of 30-40% across multiple service lines.

Key achievements that demonstrate my qualifications:
• Led Digital Diplomacy platform development serving 8 UN agencies with 98% stakeholder satisfaction
• Implemented product roadmapping frameworks adopted as organizational standards
• Managed cross-functional teams of 20+ members across 4 continents
• Pioneered new business solution development methodologies reducing time-to-market by 35%`,

    meets: `In my ${yearsOfExp} years of experience, I have developed strong capabilities in product management and project delivery that align well with this position's requirements. I have hands-on experience using Business Model Canvas for strategic planning and have successfully coordinated projects with international stakeholders.

I have contributed to digital solutions development, including conference management platforms and interpretation services. My experience includes requirements gathering, stakeholder management, and Agile/Scrum methodologies.

Key experiences relevant to this role:
• Managed product development for 3 digital solutions with cross-functional teams
• Coordinated project portfolio of 8 concurrent initiatives across multiple regions  
• Facilitated stakeholder workshops and documented user requirements
• Implemented Agile practices including sprint planning and retrospectives

I am skilled at ${skills.slice(0, 3).join(', ')} and have a proven track record of delivering projects on time and within scope.`,

    close: `I am applying for this position because I believe my ${yearsOfExp} years of professional experience has provided me with transferable skills relevant to product delivery work. While I have not held a product management role directly, I have contributed to projects and gained exposure to Agile methodologies.

In my current role, I support project activities by maintaining documentation, coordinating meetings, and assisting with stakeholder communications. I am a quick learner and am committed to developing my product delivery skills.

I am familiar with tools like Jira and have basic experience with ${skills.slice(0, 2).join(' and ')}. I am eager to learn Business Model Canvas, roadmapping, and other product management frameworks.`,

    far: `I am writing to express my interest in transitioning to a product delivery role at UNICC. My background has been in ${skills[0] || 'other fields'}, which has given me strong attention to detail and organizational skills.

While I do not have direct product management experience, I am a dedicated professional who is willing to learn and grow. I am attracted to UNICC's mission and believe that with proper training, I could contribute to your team.

I understand this role requires specific product delivery skills that I am still developing, but I am committed to pursuing professional development opportunities to build these capabilities.`
  };

  const closings = {
    exceeds: `I am drawn to UNICC's unique position as the technology backbone of the UN system. The opportunity to drive product innovation that enables humanitarian and development work worldwide deeply motivates me. I bring not only the technical skills required but also a genuine commitment to the UN's values of integrity, professionalism, and respect for diversity.

I am confident that my extensive experience in product development, Digital Diplomacy, and service delivery would make me a valuable addition to your team. I welcome the opportunity to discuss how I can contribute to UNICC's important mission.`,

    meets: `I am excited about the opportunity to contribute to UNICC's digital transformation initiatives. I believe my product management experience and commitment to continuous learning would make me an effective contributor to your team.

Thank you for considering my application. I look forward to discussing how my skills and experience align with your needs.`,

    close: `I am motivated by UNICC's mission and eager to develop my product delivery capabilities in this environment. I am a quick learner and believe that my enthusiasm and transferable skills could add value to your team.

Thank you for considering my application. I would appreciate the opportunity to discuss how I could grow into this role.`,

    far: `While I recognize my background may not be the traditional path to this role, I am committed to learning and developing new skills. I would appreciate any opportunity to discuss this position further.

Thank you for your time and consideration.`
  };

  return `${intros[quality]}

${bodies[quality]}

${closings[quality]}`;
}

function generateSecurityMotivationLetter(skills: string[], yearsOfExp: number, firstName: string, lastName: string): string {
  const intro = `I am writing to express my strong interest in contributing to UNICC's mission of providing digital solutions for the United Nations system. With ${yearsOfExp} years of experience in cybersecurity and a deep commitment to international cooperation, I am confident in my ability to make a meaningful impact on your team.`;

  const body = `Throughout my career, I have developed deep expertise in ${skills.slice(0, 3).join(', ')}. I have successfully led security initiatives that resulted in measurable improvements to organizational security posture, including reducing critical vulnerabilities by over 60% and implementing zero-trust architecture across enterprise environments.

My experience includes working with diverse, multicultural teams in complex organizational structures. I understand the unique challenges of operating in an international environment and the importance of balancing security requirements with operational needs.`;

  const closing = `I am drawn to UNICC's unique position as the technology backbone of the UN system. The opportunity to contribute to securing digital infrastructure that supports humanitarian and development work worldwide is deeply motivating to me.

Thank you for considering my application. I look forward to the opportunity to further discuss my qualifications.`;

  return `${intro}\n\n${body}\n\n${closing}`;
}

function generateReferences(): Array<{ name: string; full_address: string; occupation_title: string }> {
  const refs = [];
  const types = ['academic', 'professional', 'colleague'];
  
  for (const type of types) {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = randomItem(gender === 'male' ? maleFirstNames : femaleFirstNames);
    const lastName = randomItem(lastNames);
    const location = randomItem(cities);
    
    let title = '';
    if (type === 'academic') {
      title = randomItem(['Professor of Computer Science', 'Dean of Engineering', 'Department Chair', 'Research Director']);
    } else if (type === 'professional') {
      title = randomItem(['Director', 'Vice President', 'Senior Manager', 'Chief Technology Officer', 'Head of Division']);
    } else {
      title = randomItem(['Senior Colleague', 'Team Lead', 'Principal Engineer', 'Technical Architect']);
    }
    
    refs.push({
      name: `${firstName} ${lastName}`,
      full_address: `${randomItem(location.addresses)}, ${location.city}, ${location.country}`,
      occupation_title: title
    });
  }
  
  return refs;
}

function generateDependants(maritalStatus: string): Array<{ name: string; relationship: string; dateOfBirth: string }> {
  if (maritalStatus === 'Single' || Math.random() > 0.6) return [];
  
  const dependants = [];
  const numDeps = randomInt(1, 3);
  
  for (let i = 0; i < numDeps; i++) {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = randomItem(gender === 'male' ? maleFirstNames : femaleFirstNames);
    const dob = randomDate(new Date(2005, 0, 1), new Date(2022, 0, 1));
    
    dependants.push({
      name: firstName,
      relationship: randomItem(['Child', 'Son', 'Daughter']),
      dateOfBirth: dob.toISOString().split('T')[0]
    });
  }
  
  return dependants;
}

function generateUNRelatives(shouldHave: boolean): Array<{ name: string; relationship: string; organization: string; position: string }> {
  if (!shouldHave) return [];
  
  const relatives = [];
  const numRels = randomInt(1, 2);
  
  for (let i = 0; i < numRels; i++) {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = randomItem(gender === 'male' ? maleFirstNames : femaleFirstNames);
    const lastName = randomItem(lastNames);
    
    relatives.push({
      name: `${firstName} ${lastName}`,
      relationship: randomItem(['Spouse', 'Sibling', 'Parent', 'Child']),
      organization: randomItem(unOrganizations),
      position: randomItem(['Programme Officer', 'Administrative Assistant', 'Technical Specialist', 'Consultant'])
    });
  }
  
  return relatives;
}

// Generate education based on job type and quality
function generateEducationPHF(quality: QualityTier, jobType: string): any[] {
  const education = [];
  const numDegrees = quality === 'exceeds' ? 2 : quality === 'meets' ? randomInt(1, 2) : 1;
  let currentYear = 2023;
  
  for (let i = 0; i < numDegrees; i++) {
    let degree, field;
    
    if (jobType === 'product_delivery') {
      const eduConfig = productDeliveryEducation[quality];
      const selected = randomItem(eduConfig);
      degree = selected.degree;
      field = selected.field;
    } else {
      // Legacy cybersecurity education
      const degrees = i === 0 && (quality === 'exceeds' || quality === 'meets')
        ? ['Master of Science', 'Master of Engineering', 'MBA']
        : ['Bachelor of Science', 'Bachelor of Engineering'];
      degree = randomItem(degrees);
      field = randomItem(['Computer Science', 'Cybersecurity', 'Information Technology', 'Software Engineering']);
    }
    
    const duration = degree.includes('Master') || degree.includes('MBA') ? randomInt(1, 2) : randomInt(3, 4);
    const endYear = currentYear - (i * 4);
    const startYear = endYear - duration;
    
    education.push({
      from_month: 9,
      from_year: startYear,
      to_month: 6,
      to_year: endYear,
      institution_name: randomItem(universities),
      institution_city: randomItem(cities).city,
      institution_country: randomItem(cities).country,
      degree_or_certificate_title: degree,
      main_course_of_study: field,
      completed: true,
      attestations: { confirm_education_true: true }
    });
    
    currentYear = startYear - 1;
  }
  
  return education;
}

function generateEmploymentPHF(quality: QualityTier, hasUNExp: boolean, jobType: string): any[] {
  const employment = [];
  const numJobs = quality === 'exceeds' ? randomInt(3, 5) : 
                  quality === 'meets' ? randomInt(2, 4) : 
                  quality === 'close' ? randomInt(1, 3) : randomInt(1, 2);
  let currentYear = 2024;
  
  for (let i = 0; i < numJobs; i++) {
    const isUN = hasUNExp && i < 2;
    const company = isUN ? randomItem(unOrganizations) : randomItem(companies);
    const location = randomItem(cities);
    const supervisor = generateSupervisor(company);
    
    const duration = i === 0 ? randomInt(1, 3) : randomInt(2, 4);
    const startYear = currentYear - duration;
    const endYear = i === 0 ? null : currentYear;
    const isPresent = i === 0;
    
    // Job title appropriate for the position in career and quality
    let title: string;
    if (i === 0) {
      // Current job - use quality-appropriate title
      title = getJobTitleForJobType(quality, jobType);
    } else if (i === 1 && (quality === 'exceeds' || quality === 'meets')) {
      // Previous job - slightly lower level
      const lowerQuality: QualityTier = quality === 'exceeds' ? 'meets' : 'close';
      title = getJobTitleForJobType(lowerQuality, jobType);
    } else {
      title = getJobTitleForJobType('close', jobType);
    }
    
    const duties = generateDutiesForJobType(i === 0 ? quality : 'close', jobType);
    
    employment.push({
      from_month: randomInt(1, 12),
      from_year: startYear,
      to_month: isPresent ? null : randomInt(1, 12),
      to_year: isPresent ? null : endYear,
      is_present: isPresent,
      employer_name: company,
      employer_address: `${randomItem(location.addresses)}, ${location.city}, ${location.country}`,
      type_of_business: isUN ? 'International Organization' : randomItem(['Technology', 'Consulting', 'Financial Services', 'Government']),
      exact_title: title,
      duties_and_responsibilities: duties,
      un_grade: isUN ? randomItem(['P-2', 'P-3', 'P-4', 'P-5']) : null,
      annual_income_starting: randomInt(50000, 80000) * (numJobs - i),
      annual_income_most_recent: randomInt(70000, 120000) * (numJobs - i + 1),
      allowances_or_benefits: isUN ? 'Post adjustment, education grant, home leave, rental subsidy' : 'Health insurance, pension contribution, annual bonus',
      employees_supervised_number: quality === 'exceeds' ? randomInt(5, 20) : quality === 'meets' ? randomInt(1, 8) : 0,
      employees_supervised_type: (quality === 'exceeds' || quality === 'meets') ? 'Direct reports' : null,
      reason_for_change: i === 0 ? null : randomItem([
        'Career advancement opportunity',
        'Seeking new challenges',
        'Contract completion',
        'Organizational restructuring'
      ]),
      supervisor_name: supervisor.name,
      supervisor_title: supervisor.title,
      supervisor_email: supervisor.email,
      supervisor_phone: supervisor.phone,
      supervisor_can_contact: Math.random() > 0.2,
      attestations: { confirm_duties_accurate: true, confirm_dates_accurate: true }
    });
    
    currentYear = startYear - 1;
  }
  
  return employment;
}

function generateLanguagesPHF(): any {
  const unLanguages = ['english', 'french', 'spanish', 'arabic', 'chinese', 'russian'];
  const proficiencies = ['fluent', 'working_knowledge', 'limited'];

  const unLangs: Record<string, { read: string; write: string; speak: string }> = {};
  
  // Always fluent in English
  unLangs['english'] = { read: 'fluent', write: 'fluent', speak: 'fluent' };
  
  // Random proficiency for other UN languages
  for (const lang of unLanguages.slice(1)) {
    if (Math.random() > 0.6) {
      const level = randomItem(proficiencies);
      unLangs[lang] = { read: level, write: level, speak: level };
    }
  }

  const otherLanguageNames = ['German', 'Portuguese', 'Italian', 'Japanese', 'Hindi', 'Korean', 'Dutch', 'Swedish'];
  const otherLangs = randomItems(otherLanguageNames, randomInt(0, 2)).map(lang => ({
    language: lang,
    read: randomItem(['fluent', 'working_knowledge']),
    write: randomItem(['working_knowledge', 'limited']),
    speak: randomItem(['fluent', 'working_knowledge'])
  }));

  return { un_languages: unLangs, other_languages: otherLangs };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jobId, count = 80, jobType = 'product_delivery' } = await req.json();

    if (!jobId) {
      throw new Error("jobId is required");
    }

    const totalCount = count;
    console.log(`Generating ${totalCount} test applicants for job ${jobId} with jobType: ${jobType}`);
    console.log(`Distribution: ${Math.floor(totalCount * 0.10)} exceeds, ${Math.floor(totalCount * 0.30)} meets, ${Math.floor(totalCount * 0.40)} close, ${Math.floor(totalCount * 0.20)} far`);

    const candidatesToCreate = [];
    const applicationsToCreate = [];

    for (let i = 0; i < totalCount; i++) {
      const quality = determineQualityDistribution(i, totalCount);
      const gender = determineGender(i, totalCount);
      const hasUNExp = shouldHaveUNExperience(quality);
      const hasUNRelatives = shouldHaveUNRelatives(i);

      const firstName = gender === 'Man' ? randomItem(maleFirstNames) : randomItem(femaleFirstNames);
      const lastName = randomItem(lastNames);
      const email = `test.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now()}.${i}@example.com`;
      const phone = generatePhone();
      const nationality = randomItem(nationalities);
      const location = randomItem(cities);
      const maritalStatus = randomItem(['Single', 'Married', 'Divorced', 'Widowed']);
      const dob = randomDate(new Date(1970, 0, 1), new Date(2000, 0, 1));

      // Generate core data based on job type and quality
      const skills = getSkillsForJobType(quality, jobType);
      const certs = getCertificationsForJobType(quality, jobType);
      const educationPHF = generateEducationPHF(quality, jobType);
      const employmentPHF = generateEmploymentPHF(quality, hasUNExp, jobType);
      const references = generateReferences();
      const dependants = generateDependants(maritalStatus);
      const relatives = generateUNRelatives(hasUNRelatives);
      const languagesPHF = generateLanguagesPHF();
      
      // Years of experience based on quality
      const yearsOfExp = quality === 'exceeds' ? randomInt(10, 20) : 
                         quality === 'meets' ? randomInt(5, 10) : 
                         quality === 'close' ? randomInt(2, 5) : randomInt(0, 2);
      
      const motivationLetter = generateMotivationLetter(skills, yearsOfExp, firstName, lastName, quality, jobType);

      // Build complete PHF data
      const phfData = {
        personalDetails: {
          familyName: lastName,
          firstNames: firstName,
          title: gender === 'Man' ? 'Mr' : randomItem(['Ms', 'Mrs', 'Miss']),
          maidenName: '',
          sex: gender,
          dateOfBirth: dob.toISOString().split('T')[0],
          placeOfBirth: location.city,
          countryOfBirth: location.country,
          presentNationality: nationality,
          nationalityChanged: false,
          nationalityChangeDetails: '',
          maritalStatus: maritalStatus,
          permanentAddress: `${randomItem(location.addresses)}, ${location.city}, ${location.country}`,
          presentAddress: `${randomItem(location.addresses)}, ${location.city}, ${location.country}`,
          presentAddressSameAsPermanent: Math.random() > 0.3,
          telephone: phone,
          email: email,
          usGreenCard: false,
          usGreenCardDetails: ''
        },
        noDependants: dependants.length === 0,
        dependants: dependants,
        noUNRelatives: relatives.length === 0,
        relatives: relatives,
        workPreferences: {
          preferred_locations: randomItems(cities.map(c => c.city), 3).join(', '),
          remote_work_preference: randomItem(['Fully Remote', 'Hybrid', 'On-site']),
          travel_availability: randomItem(['Up to 25%', '25-50%', '50-75%', 'Over 75%']),
          contract_type_preference: randomItem(['Fixed-term', 'Continuing', 'Temporary']),
          notice_period: `${randomInt(1, 3)} months`
        },
        languages: languagesPHF,
        education: educationPHF,
        employment: employmentPHF,
        unemploymentPeriods: [],
        additionalInformation: {
          additional_skills: skills.join(', '),
          fellowships: quality === 'exceeds' && Math.random() > 0.7 ? [{
            title: randomItem(['Fulbright Scholar', 'Rhodes Scholar', 'Marshall Scholar']),
            organization: 'Academic Institution',
            year: randomInt(2010, 2020)
          }] : [],
          law_violations_disclosed: false,
          law_violations_details: ''
        },
        consentToSend: {
          consent_other_un_orgs: true,
          consent_national_government: Math.random() > 0.3,
          consent_other: false,
          consent_other_text: ''
        },
        mobilityMedical: {
          mobility_medical_reservations: '',
          assessment_accommodations_needed: Math.random() > 0.92,
          accommodation_extended_time: false,
          accommodation_alternative_format: false,
          accommodation_accessible_location: false,
          accommodation_interpreter: false,
          accommodation_breaks: false,
          accommodation_alternative_interview: false,
          accommodation_assistive_technology: false,
          accommodation_other: false,
          accommodation_details: '',
          accommodation_contact_preference: ''
        },
        references: references,
        employerContact: {
          objection_to_contact_present_employer: Math.random() > 0.8,
          presently_in_government_employ: Math.random() > 0.7
        },
        availability: {
          availability_mode: randomItem(['date', 'notice_period']),
          notice_period_days: randomInt(30, 90),
          availability_date: randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        },
        motivationLetter: {
          motivation_letter_content: motivationLetter
        },
        certification: {
          certify_true_complete_correct: true,
          signature_type: 'typed',
          typed_full_name: `${firstName} ${lastName}`,
          signature_image_url: null,
          signature_place: location.city,
          signature_date: new Date().toISOString(),
          signed_at_utc: new Date().toISOString()
        },
        // Store quality tier for debugging/verification
        _metadata: {
          quality_tier: quality,
          job_type: jobType
        }
      };

      // Candidate record
      candidatesToCreate.push({
        name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        family_name: lastName,
        email: email,
        phone: phone,
        gender: gender,
        date_of_birth: dob.toISOString().split('T')[0],
        present_nationality: nationality,
        location: `${location.city}, ${location.country}`,
        present_city: location.city,
        present_country: location.country,
        skills: skills,
        certifications: certs.map(c => ({ name: c, year: randomInt(2018, 2024) })),
        languages: languagesPHF,
        education: educationPHF.map(e => ({
          degree: e.degree_or_certificate_title,
          institution: e.institution_name,
          year: e.to_year,
          field: e.main_course_of_study
        })),
        work_experience: employmentPHF.map(e => ({
          title: e.exact_title,
          company: e.employer_name,
          start_date: `${e.from_year}-${String(e.from_month).padStart(2, '0')}-01`,
          end_date: e.is_present ? null : `${e.to_year}-${String(e.to_month).padStart(2, '0')}-01`,
          is_current: e.is_present,
          description: e.duties_and_responsibilities
        })),
        phf_work_experience: employmentPHF,
        phf_education: educationPHF,
        years_of_experience: yearsOfExp,
        un_experience: hasUNExp,
        marital_status_detailed: maritalStatus,
        professional_summary: `Experienced ${skills[0] || 'professional'} with ${yearsOfExp} years of experience in ${skills.slice(0, 3).join(', ')}.`,
        motivation_letter: motivationLetter,
        personal_references: references,
        notice_period_days: phfData.availability.notice_period_days,
        availability_date_detailed: phfData.availability.availability_date,
        availability_mode_detailed: phfData.availability.availability_mode,
        willing_to_relocate: Math.random() > 0.3,
        remote_work_preference: phfData.workPreferences.remote_work_preference,
        travel_availability: phfData.workPreferences.travel_availability,
        contract_type_preference: phfData.workPreferences.contract_type_preference,
        notice_period: phfData.workPreferences.notice_period,
        preferred_locations: randomItems(cities.map(c => c.city), 3),
        profile_completion_percentage: 100
      });

      // Application record with PHF data
      applicationsToCreate.push({
        candidate_email: email,
        phf_data: phfData,
        quality_tier: quality
      });
    }

    console.log(`Inserting ${candidatesToCreate.length} candidates...`);

    const { data: insertedCandidates, error: candidateError } = await supabase
      .from('candidates')
      .insert(candidatesToCreate)
      .select('id, email');

    if (candidateError) {
      console.error('Error inserting candidates:', candidateError);
      throw candidateError;
    }

    console.log(`Inserted ${insertedCandidates.length} candidates`);

    // Map emails to candidate IDs
    const emailToId = new Map(insertedCandidates.map(c => [c.email, c.id]));

    // Create applications with PHF data
    const applicationsWithIds = applicationsToCreate.map(app => ({
      job_id: jobId,
      candidate_id: emailToId.get(app.candidate_email),
      status: 'Application',
      phf_completed: true,
      phf_data: app.phf_data,
      submitted_at: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()).toISOString(),
      answers: {},
      consents: { privacy: true, dataProcessing: true }
    }));

    console.log(`Inserting ${applicationsWithIds.length} applications with full PHF data...`);

    const { data: insertedApps, error: applicationError } = await supabase
      .from('applications')
      .insert(applicationsWithIds)
      .select('id');

    if (applicationError) {
      console.error('Error inserting applications:', applicationError);
      throw applicationError;
    }

    // Count by quality tier
    const qualityCounts = applicationsToCreate.reduce((acc, app) => {
      acc[app.quality_tier] = (acc[app.quality_tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`Successfully created ${insertedCandidates.length} candidates and ${insertedApps.length} applications`);
    console.log(`Quality distribution: exceeds=${qualityCounts.exceeds || 0}, meets=${qualityCounts.meets || 0}, close=${qualityCounts.close || 0}, far=${qualityCounts.far || 0}`);

    // Log audit entry
    await supabase.from('audit_logs').insert({
      action: 'BULK_TEST_DATA_GENERATION',
      entity: 'applications',
      entity_id: jobId,
      after: {
        candidates_created: insertedCandidates.length,
        applications_created: insertedApps.length,
        job_type: jobType,
        quality_distribution: qualityCounts,
        with_full_phf: true
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        candidates_created: insertedCandidates.length,
        applications_created: insertedApps.length,
        job_type: jobType,
        quality_distribution: qualityCounts,
        message: `${totalCount} test applicants created with ${jobType} profiles: ${qualityCounts.exceeds || 0} exceed, ${qualityCounts.meets || 0} meet, ${qualityCounts.close || 0} close, ${qualityCounts.far || 0} far from requirements`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in generate-test-applicants function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
