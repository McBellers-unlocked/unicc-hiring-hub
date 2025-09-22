import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import ProfileAnalyticsSection from "@/components/profile/ProfileAnalyticsSection";
import JobRecommendationsSection from "@/components/profile/JobRecommendationsSection";
import { countries } from "@/lib/countries";

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
  current_position?: string;
  current_organization?: string;
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

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("candidates")
          .select("*")
          .eq("email", user.email)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setProfile({
            ...data,
            skills: Array.isArray(data.skills) ? data.skills : [],
            certifications: Array.isArray(data.certifications) ? data.certifications : [],
            education: Array.isArray(data.education) ? data.education : [],
            work_experience: Array.isArray(data.work_experience) ? data.work_experience : [],
            preferred_locations: Array.isArray(data.preferred_locations) ? data.preferred_locations : [],
            un_organizations_worked: Array.isArray(data.un_organizations_worked) ? data.un_organizations_worked : [],
            portfolio_attachments: Array.isArray(data.portfolio_attachments) ? data.portfolio_attachments : [],
            languages: data.languages || { un_languages: {}, other_languages: [] },
            has_security_clearance: data.has_security_clearance || false,
          });
        } else {
          // Create new profile for user
          const newProfile: Partial<CandidateProfile> = {
            name: user.user_metadata?.first_name && user.user_metadata?.last_name 
              ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
              : user.email,
            email: user.email,
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
          };
          setProfile(newProfile as CandidateProfile);
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
    
    return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal place
  };

  // Auto-update years of experience when work experience changes
  useEffect(() => {
    if (profile) {
      const calculatedYears = calculateYearsOfExperience();
      if (calculatedYears !== profile.years_of_experience) {
        setProfile({ ...profile, years_of_experience: calculatedYears });
      }
    }
  }, [profile?.work_experience]);

  const calculateCompletionPercentage = () => {
    if (!profile) return 0;
    
    const sections = {
      basicInfo: !!(profile.name && profile.email && profile.phone && profile.location),
      professionalSummary: !!(profile.professional_summary && profile.professional_summary.length > 50),
      workExperience: profile.work_experience.length > 0,
      education: profile.education.length > 0,
      skills: profile.skills.length >= 3,
      languages: Object.keys(profile.languages?.un_languages || {}).length > 0 || profile.languages?.other_languages?.length > 0,
      profilePhoto: !!profile.profile_photo_url,
      availability: !!(profile.availability_status && profile.preferred_locations.length > 0),
    };

    const weights = {
      basicInfo: 20,
      professionalSummary: 10,
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
      basicInfo: false,
      professionalSummary: false,
      workExperience: false,
      education: false,
      skills: false,
      languages: false,
      profilePhoto: false,
      availability: false,
    };

    return {
      basicInfo: !!(profile.name && profile.email && profile.phone && profile.location),
      professionalSummary: !!(profile.professional_summary && profile.professional_summary.length > 50),
      workExperience: profile.work_experience.length > 0,
      education: profile.education.length > 0,
      skills: profile.skills.length >= 3,
      languages: Object.keys(profile.languages?.un_languages || {}).length > 0 || profile.languages?.other_languages?.length > 0,
      profilePhoto: !!profile.profile_photo_url,
      availability: !!(profile.availability_status && profile.preferred_locations.length > 0),
    };
  };

  const handleSave = async () => {
    if (!profile || !user) return;

    setSaving(true);
    try {
      const completionPercentage = calculateCompletionPercentage();
      
      const { error } = await supabase
        .from("candidates")
        .upsert({
          ...profile,
          email: user.email,
          profile_completion_percentage: completionPercentage,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      navigate(`/candidate-profile/${profile.id}`);
    } catch (error) {
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
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
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
            <strong>Welcome to UNiConnect!</strong> Complete your profile to be considered for future job openings across the organization. 
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
          <ProfileAnalyticsSection
            profileId={profile.id || "new"}
            completionPercentage={calculateCompletionPercentage()}
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

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Current Location</Label>
                  <Select
                    value={profile.location || ""}
                    onValueChange={(value) => setProfile({ ...profile, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Summary */}
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

          {/* Current Position */}
          <Card>
            <CardHeader>
              <CardTitle>Current Position</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="current_position">Position Title</Label>
                  <Input
                    id="current_position"
                    value={profile.current_position || ""}
                    onChange={(e) => setProfile({ ...profile, current_position: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="current_organization">Organization</Label>
                  <Input
                    id="current_organization"
                    value={profile.current_organization || ""}
                    onChange={(e) => setProfile({ ...profile, current_organization: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button onClick={() => removeSkill(index)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Work Experience */}
          <WorkExperienceSection
            workExperience={profile.work_experience}
            onChange={(workExperience) => setProfile({ ...profile, work_experience: workExperience })}
          />

          {/* Education */}
          <EducationSection
            education={profile.education}
            onChange={(education) => setProfile({ ...profile, education: education })}
          />

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

          {/* Languages */}
          <LanguageSection
            languages={profile.languages}
            onChange={(languages) => setProfile({ ...profile, languages: languages })}
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
    </div>
  );
}