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
  "Cisco Systems", "Oracle", "SAP", "Palo Alto Networks", "CrowdStrike", "FireEye",
  "Mandiant", "Tenable", "Rapid7", "Check Point", "Symantec", "Fortinet", "Splunk",
  "JPMorgan Chase", "Bank of America", "Goldman Sachs", "HSBC", "Barclays",
  "Booz Allen Hamilton", "Leidos", "Northrop Grumman", "BAE Systems", "SAIC"
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
  "Cornell University", "Columbia University", "University of Washington", "TU Delft"
];

const securitySkills = [
  "Penetration Testing", "Vulnerability Assessment", "Burp Suite", "Metasploit", "Kali Linux",
  "OWASP Top 10", "Network Security", "Web Application Security", "API Security", "Cloud Security",
  "Python", "Bash Scripting", "PowerShell", "Incident Response", "Malware Analysis",
  "Security Auditing", "Compliance (ISO 27001, NIST)", "Risk Assessment", "Threat Modeling",
  "SIEM (Splunk, QRadar)", "Container Security", "Kubernetes Security", "AWS Security",
  "Azure Security", "DevSecOps", "Source Code Analysis", "Red Teaming", "Blue Teaming"
];

const certifications = [
  "OSCP", "CEH", "CISSP", "Security+", "GPEN", "GWAPT", "CREST CRT", "OSWE", "GCIH", "GCFA"
];

const jobTitles = {
  senior: [
    "Chief Information Security Officer", "Director of Cybersecurity", "Head of Security Operations",
    "Principal Security Architect", "Senior Security Manager", "VP of Information Security"
  ],
  mid: [
    "Cybersecurity Manager", "Security Operations Lead", "Senior Penetration Tester",
    "Security Analyst Team Lead", "Information Security Officer", "Senior Security Consultant"
  ],
  junior: [
    "Cybersecurity Analyst", "Security Operations Analyst", "Penetration Tester",
    "Vulnerability Analyst", "Security Consultant", "SOC Analyst"
  ]
};

const supervisorTitles = [
  "Chief Information Security Officer", "Director of Cybersecurity", "Head of Security Operations",
  "Security Operations Manager", "Principal Security Engineer", "Senior Technical Lead",
  "Information Security Director", "VP of Technology", "Chief Technology Officer",
  "Security Architecture Lead", "Programme Manager", "Division Chief"
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

const fieldsOfStudy = [
  "Computer Science", "Cybersecurity", "Information Technology", "Computer Engineering",
  "Information Systems", "Network Security", "Software Engineering", "Data Science"
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

function generateDuties(jobTitle: string, isUNJob: boolean): string {
  const baseDuties = {
    analyst: [
      "Monitored security events and alerts using SIEM tools, investigating and triaging potential security incidents across the organization's infrastructure",
      "Conducted regular vulnerability assessments and penetration tests of internal and external systems, documenting findings and tracking remediation progress",
      "Developed and maintained security documentation including policies, procedures, incident response playbooks, and security awareness training materials",
      "Collaborated with IT teams and business units to remediate identified vulnerabilities and implement security improvements",
      "Performed security reviews of new applications, infrastructure changes, and third-party integrations before production deployment",
      "Prepared detailed security reports and metrics for management and stakeholders, presenting findings in monthly security review meetings"
    ],
    pentester: [
      "Led comprehensive penetration testing engagements covering web applications, APIs, mobile applications, and network infrastructure using both automated tools and manual techniques",
      "Executed red team exercises simulating advanced persistent threats (APTs) to assess organizational resilience and incident response capabilities",
      "Developed custom exploitation tools, scripts, and proof-of-concept code to demonstrate the impact of identified security vulnerabilities",
      "Prepared detailed technical reports with CVSS-rated findings, business impact analysis, and prioritized remediation guidance for technical and executive audiences",
      "Mentored junior security analysts on penetration testing methodologies, secure coding practices, and technical report writing",
      "Collaborated with development teams to validate security fixes, conduct retesting, and improve secure software development lifecycle practices"
    ],
    manager: [
      "Directed a team of 8-15 security professionals responsible for security operations, incident response, vulnerability management, and compliance activities",
      "Developed and implemented enterprise security strategies aligned with business objectives, risk tolerance, and regulatory requirements",
      "Managed relationships with external security vendors, coordinated third-party assessments, and oversaw managed security service providers",
      "Presented security metrics, risk assessments, and strategic initiatives to executive leadership, board of directors, and key stakeholders",
      "Oversaw budget planning, resource allocation, and procurement for security initiatives totaling $2-5M annually",
      "Established security awareness programs, training curricula, and phishing simulation exercises for all staff levels"
    ],
    architect: [
      "Designed and implemented enterprise security architecture supporting cloud, on-premises, and hybrid environments across multiple geographic regions",
      "Evaluated and selected security technologies including SIEM, EDR, IAM, CASB, and zero trust solutions aligned with organizational requirements",
      "Developed security standards, frameworks, reference architectures, and design patterns for use across the organization",
      "Led security design reviews for major projects, infrastructure changes, and cloud migration initiatives, ensuring security by design principles",
      "Provided technical leadership, guidance, and mentorship to security engineering teams and cross-functional project teams",
      "Collaborated with business units, IT teams, and vendors to understand requirements and integrate security controls into solutions"
    ]
  };

  const unSpecificDuties = [
    "Ensured compliance with UN security policies, ICSC standards, and international best practices for information security",
    "Coordinated with other UN agencies on shared security initiatives, threat intelligence sharing, and incident response",
    "Supported field operations and duty stations with security guidance, training, and incident response during emergencies",
    "Contributed to inter-agency working groups on cybersecurity, data protection, and digital transformation initiatives"
  ];

  let category = 'analyst';
  const titleLower = jobTitle.toLowerCase();
  if (titleLower.includes('penetration') || titleLower.includes('red team') || titleLower.includes('ethical')) category = 'pentester';
  else if (titleLower.includes('manager') || titleLower.includes('director') || titleLower.includes('head') || titleLower.includes('chief') || titleLower.includes('lead')) category = 'manager';
  else if (titleLower.includes('architect') || titleLower.includes('principal')) category = 'architect';

  let duties = randomItems(baseDuties[category], 4);
  if (isUNJob) {
    duties = duties.concat(randomItems(unSpecificDuties, 2));
  }

  return duties.map(d => `• ${d}`).join('\n\n');
}

function generateMotivationLetter(skills: string[], yearsOfExp: number, firstName: string, lastName: string): string {
  const intro = randomItem([
    `I am writing to express my strong interest in contributing to UNICC's mission of providing digital solutions for the United Nations system. With ${yearsOfExp} years of experience in cybersecurity and a deep commitment to international cooperation, I am confident in my ability to make a meaningful impact on your team.`,
    `As a dedicated cybersecurity professional with ${yearsOfExp} years of progressive experience, I am excited about the opportunity to join UNICC and support the UN's digital transformation journey. My background in ${skills[0]} and ${skills[1]} aligns well with your requirements.`,
    `I am writing to apply for a position at UNICC, where I can leverage my ${yearsOfExp} years of cybersecurity expertise to support the critical work of the United Nations. My passion for protecting organizations from cyber threats, combined with my commitment to the UN's values of integrity and professionalism, makes me an ideal candidate.`
  ]);

  const body = randomItem([
    `Throughout my career, I have developed deep expertise in ${skills.slice(0, 3).join(', ')}. I have successfully led security initiatives that resulted in measurable improvements to organizational security posture, including reducing critical vulnerabilities by over 60% and implementing zero-trust architecture across enterprise environments.

My experience includes working with diverse, multicultural teams in complex organizational structures. I understand the unique challenges of operating in an international environment and the importance of balancing security requirements with operational needs. I am skilled at communicating technical concepts to non-technical stakeholders and building consensus across different teams and cultures.

In my current role, I have been responsible for conducting comprehensive security assessments, developing incident response procedures, and providing security guidance to project teams. I have also led security awareness initiatives and contributed to policy development efforts that align with industry standards and best practices.`,

    `My professional journey has equipped me with comprehensive skills in ${skills.slice(0, 3).join(', ')}. I have a proven track record of identifying and mitigating security risks, implementing robust security controls, and building security-aware cultures within organizations.

I am particularly skilled at bridging the gap between technical security teams and business stakeholders, ensuring that security considerations are understood and prioritized at all levels of an organization. My collaborative approach has been instrumental in successful cross-functional security initiatives that delivered measurable business value.

I have experience managing complex security projects from inception to completion, including vulnerability management programs, security tool implementations, and compliance initiatives. I am comfortable working independently while also thriving in team environments where knowledge sharing and collaboration are valued.`,

    `I bring extensive experience in ${skills.slice(0, 3).join(', ')}, having worked across various sectors including international organizations, government, and private industry. This diverse background has given me a unique perspective on security challenges and best practices.

I am adept at developing security strategies that align with organizational objectives while maintaining robust protection against evolving threats. My experience includes incident response leadership, security architecture design, and compliance with international standards such as ISO 27001 and NIST frameworks.

I am committed to continuous learning and staying current with the latest security trends, threats, and technologies. I regularly participate in professional development activities and contribute to the security community through knowledge sharing and mentorship.`
  ]);

  const closing = randomItem([
    `I am drawn to UNICC's unique position as the technology backbone of the UN system. The opportunity to contribute to securing digital infrastructure that supports humanitarian and development work worldwide is deeply motivating to me. I am committed to upholding the highest standards of integrity, professionalism, and respect for diversity that the UN represents.

I am confident that my technical expertise, international experience, and commitment to the UN's values would make me a valuable addition to your team. I welcome the opportunity to discuss how my skills and experience can contribute to UNICC's important mission.

Thank you for considering my application. I look forward to the opportunity to further discuss my qualifications and learn more about how I can contribute to UNICC's continued success.`,

    `The mission of UNICC resonates strongly with my professional values and career aspirations. I believe that effective cybersecurity is essential to enabling the UN's critical humanitarian and development work, and I am eager to be part of an organization that makes a real difference in the world.

I am confident that my technical expertise, combined with my commitment to the UN's core values, would make me a valuable addition to your team. I am excited about the possibility of contributing to an organization that has such a positive impact on people's lives around the world.

I appreciate your consideration of my application and look forward to the possibility of discussing my qualifications in more detail. Thank you for your time and attention.`,

    `Joining UNICC would allow me to combine my technical expertise with my desire to contribute to meaningful global initiatives. I am excited about the prospect of working alongside talented professionals who share a commitment to excellence and the UN's principles of integrity and respect.

My experience, skills, and values align closely with what I understand UNICC is looking for in its team members. I am confident in my ability to contribute from day one while continuing to grow and develop within the organization.

I appreciate your consideration of my application and look forward to the opportunity to discuss how I can contribute to UNICC's important work. Thank you for your time.`
  ]);

  return `${intro}\n\n${body}\n\n${closing}\n\nSincerely,\n${firstName} ${lastName}`;
}

function generateReferences(): Array<{ name: string; full_address: string; occupation_title: string }> {
  const refs = [];
  
  // Academic reference
  const academicGender = Math.random() > 0.5 ? 'male' : 'female';
  const academicFirst = randomItem(academicGender === 'male' ? maleFirstNames : femaleFirstNames);
  const academicLast = randomItem(lastNames);
  const uni = randomItem(universities);
  const uniCity = randomItem(cities);
  refs.push({
    name: `Professor ${academicFirst} ${academicLast}`,
    full_address: `Department of Computer Science, ${uni}, ${uniCity.city}, ${uniCity.country}`,
    occupation_title: randomItem(["Professor of Computer Science", "Professor of Cybersecurity", "Associate Professor of Information Security"])
  });

  // Professional reference (former supervisor)
  const profGender = Math.random() > 0.5 ? 'male' : 'female';
  const profFirst = randomItem(profGender === 'male' ? maleFirstNames : femaleFirstNames);
  const profLast = randomItem(lastNames);
  const profCompany = randomItem(companies);
  const profCity = randomItem(cities);
  refs.push({
    name: `${profFirst} ${profLast}`,
    full_address: `${profCompany}, ${randomItem(profCity.addresses)}, ${profCity.city}, ${profCity.country}`,
    occupation_title: randomItem(["Former Supervisor", "Director of IT Security", "Chief Technology Officer", "Head of Security Operations"])
  });

  // Colleague reference
  const collGender = Math.random() > 0.5 ? 'male' : 'female';
  const collFirst = randomItem(collGender === 'male' ? maleFirstNames : femaleFirstNames);
  const collLast = randomItem(lastNames);
  const collOrg = Math.random() > 0.5 ? randomItem(unOrganizations) : randomItem(companies);
  const collCity = randomItem(cities);
  refs.push({
    name: `${collFirst} ${collLast}`,
    full_address: `${collOrg}, ${collCity.city}, ${collCity.country}`,
    occupation_title: randomItem(["Senior Security Consultant", "Principal Engineer", "Technical Director", "Programme Manager"])
  });

  return refs;
}

function generateDependants(maritalStatus: string): Array<{ name: string; relationship: string; dateOfBirth: string }> {
  if (maritalStatus === 'Single' || Math.random() > 0.6) return [];

  const dependants = [];
  const numDependants = randomInt(1, 3);

  for (let i = 0; i < numDependants; i++) {
    const relationship = i === 0 && maritalStatus === 'Married' ? 'Spouse' : 'Child';
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = randomItem(gender === 'male' ? maleFirstNames : femaleFirstNames);
    
    const yearOffset = relationship === 'Spouse' ? randomInt(25, 50) : randomInt(1, 18);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - yearOffset);
    
    dependants.push({
      name: firstName,
      relationship,
      dateOfBirth: dob.toISOString().split('T')[0]
    });
  }

  return dependants;
}

function generateUNRelatives(shouldHave: boolean): Array<{ name: string; relationship: string; organization: string; position: string }> {
  if (!shouldHave) return [];

  const numRelatives = randomInt(1, 2);
  const relatives = [];
  const relationships = ['Sibling', 'Parent', 'Spouse', 'Cousin', 'Uncle', 'Aunt'];
  const positions = ['Programme Officer', 'Administrative Assistant', 'Project Manager', 'Technical Specialist', 'Human Resources Officer', 'Finance Officer'];

  for (let i = 0; i < numRelatives; i++) {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = randomItem(gender === 'male' ? maleFirstNames : femaleFirstNames);
    const lastName = randomItem(lastNames);

    relatives.push({
      name: `${firstName} ${lastName}`,
      relationship: randomItem(relationships),
      organization: randomItem(unOrganizations),
      position: randomItem(positions)
    });
  }

  return relatives;
}

function generateEducationPHF(quality: string): any[] {
  const numEducation = quality === 'strong' ? randomInt(2, 3) : quality === 'good' ? 2 : 1;
  const education = [];

  const degreeTypes = {
    phd: ["Ph.D.", "Doctor of Philosophy", "Doctorate"],
    masters: ["Master of Science", "Master of Arts", "MBA", "Master of Engineering"],
    bachelors: ["Bachelor of Science", "Bachelor of Arts", "Bachelor of Engineering"]
  };

  for (let i = 0; i < numEducation; i++) {
    const degreeCategory = i === 0 && quality === 'strong' ? 
      (Math.random() > 0.7 ? 'phd' : 'masters') : 
      (i === 0 && quality === 'good' ? 'masters' : 'bachelors');

    const startYear = 2000 + randomInt(0, 15);
    const duration = degreeCategory === 'phd' ? randomInt(3, 5) : degreeCategory === 'masters' ? randomInt(1, 2) : randomInt(3, 4);
    const endYear = startYear + duration;

    const location = randomItem(cities);
    const degreeTitle = randomItem(degreeTypes[degreeCategory]);
    const field = randomItem(fieldsOfStudy);

    education.push({
      from_month: randomInt(1, 12),
      from_year: startYear,
      to_month: randomInt(1, 12),
      to_year: endYear,
      is_present: false,
      institution_name: randomItem(universities),
      institution_place: location.city,
      institution_country: location.country,
      degree_type: degreeTitle,
      degree_or_certificate_title: `${degreeTitle} in ${field}`,
      main_course_of_study: field,
      is_completed: true
    });
  }

  return education.sort((a, b) => b.to_year - a.to_year);
}

function generateEmploymentPHF(quality: string, shouldHaveUNExp: boolean): any[] {
  const numJobs = quality === 'strong' ? randomInt(4, 5) : quality === 'good' ? randomInt(3, 4) : randomInt(2, 3);
  const employment = [];

  let currentYear = new Date().getFullYear();

  for (let i = 0; i < numJobs; i++) {
    const isUN = shouldHaveUNExp && i < 2;
    const company = isUN ? randomItem(unOrganizations) : randomItem(companies);
    const location = randomItem(cities);
    const supervisor = generateSupervisor(company);

    const duration = i === 0 ? randomInt(1, 3) : randomInt(2, 4);
    const startYear = currentYear - duration;
    const endYear = i === 0 ? null : currentYear;
    const isPresent = i === 0;

    const titleCategory = i === 0 && quality === 'strong' ? 'senior' : 
                          (i === 0 || quality === 'good') ? 'mid' : 'junior';
    const title = randomItem(jobTitles[titleCategory]);

    const duties = generateDuties(title, isUN);

    employment.push({
      from_month: randomInt(1, 12),
      from_year: startYear,
      to_month: isPresent ? null : randomInt(1, 12),
      to_year: isPresent ? null : endYear,
      is_present: isPresent,
      employer_name: company,
      employer_address: `${randomItem(location.addresses)}, ${location.city}, ${location.country}`,
      type_of_business: isUN ? 'International Organization' : randomItem(['Technology', 'Consulting', 'Defense', 'Financial Services', 'Government']),
      exact_title: title,
      duties_and_responsibilities: duties,
      un_grade: isUN ? randomItem(['P-2', 'P-3', 'P-4', 'P-5', 'D-1']) : null,
      annual_income_starting: randomInt(50000, 80000) * (numJobs - i),
      annual_income_most_recent: randomInt(70000, 120000) * (numJobs - i + 1),
      allowances_or_benefits: isUN ? 'Post adjustment, education grant, home leave, rental subsidy' : 'Health insurance, pension contribution, annual bonus, stock options',
      employees_supervised_number: quality === 'strong' ? randomInt(3, 15) : quality === 'good' ? randomInt(0, 5) : 0,
      employees_supervised_type: quality !== 'weak' && randomInt(0, 10) > 3 ? 'Direct reports including analysts and engineers' : null,
      reason_for_change: i === 0 ? null : randomItem([
        'Career advancement opportunity',
        'Seeking new challenges and professional growth',
        'Relocation for personal reasons',
        'Contract completion',
        'Organizational restructuring',
        'Better alignment with career goals'
      ]),
      supervisor_name: supervisor.name,
      supervisor_title: supervisor.title,
      supervisor_email: supervisor.email,
      supervisor_phone: supervisor.phone,
      supervisor_can_contact: Math.random() > 0.2,
      attestations: {
        confirm_duties_accurate: true,
        confirm_dates_accurate: true
      }
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
  
  // Random proficiency for other UN languages - only add if they have a level (not none)
  for (const lang of unLanguages.slice(1)) {
    if (Math.random() > 0.6) {
      const level = randomItem(proficiencies);
      unLangs[lang] = { read: level, write: level, speak: level };
    }
    // Don't add languages with 'none' - just skip them entirely
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

function determineQuality(index: number): string {
  if (index < 8) return 'strong';
  if (index < 14) return 'good';
  if (index < 30) return 'average';
  return 'weak';
}

function determineGender(index: number): 'Man' | 'Woman' {
  return index < 21 ? 'Man' : 'Woman';
}

function shouldHaveUNExperience(index: number): boolean {
  return index < 16;
}

function shouldHaveUNRelatives(index: number): boolean {
  return index % 10 === 0;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error("jobId is required");
    }

    console.log(`Generating 40 test applicants with full PHF data for job: ${jobId}`);

    const candidatesToCreate = [];
    const applicationsToCreate = [];

    for (let i = 0; i < 40; i++) {
      const quality = determineQuality(i);
      const gender = determineGender(i);
      const hasUNExp = shouldHaveUNExperience(i);
      const hasUNRelatives = shouldHaveUNRelatives(i);

      const firstName = gender === 'Man' ? randomItem(maleFirstNames) : randomItem(femaleFirstNames);
      const lastName = randomItem(lastNames);
      const email = `test.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now()}.${i}@example.com`;
      const phone = generatePhone();
      const nationality = randomItem(nationalities);
      const location = randomItem(cities);
      const maritalStatus = randomItem(['Single', 'Married', 'Divorced', 'Widowed']);
      const dob = randomDate(new Date(1970, 0, 1), new Date(2000, 0, 1));

      // Generate core data
      const skills = randomItems(securitySkills, randomInt(4, 8));
      const certs = randomItems(certifications, quality === 'strong' ? randomInt(3, 5) : randomInt(1, 3));
      const educationPHF = generateEducationPHF(quality);
      const employmentPHF = generateEmploymentPHF(quality, hasUNExp);
      const references = generateReferences();
      const dependants = generateDependants(maritalStatus);
      const relatives = generateUNRelatives(hasUNRelatives);
      const languagesPHF = generateLanguagesPHF();
      const yearsOfExp = quality === 'strong' ? randomInt(10, 20) : quality === 'good' ? randomInt(6, 12) : randomInt(2, 6);
      const motivationLetter = generateMotivationLetter(skills, yearsOfExp, firstName, lastName);

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
          fellowships: quality === 'strong' && Math.random() > 0.7 ? [{
            title: randomItem(['Fulbright Scholar', 'Rhodes Scholar', 'Marshall Scholar', 'Chevening Scholar']),
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
        professional_summary: `Experienced ${skills[0]} professional with ${yearsOfExp} years of experience in ${skills.slice(0, 3).join(', ')}.`,
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
        phf_data: phfData
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

    console.log(`Successfully created ${insertedCandidates.length} candidates and ${insertedApps.length} applications with complete PHF data`);

    // Log audit entry
    await supabase.from('audit_logs').insert({
      action: 'BULK_TEST_DATA_GENERATION',
      entity: 'applications',
      entity_id: jobId,
      after: {
        candidates_created: insertedCandidates.length,
        applications_created: insertedApps.length,
        with_full_phf: true
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        candidates_created: insertedCandidates.length,
        applications_created: insertedApps.length,
        message: "40 test applicants created with complete PHF data including motivation letters, references, duties & responsibilities, and supervisor details"
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
