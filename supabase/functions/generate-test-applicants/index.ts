import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Data arrays for realistic generation
const firstNames = [
  "James", "Maria", "David", "Sophie", "Michael", "Emma", "Alexander", "Olivia",
  "William", "Isabella", "Chen", "Fatima", "Raj", "Yuki", "Ahmed", "Ana",
  "Lucas", "Priya", "Mohammed", "Elena", "John", "Sarah", "Robert", "Jennifer",
  "Daniel", "Amanda", "Thomas", "Jessica", "Christopher", "Ashley", "Matthew", "Emily",
  "Andrew", "Samantha", "Ryan", "Nicole", "Brandon", "Rachel", "Jonathan", "Laura",
  "Kevin", "Stephanie", "Eric", "Michelle", "Brian", "Kimberly", "Jason", "Rebecca",
  "Jacob", "Angela", "Nicholas", "Melissa", "Nathan", "Amy", "Tyler", "Christina",
  "Aaron", "Elizabeth", "Adam", "Katherine", "Justin", "Lauren", "Patrick", "Victoria",
  "Sean", "Hannah", "Mark", "Grace", "Steven", "Natalie", "Peter", "Diana",
  "Carlos", "Anna", "Luis", "Sofia", "Diego", "Valentina", "Antonio", "Camila",
  "Juan", "Isabella", "Pablo", "Lucia", "Miguel", "Gabriela", "Rafael", "Daniela",
  "Wei", "Xin", "Ming", "Ling", "Jian", "Mei", "Tao", "Yan",
  "Hiroshi", "Sakura", "Takeshi", "Akiko", "Kenji", "Haruka", "Ryo", "Yui",
  "Hassan", "Aisha", "Omar", "Layla", "Ali", "Zara", "Ibrahim", "Noor",
  "Arjun", "Anjali", "Vikram", "Kavita", "Rohan", "Neha", "Aditya", "Pooja",
  "Luca", "Francesca", "Marco", "Giulia", "Alessandro", "Chiara", "Matteo", "Valentina",
  "Felix", "Charlotte", "Maximilian", "Amelie", "Leon", "Mia", "Lukas", "Hannah",
  "Henrik", "Astrid", "Lars", "Ingrid", "Erik", "Freya", "Anders", "Elsa",
  "Pierre", "Camille", "Antoine", "Aurelie", "Julien", "Marie", "Nicolas", "Chloe",
  "Oliver", "Amelia", "Harry", "Isla", "George", "Poppy", "Oscar", "Lily"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Martinez", "Rodriguez",
  "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee",
  "Thompson", "White", "Harris", "Clark", "Lewis", "Walker", "Hall", "Allen",
  "Wong", "Khan", "Patel", "Singh", "Kumar", "Nguyen", "Kim", "Park",
  "Chen", "Liu", "Zhang", "Wang", "Li", "Yang", "Zhao", "Wu",
  "Yamamoto", "Suzuki", "Tanaka", "Watanabe", "Sato", "Nakamura", "Kobayashi", "Kato",
  "Hassan", "Ali", "Ahmed", "Mohammed", "Ibrahim", "Rahman", "Abdullah", "Hussein",
  "Sharma", "Verma", "Gupta", "Joshi", "Reddy", "Rao", "Mehta", "Nair",
  "Silva", "Santos", "Oliveira", "Costa", "Fernandez", "Perez", "Lopez", "Gonzalez",
  "Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci",
  "Mueller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
  "Johansson", "Andersson", "Karlsson", "Nilsson", "Eriksson", "Larsson", "Olsson", "Persson",
  "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand",
  "Evans", "Roberts", "Wright", "Green", "Hughes", "Edwards", "Collins", "Stewart"
];

const companies = [
  "Microsoft", "Google", "Amazon", "IBM", "Accenture", "Deloitte", "KPMG", "PwC",
  "Cisco Systems", "Oracle", "SAP", "VMware", "Palo Alto Networks", "CrowdStrike",
  "FireEye", "Mandiant", "Tenable", "Rapid7", "Qualys", "Check Point",
  "Symantec", "McAfee", "Trend Micro", "Fortinet", "F5 Networks", "Splunk",
  "JPMorgan Chase", "Bank of America", "Citigroup", "Goldman Sachs", "Morgan Stanley",
  "HSBC", "Barclays", "Deutsche Bank", "Credit Suisse", "UBS", "BNP Paribas",
  "Ernst & Young", "McKinsey & Company", "Boston Consulting Group", "Bain & Company",
  "Booz Allen Hamilton", "Leidos", "Northrop Grumman", "Raytheon", "Lockheed Martin",
  "BAE Systems", "General Dynamics", "L3Harris Technologies", "SAIC", "CACI International",
  "UK Cabinet Office", "US Department of Defense", "NATO CCDCOE", "Europol", "INTERPOL",
  "UK National Cyber Security Centre", "CISA", "NSA", "GCHQ", "FBI Cyber Division"
];

const universities = [
  "MIT", "Stanford University", "Carnegie Mellon University", "UC Berkeley", "Oxford University",
  "Cambridge University", "Imperial College London", "ETH Zurich", "TU Munich", "KTH Royal Institute",
  "National University of Singapore", "University of Tokyo", "Tsinghua University", "Peking University",
  "IIT Delhi", "IIT Bombay", "University of Toronto", "University of Waterloo", "McGill University",
  "Georgia Tech", "University of Illinois", "Cornell University", "Columbia University", "NYU",
  "University of Washington", "UT Austin", "Purdue University", "University of Michigan",
  "University College London", "King's College London", "University of Edinburgh", "TU Delft"
];

const securitySkills = [
  "Penetration Testing", "Vulnerability Assessment", "Burp Suite", "Metasploit", "Kali Linux",
  "OWASP Top 10", "Network Security", "Web Application Security", "API Security", "Cloud Security",
  "Python", "Bash Scripting", "PowerShell", "SQL Injection", "XSS", "CSRF",
  "Nmap", "Wireshark", "Nessus", "OpenVAS", "Acunetix", "AppScan",
  "Security Auditing", "Compliance (ISO 27001, NIST)", "Risk Assessment", "Threat Modeling",
  "Incident Response", "Malware Analysis", "Reverse Engineering", "Exploit Development",
  "Social Engineering", "Phishing Simulation", "Red Teaming", "Blue Teaming",
  "SIEM (Splunk, QRadar)", "IDS/IPS", "Firewall Management", "VPN Configuration",
  "Container Security", "Kubernetes Security", "AWS Security", "Azure Security", "GCP Security",
  "CI/CD Security", "DevSecOps", "Source Code Analysis", "DAST", "SAST"
];

const certifications = [
  "OSCP (Offensive Security Certified Professional)",
  "CEH (Certified Ethical Hacker)",
  "CISSP (Certified Information Systems Security Professional)",
  "Security+ (CompTIA Security+)",
  "GPEN (GIAC Penetration Tester)",
  "GWAPT (GIAC Web Application Penetration Tester)",
  "GXPN (GIAC Exploit Researcher and Advanced Penetration Tester)",
  "CREST Registered Penetration Tester",
  "CREST Certified Web Application Tester",
  "OSWE (Offensive Security Web Expert)",
  "OSCE (Offensive Security Certified Expert)",
  "GCIH (GIAC Certified Incident Handler)",
  "GCFA (GIAC Certified Forensic Analyst)"
];

const jobTitles = [
  "Junior Security Analyst", "Security Analyst", "Senior Security Analyst",
  "Penetration Tester", "Senior Penetration Tester", "Lead Penetration Tester",
  "Security Consultant", "Senior Security Consultant", "Principal Security Consultant",
  "SOC Analyst", "Senior SOC Analyst", "SOC Manager",
  "Security Engineer", "Senior Security Engineer", "Principal Security Engineer",
  "Ethical Hacker", "Senior Ethical Hacker", "Red Team Lead",
  "Application Security Engineer", "Cloud Security Engineer", "Network Security Engineer",
  "Cybersecurity Researcher", "Vulnerability Researcher", "Security Architect"
];

const degrees = [
  { level: "Bachelor", field: "Computer Science" },
  { level: "Bachelor", field: "Cybersecurity" },
  { level: "Bachelor", field: "Information Technology" },
  { level: "Bachelor", field: "Computer Engineering" },
  { level: "Bachelor", field: "Information Security" },
  { level: "Master", field: "Cybersecurity" },
  { level: "Master", field: "Information Security" },
  { level: "Master", field: "Computer Science" },
  { level: "Master", field: "Network Security" },
  { level: "PhD", field: "Cybersecurity" },
  { level: "PhD", field: "Computer Science" },
  { level: "PhD", field: "Information Security" }
];

const languages = ["English", "Spanish", "French", "German", "Mandarin", "Arabic", "Russian", "Japanese", "Portuguese", "Italian"];
const proficiencyLevels = ["Native", "Fluent", "Advanced", "Intermediate"];

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateEducation(quality: string): any[] {
  const numDegrees = quality === 'strong' ? 2 : Math.random() > 0.6 ? 2 : 1;
  const education = [];
  
  const hasMasters = quality === 'strong' || (quality === 'good' && Math.random() > 0.5);
  const hasPhd = quality === 'strong' && Math.random() > 0.8;
  
  // Bachelor's degree
  const bachelorDegree = degrees.filter(d => d.level === 'Bachelor');
  const bachelor = randomItem(bachelorDegree);
  const bachelorYear = 2008 + Math.floor(Math.random() * 12);
  
  education.push({
    degree: bachelor.level,
    field: bachelor.field,
    institution: randomItem(universities),
    year: bachelorYear,
    gpa: (3.2 + Math.random() * 0.8).toFixed(2)
  });
  
  if (hasPhd) {
    const phdDegree = degrees.filter(d => d.level === 'PhD');
    const phd = randomItem(phdDegree);
    education.push({
      degree: phd.level,
      field: phd.field,
      institution: randomItem(universities),
      year: bachelorYear + 6 + Math.floor(Math.random() * 3),
      gpa: (3.5 + Math.random() * 0.5).toFixed(2)
    });
  } else if (hasMasters) {
    const masterDegree = degrees.filter(d => d.level === 'Master');
    const master = randomItem(masterDegree);
    education.push({
      degree: master.level,
      field: master.field,
      institution: randomItem(universities),
      year: bachelorYear + 2 + Math.floor(Math.random() * 3),
      gpa: (3.4 + Math.random() * 0.6).toFixed(2)
    });
  }
  
  return education;
}

function generateWorkExperience(quality: string, education: any[]): any[] {
  const numJobs = 3 + Math.floor(Math.random() * 2); // 3-4 jobs
  const workExperience = [];
  const currentYear = new Date().getFullYear();
  const graduationYear = Math.max(...education.map(e => e.year));
  
  let careerStartYear = graduationYear;
  
  for (let i = 0; i < numJobs; i++) {
    const isRecent = i === 0;
    const startYear = careerStartYear + i * (Math.floor(Math.random() * 2) + 1);
    const endYear = isRecent ? currentYear : startYear + 2 + Math.floor(Math.random() * 3);
    
    // Progressive titles based on career stage
    let titleIndex = Math.min(Math.floor(i * (jobTitles.length / numJobs)), jobTitles.length - 1);
    if (quality === 'strong') titleIndex = Math.min(titleIndex + 3, jobTitles.length - 1);
    if (quality === 'weak') titleIndex = Math.max(0, titleIndex - 3);
    
    workExperience.push({
      position: jobTitles[titleIndex],
      company: randomItem(companies),
      location: randomItem(["London, UK", "New York, USA", "Singapore", "Geneva, Switzerland", "Dubai, UAE", "Toronto, Canada"]),
      start_date: `${startYear}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
      end_date: isRecent ? null : `${endYear}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
      current: isRecent,
      description: `Conducted security assessments and penetration testing for enterprise clients. Identified and reported critical vulnerabilities in web applications, networks, and cloud infrastructure. Collaborated with development teams to remediate security issues and improve security posture.`
    });
  }
  
  return workExperience.reverse(); // Most recent first
}

function generateSkills(quality: string): string[] {
  const count = quality === 'strong' ? 15 : quality === 'good' ? 12 : quality === 'average' ? 10 : 7;
  return randomItems(securitySkills, count);
}

function generateCertifications(quality: string): any[] {
  const certs = [];
  const count = quality === 'strong' ? 4 : quality === 'good' ? 3 : quality === 'average' ? 2 : 1;
  
  const selectedCerts = randomItems(certifications, count);
  const currentYear = new Date().getFullYear();
  
  selectedCerts.forEach((cert, i) => {
    certs.push({
      name: cert,
      issuer: cert.includes('OSCP') ? 'Offensive Security' : cert.includes('CEH') ? 'EC-Council' : cert.includes('GIAC') ? 'GIAC' : cert.includes('CISSP') ? 'ISC2' : cert.includes('CompTIA') ? 'CompTIA' : 'CREST',
      year: currentYear - Math.floor(Math.random() * 5) - i,
      expiry: cert.includes('CISSP') || cert.includes('CEH') ? currentYear + 2 : null
    });
  });
  
  return certs;
}

function generateLanguages(): any {
  const numLanguages = 2 + Math.floor(Math.random() * 2); // 2-3 languages
  const selectedLanguages = randomItems(languages, numLanguages);
  
  const result: any = {};
  selectedLanguages.forEach((lang, i) => {
    result[lang.toLowerCase()] = {
      read: i === 0 ? 'Native' : randomItem(proficiencyLevels),
      write: i === 0 ? 'Native' : randomItem(proficiencyLevels),
      speak: i === 0 ? 'Native' : randomItem(proficiencyLevels)
    };
  });
  
  return result;
}

function determineQuality(index: number): string {
  const rand = Math.random();
  if (index < 50) return 'strong'; // First 50 are strong
  if (index < 130) return 'good'; // Next 80 are good
  if (index < 180) return 'average'; // Next 50 are average
  return 'weak'; // Last 20 are weak
}

function determineStage(index: number): string {
  if (index < 40) return 'Application';
  if (index < 90) return 'Screening';
  if (index < 125) return 'Longlist';
  if (index < 155) return 'Shortlist';
  if (index < 175) return 'Pre-Recorded Video';
  if (index < 190) return 'Panel Interview';
  if (index < 195) return 'Recommended';
  return 'Rejected';
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

    console.log(`Starting generation of 200 test applicants for job: ${jobId}`);

    const candidatesToCreate = [];
    const applicationsToCreate = [];

    // Generate 200 candidates and applications
    for (let i = 0; i < 200; i++) {
      const quality = determineQuality(i);
      const stage = determineStage(i);
      
      const firstName = randomItem(firstNames);
      const lastName = randomItem(lastNames);
      const email = `test.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`;
      
      const education = generateEducation(quality);
      const workExperience = generateWorkExperience(quality, education);
      const skills = generateSkills(quality);
      const certifications = generateCertifications(quality);
      const languagesData = generateLanguages();
      
      const yearsOfExp = workExperience.reduce((sum, job) => {
        const start = new Date(job.start_date).getFullYear();
        const end = job.end_date ? new Date(job.end_date).getFullYear() : new Date().getFullYear();
        return sum + (end - start);
      }, 0);
      
      const candidate = {
        name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: `+${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 900000000) + 100000000}`,
        location: randomItem(["London, UK", "New York, USA", "Singapore", "Geneva, Switzerland", "Toronto, Canada"]),
        education: education,
        work_experience: workExperience,
        skills: skills,
        certifications: certifications,
        languages: languagesData,
        years_of_experience: yearsOfExp,
        professional_summary: `Experienced cybersecurity professional with ${yearsOfExp}+ years specializing in penetration testing, vulnerability assessment, and security consulting. Proven track record of identifying critical security vulnerabilities and helping organizations strengthen their security posture.`,
        has_security_clearance: quality === 'strong' && Math.random() > 0.7,
        un_experience: quality === 'strong' && Math.random() > 0.8,
        willing_to_relocate: Math.random() > 0.3,
        profile_completion_percentage: 95,
        date_of_birth: randomDate(new Date(1980, 0, 1), new Date(1998, 11, 31)),
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        nationality_changed: false,
        present_nationality_detailed: randomItem(["British", "American", "Canadian", "Australian", "German", "French", "Indian", "Chinese", "Japanese", "Brazilian"]),
        marital_status_detailed: randomItem(["Single", "Married", "Divorced"]),
        availability_date_detailed: randomDate(new Date(), new Date(new Date().setMonth(new Date().getMonth() + 3)))
      };
      
      candidatesToCreate.push(candidate);
      
      applicationsToCreate.push({
        candidate_email: email,
        stage: stage,
        phf_completed: Math.random() > 0.1 // 90% completed
      });
    }

    console.log(`Generated ${candidatesToCreate.length} candidates, inserting in batches...`);

    // Insert candidates in batches of 50
    const batchSize = 50;
    const insertedCandidates = [];
    
    for (let i = 0; i < candidatesToCreate.length; i += batchSize) {
      const batch = candidatesToCreate.slice(i, i + batchSize);
      console.log(`Inserting candidate batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidatesToCreate.length / batchSize)}`);
      
      const { data, error } = await supabase
        .from('candidates')
        .insert(batch)
        .select('id, email');
      
      if (error) {
        console.error(`Error inserting candidate batch:`, error);
        throw error;
      }
      
      insertedCandidates.push(...(data || []));
    }

    console.log(`Inserted ${insertedCandidates.length} candidates, creating applications...`);

    // Create a map of email to candidate ID
    const emailToId = new Map(insertedCandidates.map(c => [c.email, c.id]));
    
    // Create applications
    const applicationsWithIds = applicationsToCreate.map(app => ({
      job_id: jobId,
      candidate_id: emailToId.get(app.candidate_email),
      status: app.stage,
      phf_completed: app.phf_completed,
      submitted_at: randomDate(new Date(new Date().setDate(new Date().getDate() - 30)), new Date()),
      answers: {},
      consents: { privacy: true, dataProcessing: true }
    }));

    // Insert applications in batches
    const insertedApplications = [];
    for (let i = 0; i < applicationsWithIds.length; i += batchSize) {
      const batch = applicationsWithIds.slice(i, i + batchSize);
      console.log(`Inserting application batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(applicationsWithIds.length / batchSize)}`);
      
      const { data, error } = await supabase
        .from('applications')
        .insert(batch)
        .select('id, status');
      
      if (error) {
        console.error(`Error inserting application batch:`, error);
        throw error;
      }
      
      insertedApplications.push(...(data || []));
    }

    console.log(`Successfully created ${insertedCandidates.length} candidates and ${insertedApplications.length} applications`);

    // Log audit entry
    await supabase.from('audit_logs').insert({
      action: 'BULK_TEST_DATA_GENERATION',
      entity: 'applications',
      entity_id: jobId,
      after: {
        candidates_created: insertedCandidates.length,
        applications_created: insertedApplications.length,
        stage_distribution: {
          Application: applicationsToCreate.filter(a => a.stage === 'Application').length,
          Screening: applicationsToCreate.filter(a => a.stage === 'Screening').length,
          Longlist: applicationsToCreate.filter(a => a.stage === 'Longlist').length,
          Shortlist: applicationsToCreate.filter(a => a.stage === 'Shortlist').length,
          'Pre-Recorded Video': applicationsToCreate.filter(a => a.stage === 'Pre-Recorded Video').length,
          'Panel Interview': applicationsToCreate.filter(a => a.stage === 'Panel Interview').length,
          Recommended: applicationsToCreate.filter(a => a.stage === 'Recommended').length,
          Rejected: applicationsToCreate.filter(a => a.stage === 'Rejected').length
        }
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        candidates_created: insertedCandidates.length,
        applications_created: insertedApplications.length,
        message: "Test data generated successfully"
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
