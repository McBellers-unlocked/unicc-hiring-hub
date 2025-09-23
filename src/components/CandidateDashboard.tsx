import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { User, MapPin, Briefcase, AlertCircle, Edit3, FileText, Search, Calendar, Building } from 'lucide-react';
import { getCountryFlagUrl, getAvailabilityInfo, formatExperienceYears } from '@/lib/countryFlags';

// Import existing components for tabs
import JobsContent from './dashboard/JobsContent';
import MyApplicationsContent from './dashboard/MyApplicationsContent';
import ProfileContent from './dashboard/ProfileContent';

interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  professional_summary?: string;
  profile_completion_percentage: number;
  photo_url?: string;
  years_of_experience?: number;
  availability_status?: string;
  work_experience?: any[];
  education?: any[];
  skills?: string[];
}

export default function CandidateDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (user) {
      fetchCandidateProfile();
    }
  }, [user]);

  const fetchCandidateProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('email', user?.email)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Ensure arrays are properly handled
        setProfile({
          ...data,
          work_experience: Array.isArray(data.work_experience) ? data.work_experience : [],
          education: Array.isArray(data.education) ? data.education : [],
          skills: Array.isArray(data.skills) ? data.skills.map(String) : []
        });
      }
    } catch (error) {
      console.error('Error fetching candidate profile:', error);
      toast({
        title: "Error",
        description: "Failed to load your profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

  const getAvailabilityColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'not available':
        return 'bg-red-100 text-red-800';
      case 'open to opportunities':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const hasIncompleteProfile = () => {
    if (!profile) return true;
    
    const mandatoryFields = [
      profile.name,
      profile.email,
      profile.phone,
      profile.location,
      profile.professional_summary,
    ];
    
    const hasMandatoryFields = mandatoryFields.every(field => field && field.trim() !== '');
    const hasWorkExperience = profile.work_experience && profile.work_experience.length > 0;
    const hasEducation = profile.education && profile.education.length > 0;
    
    return !hasMandatoryFields || !hasWorkExperience || !hasEducation || (profile.profile_completion_percentage || 0) < 50;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Profile Not Found</h3>
        <p className="text-muted-foreground mb-6">We couldn't find your profile. Please try again.</p>
        <Button onClick={() => navigate('/candidate-profile/edit')}>
          Create Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.photo_url} alt={profile.name} />
              <AvatarFallback className="text-lg">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  {getCurrentPosition(profile.work_experience) && (
                    <p className="text-lg text-muted-foreground">{getCurrentPosition(profile.work_experience)}</p>
                  )}
                  {getCurrentOrganization(profile.work_experience) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {getCurrentOrganization(profile.work_experience)}
                    </p>
                  )}
                  
                   <div className="flex flex-wrap gap-2 mt-2">
                     {profile.location && (
                       <Badge variant="outline" className="flex items-center gap-1">
                         {getCountryFlagUrl(profile.location) && (
                           <img 
                             src={getCountryFlagUrl(profile.location)} 
                             alt={`${profile.location} flag`} 
                             className="w-4 h-3 object-cover rounded-sm"
                             onError={(e) => {
                               e.currentTarget.style.display = 'none';
                             }}
                           />
                         )}
                         {profile.location}
                       </Badge>
                     )}
                     
                     {profile.availability_status && (
                       <Badge 
                         variant="outline" 
                         className="flex items-center gap-1"
                         title={getAvailabilityInfo(profile.availability_status).description}
                       >
                         <div className={`h-2 w-2 rounded-full ${getAvailabilityInfo(profile.availability_status).color}`}></div>
                         {getAvailabilityInfo(profile.availability_status).label}
                       </Badge>
                     )}
                     
                     {profile.work_experience && profile.work_experience.length > 0 && (() => {
                       const totalMonths = calculateYearsOfExperience(profile.work_experience);
                       return totalMonths > 0 ? (
                         <Badge variant="outline" className="flex items-center gap-1">
                           <Calendar className="h-3 w-3" />
                           {formatExperienceYears(totalMonths)} exp.
                         </Badge>
                       ) : null;
                     })()}
                   </div>
                </div>
                
                <Button
                  onClick={() => navigate(`/candidate-profile/${profile.id}/edit`)}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
              
              {/* Profile Completion */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Profile Completion</span>
                  <span className="text-sm text-muted-foreground">
                    {profile.profile_completion_percentage || 0}%
                  </span>
                </div>
                <Progress value={profile.profile_completion_percentage || 0} className="h-2" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Completion Alert */}
      {hasIncompleteProfile() && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Complete your profile to maximize opportunities!</strong>
            <br />
            A complete profile helps you get discovered by hiring managers and ensures you're considered for future openings across the organization. 
            {(profile.profile_completion_percentage || 0) < 50 && (
              <span> You're at {profile.profile_completion_percentage || 0}% completion.</span>
            )}
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => navigate(`/candidate-profile/${profile.id}/edit`)}
            >
              Complete now →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Profile
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Browse Jobs
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            My Applications
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-6">
          <ProfileContent profile={profile} />
        </TabsContent>
        
        <TabsContent value="jobs" className="mt-6">
          <JobsContent />
        </TabsContent>
        
        <TabsContent value="applications" className="mt-6">
          <MyApplicationsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}