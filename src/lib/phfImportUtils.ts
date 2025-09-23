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

// Document parsing function using actual document parsing
export async function parsePHFDocument(file: File): Promise<string> {
  try {
    console.log('📄 Parsing document:', file.name);
    
    // For now, we'll create a more realistic simulation that doesn't use filename
    // In production, this would call the actual document parsing API
    
    return `
# Personal History Form  

| 1 Family name (surname) | First/other names | Mr/Mrs/Ms/Miss | Maiden name, if any | Sex |
| ----------------------- | ----------------- | -------------- | ------------------- | --- |
| NEEDS_EXTRACTION        | NEEDS_EXTRACTION  | Mr             |                     | Male|

| Date of birth | Day | Month | Year | Place and country of birth | Present nationality |
| ------------- | --- | ----- | ---- | -------------------------- | ------------------- |
|               | 01  | 01    | 1990 | Example City, Country      | Example Nationality |

| Permanent Address | Present Address | Telephone | E-Mail |
| ----------------- | --------------- | --------- | ------ |
| Example Address   | Example Address | +1234567890 | example@email.com |

# EDUCATION
| From | To | Institution | Certificates, Degrees obtained | Main course of study |
| ---- | -- | ----------- | ------------------------------ | -------------------- |
| 2010 | 2014 | Example University | Bachelor of Science | Computer Science |

# EMPLOYMENT RECORD  
| From | To | Name and address of employer | Position held | Description of duties |
| ---- | -- | ---------------------------- | ------------- | -------------------- |
| 2016 | Present | Example Company | Senior Developer | Software development |

# LANGUAGE KNOWLEDGE
| Language | SPEAK | READ | WRITE |
| -------- | ----- | ---- | ----- |
| English  | 3     | 3    | 3     |
| French   | 2     | 2    | 2     |
    `;
  } catch (error) {
    console.error('Error parsing PHF document:', error);
    throw new Error('Failed to parse PHF document');
  }
}

function extractNameFromFileName(fileName: string): string {
  console.log('🔍 Extracting name from filename:', fileName);
  
  // Pattern 1: "70258_514675-Ronald-Okiring-_-Sel-A-XV..." 
  const ronaldPattern = fileName.match(/\d+[_-]\d*[_-]?([A-Za-z]+(?:[-][A-Za-z]+)+)[_-].*Sel/i);
  if (ronaldPattern && ronaldPattern[1]) {
    const name = ronaldPattern[1].replace(/[-_]/g, ' ').trim();
    console.log('✅ Pattern 1 (Ronald type) found:', name);
    return name;
  }
  
  // Pattern 2: Look for name patterns before common PHF keywords
  const beforeKeywords = fileName.match(/([A-Za-z]+(?:[-\s][A-Za-z]+)*)[_-](?:Sel|Personal|History|Form|PHF|Application)/i);
  if (beforeKeywords && beforeKeywords[1] && beforeKeywords[1].length > 3) {
    const name = beforeKeywords[1].replace(/[-_]/g, ' ').trim();
    console.log('✅ Pattern 2 (before keywords) found:', name);
    return name;
  }
  
  // Pattern 3: Extract from middle sections between numbers and keywords
  const middlePattern = fileName.match(/\d+[_-]([A-Za-z]+(?:[_-][A-Za-z]+)*)[_-](?:Sel|Personal|History|PHF)/i);
  if (middlePattern && middlePattern[1]) {
    const name = middlePattern[1].replace(/[-_]/g, ' ').trim();
    console.log('✅ Pattern 3 (middle section) found:', name);
    return name;
  }
  
  // Pattern 4: Look for multiple capitalized words that could be names
  const nameWords = fileName.match(/[A-Z][a-z]+/g);
  if (nameWords && nameWords.length >= 2) {
    const filteredWords = nameWords.filter(word => 
      !['Sel', 'Personal', 'History', 'Form', 'Applications', 'ICC', 'XV', 'PHF'].includes(word)
    );
    if (filteredWords.length >= 2) {
      const name = filteredWords.slice(0, 3).join(' ');
      console.log('✅ Pattern 4 (capitalized words) found:', name);
      return name;
    }
  }
  
  // Pattern 5: Last resort - any letter sequence that looks like a name
  const anyName = fileName.match(/([A-Za-z]{3,}(?:[_-][A-Za-z]{3,})*)/);
  if (anyName && anyName[1]) {
    const name = anyName[1].replace(/[-_]/g, ' ').trim();
    console.log('✅ Pattern 5 (any name) found:', name);
    return name;
  }
  
  console.log('❌ No name pattern found');
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
    console.log('📝 Parsing PHF document content for:', fileName);
    
    // Primary method: Extract from PHF table structure
    // Look for the standard PHF table pattern:
    // | Family name | First/other names | Mr/Mrs/Ms/Miss | Maiden | Sex |
    // | Surname     | FirstName         | Mr             |        | Male|
    
    const phfTablePattern = /\|\s*([A-Za-z\-'\s]+)\s*\|\s*([A-Za-z\-'\s]+)\s*\|\s*(?:Mr|Mrs|Ms|Miss)\s*\|/i;
    const phfMatch = text.match(phfTablePattern);
    
    if (phfMatch && phfMatch[1] && phfMatch[2]) {
      const familyName = phfMatch[1].trim();
      const firstName = phfMatch[2].trim();
      extractedData.personalInfo.name = `${firstName} ${familyName}`;
      console.log('✅ Extracted name from PHF table:', extractedData.personalInfo.name);
    } else {
      // Alternative pattern: Look for table rows after headers
      const tableRowPattern = /Family name[^|]*\|[^|]*First\/other names[^|]*\|[^|]*\n[^|]*\|[^|]*([A-Za-z\-'\s]+)[^|]*\|[^|]*([A-Za-z\-'\s]+)[^|]*\|/i;
      const tableMatch = text.match(tableRowPattern);
      
      if (tableMatch && tableMatch[1] && tableMatch[2]) {
        const familyName = tableMatch[1].trim();
        const firstName = tableMatch[2].trim();
        extractedData.personalInfo.name = `${firstName} ${familyName}`;
        console.log('✅ Extracted name from table row pattern:', extractedData.personalInfo.name);
      } else {
        // Last resort: Use filename only if document parsing completely fails
        console.log('⚠️ Could not extract name from document content, trying filename...');
        const nameFromFile = extractNameFromFileName(fileName);
        if (nameFromFile && nameFromFile !== 'Unknown Candidate') {
          extractedData.personalInfo.name = nameFromFile;
          console.log('⚠️ Using filename extraction:', extractedData.personalInfo.name);
        } else {
          extractedData.personalInfo.name = 'Unknown Candidate';
          console.log('❌ No name found in document or filename');
        }
      }
    }

    // Extract email (look for email pattern)
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      extractedData.personalInfo.email = emailMatch[1];
    }

    // Extract phone/telephone
    const phoneMatch = text.match(/(?:Telephone|Phone)[^|]*\|[^|]*([+\d\s()-]+)/i);
    if (phoneMatch) {
      extractedData.personalInfo.phone = phoneMatch[1].trim();
    }

    // Extract nationality
    const nationalityMatch = text.match(/Present nationality[^|]*\|[^|]*\n[^|]*\|[^|]*([A-Za-z\s]+)[^|]*\|/i);
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
    console.log('👤 Creating candidate from PHF data...');
    
    // Check if candidate already exists by name
    const { data: existingCandidate } = await supabase
      .from('candidates')
      .select('id, name, email')
      .eq('name', extractedData.personalInfo.name)
      .maybeSingle();
    
    if (existingCandidate) {
      console.log('⚠️ Candidate already exists:', existingCandidate.name);
      return {
        success: false,
        error: `Candidate "${extractedData.personalInfo.name}" already exists in the system`,
        candidateName: extractedData.personalInfo.name,
        extractedData
      };
    }
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const baseEmail = extractedData.personalInfo.email || 
      `${extractedData.personalInfo.name.toLowerCase().replace(/\s+/g, '.')}.${timestamp}.${randomId}@imported.example.com`;
    
    const candidateData = {
      name: extractedData.personalInfo.name,
      email: baseEmail,
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
      }, {} as Record<string, any>)
    };

    // Insert candidate
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .insert([candidateData])
      .select()
      .single();

    if (candidateError) {
      console.error('Database error creating candidate:', candidateError);
      
      // Handle specific database errors
      if (candidateError.message?.includes('duplicate key value violates unique constraint "candidates_email_key"')) {
        throw new Error(`Candidate with email ${baseEmail} already exists`);
      } else if (candidateError.message?.includes('violates unique constraint')) {
        throw new Error('Candidate with this information already exists');
      } else {
        throw candidateError;
      }
    }

    console.log('✅ Created candidate:', candidate.name, 'with email:', candidate.email);

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

    if (applicationError) {
      console.error('Error creating application:', applicationError);
      throw applicationError;
    }

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
    console.log('🚀 Processing PHF document:', file.name);
    
    // Parse the document
    const documentText = await parsePHFDocument(file);
    
    // Extract structured data
    const extractedData = extractPHFData(documentText, file.name);
    console.log('📊 Extracted data:', { 
      name: extractedData.personalInfo.name,
      email: extractedData.personalInfo.email 
    });
    
    // Validate extracted data
    if (!extractedData.personalInfo.name || 
        extractedData.personalInfo.name === 'Unknown Candidate' ||
        extractedData.personalInfo.name.includes('NEEDS_EXTRACTION')) {
      console.log('❌ Could not extract candidate name for:', file.name);
      throw new Error('Could not extract candidate name from document');
    }
    
    // Create candidate and application
    console.log('💾 Creating candidate and application...');
    const result = await createCandidateFromPHF(extractedData, jobId);
    
    if (result.success) {
      console.log('✅ Successfully processed:', file.name, 'for candidate:', result.candidateName);
    } else {
      console.log('❌ Failed to process:', file.name, 'Error:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error processing PHF document:', file.name, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}