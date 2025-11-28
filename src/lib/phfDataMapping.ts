// PHF Data Mapping utilities for converting between profile and PHF formats

import { format, parse } from 'date-fns';
import { normalizeEducationLevel } from './educationLevels';

// Convert profile languages to PHF format (keeping same structure)
export function convertLanguagesToPHF(profileLanguages: any): any {
  // Return the languages in the same format as the profile
  return {
    un_languages: profileLanguages?.un_languages || {},
    other_languages: profileLanguages?.other_languages || []
  };
}

// Convert PHF languages back to profile format (already same format)
export function convertPHFToLanguages(phfLanguages: any): any {
  // Since we're keeping the same format, just return it
  if (!phfLanguages) return { un_languages: {}, other_languages: [] };
  return {
    un_languages: phfLanguages.un_languages || {},
    other_languages: phfLanguages.other_languages || []
  };
}

// Convert simple work experience to PHF format
export function convertWorkExperienceToPHF(workExp: any[]): any[] {
  if (!Array.isArray(workExp)) return [];
  
  return workExp.map(work => {
    // Parse date from YYYY-MM format or other formats
    const parseDate = (dateStr: string) => {
      if (!dateStr) return { month: '', year: '' };
      const parts = dateStr.split('-');
      return {
        month: parts[1] || '',
        year: parts[0] || ''
      };
    };

    const startDate = parseDate(work.startDate);
    const endDate = parseDate(work.endDate);

    return {
      period_from_month: startDate.month,
      period_from_year: startDate.year,
      period_to_month: work.isCurrent ? '' : endDate.month,
      period_to_year: work.isCurrent ? '' : endDate.year,
      is_present: work.isCurrent || false,
      exact_title_of_post: work.position || '',
      type_of_business: work.type || '',
      is_un_system_post: work.isUNExperience || false,
      un_grade: '',
      annual_income_starting: undefined,
      annual_income_most_recent: undefined,
      allowances_or_benefits: '',
      employees_supervised_number: undefined,
      employees_supervised_type: '',
      employer_name: work.company || '',
      employer_address: work.location || '',
      supervisor_name: work.supervisor_name || '',
      supervisor_title: work.supervisor_title || '',
      supervisor_phone: work.supervisor_phone || '',
      supervisor_email: work.supervisor_email || '',
      reason_for_change: '',
      duties_and_responsibilities: work.description || '',
      attestations: []
    };
  });
}

// Convert PHF work experience to simple format
export function convertPHFToWorkExperience(phfWork: any[]): any[] {
  if (!Array.isArray(phfWork)) return [];
  
  return phfWork.map(work => {
    // Detect format: new format has 'company' directly, old format has 'employer_name'
    const isNewFormat = work.company !== undefined || work.startDate !== undefined;
    
    if (isNewFormat) {
      // Data is already in the correct format, just ensure all fields exist
      return {
        company: work.company || '',
        position: work.position || '',
        type: work.type || 'Full-time',
        startDate: work.startDate || '',
        endDate: work.endDate || '',
        location: work.location || '',
        description: work.description || '',
        isUNExperience: work.isUNExperience || false,
        isCurrent: work.isCurrent || false,
        supervisor_name: work.supervisor_name || '',
        supervisor_title: work.supervisor_title || '',
        supervisor_phone: work.supervisor_phone || '',
        supervisor_email: work.supervisor_email || ''
      };
    }
    
    // Handle old PHF format (employer_name, exact_title_of_post, period_from_month, etc.)
    const formatDate = (month: string, year: string) => {
      if (!month || !year) return '';
      return `${year}-${month.padStart(2, '0')}`;
    };

    return {
      company: work.employer_name || '',
      position: work.exact_title_of_post || '',
      type: work.type_of_business || 'Full-time',
      startDate: formatDate(work.period_from_month, work.period_from_year),
      endDate: work.is_present ? '' : formatDate(work.period_to_month, work.period_to_year),
      location: work.employer_address || '',
      description: work.duties_and_responsibilities || '',
      isUNExperience: work.is_un_system_post || false,
      isCurrent: work.is_present || false,
      supervisor_name: work.supervisor_name || '',
      supervisor_title: work.supervisor_title || '',
      supervisor_phone: work.supervisor_phone || '',
      supervisor_email: work.supervisor_email || ''
    };
  });
}

// Convert simple education to PHF format
export function convertEducationToPHF(education: any[]): any[] {
  if (!Array.isArray(education)) return [];
  
  return education.map(edu => {
    const parseDate = (dateStr: string) => {
      if (!dateStr) return { month: '', year: '' };
      const parts = dateStr.split('-');
      return {
        month: parts[1] || '',
        year: parts[0] || ''
      };
    };

    const startDate = parseDate(edu.startDate);
    const endDate = parseDate(edu.endDate);

    // Map degree types to PHF format with normalization
    const mapDegreeType = (degree: string) => {
      // First normalize legacy values
      return normalizeEducationLevel(degree);
    };

    return {
      from_month: startDate.month,
      from_year: startDate.year,
      to_month: endDate.month,
      to_year: endDate.year,
      is_present: false, // Education is typically completed
      institution_name: edu.institution || '',
      institution_place: '',
      institution_country: '',
      degree_type: mapDegreeType(edu.degree),
      degree_or_certificate_title: edu.degree || '',
      main_course_of_study: edu.field || '',
      is_completed: true,
      certificate_url: ''
    };
  });
}

// Convert PHF education to simple format
export function convertPHFToEducation(phfEdu: any[]): any[] {
  if (!Array.isArray(phfEdu)) return [];
  
  return phfEdu.map(edu => {
    // Detect format: new dialog format has 'start_date' or 'institution' without 'institution_name'
    const isNewFormat = edu.start_date !== undefined || (edu.institution && !edu.institution_name);
    
    if (isNewFormat) {
      // Handle new dialog-based format (snake_case fields)
      return {
        institution: edu.institution || '',
        degree: normalizeEducationLevel(edu.degree || edu.degree_type || ''),
        field: edu.field_of_study || edu.field || '',
        startDate: edu.start_date || edu.startDate || '',
        endDate: edu.end_date || edu.endDate || '',
        isCurrent: edu.is_current || edu.isCurrent || false,
        grade: edu.grade || '',
        description: edu.description || ''
      };
    }
    
    // Handle old PHF format (from_month, from_year, institution_name, etc.)
    const formatDate = (month: string, year: string) => {
      if (!month || !year) return '';
      return `${year}-${month.padStart(2, '0')}`;
    };

    return {
      institution: edu.institution_name || '',
      degree: normalizeEducationLevel(edu.degree_type || ''),
      field: edu.main_course_of_study || '',
      startDate: formatDate(edu.from_month, edu.from_year),
      endDate: formatDate(edu.to_month, edu.to_year),
      isCurrent: edu.is_present || false,
      grade: '',
      description: ''
    };
  });
}

// Create PHF-compatible data from profile
export function createPHFDataFromProfile(profile: any): any {
  return {
    personalDetails: {
      familyName: profile.family_name || profile.last_name || '',
      firstNames: profile.first_name || '',
      title: profile.title || 'Mr',
      maidenName: profile.maiden_name || profile.maiden_name_detailed || '',
      sex: profile.gender || 'Male',
      dateOfBirth: profile.date_of_birth ? new Date(profile.date_of_birth) : new Date(),
      placeOfBirth: profile.place_of_birth || profile.place_of_birth_detailed || '',
      countryOfBirth: profile.country_of_birth || profile.country_of_birth_detailed || '',
      presentNationality: profile.present_nationality || profile.present_nationality_detailed || '',
      nationalityChanged: profile.nationality_changed || false,
      nationalityChangeDetails: profile.nationality_change_details || profile.nationality_change_details_detailed || '',
      maritalStatus: profile.marital_status || profile.marital_status_detailed || 'Single',
      permanentAddress: profile.permanent_address_detailed || profile.permanent_address || 
        (profile.permanent_address_line1 ? 
          `${profile.permanent_address_line1}${profile.permanent_address_line2 ? ', ' + profile.permanent_address_line2 : ''}, ${profile.permanent_city || ''}, ${profile.permanent_country || ''}`.trim().replace(/,\s*$/, '') : ''),
      presentAddress: profile.present_address_detailed || profile.present_address || 
        (profile.present_address_line1 ? 
          `${profile.present_address_line1}${profile.present_address_line2 ? ', ' + profile.present_address_line2 : ''}, ${profile.present_city || ''}, ${profile.present_country || ''}`.trim().replace(/,\s*$/, '') : ''),
      telephone: profile.phone || profile.telephone_detailed || '',
      email: profile.email || '',
      usGreenCard: profile.us_green_card_detailed || false,
      usGreenCardDetails: profile.us_green_card_details_detailed || '',
      photoUrl: profile.profile_photo_url || '',
    },
    
    dependants: profile.dependants_detailed || [],
    relatives: profile.relatives_detailed || [],
    
    workPreferences: {
      preferred_locations: Array.isArray(profile.preferred_locations) 
        ? profile.preferred_locations.join(', ') 
        : (profile.preferred_locations || ''),
      remote_work_preference: profile.remote_work_preference || '',
      travel_availability: profile.travel_availability || 
        (profile.willing_to_relocate ? 'Yes, willing to relocate' : 'Prefer current location'),
      contract_type_preference: profile.contract_type_preference || '',
      notice_period: profile.notice_period_detailed || profile.notice_period || '',
    },
    
    languages: convertLanguagesToPHF(profile.languages || {}),
    
    education: Array.isArray(profile.phf_education) && profile.phf_education.length > 0 
      ? profile.phf_education 
      : convertEducationToPHF(profile.education || []),
    employment: Array.isArray(profile.phf_work_experience) && profile.phf_work_experience.length > 0 
      ? profile.phf_work_experience 
      : convertWorkExperienceToPHF(profile.work_experience || []),
    unemploymentPeriods: profile.unemployment_periods || [],
    
    additionalInformation: {
      additional_skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : (profile.skills || ''),
      fellowships: profile.fellowships || [],
      law_violations_disclosed: profile.law_violations_disclosed || false,
      law_violations_details: profile.law_violations_details || '',
    },
    
    consentToSend: {
      consent_other_un_orgs: true,
      consent_national_government: true,
      consent_other: false,
      consent_other_text: '',
    },
    
    mobilityMedical: {
      mobility_medical_reservations: profile.mobility_medical_reservations || '',
    },
    
    references: profile.personal_references || [],
    
    employerContact: {
      objection_to_contact_present_employer: !profile.supervisor_contact_consent,
      presently_in_government_employ: profile.government_employment || false,
    },
    
    availability: {
      availability_date: profile.availability_date_detailed ? new Date(profile.availability_date_detailed) : undefined,
      notice_period_days: profile.notice_period_days,
      availability_mode: profile.availability_mode_detailed || 'date',
    },
    
    motivationLetter: {
      motivation_letter_content: profile.motivation_letter || '',
    },
    
    certification: {
      certify_true_complete_correct: false,
      signature_type: 'typed',
      typed_full_name: profile.name || '',
      signature_image_url: '',
      signature_place: '',
      signature_date: new Date(),
      signed_at_utc: new Date(),
    },
  };
}

// Update profile from completed PHF data
export function updateProfileFromPHF(phfData: any): Partial<any> {
  const updates: any = {};
  
  if (phfData.personalDetails) {
    const pd = phfData.personalDetails;
    updates.family_name = pd.familyName;
    updates.first_name = pd.firstNames;
    updates.maiden_name_detailed = pd.maidenName;
    updates.gender = pd.sex;
    updates.date_of_birth = pd.dateOfBirth;
    updates.place_of_birth_detailed = pd.placeOfBirth;
    updates.country_of_birth_detailed = pd.countryOfBirth;
    updates.present_nationality_detailed = pd.presentNationality;
    updates.nationality_changed = pd.nationalityChanged;
    updates.nationality_change_details_detailed = pd.nationalityChangeDetails;
    updates.marital_status_detailed = pd.maritalStatus;
    updates.permanent_address_detailed = pd.permanentAddress;
    updates.present_address_detailed = pd.presentAddress;
    updates.telephone_detailed = pd.telephone;
    updates.us_green_card_detailed = pd.usGreenCard;
    updates.us_green_card_details_detailed = pd.usGreenCardDetails;
  }
  
  // Check _education first (dialog-added entries), then fall back to education (form entries)
  const educationData = phfData._education || phfData.education;
  if (educationData && educationData.length > 0) {
    updates.phf_education = educationData;
    updates.education = convertPHFToEducation(educationData);
  }
  
  // Check _workExperiences first (dialog-added entries), then fall back to employment
  const workData = phfData._workExperiences || phfData.employment;
  if (workData && workData.length > 0) {
    updates.phf_work_experience = workData;
    updates.work_experience = convertPHFToWorkExperience(workData);
  }
  
  if (phfData.workPreferences) {
    const wp = phfData.workPreferences;
    updates.remote_work_preference = wp.remote_work_preference;
    updates.travel_availability = wp.travel_availability;
    updates.contract_type_preference = wp.contract_type_preference;
    updates.notice_period_detailed = wp.notice_period;
    updates.preferred_locations = wp.preferred_locations ? wp.preferred_locations.split(', ') : [];
  }
  
  if (phfData.languages) {
    updates.languages = convertPHFToLanguages(phfData.languages);
  }
  
  if (phfData.additionalInformation) {
    const ai = phfData.additionalInformation;
    updates.skills = ai.additional_skills ? ai.additional_skills.split(', ') : [];
    updates.fellowships = ai.fellowships;
    updates.law_violations_disclosed = ai.law_violations_disclosed;
    updates.law_violations_details = ai.law_violations_details;
  }
  
  updates.dependants_detailed = phfData.dependants || [];
  updates.relatives_detailed = phfData.relatives || [];
  updates.unemployment_periods = phfData.unemploymentPeriods || [];
  updates.personal_references = phfData.references || [];
  updates.motivation_letter = phfData.motivationLetter?.motivation_letter_content || '';
  
  if (phfData.employerContact) {
    updates.supervisor_contact_consent = !phfData.employerContact.objection_to_contact_present_employer;
    updates.government_employment = phfData.employerContact.presently_in_government_employ;
  }
  
  if (phfData.availability) {
    updates.availability_date_detailed = phfData.availability.availability_date;
    updates.notice_period_days = phfData.availability.notice_period_days;
    updates.availability_mode_detailed = phfData.availability.availability_mode;
  }
  
  updates.mobility_medical_reservations = phfData.mobilityMedical?.mobility_medical_reservations || '';
  
  return updates;
}