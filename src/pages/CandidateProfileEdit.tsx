import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { X, Plus, Shield, Info } from "lucide-react";
import EducationSection from "@/components/profile/EducationSection";
import WorkExperienceSection from "@/components/profile/WorkExperienceSection";
import CertificationSection from "@/components/profile/CertificationSection";
import LanguageSection from "@/components/profile/LanguageSection";
import ProfilePhotoSection from "@/components/profile/ProfilePhotoSection";
import ProfileCompletionWidget from "@/components/profile/ProfileCompletionWidget";
import PortfolioSection from "@/components/profile/PortfolioSection";

import JobRecommendationsSection from "@/components/profile/JobRecommendationsSection";
import { PersonalDetailsSection } from "@/components/profile/PersonalDetailsSection";
import { convertPHFToWorkExperience, convertWorkExperienceToPHF } from "@/lib/phfDataMapping";

interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  professional_summary?: string;
  skills: any;
  certifications: any;
  education: any;
  work_experience: any;
  availability_status: string;
  profile_photo_url?: string;
  preferred_locations: any;
  years_of_experience?: number;
  years_of_experience_months?: number;
  willing_to_relocate: boolean;
  un_experience: boolean;
  un_organizations_worked: any;
  salary_expectation_range?: string;
  notice_period?: string;
  security_clearance_level?: string;
  languages: any;
  has_security_clearance: boolean;
  portfolio_attachments: any;
  profile_completion_percentage?: number;
  gender?: string;
  // Enhanced PHF-compatible fields
  phf_work_experience?: any;
  phf_education?: any;
  dependants_detailed?: any;
  relatives_detailed?: any;
  motivation_letter?: string;
  // Personal detail fields
  title?: string;
  first_name?: string;
  last_name?: string;
  middle_names?: string;
  maiden_name?: string;
  date_of_birth?: string | Date;
  place_of_birth?: string;
  country_of_birth?: string;
  present_nationality?: string;
  nationality_changed?: boolean;
  nationality_change_details?: string;
  marital_status?: string;
  present_address_line1?: string;
  present_address_line2?: string;
  present_city?: string;
  present_country?: string;
  present_address_same_as_permanent?: boolean;
  permanent_address_line1?: string;
  permanent_address_line2?: string;
  permanent_city?: string;
  permanent_country?: string;
  us_green_card?: boolean;
  us_green_card_details?: string;
  // Privacy settings
  email_public?: boolean;
  phone_public?: boolean;
}

interface StaffData {
  job_title?: string;
  entry_on_duty_date?: string;
  duty_station?: string;
  division?: string;
  unit?: string;
}

export default function CandidateProfileEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [staffData, setStaffData] = useState<StaffData | null>(null);
  const [skillAssessments, setSkillAssessments] = useState<Map<string, {
    selfAssessment: number | null;
    managerAssessment: number | null;
    requiredLevel: number | null;
    status: string;
  }>>(new Map());

  // Gap-based color styling for skills
  const getSkillStyle = (skillName: string) => {
    const assessment = skillAssessments.get(skillName.toLowerCase());
    if (!assessment || assessment.status !== 'approved') {
      return "bg-muted text-muted-foreground"; // Not assessed
    }
    
    const level = assessment.managerAssessment ?? assessment.selfAssessment;
    const required = assessment.requiredLevel;
    if (level === null || required === null) {
      return "bg-muted text-muted-foreground";
    }
    
    const gap = level - required;
    if (gap >= 2) return "bg-purple-200 text-purple-700"; // Excellence
    if (gap === 1) return "bg-blue-200 text-blue-700";    // Exceeding
    if (gap === 0) return "bg-emerald-200 text-emerald-700"; // Meeting
    if (gap === -1) return "bg-amber-200 text-amber-700";  // Minor gap
    return "bg-red-200 text-red-700";                      // Significant gap
  };

  useEffect(() => {
    console.log('=== useEffect TRIGGERED ===');
    console.log('User:', user?.email);
    console.log('Current profile state before fetch:', profile?.work_experience?.length || 0, 'items');
    console.log('Has already loaded profile:', hasLoadedProfile);
    
    // Prevent unnecessary re-fetches that overwrite user changes
    if (hasLoadedProfile) {
      console.log('Profile already loaded, skipping re-fetch to preserve user changes');
      return;
    }
    
    const fetchProfile = async () => {
      if (!user) {
        console.log('No user, skipping fetch');
        return;
      }

      try {
        const { data, error } = await supabase
          .from("candidates")
          .select("*")
          .eq("email", user.email)
          .maybeSingle();

        if (error) {
          console.error("Database error:", error);
          throw error;
        }

        if (data) {
        console.log('Loaded data from database:', {
          id: data.id,
          work_experience: data.work_experience, 
          phf_work_experience: data.phf_work_experience 
        });

        // Fetch staff data from users table
        const { data: userData } = await supabase
          .from("users")
          .select("id, job_title, entry_on_duty_date, duty_station, division, unit")
          .eq("email", user.email)
          .neq("role", "Candidate")
          .maybeSingle();

        if (userData) {
          console.log('Staff data found:', userData);
          setStaffData(userData);
          
          // Fetch skill assessments for gap-based coloring
          const { data: assessments } = await supabase
            .from('skill_assessments')
            .select('skill_id, self_assessment, manager_assessment, required_level, status, skill_definitions (name)')
            .eq('user_id', userData.id);
          
          if (assessments) {
            const assessmentsMap = new Map();
            assessments.forEach((a: any) => {
              if (a.skill_definitions?.name) {
                assessmentsMap.set(a.skill_definitions.name.toLowerCase(), {
                  selfAssessment: a.self_assessment,
                  managerAssessment: a.manager_assessment,
                  requiredLevel: a.required_level,
                  status: a.status
                });
              }
            });
            setSkillAssessments(assessmentsMap);
            console.log('Loaded skill assessments:', assessmentsMap.size);
          }
        }

        // Prioritize existing work_experience data, then fall back to converted PHF data
        let workExperience: any[] = [];
        if (Array.isArray(data.work_experience) && data.work_experience.length > 0) {
          workExperience = data.work_experience;
        } else if (data.phf_work_experience && Array.isArray(data.phf_work_experience) && data.phf_work_experience.length > 0) {
          workExperience = convertPHFToWorkExperience(data.phf_work_experience);
        }

        // Inject UNICC work experience as committed entry if staff data exists
        if (userData && userData.job_title && userData.entry_on_duty_date) {
          const hasUniccEntry = workExperience.some((exp: any) => 
            exp.company?.toLowerCase().includes('unicc') || 
            exp.company?.toLowerCase().includes('united nations international computing centre')
          );

          if (!hasUniccEntry) {
            const entryDate = new Date(userData.entry_on_duty_date);
            const formattedStartDate = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;

            const uniccEntry = {
              company: "United Nations International Computing Centre (UNICC)",
              position: userData.job_title,
              type: "Full-time",
              startDate: formattedStartDate,
              endDate: "",
              location: userData.duty_station || "",
              description: "",
              isUNExperience: true,
              isCurrent: true,
              _isStaffEntry: true,
            };

            // Prepend UNICC entry (most recent/current job)
            workExperience = [uniccEntry, ...workExperience];
            console.log('Injected UNICC staff entry into work experience');
          }
        }

        console.log('Final work experience for UI:', workExperience);
        console.log('Work experience length:', workExperience.length);

          setProfile({
            ...data,
            skills: Array.isArray(data.skills) ? data.skills : [],
            certifications: Array.isArray(data.certifications) ? data.certifications : [],
            education: Array.isArray(data.education) ? data.education : [],
            work_experience: workExperience,
            preferred_locations: Array.isArray(data.preferred_locations) ? data.preferred_locations : [],
            un_organizations_worked: Array.isArray(data.un_organizations_worked) ? data.un_organizations_worked : [],
            portfolio_attachments: Array.isArray(data.portfolio_attachments) ? data.portfolio_attachments : [],
            languages: data.languages || { un_languages: {}, other_languages: [] },
            has_security_clearance: data.has_security_clearance || false,
            un_experience: data.un_experience || !!userData,
          });
          setHasLoadedProfile(true);
          console.log('Profile loaded successfully, setting hasLoadedProfile = true');
        } else {
          console.log("No candidate found, creating new record in database...");
          // Create new profile record in database
          const newCandidateData = {
            name: user.user_metadata?.first_name && user.user_metadata?.last_name 
              ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
              : user.email,
            email: user.email,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            skills: [],
            certifications: [],
            education: [],
            work_experience: [],
            preferred_locations: [],
            un_organizations_worked: [],
            portfolio_attachments: [],
            availability_status: 'available',
            willing_to_relocate: false,
            un_experience: false,
            languages: { un_languages: {}, other_languages: [] },
            has_security_clearance: false,
            profile_completion_percentage: 0,
          };

          const { data: createdProfile, error: createError } = await supabase
            .from("candidates")
            .insert(newCandidateData)
            .select()
            .single();

          if (createError) {
            console.error("Error creating candidate profile:", createError);
            throw createError;
          }

          console.log("Created new candidate profile:", createdProfile);
          setProfile(createdProfile);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, toast]);

  // Debug: Track profile state changes
  useEffect(() => {
    if (profile) {
      console.log('Profile state changed:', {
        id: profile.id,
        work_experience_count: profile.work_experience?.length || 0,
        education_count: profile.education?.length || 0,
        work_experience: profile.work_experience,
        education: profile.education
      });
    } else {
      console.log('Profile is null/undefined');
    }
  }, [profile]);

  // Calculate years of experience from work history
  const calculateYearsOfExperience = () => {
    if (!profile?.work_experience || profile.work_experience.length === 0) return 0;
    
    let totalMonths = 0;
    
    profile.work_experience.forEach((job: any) => {
      if (job.from_year) {
        const startYear = parseInt(job.from_year);
        const startMonth = parseInt(job.from_month) || 1;
        
        let endYear, endMonth;
        if (job.is_present) {
          const now = new Date();
          endYear = now.getFullYear();
          endMonth = now.getMonth() + 1;
        } else if (job.to_year) {
          endYear = parseInt(job.to_year);
          endMonth = parseInt(job.to_month) || 12;
        } else {
          return; // Skip invalid entries
        }
        
        const startDate = new Date(startYear, startMonth - 1);
        const endDate = new Date(endYear, endMonth - 1);
        const monthDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
        
        if (monthDiff > 0) {
          totalMonths += monthDiff;
        }
      }
    });
    
    return totalMonths; // Return total months instead of years
  };

  // Auto-update years of experience when work experience changes
  useEffect(() => {
    if (profile) {
      const calculatedMonths = calculateYearsOfExperience();
      const calculatedYears = Math.round(calculatedMonths / 12 * 10) / 10;
      if (calculatedYears !== profile.years_of_experience) {
        setProfile({ 
          ...profile, 
          years_of_experience: calculatedYears,
          years_of_experience_months: calculatedMonths
        });
      }
    }
  }, [profile?.work_experience]);

  // Helper functions to derive current position from work experience
  const getCurrentPosition = () => {
    if (!profile?.work_experience || !Array.isArray(profile.work_experience) || profile.work_experience.length === 0) {
      return null;
    }
    
    // Sort work experience by start date (most recent first)
    const sortedExperience = [...profile.work_experience].sort((a, b) => {
      if (!a.start_date || !b.start_date) return 0;
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });
    
    // Find the most recent position (current or most recent if no current)
    const currentJob = sortedExperience.find(job => !job.end_date || job.end_date === '') || sortedExperience[0];
    return currentJob?.position_title || null;
  };

  const getCurrentOrganization = () => {
    if (!profile?.work_experience || !Array.isArray(profile.work_experience) || profile.work_experience.length === 0) {
      return null;
    }
    
    // Sort work experience by start date (most recent first)
    const sortedExperience = [...profile.work_experience].sort((a, b) => {
      if (!a.start_date || !b.start_date) return 0;
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });
    
    // Find the most recent position (current or most recent if no current)
    const currentJob = sortedExperience.find(job => !job.end_date || job.end_date === '') || sortedExperience[0];
    return currentJob?.organization || null;
  };

  const calculateCompletionPercentage = () => {
    if (!profile) return 0;
    
    // Debug logging to check profile data
    console.log('Profile data for completion check:', {
      professional_summary: profile.professional_summary,
      professional_summary_length: profile.professional_summary?.trim().length,
      skills: profile.skills,
      skills_length: Array.isArray(profile.skills) ? profile.skills.length : 'not array',
      availability_status: profile.availability_status,
      preferred_locations: profile.preferred_locations,
      preferred_locations_length: Array.isArray(profile.preferred_locations) ? profile.preferred_locations.length : 'not array'
    });
    
    const sections = {
      personalDetails: !!(profile.first_name && profile.email && profile.phone && profile.date_of_birth && profile.gender),
      professionalSummary: !!(profile.professional_summary && profile.professional_summary.trim().length > 50),
      workExperience: Array.isArray(profile.work_experience) && profile.work_experience.length > 0,
      education: Array.isArray(profile.education) && profile.education.length > 0,
      skills: Array.isArray(profile.skills) && profile.skills.length >= 3,
      languages: Object.keys(profile.languages?.un_languages || {}).length > 0 || (Array.isArray(profile.languages?.other_languages) && profile.languages.other_languages.length > 0),
      profilePhoto: !!profile.profile_photo_url,
      availability: !!(profile.availability_status && Array.isArray(profile.preferred_locations) && profile.preferred_locations.length > 0),
    };

    console.log('Section completion status:', sections);

    const weights = {
      personalDetails: 20,
      professionalSummary: 15,
      workExperience: 25,
      education: 15,
      skills: 10,
      languages: 10,
      profilePhoto: 5,
      availability: 5,
    };

    let totalScore = 0;
    Object.entries(sections).forEach(([key, completed]) => {
      if (completed) {
        totalScore += weights[key as keyof typeof weights];
      }
    });

    return Math.round(totalScore);
  };

  const getCompletionData = () => {
    if (!profile) return {
      personalDetails: false,
      professionalSummary: false,
      workExperience: false,
      education: false,
      skills: false,
      languages: false,
      profilePhoto: false,
      availability: false,
    };

    return {
      personalDetails: !!(profile.first_name && profile.email && profile.phone && profile.date_of_birth && profile.gender),
      professionalSummary: !!(profile.professional_summary && profile.professional_summary.trim().length > 50),
      workExperience: Array.isArray(profile.work_experience) && profile.work_experience.length > 0,
      education: Array.isArray(profile.education) && profile.education.length > 0,
      skills: Array.isArray(profile.skills) && profile.skills.length >= 3,
      languages: Object.keys(profile.languages?.un_languages || {}).length > 0 || (Array.isArray(profile.languages?.other_languages) && profile.languages.other_languages.length > 0),
      profilePhoto: !!profile.profile_photo_url,
      availability: !!(profile.availability_status && Array.isArray(profile.preferred_locations) && profile.preferred_locations.length > 0),
    };
  };

  const handleSave = async () => {
    if (!profile || !user) return;

    setSaving(true);
    try {
      // Step 8: ID Verification
      console.log('=== SAVE OPERATION START ===');
      console.log('Candidate ID:', profile.id);
      console.log('User email:', user.email);
      
      // Step 1: Current state logging
      console.log('Current profile work experience:', profile.work_experience);
      console.log('Work experience length:', profile.work_experience?.length);
      console.log('Work experience data:', JSON.stringify(profile.work_experience, null, 2));
      
      // Step 2: Pre-Save Database Check
      console.log('=== PRE-SAVE DATABASE CHECK ===');
      const { data: currentData, error: fetchError } = await supabase
        .from("candidates")
        .select('work_experience, phf_work_experience')
        .eq('email', user.email)
        .single();
      
      if (fetchError) {
        console.error('Error fetching current data:', fetchError);
      } else {
        console.log('Current database state:', currentData);
      }
      
      const completionPercentage = calculateCompletionPercentage();
      
      // Step 4: Simplify Save Data (temporarily skip complex transformations)
      console.log('=== DATA TRANSFORMATION ===');
      let phfWorkExperience = [];
      if (profile.work_experience?.length) {
        console.log('Converting to PHF format...');
        phfWorkExperience = convertWorkExperienceToPHF(profile.work_experience);
        console.log('Converted to PHF format:', phfWorkExperience);
      } else {
        console.log('No work experience to convert');
      }
      
      console.log('=== handleSave date processing ===');
      console.log('profile.date_of_birth:', profile.date_of_birth);
      console.log('profile.date_of_birth instanceof Date:', profile.date_of_birth instanceof Date);

      const formattedDOB = profile.date_of_birth instanceof Date 
        ? `${profile.date_of_birth.getFullYear()}-${String(profile.date_of_birth.getMonth() + 1).padStart(2, '0')}-${String(profile.date_of_birth.getDate()).padStart(2, '0')}`
        : profile.date_of_birth;
      
      console.log('Formatted DOB for save:', formattedDOB);

      const updateData = {
        ...profile,
        email: user.email,
        profile_completion_percentage: completionPercentage,
        // Store both formats - simple for UI and PHF for form compatibility
        work_experience: profile.work_experience || [],
        phf_work_experience: phfWorkExperience,
        // Convert date_of_birth to string format for database using local date components
        date_of_birth: formattedDOB,
      };
      
      // Remove fields that don't exist in the database
      delete updateData.years_of_experience_months;
      
      console.log('=== FINAL UPDATE DATA ===');
      console.log('Update data work_experience:', updateData.work_experience);
      console.log('Update data phf_work_experience:', updateData.phf_work_experience);
      console.log('Full update data keys:', Object.keys(updateData));
      
      // Step 1: Database Response Logging
      console.log('=== SAVING TO DATABASE ===');
      const { data: saveResponse, error } = await supabase
        .from("candidates")
        .upsert(updateData)
        .select('id, work_experience, phf_work_experience, profile_completion_percentage');

      // Step 5: Transaction Logging
      if (error) {
        console.error('=== DATABASE ERROR ===');
        console.error('Error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error hint:', error.hint);
        throw error;
      }
      
      console.log('=== SAVE RESPONSE ===');
      console.log('Save response data:', saveResponse);
      console.log('Saved work_experience:', saveResponse?.[0]?.work_experience);
      console.log('Saved phf_work_experience:', saveResponse?.[0]?.phf_work_experience);

      // Step 3: Post-Save Verification
      console.log('=== POST-SAVE VERIFICATION ===');
      const { data: verificationData, error: verifyError } = await supabase
        .from("candidates")
        .select('work_experience, phf_work_experience, profile_completion_percentage')
        .eq('email', user.email)
        .single();
      
      if (verifyError) {
        console.error('Verification query failed:', verifyError);
      } else {
        console.log('Post-save verification data:', verificationData);
        console.log('Verified work_experience:', verificationData?.work_experience);
        console.log('Verified phf_work_experience:', verificationData?.phf_work_experience);
        
        // Check if data matches what we tried to save
        const savedDataMatches = JSON.stringify(verificationData?.work_experience) === JSON.stringify(updateData.work_experience);
        console.log('Data integrity check - matches saved data:', savedDataMatches);
      }

      console.log('=== SAVE OPERATION COMPLETE ===');
      
      // Bidirectional sync: Sync profile skills to users table and create draft skill_assessments
      const syncSkillsToUsersAndAssessments = async () => {
        try {
          // 1. Get user record by email
          const { data: userData } = await supabase
            .from('users')
            .select('id, skills')
            .eq('email', user.email)
            .single();
          
          if (!userData) {
            console.log('No user record found for skills sync');
            return;
          }
          
          const profileSkills = Array.isArray(profile.skills) ? profile.skills : [];
          if (profileSkills.length === 0) return;
          
          // 2. Sync profile skills to users.skills
          const existingUserSkills: string[] = Array.isArray(userData.skills) 
            ? (userData.skills as (string | { name?: string })[]).map(s => typeof s === 'string' ? s : (s as any)?.name || '').filter(Boolean)
            : [];
          const mergedSkills = [...new Set([...existingUserSkills, ...profileSkills])];
          
          await supabase
            .from('users')
            .update({ skills: mergedSkills })
            .eq('id', userData.id);
          
          console.log('Synced skills to users table:', mergedSkills);
          
          // 3. Create draft skill_assessments for new skills (auto-create skill definition if missing)
          for (const skill of profileSkills) {
            // Check if a matching skill definition exists (case-insensitive)
            let { data: skillDef } = await supabase
              .from('skill_definitions')
              .select('id')
              .ilike('name', skill)
              .maybeSingle();
            
            // If not found, create it in "Custom" category
            if (!skillDef) {
              const { data: newSkillDef, error: createError } = await supabase
                .from('skill_definitions')
                .insert({
                  name: skill,
                  category: 'Custom',
                  is_active: true
                })
                .select('id')
                .single();
              
              if (!createError && newSkillDef) {
                skillDef = newSkillDef;
                console.log('Created new skill definition:', skill);
              }
            }
            
            if (skillDef) {
              // Check if assessment already exists
              const { data: existingAssessment } = await supabase
                .from('skill_assessments')
                .select('id')
                .eq('user_id', userData.id)
                .eq('skill_id', skillDef.id)
                .maybeSingle();
              
              if (!existingAssessment) {
                // Create draft assessment
                await supabase
                  .from('skill_assessments')
                  .insert({
                    user_id: userData.id,
                    skill_id: skillDef.id,
                    status: 'draft'
                  });
                console.log('Created draft skill assessment for:', skill);
              }
            }
          }
        } catch (err) {
          console.error('Error syncing skills:', err);
          // Don't throw - this is a non-critical operation
        }
      };
      
      await syncSkillsToUsersAndAssessments();
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      // Don't navigate away to observe the data persistence
      // navigate(`/candidate-profile/${profile.id}`);
    } catch (error) {
      console.error("=== SAVE OPERATION FAILED ===");
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSectionUpdate = (data: any) => {
    console.log('Section update called with data:', data);
    console.log('Current profile work experience before update:', profile?.work_experience);
    const updatedProfile = {
      ...profile,
      ...data,
    };
    console.log('Updated profile work experience after update:', updatedProfile.work_experience);
    setProfile(updatedProfile);
  };

  const addSkill = () => {
    if (newSkill.trim() && profile) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkill.trim()]
      });
      setNewSkill("");
    }
  };

  const removeSkill = (index: number) => {
    if (profile) {
      setProfile({
        ...profile,
        skills: profile.skills.filter((_, i) => i !== index)
      });
    }
  };

  const addPreferredLocation = () => {
    if (newLocation.trim() && profile) {
      setProfile({
        ...profile,
        preferred_locations: [...profile.preferred_locations, newLocation.trim()]
      });
      setNewLocation("");
    }
  };

  const removePreferredLocation = (index: number) => {
    if (profile) {
      setProfile({
        ...profile,
        preferred_locations: profile.preferred_locations.filter((_, i) => i !== index)
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container mx-auto py-8 text-center">
          <h1 className="text-2xl font-bold">Profile not found</h1>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Home
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Profile</h1>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/candidate-profile/${profile.id}`)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>

      {/* Profile Setup Onboarding Banner */}
      {calculateCompletionPercentage() < 30 && (
        <Alert className="mb-6 border-primary bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Welcome to UNICConnect!</strong> Complete your profile to be considered for future job openings across the organization. 
            Your profile information will be used to match you with relevant opportunities at UNICC and partner organizations. 
            A complete profile significantly increases your chances of being discovered by hiring managers.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Profile Completion & Analytics */}
        <div className="lg:col-span-1 space-y-6">
          <ProfileCompletionWidget 
            completionData={getCompletionData()}
            overallPercentage={calculateCompletionPercentage()}
          />
          <JobRecommendationsSection
            candidateProfile={profile}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Photo */}
          <ProfilePhotoSection
            photoUrl={profile.profile_photo_url}
            name={profile.name}
            email={profile.email}
            onChange={(photoUrl) => setProfile({ ...profile, profile_photo_url: photoUrl || undefined })}
          />

          {/* Personal Details */}
          <PersonalDetailsSection
            candidateId={profile.id}
            initialData={{
              title: profile.title as 'Mr' | 'Mrs' | 'Ms' | 'Miss' | undefined,
              first_name: profile.first_name,
              last_name: profile.last_name,
              middle_names: profile.middle_names,
              email: profile.email,
              phone: profile.phone,
              maiden_name: profile.maiden_name,
              gender: profile.gender as 'Male' | 'Female' | undefined,
              date_of_birth: (() => {
                if (!profile.date_of_birth) return undefined;
                const val = profile.date_of_birth;
                if (val instanceof Date) return val;
                if (typeof val === 'string') {
                  // Parse date string as local date to avoid timezone shift
                  const datePart = val.includes('T') ? val.split('T')[0] : val;
                  const parts = datePart.split('-');
                  if (parts.length === 3) {
                    // Use noon (12:00) instead of midnight to avoid timezone edge cases
                    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
                  }
                }
                return undefined;
              })(),
              place_of_birth: profile.place_of_birth,
              country_of_birth: profile.country_of_birth,
              present_nationality: profile.present_nationality,
              nationality_changed: profile.nationality_changed || false,
              nationality_change_details: profile.nationality_change_details,
              marital_status: profile.marital_status as 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Separated' | undefined,
              present_address_line1: profile.present_address_line1,
              present_address_line2: profile.present_address_line2,
              present_city: profile.present_city,
              present_country: profile.present_country,
              present_address_same_as_permanent: profile.present_address_same_as_permanent || false,
              permanent_address_line1: profile.permanent_address_line1,
              permanent_address_line2: profile.permanent_address_line2,
              permanent_city: profile.permanent_city,
              permanent_country: profile.permanent_country,
              us_green_card: profile.us_green_card || false,
              us_green_card_details: profile.us_green_card_details,
              email_public: profile.email_public || false,
              phone_public: profile.phone_public || false,
            }}
            onUpdate={(data) => {
              setProfile({
                ...profile,
                ...data,
              });
            }}
            onFieldChange={(field, value) => {
              // Sync changes in real-time so parent Save button uses latest values
              setProfile(prev => ({
                ...prev!,
                [field]: value
              }));
            }}
          />


          <Card>
            <CardHeader>
              <CardTitle>Professional Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write a brief professional summary..."
                value={profile.professional_summary || ""}
                onChange={(e) => setProfile({ ...profile, professional_summary: e.target.value })}
                rows={5}
              />
            </CardContent>
          </Card>


          {/* Work Experience */}
          <WorkExperienceSection
            workExperience={profile.work_experience}
            onChange={(workExperience) => {
              console.log('Work experience changed to:', workExperience);
              console.log('Work experience length:', workExperience.length);
              setProfile(prev => {
                const updated = { ...prev, work_experience: workExperience };
                console.log('Updated profile work experience:', updated.work_experience);
                return updated;
              });
            }}
            staffData={staffData}
          />

          {/* Education */}
          <EducationSection
            education={profile.education}
            onChange={(education) => {
              console.log('Education changed to:', education);
              setProfile({ ...profile, education: education });
            }}
          />

          {/* Languages */}
          <LanguageSection
            languages={profile.languages}
            onChange={(languages) => setProfile({ ...profile, languages: languages })}
          />

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                />
                <Button onClick={addSkill} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: string, index: number) => (
                  <Badge key={index} variant="secondary" className={`flex items-center gap-1 ${getSkillStyle(skill)}`}>
                    {skill}
                    <button onClick={() => removeSkill(index)} className="hover:opacity-70">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <CertificationSection
            certifications={profile.certifications}
            onChange={(certifications) => setProfile({ ...profile, certifications: certifications })}
          />

          {/* Portfolio & Documents */}
          <PortfolioSection
            portfolioFiles={profile.portfolio_attachments}
            email={profile.email}
            onChange={(files) => setProfile({ ...profile, portfolio_attachments: files })}
          />

          {/* Security Clearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Clearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_security_clearance"
                  checked={profile.has_security_clearance}
                  onCheckedChange={(checked) => setProfile({ ...profile, has_security_clearance: !!checked })}
                />
                <Label htmlFor="has_security_clearance">I have national-level security clearance</Label>
              </div>
              {profile.has_security_clearance && (
                <div>
                  <Label htmlFor="clearance_details">Clearance Details (optional)</Label>
                  <Input
                    id="clearance_details"
                    value={profile.security_clearance_level || ""}
                    onChange={(e) => setProfile({ ...profile, security_clearance_level: e.target.value })}
                    placeholder="e.g., Secret, Top Secret, Country of clearance"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This information is confidential and will only be shared with authorized personnel when required.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Availability & Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Availability & Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="availability">Availability Status</Label>
                  <Select
                    value={profile.availability_status}
                    onValueChange={(value) => setProfile({ ...profile, availability_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="employed_open">Employed but open</SelectItem>
                      <SelectItem value="not_available">Not available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notice_period">Notice Period</Label>
                  <Input
                    id="notice_period"
                    value={profile.notice_period || ""}
                    onChange={(e) => setProfile({ ...profile, notice_period: e.target.value })}
                    placeholder="e.g., 2 weeks, 1 month"
                  />
                </div>
                <div>
                  <Label htmlFor="salary_expectation">Salary Expectation</Label>
                  <Input
                    id="salary_expectation"
                    value={profile.salary_expectation_range || ""}
                    onChange={(e) => setProfile({ ...profile, salary_expectation_range: e.target.value })}
                    placeholder="e.g., $80,000 - $100,000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Locations</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a location..."
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPreferredLocation()}
                  />
                  <Button onClick={addPreferredLocation} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.preferred_locations.map((location: string, index: number) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {location}
                      <button onClick={() => removePreferredLocation(index)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="willing_to_relocate"
                  checked={profile.willing_to_relocate}
                  onCheckedChange={(checked) => setProfile({ ...profile, willing_to_relocate: !!checked })}
                />
                <Label htmlFor="willing_to_relocate">Willing to relocate</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="un_experience"
                  checked={profile.un_experience}
                  onCheckedChange={(checked) => setProfile({ ...profile, un_experience: !!checked })}
                />
                <Label htmlFor="un_experience">I have UN system experience</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Save Section */}
      <div className="flex items-center justify-end mt-6 pt-6 border-t space-x-2">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/candidate-profile/${profile.id}`)}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
      </div>
    </Layout>
  );
}