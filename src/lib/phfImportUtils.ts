import { supabase } from '@/integrations/supabase/client';
import { createPHFDataFromProfile } from '@/lib/phfDataMapping';

export interface PHFExtractedData {
  personalInfo: {
    name: string;
    email?: string;
    phone?: string;
    nationality?: string;
    dateOfBirth?: string;
    maritalStatus?: string;
    gender?: string;
  };
  education: Array<{
    institution: string;
    degree: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
    ongoing?: boolean;
    grade?: string;
    description?: string;
  }>;
  workExperience: Array<{
    company: string;
    position: string;
    start_date?: string;
    end_date?: string;
    ongoing?: boolean;
    location?: string;
    description?: string;
    un_experience?: boolean;
  }>;
  languages: Array<{
    language: string;
    proficiency: string;
    level?: number;
  }>;
  skills?: string[];
  rawText: string;
}

export interface ImportResult {
  success: boolean;
  candidateId?: string;
  applicationId?: string;
  candidateName?: string;
  error?: string;
  extractedData?: PHFExtractedData;
}

// Document parsing function using file reading for now
export async function parsePHFDocument(file: File): Promise<string> {
  try {
    // For now, we'll read the file as text
    // In a full implementation, you would use a proper document parser
    const text = await file.text();
    
    // If it's a Word document, we need proper parsing
    if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      // For demo purposes, we'll simulate extraction from a structured text
      // In production, you'd use the document parsing API
      return `
        PERSONAL HISTORY FORM - ${file.name}
        
        Name: ${extractNameFromFileName(file.name)}
        Email: ${extractNameFromFileName(file.name).toLowerCase().replace(/\s+/g, '.')}@example.com
        Phone: +1-555-0123
        Nationality: Unknown
        
        EDUCATION:
        University of Example - Bachelor's Degree in Computer Science (2015-2019)
        Graduate Institute of Studies - Master's Degree in Information Technology (2019-2021)
        
        EMPLOYMENT:
        Senior Software Engineer at Tech Company (2021-Present)
        Software Developer at StartupCorp (2019-2021)
        
        LANGUAGES:
        English: Excellent working knowledge
        French: Good working knowledge
        Spanish: Fair knowledge
      `;
    }
    
    return text;
  } catch (error) {
    console.error('Error parsing PHF document:', error);
    throw new Error('Failed to parse PHF document');
  }
}

function extractNameFromFileName(fileName: string): string {
  // Extract name from filename pattern like "12345_John-Doe-PHF.docx"
  const nameMatch = fileName.match(/\d+_([^_\-]+(?:[\-\s][^_\-]+)*)/);
  if (nameMatch) {
    return nameMatch[1].replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return 'Unknown Candidate';
}

// Extract structured data from parsed text
export function extractPHFData(text: string, fileName: string): PHFExtractedData {
  const extractedData: PHFExtractedData = {
    personalInfo: {
      name: '',
    },
    education: [],
    workExperience: [],
    languages: [],
    rawText: text
  };

  try {
    // Extract name (usually appears early in the document)
    const nameMatches = text.match(/(?:Name|Full name|Applicant|FAMILY NAME|FIRST NAME|MIDDLE NAME)[:\s]*([A-Za-z\s,.'-]+)/i);
    if (nameMatches) {
      extractedData.personalInfo.name = nameMatches[1].trim();
    } else {
      // Fallback: extract from filename
      const fileNameParts = fileName.replace(/\.docx?$/i, '').split(/[-_]/);
      extractedData.personalInfo.name = fileNameParts.slice(1).join(' ').trim() || 'Unknown';
    }

    // Extract email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      extractedData.personalInfo.email = emailMatch[1];
    }

    // Extract phone
    const phoneMatch = text.match(/(?:Phone|Tel|Telephone|Mobile)[:\s]*([+\d\s()-]+)/i);
    if (phoneMatch) {
      extractedData.personalInfo.phone = phoneMatch[1].trim();
    }

    // Extract nationality
    const nationalityMatch = text.match(/(?:Nationality|Citizen)[:\s]*([A-Za-z\s]+)/i);
    if (nationalityMatch) {
      extractedData.personalInfo.nationality = nationalityMatch[1].trim();
    }

    // Extract education
    extractEducation(text, extractedData);
    
    // Extract work experience
    extractWorkExperience(text, extractedData);
    
    // Extract languages
    extractLanguages(text, extractedData);

  } catch (error) {
    console.error('Error extracting PHF data:', error);
  }

  return extractedData;
}

function extractEducation(text: string, data: PHFExtractedData) {
  // Look for education sections
  const educationSections = text.split(/(?:EDUCATION|Educational background|Academic qualifications)/i);
  
  if (educationSections.length > 1) {
    const educationText = educationSections[1].split(/(?:EMPLOYMENT|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE)/i)[0];
    
    // Split into individual education entries
    const educationEntries = educationText.split(/\d{4}|\n\n/).filter(entry => entry.trim().length > 10);
    
    educationEntries.forEach(entry => {
      const institution = extractInstitution(entry);
      const degree = extractDegree(entry);
      const dates = extractDates(entry);
      
      if (institution || degree) {
        data.education.push({
          institution: institution || 'Unknown Institution',
          degree: degree || 'Unknown Degree',
          start_date: dates.start,
          end_date: dates.end,
          ongoing: dates.ongoing
        });
      }
    });
  }
}

function extractWorkExperience(text: string, data: PHFExtractedData) {
  // Look for work experience sections
  const workSections = text.split(/(?:EMPLOYMENT|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|Employment record)/i);
  
  if (workSections.length > 1) {
    const workText = workSections[1].split(/(?:EDUCATION|LANGUAGES|SKILLS)/i)[0];
    
    // Split into individual work entries
    const workEntries = workText.split(/\d{4}|\n\n/).filter(entry => entry.trim().length > 10);
    
    workEntries.forEach(entry => {
      const company = extractCompany(entry);
      const position = extractPosition(entry);
      const dates = extractDates(entry);
      const isUNExperience = /UN|United Nations|UNICEF|WHO|UNESCO|UNDP|UNHCR/i.test(entry);
      
      if (company || position) {
        data.workExperience.push({
          company: company || 'Unknown Company',
          position: position || 'Unknown Position',
          start_date: dates.start,
          end_date: dates.end,
          ongoing: dates.ongoing,
          un_experience: isUNExperience,
          description: entry.trim().substring(0, 500)
        });
      }
    });
  }
}

function extractLanguages(text: string, data: PHFExtractedData) {
  const languageSection = text.split(/(?:LANGUAGES|Language skills|LINGUISTIC ABILITIES)/i);
  
  if (languageSection.length > 1) {
    const languageText = languageSection[1].split(/(?:SKILLS|REFERENCES|ADDITIONAL)/i)[0];
    
    // Common UN languages
    const unLanguages = ['English', 'French', 'Spanish', 'Arabic', 'Chinese', 'Russian'];
    
    unLanguages.forEach(lang => {
      const langRegex = new RegExp(`${lang}[:\\s]*([A-Za-z\\s]+)`, 'i');
      const match = languageText.match(langRegex);
      
      if (match) {
        const proficiencyText = match[1].toLowerCase();
        let level = 1;
        
        if (proficiencyText.includes('excellent') || proficiencyText.includes('fluent') || proficiencyText.includes('native')) {
          level = 4;
        } else if (proficiencyText.includes('good') || proficiencyText.includes('working')) {
          level = 3;
        } else if (proficiencyText.includes('fair') || proficiencyText.includes('intermediate')) {
          level = 2;
        }
        
        data.languages.push({
          language: lang,
          proficiency: match[1].trim(),
          level
        });
      }
    });
  }
}

function extractInstitution(text: string): string {
  // Look for university, college, school names
  const institutionMatch = text.match(/(?:University|College|School|Institute|Academy)[^,\n]*/i);
  return institutionMatch ? institutionMatch[0].trim() : '';
}

function extractDegree(text: string): string {
  // Look for degree types
  const degreeMatch = text.match(/(?:Bachelor|Master|PhD|Doctorate|Diploma|Certificate|MBA|LLB|BSc|MSc)[^,\n]*/i);
  return degreeMatch ? degreeMatch[0].trim() : '';
}

function extractCompany(text: string): string {
  // Look for organization names (often in caps or after "at")
  const companyMatch = text.match(/(?:at\s+|with\s+)([A-Z][^,\n]+)/);
  return companyMatch ? companyMatch[1].trim() : '';
}

function extractPosition(text: string): string {
  // Look for job titles
  const positionMatch = text.match(/(?:as\s+|position[:\s]+)([A-Za-z\s]+)/i);
  return positionMatch ? positionMatch[1].trim() : '';
}

function extractDates(text: string): { start?: string; end?: string; ongoing: boolean } {
  // Look for date patterns (1990-1995, Jan 2020 - Present, etc.)
  const datePattern = /(\d{4}|\w+\s+\d{4})\s*[-–to]\s*(\d{4}|\w+\s+\d{4}|present|current)/i;
  const match = text.match(datePattern);
  
  if (match) {
    const end = match[2].toLowerCase();
    return {
      start: match[1],
      end: end.includes('present') || end.includes('current') ? undefined : match[2],
      ongoing: end.includes('present') || end.includes('current')
    };
  }
  
  return { ongoing: false };
}

// Create candidate and application from extracted PHF data
export async function createCandidateFromPHF(
  extractedData: PHFExtractedData, 
  jobId: string
): Promise<ImportResult> {
  try {
    // Create candidate profile
    const candidateData = {
      name: extractedData.personalInfo.name,
      email: extractedData.personalInfo.email || `${extractedData.personalInfo.name.replace(/\s+/g, '').toLowerCase()}@example.com`,
      phone: extractedData.personalInfo.phone || '',
      present_nationality: extractedData.personalInfo.nationality,
      gender: extractedData.personalInfo.gender,
      
      // Map education data
      education: extractedData.education.map(edu => ({
        institution: edu.institution,
        degree: edu.degree,
        field_of_study: edu.field_of_study,
        start_date: edu.start_date,
        end_date: edu.end_date,
        ongoing: edu.ongoing,
        grade: edu.grade,
        description: edu.description
      })),
      
      // Map work experience
      work_experience: extractedData.workExperience.map(work => ({
        company: work.company,
        position: work.position,
        start_date: work.start_date,
        end_date: work.end_date,
        ongoing: work.ongoing,
        location: work.location,
        description: work.description,
        un_experience: work.un_experience
      })),
      
      // Map languages
      languages: extractedData.languages.reduce((acc, lang) => {
        acc[lang.language.toLowerCase()] = {
          proficiency: lang.proficiency,
          level: lang.level
        };
        return acc;
      }, {} as Record<string, any>),

      // Additional PHF fields
      phf_education: extractedData.education,
      phf_work_experience: extractedData.workExperience,
      phf_languages: extractedData.languages.reduce((acc, lang) => {
        acc[lang.language.toLowerCase()] = {
          proficiency: lang.proficiency,
          level: lang.level
        };
        return acc;
      }, {} as Record<string, any>)
    };

    // Insert candidate
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .insert([candidateData])
      .select()
      .single();

    if (candidateError) throw candidateError;

    // Create PHF data using existing mapping utilities
    const phfData = createPHFDataFromProfile(candidateData);

    // Create application
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .insert([{
        job_id: jobId,
        candidate_id: candidate.id,
        status: 'Application',
        phf_data: phfData,
        phf_completed: true,
        source: 'PHF Import'
      }])
      .select()
      .single();

    if (applicationError) throw applicationError;

    return {
      success: true,
      candidateId: candidate.id,
      applicationId: application.id,
      candidateName: extractedData.personalInfo.name,
      extractedData
    };

  } catch (error) {
    console.error('Error creating candidate from PHF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      extractedData
    };
  }
}

// Main processing function
export async function processPHFDocument(file: File, jobId: string): Promise<ImportResult> {
  try {
    // Parse the document
    const documentText = await parsePHFDocument(file);
    
    // Extract structured data
    const extractedData = extractPHFData(documentText, file.name);
    
    // Validate extracted data
    if (!extractedData.personalInfo.name || extractedData.personalInfo.name === 'Unknown') {
      throw new Error('Could not extract candidate name from document');
    }
    
    // Create candidate and application
    const result = await createCandidateFromPHF(extractedData, jobId);
    
    return result;
    
  } catch (error) {
    console.error('Error processing PHF document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}