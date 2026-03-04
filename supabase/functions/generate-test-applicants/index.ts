import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= NAME DATA =============
const maleFirstNames = [
  "James", "David", "Michael", "Alexander", "William", "Chen", "Raj", "Ahmed",
  "Lucas", "Mohammed", "John", "Robert", "Daniel", "Thomas", "Christopher", "Matthew",
  "Andrew", "Ryan", "Brandon", "Jonathan", "Kevin", "Eric", "Brian", "Jason",
  "Jacob", "Nicholas", "Nathan", "Tyler", "Aaron", "Adam", "Justin", "Patrick",
  "Sean", "Mark", "Steven", "Peter", "Carlos", "Luis", "Diego", "Antonio"
];

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

// ============= UNRELATED CONTENT (for 'far' tier) =============
const unrelatedSkills = [
  "Penetration Testing", "Network Security", "Vulnerability Assessment",
  "Accounting", "Legal Research", "Graphic Design", "Sales", "Payroll Processing",
  "Inventory Management", "Forklift Operation", "Carpentry", "Welding",
  "Retail Management", "Food Service", "Plumbing", "HVAC Repair"
];

const unrelatedJobTitles = [
  "Security Analyst", "Accountant", "Legal Assistant", "Sales Representative",
  "Customer Support Agent", "Data Entry Clerk", "Warehouse Supervisor",
  "Retail Store Manager", "Restaurant Manager", "Administrative Assistant"
];

const unrelatedDuties = [
  "Monitored security events and alerts using SIEM tools, investigating potential threats",
  "Conducted vulnerability assessments of network infrastructure and web applications",
  "Managed accounting records and financial reporting for department budgets",
  "Provided customer support via phone and email, resolving tier-1 inquiries",
  "Processed sales orders and maintained customer relationship management systems",
  "Performed data entry and document filing for administrative operations",
  "Supervised warehouse operations including inventory management and shipping"
];

const unrelatedEducation = [
  { degree: "Bachelor of Science", field: "Cybersecurity" },
  { degree: "Bachelor of Arts", field: "Fine Arts" },
  { degree: "Bachelor of Science", field: "Accounting" },
  { degree: "Associate Degree", field: "Culinary Arts" },
  { degree: "High School Diploma", field: "" }
];

const unrelatedCertifications = [
  "OSCP", "CEH", "CISSP", "CPA", "Bar Exam", "Real Estate License", "ServSafe"
];

// ============= HELPER FUNCTIONS =============
type QualityTier = 'exceeds' | 'meets' | 'close' | 'far';

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

function determineGender(index: number): 'Man' | 'Woman' {
  return index % 2 === 0 ? 'Man' : 'Woman';
}

function shouldHaveUNExperience(quality: QualityTier): boolean {
  if (quality === 'exceeds') return Math.random() > 0.2;  // 80% chance
  if (quality === 'meets') return Math.random() > 0.5;    // 50% chance
  if (quality === 'close') return Math.random() > 0.8;    // 20% chance
  return false;  // far candidates don't have UN experience
}

function shouldHaveUNRelatives(index: number): boolean {
  return index % 10 === 0;
}

// ============= CRITERION PARSING (same logic as scoring) =============
interface ParsedCriterion {
  text: string;
  type: 'years_experience' | 'education' | 'skill' | 'knowledge' | 'certification' | 'other';
  yearsRequired?: number;
  experienceField?: string;
  educationLevel?: string;
  educationFields?: string[];
}

interface ParsedJobRequirements {
  essentialCriteria: ParsedCriterion[];
  essentialEducation: ParsedCriterion[];
  jobTitle: string;
  grade: string;
}

function parseBulletPoints(description: string): string[] {
  if (!description) return [];
  return description
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- ') || line.startsWith('• ') || line.startsWith('·') || line.match(/^\d+\.\s/))
    .map(line => line.replace(/^[-•·]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 0);
}

function parseYearsRequired(text: string): number {
  // Match patterns like "At least two (2) years", "5+ years", "minimum 3 years"
  const match = text.match(/(?:at least\s+)?(\w+)?\s*\(?(\d+)\)?\s*(?:\+\s*)?years?/i);
  if (match) {
    return parseInt(match[2] || match[1], 10) || 0;
  }
  // Try word-based numbers
  const wordNumbers: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
  };
  for (const [word, num] of Object.entries(wordNumbers)) {
    if (text.toLowerCase().includes(word + ' year') || text.toLowerCase().includes(word + ' (')) {
      return num;
    }
  }
  return 0;
}

function extractExperienceField(text: string): string {
  // Extract what kind of experience is required
  const patterns = [
    /experience in (.+?)(?:,|\.|\s+and\s+|\s+or\s+|including|such as)/i,
    /experience (?:with|of) (.+?)(?:,|\.|\s+and\s+|\s+or\s+)/i,
    /relevant experience in (.+?)(?:,|\.|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return text.slice(0, 100);
}

function parseEducationLevel(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('master') || lowerText.includes('postgraduate') || lowerText.includes('advanced degree')) {
    return 'masters';
  }
  if (lowerText.includes('bachelor') || lowerText.includes('first university degree') || lowerText.includes('undergraduate')) {
    return 'bachelors';
  }
  if (lowerText.includes('phd') || lowerText.includes('doctorate')) {
    return 'doctorate';
  }
  if (lowerText.includes('diploma') || lowerText.includes('certificate')) {
    return 'diploma';
  }
  return 'bachelors';
}

function extractEducationFields(text: string): string[] {
  // Extract fields of study like "Information Technology, Cybersecurity, Computer Science"
  const fieldMatch = text.match(/(?:in|of)\s+([^.]+?)(?:\.|,\s*or|$)/i);
  if (fieldMatch) {
    return fieldMatch[1]
      .split(/,\s*|\s+or\s+/i)
      .map(f => f.trim())
      .filter(f => f.length > 0 && f.length < 50);
  }
  return ['Information Technology', 'Computer Science', 'Business Administration'];
}

function categorizeCriterion(text: string): ParsedCriterion['type'] {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('year') && (lowerText.includes('experience') || lowerText.includes('at least'))) {
    return 'years_experience';
  }
  if (lowerText.includes('degree') || lowerText.includes('education') || lowerText.includes('qualification') || lowerText.includes('university')) {
    return 'education';
  }
  if (lowerText.includes('certification') || lowerText.includes('certified') || lowerText.includes('certificate')) {
    return 'certification';
  }
  if (lowerText.includes('knowledge') || lowerText.includes('understanding') || lowerText.includes('familiarity')) {
    return 'knowledge';
  }
  if (lowerText.includes('skill') || lowerText.includes('proficiency') || lowerText.includes('ability')) {
    return 'skill';
  }
  return 'other';
}

function parseRequirements(requirements: any[]): ParsedJobRequirements {
  const essentialCriteria: ParsedCriterion[] = [];
  const essentialEducation: ParsedCriterion[] = [];
  
  for (const req of requirements) {
    const bullets = parseBulletPoints(req.description || '');
    const isEducation = req.category === 'Essential Education';
    
    for (const bullet of bullets) {
      const type = categorizeCriterion(bullet);
      const criterion: ParsedCriterion = { text: bullet, type };
      
      if (type === 'years_experience') {
        criterion.yearsRequired = parseYearsRequired(bullet);
        criterion.experienceField = extractExperienceField(bullet);
      }
      if (type === 'education' || isEducation) {
        criterion.educationLevel = parseEducationLevel(bullet);
        criterion.educationFields = extractEducationFields(bullet);
      }
      
      if (isEducation) {
        essentialEducation.push(criterion);
      } else {
        essentialCriteria.push(criterion);
      }
    }
  }
  
  return { essentialCriteria, essentialEducation, jobTitle: '', grade: '' };
}

// ============= DYNAMIC CONTENT GENERATION =============
function extractKeywordsFromCriteria(criteria: ParsedCriterion[]): string[] {
  const keywords: string[] = [];
  
  for (const c of criteria) {
    const text = c.text.toLowerCase();
    
    // Extract key skill/knowledge areas
    const matches = text.match(/(?:experience in|knowledge of|proficiency in|skills in|ability to|understanding of)\s+([^,.\n]+)/gi);
    if (matches) {
      for (const match of matches) {
        const extracted = match.replace(/^(experience in|knowledge of|proficiency in|skills in|ability to|understanding of)\s*/i, '').trim();
        if (extracted.length > 3 && extracted.length < 60) {
          keywords.push(extracted);
        }
      }
    }
    
    // Extract specific tools/technologies mentioned
    const toolPatterns = [
      /\b(jira|confluence|asana|trello|monday|clickup)\b/gi,
      /\b(agile|scrum|kanban|lean|waterfall)\b/gi,
      /\b(digital diplomacy|rsi|interpretation|translation)\b/gi,
      /\b(product management|product development|business analysis)\b/gi,
      /\b(project management|portfolio management|programme management)\b/gi,
      /\b(stakeholder management|requirements gathering|process optimization)\b/gi
    ];
    
    for (const pattern of toolPatterns) {
      const toolMatches = text.match(pattern);
      if (toolMatches) {
        keywords.push(...toolMatches.map(m => m.charAt(0).toUpperCase() + m.slice(1)));
      }
    }
  }
  
  return [...new Set(keywords)];
}

function generateSkillsFromCriteria(criteria: ParsedCriterion[], quality: QualityTier): string[] {
  const extractedKeywords = extractKeywordsFromCriteria(criteria);
  
  // Base skills from criteria
  const baseSkills = extractedKeywords.length > 0 ? extractedKeywords : [
    'Product Management', 'Business Analysis', 'Stakeholder Management',
    'Project Coordination', 'Requirements Gathering'
  ];
  
  // Enhancement skills for exceeds tier
  const advancedSkills = [
    'Strategic Roadmapping', 'OKR Methodology', 'Design Thinking',
    'Business Model Canvas', 'Lean Six Sigma', 'Digital Transformation',
    'Executive Stakeholder Management', 'P&L Responsibility', 'Team Leadership'
  ];
  
  // Partial/generic skills for close tier
  const genericSkills = [
    'Microsoft Office', 'Communication', 'Team Collaboration',
    'Documentation', 'Meeting Coordination', 'Report Writing'
  ];
  
  switch (quality) {
    case 'exceeds':
      return [...randomItems(baseSkills, Math.min(6, baseSkills.length)), ...randomItems(advancedSkills, 4)];
    case 'meets':
      return randomItems(baseSkills, Math.min(6, baseSkills.length));
    case 'close':
      return [...randomItems(baseSkills, Math.min(2, baseSkills.length)), ...randomItems(genericSkills, 3)];
    case 'far':
      return randomItems(unrelatedSkills, 4);
  }
}

function generateJobTitleFromCriteria(jobTitle: string, quality: QualityTier): string {
  // Extract base job family from job title
  const lowerTitle = jobTitle.toLowerCase();
  let family = 'Operations';
  
  if (lowerTitle.includes('product')) family = 'Product';
  else if (lowerTitle.includes('project')) family = 'Project';
  else if (lowerTitle.includes('programme') || lowerTitle.includes('program')) family = 'Programme';
  else if (lowerTitle.includes('digital')) family = 'Digital';
  else if (lowerTitle.includes('business')) family = 'Business';
  else if (lowerTitle.includes('security') || lowerTitle.includes('cyber')) family = 'Security';
  
  const titles = {
    Product: {
      exceeds: ['Head of Product Delivery', 'Director of Product Development', 'VP of Product', 'Chief Product Officer', 'Senior Product Director'],
      meets: ['Product Manager', 'Senior Product Owner', 'Product Development Lead', 'Associate Product Director'],
      close: ['Associate Product Manager', 'Product Coordinator', 'Junior Product Analyst', 'Product Assistant'],
      far: unrelatedJobTitles
    },
    Project: {
      exceeds: ['Director of Project Management', 'Head of PMO', 'Senior Programme Manager', 'VP of Delivery'],
      meets: ['Project Manager', 'Senior Project Coordinator', 'PMO Analyst', 'Delivery Manager'],
      close: ['Project Coordinator', 'Project Assistant', 'Junior Project Analyst'],
      far: unrelatedJobTitles
    },
    Programme: {
      exceeds: ['Director of Programme Management', 'Chief Programme Officer', 'Head of Delivery'],
      meets: ['Programme Manager', 'Senior Programme Coordinator', 'Portfolio Analyst'],
      close: ['Programme Assistant', 'Junior Programme Coordinator'],
      far: unrelatedJobTitles
    },
    Digital: {
      exceeds: ['Director of Digital Solutions', 'Head of Digital Transformation', 'Chief Digital Officer'],
      meets: ['Digital Solutions Manager', 'Digital Product Manager', 'Digital Services Lead'],
      close: ['Digital Coordinator', 'Digital Assistant', 'Junior Digital Analyst'],
      far: unrelatedJobTitles
    },
    Business: {
      exceeds: ['Director of Business Development', 'Head of Strategy', 'VP of Business Operations'],
      meets: ['Business Analyst', 'Business Development Manager', 'Strategy Analyst'],
      close: ['Junior Business Analyst', 'Business Coordinator', 'Operations Assistant'],
      far: unrelatedJobTitles
    },
    Security: {
      exceeds: ['CISO', 'Director of Cybersecurity', 'Head of Security Operations'],
      meets: ['Security Manager', 'Senior Security Analyst', 'Security Lead'],
      close: ['Security Analyst', 'Junior Security Specialist'],
      far: unrelatedJobTitles
    },
    Operations: {
      exceeds: ['Director of Operations', 'VP of Operations', 'Chief Operating Officer'],
      meets: ['Operations Manager', 'Senior Operations Analyst', 'Service Delivery Manager'],
      close: ['Operations Coordinator', 'Administrative Officer', 'Junior Analyst'],
      far: unrelatedJobTitles
    }
  };
  
  return randomItem(titles[family as keyof typeof titles]?.[quality] || titles.Operations[quality]);
}

function generateDutiesFromCriteria(criteria: ParsedCriterion[], jobTitle: string, quality: QualityTier): string {
  if (quality === 'far') {
    const duties = randomItems(unrelatedDuties, 4);
    return duties.map(d => `• ${d}`).join('\n\n');
  }
  
  const duties: string[] = [];
  const keywords = extractKeywordsFromCriteria(criteria);
  
  // Get experience fields from criteria
  const experienceFields = criteria
    .filter(c => c.type === 'years_experience' && c.experienceField)
    .map(c => c.experienceField!);
  
  const primaryField = experienceFields[0] || keywords[0] || 'product development';
  
  switch (quality) {
    case 'exceeds':
      duties.push(
        `Led end-to-end ${primaryField} initiatives across 5+ international organizations, managing teams of 15+ professionals and budgets exceeding $10M`,
        `Developed and executed strategic roadmaps for ${keywords.slice(0, 2).join(' and ') || 'digital transformation'} programs, achieving 98% on-time delivery and 40% efficiency improvements`,
        `Presented to C-level executives and board members, translating complex ${primaryField} outcomes into business value metrics and securing executive sponsorship for major initiatives`,
        `Pioneered new methodologies for ${keywords[1] || 'service delivery'} that reduced time-to-market by 35% while maintaining quality standards across all deliverables`
      );
      if (keywords.some(k => k.toLowerCase().includes('diplomacy') || k.toLowerCase().includes('interpretation'))) {
        duties.push(`Designed and optimized RSI (Remote Simultaneous Interpretation) platforms supporting 200+ multilingual events annually across 6 UN official languages`);
      }
      break;
      
    case 'meets':
      duties.push(
        `Managed ${primaryField} projects coordinating cross-functional teams of 8-12 members across 4 departments and multiple time zones`,
        `Implemented ${keywords[0] || 'agile'} methodologies for development teams, conducting sprint planning, daily standups, and retrospectives with 30% efficiency gains`,
        `Facilitated stakeholder workshops and requirements gathering sessions, documenting user stories and acceptance criteria for ${keywords.slice(0, 2).join(', ') || 'digital solutions'}`,
        `Developed and maintained project roadmaps with clear milestones, dependencies, and resource requirements, achieving 85% on-time delivery`
      );
      break;
      
    case 'close':
      duties.push(
        `Contributed to ${primaryField} initiatives as team member, assisting senior managers with documentation and coordination tasks`,
        `Participated in project activities using standard methodologies, tracking tasks and deadlines in project management tools`,
        `Prepared presentations and reports for team meetings, compiling data and creating visualizations for stakeholder updates`,
        `Attended ${keywords[0] || 'agile'} ceremonies as participant, learning sprint planning and retrospective processes`
      );
      break;
  }
  
  return duties.map(d => `• ${d}`).join('\n\n');
}

function generateEducationFromCriteria(educationCriteria: ParsedCriterion[], quality: QualityTier): any[] {
  if (quality === 'far') {
    const edu = randomItem(unrelatedEducation);
    return [{
      from_month: 9,
      from_year: randomInt(2010, 2015),
      to_month: 6,
      to_year: randomInt(2014, 2019),
      institution_name: randomItem(universities),
      institution_city: randomItem(cities).city,
      institution_country: randomItem(cities).country,
      degree_or_certificate_title: edu.degree,
      main_course_of_study: edu.field,
      completed: true,
      attestations: { confirm_education_true: true }
    }];
  }
  
  // Get required education level and fields from criteria
  const requiredLevel = educationCriteria.find(c => c.educationLevel)?.educationLevel || 'bachelors';
  const requiredFields = educationCriteria.flatMap(c => c.educationFields || []);
  const fields = requiredFields.length > 0 ? requiredFields : ['Information Technology', 'Business Administration', 'Computer Science'];
  
  const education = [];
  let currentYear = 2023;
  
  // Primary degree
  if (quality === 'exceeds') {
    // Add advanced degree
    education.push({
      from_month: 9,
      from_year: currentYear - 2,
      to_month: 6,
      to_year: currentYear,
      institution_name: randomItem(['INSEAD', 'London Business School', 'Harvard Business School', 'Wharton School', 'Stanford GSB']),
      institution_city: randomItem(cities).city,
      institution_country: randomItem(cities).country,
      degree_or_certificate_title: randomItem(['MBA', 'Executive MBA', 'Master of Science']),
      main_course_of_study: randomItem(['Technology Management', 'Digital Transformation', 'Innovation and Entrepreneurship']),
      completed: true,
      attestations: { confirm_education_true: true }
    });
    currentYear -= 5;
  }
  
  // Bachelor's degree (or Master's for meets if required)
  const primaryDegree = quality === 'meets' && requiredLevel === 'masters' 
    ? randomItem(['Master of Science', 'Master of Arts', 'Master of Business Administration'])
    : quality === 'close' 
    ? randomItem(['Bachelor of Arts', 'Bachelor of Science', 'Associate Degree'])
    : randomItem(['Bachelor of Science', 'Bachelor of Business Administration', 'Bachelor of Arts']);
  
  const primaryField = quality === 'close' 
    ? randomItem(['Communications', 'General Studies', 'Psychology', 'Sociology'])
    : randomItem(fields);
  
  education.push({
    from_month: 9,
    from_year: currentYear - 4,
    to_month: 6,
    to_year: currentYear,
    institution_name: randomItem(universities),
    institution_city: randomItem(cities).city,
    institution_country: randomItem(cities).country,
    degree_or_certificate_title: primaryDegree,
    main_course_of_study: primaryField,
    completed: true,
    attestations: { confirm_education_true: true }
  });
  
  return education;
}

function generateCertificationsFromCriteria(criteria: ParsedCriterion[], quality: QualityTier): string[] {
  if (quality === 'far') {
    return randomItems(unrelatedCertifications, randomInt(0, 1));
  }
  
  // Extract certification-related keywords
  const keywords = extractKeywordsFromCriteria(criteria);
  const lowerKeywords = keywords.map(k => k.toLowerCase()).join(' ');
  
  // Determine relevant certifications based on job requirements
  const relevantCerts: string[] = [];
  
  if (lowerKeywords.includes('project') || lowerKeywords.includes('programme') || lowerKeywords.includes('portfolio')) {
    relevantCerts.push('PMP', 'PRINCE2 Practitioner', 'CAPM', 'PMI-ACP');
  }
  if (lowerKeywords.includes('agile') || lowerKeywords.includes('scrum')) {
    relevantCerts.push('Certified Scrum Master (CSM)', 'SAFe Agilist', 'Professional Scrum Master');
  }
  if (lowerKeywords.includes('product')) {
    relevantCerts.push('Certified Product Manager', 'Product Management Certificate', 'AIPMM Certified');
  }
  if (lowerKeywords.includes('business') || lowerKeywords.includes('analysis')) {
    relevantCerts.push('CBAP', 'CCBA', 'PMI-PBA');
  }
  if (lowerKeywords.includes('lean') || lowerKeywords.includes('process')) {
    relevantCerts.push('Lean Six Sigma Green Belt', 'Lean Six Sigma Black Belt');
  }
  
  // Default certifications if none matched
  if (relevantCerts.length === 0) {
    relevantCerts.push('PMP', 'Certified Scrum Master (CSM)', 'Google Project Management', 'PRINCE2 Foundation');
  }
  
  const count = quality === 'exceeds' ? randomInt(3, 5) : 
                quality === 'meets' ? randomInt(2, 3) :
                randomInt(0, 1);
  
  return randomItems(relevantCerts, count);
}

function generateMotivationLetterFromCriteria(
  criteria: ParsedCriterion[],
  jobTitle: string,
  skills: string[],
  yearsOfExp: number,
  firstName: string,
  lastName: string,
  quality: QualityTier
): string {
  const keywords = extractKeywordsFromCriteria(criteria);
  const primaryArea = keywords[0] || 'product development';
  const secondaryArea = keywords[1] || 'service delivery';
  
  const intros = {
    exceeds: `I am writing to express my strong interest in the ${jobTitle} position at UNICC. With ${yearsOfExp} years of progressive experience in ${primaryArea} and ${secondaryArea} across international organizations, I am confident in my ability to make an immediate and significant impact on your team.`,
    meets: `I am excited to apply for the ${jobTitle} role at UNICC. With ${yearsOfExp} years of experience in ${primaryArea}, I am eager to contribute my skills to support the UN's digital transformation initiatives.`,
    close: `I am writing to apply for the ${jobTitle} position at UNICC. While my ${yearsOfExp} years of professional experience has been in related fields, I am motivated to transition into this role and believe my transferable skills would be valuable.`,
    far: `I am interested in the ${jobTitle} position at UNICC. Although my background is primarily in different fields, I am eager to learn and transition into this new area of work.`
  };

  const bodies = {
    exceeds: `Throughout my career, I have led end-to-end ${primaryArea} initiatives that directly align with this role's requirements. My expertise has enabled me to develop compelling business cases that secured significant funding for transformation projects.

I have successfully managed portfolios of 15+ concurrent initiatives, consistently achieving 95%+ on-time delivery rates. My work in process design and optimization has resulted in measurable efficiency gains of 30-40% across multiple service lines.

Key achievements that demonstrate my qualifications:
• Led ${primaryArea} initiatives serving multiple international organizations with 98% stakeholder satisfaction
• Implemented strategic frameworks adopted as organizational standards
• Managed cross-functional teams of 20+ members across 4 continents
• Pioneered new methodologies reducing time-to-market by 35%`,

    meets: `In my ${yearsOfExp} years of experience, I have developed strong capabilities in ${primaryArea} that align well with this position's requirements. I have hands-on experience and have successfully coordinated projects with international stakeholders.

Key experiences relevant to this role:
• Managed ${primaryArea} projects with cross-functional teams
• Coordinated initiatives across multiple regions  
• Facilitated stakeholder workshops and documented requirements
• Implemented agile practices including sprint planning and retrospectives

I am skilled at ${skills.slice(0, 3).join(', ')} and have a proven track record of delivering projects on time and within scope.`,

    close: `I am applying for this position because I believe my ${yearsOfExp} years of professional experience has provided me with transferable skills relevant to this work. While I have not held this role directly, I have contributed to projects and gained exposure to relevant methodologies.

In my current role, I support project activities by maintaining documentation, coordinating meetings, and assisting with stakeholder communications. I am a quick learner and am committed to developing my skills further.

I am familiar with ${skills.slice(0, 2).join(' and ')} and am eager to learn the specific frameworks and tools used in this role.`,

    far: `I am writing to express my interest in transitioning to this role at UNICC. My background has been in ${skills[0] || 'other fields'}, which has given me strong attention to detail and organizational skills.

While I do not have direct experience in ${primaryArea}, I am a dedicated professional who is willing to learn and grow. I am attracted to UNICC's mission and believe that with proper training, I could contribute to your team.

I understand this role requires specific skills that I am still developing, but I am committed to pursuing professional development opportunities.`
  };

  const closings = {
    exceeds: `I am drawn to UNICC's unique position as the technology backbone of the UN system. The opportunity to drive innovation that enables humanitarian and development work worldwide deeply motivates me. I bring not only the technical skills required but also a genuine commitment to the UN's values.

I am confident that my extensive experience would make me a valuable addition to your team. I welcome the opportunity to discuss how I can contribute to UNICC's important mission.`,

    meets: `I am excited about the opportunity to contribute to UNICC's digital transformation initiatives. I believe my experience and commitment to continuous learning would make me an effective contributor to your team.

Thank you for considering my application. I look forward to discussing how my skills and experience align with your needs.`,

    close: `I am motivated by UNICC's mission and eager to develop my capabilities in this environment. I am a quick learner and believe that my enthusiasm and transferable skills could add value to your team.

Thank you for considering my application. I would appreciate the opportunity to discuss how I could grow into this role.`,

    far: `While I recognize my background may not be the traditional path to this role, I am committed to learning and developing new skills. I would appreciate any opportunity to discuss this position further.

Thank you for your time and consideration.`
  };

  return `${intros[quality]}

${bodies[quality]}

${closings[quality]}`;
}

// ============= COMMON GENERATORS =============
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

function generateEmploymentPHF(
  criteria: ParsedCriterion[],
  jobTitle: string,
  quality: QualityTier,
  hasUNExp: boolean,
  yearsOfExp: number
): any[] {
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
    
    // Job title appropriate for position in career and quality
    let title: string;
    if (i === 0) {
      title = generateJobTitleFromCriteria(jobTitle, quality);
    } else if (i === 1 && (quality === 'exceeds' || quality === 'meets')) {
      const lowerQuality: QualityTier = quality === 'exceeds' ? 'meets' : 'close';
      title = generateJobTitleFromCriteria(jobTitle, lowerQuality);
    } else {
      title = generateJobTitleFromCriteria(jobTitle, 'close');
    }
    
    const duties = generateDutiesFromCriteria(criteria, jobTitle, i === 0 ? quality : 'close');
    
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

function generateLanguagesPHF(): { un_languages: any[]; other_languages: any[] } {
  const unLangs = ['English', 'French', 'Spanish', 'Arabic', 'Chinese', 'Russian'];
  const otherLangs = ['German', 'Portuguese', 'Japanese', 'Korean', 'Hindi', 'Italian', 'Dutch', 'Swedish'];
  
  const numUN = randomInt(1, 3);
  const numOther = randomInt(0, 2);
  
  const selectedUN = randomItems(unLangs, numUN).map((lang, i) => ({
    language: lang,
    read: i === 0 ? 'fluent' : randomItem(['fluent', 'working_knowledge', 'limited']),
    write: i === 0 ? 'fluent' : randomItem(['fluent', 'working_knowledge', 'limited']),
    speak: i === 0 ? 'fluent' : randomItem(['fluent', 'working_knowledge', 'limited'])
  }));
  
  const selectedOther = randomItems(otherLangs, numOther).map(lang => ({
    language: lang,
    read: randomItem(['fluent', 'working_knowledge']),
    write: randomItem(['working_knowledge', 'limited']),
    speak: randomItem(['fluent', 'working_knowledge'])
  }));

  return { un_languages: selectedUN, other_languages: selectedOther };
}

// ============= MAIN HANDLER =============
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth guard: require Admin or HR role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['Admin', 'HR Assistant', 'Chief of HR'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { jobId, count = 40 } = await req.json();

    if (!jobId) {
      throw new Error("jobId is required");
    }

    // Fetch job details
    console.log(`Fetching job details for ${jobId}...`);
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, grade')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to fetch job: ${jobError?.message || 'Job not found'}`);
    }

    console.log(`Job: ${job.title} (Grade: ${job.grade})`);

    // Fetch essential criteria from job_requirements table
    const { data: requirements, error: reqError } = await supabase
      .from('job_requirements')
      .select('id, title, category, description, must_have')
      .eq('job_id', jobId)
      .in('category', ['Essential Criteria', 'Essential Education']);

    if (reqError) {
      console.warn(`Warning: Could not fetch requirements: ${reqError.message}`);
    }

    // Parse requirements into structured criteria
    const parsedReqs = parseRequirements(requirements || []);
    parsedReqs.jobTitle = job.title;
    parsedReqs.grade = job.grade || '';

    console.log(`Parsed ${parsedReqs.essentialCriteria.length} essential criteria and ${parsedReqs.essentialEducation.length} education criteria`);

    // Determine required years from criteria
    const yearsFromCriteria = parsedReqs.essentialCriteria
      .filter(c => c.type === 'years_experience' && c.yearsRequired)
      .map(c => c.yearsRequired!);
    const requiredYears = yearsFromCriteria.length > 0 ? Math.max(...yearsFromCriteria) : 2;
    
    console.log(`Required years of experience: ${requiredYears}`);

    const totalCount = count;
    console.log(`Generating ${totalCount} test applicants for job ${jobId}`);
    console.log(`Distribution: ${Math.floor(totalCount * 0.10)} exceeds, ${Math.floor(totalCount * 0.30)} meets, ${Math.floor(totalCount * 0.40)} close, ${Math.floor(totalCount * 0.20)} far`);

    const candidatesToCreate = [];
    const applicationsToCreate = [];

    for (let i = 0; i < totalCount; i++) {
      const quality = determineQualityDistribution(i, totalCount);
      const gender = determineGender(i);
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

      // Calculate years of experience based on quality and job requirements
      const yearsOfExp = quality === 'exceeds' ? requiredYears + randomInt(5, 10) : 
                         quality === 'meets' ? requiredYears + randomInt(0, 3) : 
                         quality === 'close' ? Math.max(1, requiredYears - 1) : randomInt(0, 2);

      // Generate dynamic content based on parsed criteria
      const allCriteria = [...parsedReqs.essentialCriteria, ...parsedReqs.essentialEducation];
      const skills = generateSkillsFromCriteria(allCriteria, quality);
      const certs = generateCertificationsFromCriteria(allCriteria, quality);
      const educationPHF = generateEducationFromCriteria(parsedReqs.essentialEducation, quality);
      const employmentPHF = generateEmploymentPHF(allCriteria, job.title, quality, hasUNExp, yearsOfExp);
      const references = generateReferences();
      const dependants = generateDependants(maritalStatus);
      const relatives = generateUNRelatives(hasUNRelatives);
      const languagesPHF = generateLanguagesPHF();
      
      const motivationLetter = generateMotivationLetterFromCriteria(
        allCriteria, job.title, skills, yearsOfExp, firstName, lastName, quality
      );

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
        _metadata: {
          quality_tier: quality,
          job_title: job.title,
          generated_from_criteria: true
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

      // Application record
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

    console.log(`Inserting ${applicationsWithIds.length} applications...`);

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
        job_title: job.title,
        required_years: requiredYears,
        criteria_count: parsedReqs.essentialCriteria.length + parsedReqs.essentialEducation.length,
        quality_distribution: qualityCounts,
        generated_from_criteria: true
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        candidates_created: insertedCandidates.length,
        applications_created: insertedApps.length,
        job_title: job.title,
        required_years: requiredYears,
        criteria_parsed: {
          essential: parsedReqs.essentialCriteria.length,
          education: parsedReqs.essentialEducation.length
        },
        quality_distribution: qualityCounts,
        message: `${totalCount} test applicants created based on "${job.title}" requirements: ${qualityCounts.exceeds || 0} exceed, ${qualityCounts.meets || 0} meet, ${qualityCounts.close || 0} close, ${qualityCounts.far || 0} far`
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
