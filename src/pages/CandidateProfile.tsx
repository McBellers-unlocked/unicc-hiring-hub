import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Globe, MapPin } from "lucide-react";
import ProfileHero from "@/components/profile/ProfileHero";
import ProfileStatsCards from "@/components/profile/ProfileStatsCards";
import EnhancedSkillsSection from "@/components/profile/EnhancedSkillsSection";
import EnhancedLanguagesSection from "@/components/profile/EnhancedLanguagesSection";
import WorkExperienceTimeline from "@/components/profile/WorkExperienceTimeline";
import EducationTimeline from "@/components/profile/EducationTimeline";
import CertificationsGrid from "@/components/profile/CertificationsGrid";
import JobRecommendationsSection from "@/components/profile/JobRecommendationsSection";
import PortfolioSection from "@/components/profile/PortfolioSection";
import ProfileAnalyticsSection from "@/components/profile/ProfileAnalyticsSection";

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
  profile_completion_percentage: number;
  privacy_setting: string;
  profile_photo_url?: string;
  preferred_locations: any;
  years_of_experience_months?: number;
  years_of_experience?: number;
  linkedin_url?: string;
  willing_to_relocate: boolean;
  un_experience: boolean;
  un_organizations_worked: any;
  languages?: any;
  current_position?: string;
  current_organization?: string;
  portfolio_attachments?: any;
}

export default function CandidateProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("candidates")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        const normalizedProfile = {
          ...data,
          skills: Array.isArray(data.skills) ? data.skills : [],
          certifications: Array.isArray(data.certifications) ? data.certifications : [],
          education: Array.isArray(data.education) ? data.education : [],
          work_experience: Array.isArray(data.work_experience) ? data.work_experience : [],
          preferred_locations: Array.isArray(data.preferred_locations) ? data.preferred_locations : [],
          un_organizations_worked: Array.isArray(data.un_organizations_worked) ? data.un_organizations_worked : [],
          portfolio_attachments: Array.isArray(data.portfolio_attachments) ? data.portfolio_attachments : [],
        };

        // Calculate years of experience if not present or if 0
        if (!normalizedProfile.years_of_experience || normalizedProfile.years_of_experience === 0) {
          const experienceMonths = calculateYearsOfExperience(normalizedProfile.work_experience);
          (normalizedProfile as any).years_of_experience_months = experienceMonths;
          normalizedProfile.years_of_experience = Math.round(experienceMonths / 12 * 10) / 10;
        }

        // Extract current position and organization
        (normalizedProfile as any).current_position = getCurrentPosition(normalizedProfile.work_experience);
        (normalizedProfile as any).current_organization = getCurrentOrganization(normalizedProfile.work_experience);

        setProfile(normalizedProfile);
        
        // Check if this is the user's own profile
        if (user && data.email === user.email) {
          setIsOwnProfile(true);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load candidate profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfile();
    }
  }, [id, user, toast]);

  // Calculate years of experience from work history
  const calculateYearsOfExperience = (workExperience: any[]) => {
    if (!workExperience || workExperience.length === 0) return 0;
    
    let totalMonths = 0;
    
    workExperience.forEach((job: any) => {
      if (job.from_year || job.startDate) {
        let startYear, startMonth, endYear, endMonth;
        
        // Handle different date formats
        if (job.from_year) {
          startYear = parseInt(job.from_year);
          startMonth = parseInt(job.from_month) || 1;
        } else if (job.startDate) {
          const [year, month] = job.startDate.split('-');
          startYear = parseInt(year);
          startMonth = parseInt(month) || 1;
        }
        
        if (job.is_present || job.isCurrent) {
          const now = new Date();
          endYear = now.getFullYear();
          endMonth = now.getMonth() + 1;
        } else if (job.to_year) {
          endYear = parseInt(job.to_year);
          endMonth = parseInt(job.to_month) || 12;
        } else if (job.endDate) {
          const [year, month] = job.endDate.split('-');
          endYear = parseInt(year);
          endMonth = parseInt(month) || 12;
        } else {
          return; // Skip invalid entries
        }
        
        if (startYear && endYear) {
          const startDate = new Date(startYear, startMonth - 1);
          const endDate = new Date(endYear, endMonth - 1);
          const monthDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
          
          if (monthDiff > 0) {
            totalMonths += monthDiff;
          }
        }
      }
    });
    
    return totalMonths; // Return total months instead of years
  };

  // Helper functions to derive current position from work experience
  const getCurrentPosition = (workExperience: any[]) => {
    if (!workExperience || !Array.isArray(workExperience) || workExperience.length === 0) {
      return null;
    }
    
    // Sort work experience by start date (most recent first)
    const sortedExperience = [...workExperience].sort((a, b) => {
      const aDate = a.start_date || a.startDate;
      const bDate = b.start_date || b.startDate;
      if (!aDate || !bDate) return 0;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    
    // Find the most recent position (current or most recent if no current)
    const currentJob = sortedExperience.find(job => 
      job.is_present || job.isCurrent || !job.end_date || job.end_date === '' || !job.endDate
    ) || sortedExperience[0];
    
    return currentJob?.position_title || currentJob?.position || currentJob?.title || null;
  };

  const getCurrentOrganization = (workExperience: any[]) => {
    if (!workExperience || !Array.isArray(workExperience) || workExperience.length === 0) {
      return null;
    }
    
    // Sort work experience by start date (most recent first)
    const sortedExperience = [...workExperience].sort((a, b) => {
      const aDate = a.start_date || a.startDate;
      const bDate = b.start_date || b.startDate;
      if (!aDate || !bDate) return 0;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    
    // Find the most recent position (current or most recent if no current)
    const currentJob = sortedExperience.find(job => 
      job.is_present || job.isCurrent || !job.end_date || job.end_date === '' || !job.endDate
    ) || sortedExperience[0];
    
    return currentJob?.organization || currentJob?.company || null;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <Button onClick={() => navigate("/")} className="mt-4">
          Go Home
        </Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8 max-w-7xl space-y-6">
      {/* Hero Section */}
      <ProfileHero 
        profile={profile}
        isOwnProfile={isOwnProfile}
        onEdit={() => navigate(`/candidate-profile/${id}/edit`)}
      />

      {/* Stats Cards */}
      <ProfileStatsCards 
        profileCompletionPercentage={profile.profile_completion_percentage}
        yearsOfExperience={profile.years_of_experience || 0}
        skillsCount={profile.skills.length}
        certificationsCount={profile.certifications.length}
      />

      {/* Profile Analytics (only for own profile) */}
      {isOwnProfile && (
        <ProfileAnalyticsSection 
          profileId={profile.id}
          completionPercentage={profile.profile_completion_percentage}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Recommendations */}
          <JobRecommendationsSection candidateProfile={profile} />

          {/* Professional Summary */}
          {profile.professional_summary && (
            <Card>
              <CardHeader>
                <CardTitle>Professional Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap leading-relaxed">{profile.professional_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Work Experience Timeline */}
          <WorkExperienceTimeline workExperience={profile.work_experience} />

          {/* Education Timeline */}
          <EducationTimeline education={profile.education} />

          {/* Certifications */}
          <CertificationsGrid certifications={profile.certifications} />

          {/* Portfolio */}
          {profile.portfolio_attachments && profile.portfolio_attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Portfolio & Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <PortfolioSection 
                  portfolioFiles={profile.portfolio_attachments}
                  email={profile.email}
                  onChange={() => {}}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Right 1/3 */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${profile.email}`} className="hover:underline">
                  {profile.email}
                </a>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile.linkedin_url && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={profile.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    LinkedIn Profile
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills & Expertise */}
          <EnhancedSkillsSection skills={profile.skills} />

          {/* Languages */}
          <EnhancedLanguagesSection languages={profile.languages} />

          {/* UN Experience */}
          {profile.un_experience && (
            <Card>
              <CardHeader>
                <CardTitle>UN System Experience</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.un_organizations_worked.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.un_organizations_worked.map((org: string, index: number) => (
                      <Badge key={index} variant="default">
                        {org}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Has UN system experience
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preferences & Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Work Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.preferred_locations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <h5 className="font-medium text-sm">Preferred Locations</h5>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.preferred_locations.map((location: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Willing to relocate</span>
                  <Badge variant={profile.willing_to_relocate ? "default" : "secondary"}>
                    {profile.willing_to_relocate ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Availability</span>
                  <Badge variant="outline">
                    {profile.availability_status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}