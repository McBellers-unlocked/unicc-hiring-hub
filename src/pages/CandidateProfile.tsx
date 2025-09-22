import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Edit, MapPin, Calendar, Building, Mail, Phone, Globe } from "lucide-react";

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
  years_of_experience?: number;
  current_position?: string;
  current_organization?: string;
  linkedin_url?: string;
  willing_to_relocate: boolean;
  un_experience: boolean;
  un_organizations_worked: any;
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
        };
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

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-500";
      case "employed_open": return "bg-yellow-500";
      case "not_available": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.profile_photo_url} />
                <AvatarFallback className="text-lg">
                  {profile.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-grow">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  {profile.current_position && (
                    <p className="text-lg text-muted-foreground">{profile.current_position}</p>
                  )}
                  {profile.current_organization && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {profile.current_organization}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.location && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {profile.location}
                      </Badge>
                    )}
                    <Badge variant="outline" className={`flex items-center gap-1`}>
                      <div className={`h-2 w-2 rounded-full ${getAvailabilityColor(profile.availability_status)}`}></div>
                      {profile.availability_status.replace('_', ' ')}
                    </Badge>
                    {profile.years_of_experience && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {profile.years_of_experience} years exp.
                      </Badge>
                    )}
                  </div>
                </div>
                
                {isOwnProfile && (
                  <Button 
                    onClick={() => navigate(`/candidate-profile/${id}/edit`)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* Profile Completion */}
              {isOwnProfile && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Profile Completion</span>
                    <span>{profile.profile_completion_percentage}%</span>
                  </div>
                  <Progress value={profile.profile_completion_percentage} className="mt-1" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Professional Summary */}
          {profile.professional_summary && (
            <Card>
              <CardHeader>
                <CardTitle>Professional Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{profile.professional_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Work Experience */}
          {profile.work_experience.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Work Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.work_experience.map((exp: any, index: number) => (
                    <div key={index} className="border-l-2 border-primary pl-4">
                      <h4 className="font-semibold">{exp.position}</h4>
                      <p className="text-muted-foreground">{exp.organization}</p>
                      <p className="text-sm text-muted-foreground">
                        {exp.startDate} - {exp.endDate || 'Present'}
                      </p>
                      {exp.description && (
                        <p className="text-sm mt-2">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Education */}
          {profile.education.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Education</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.education.map((edu: any, index: number) => (
                    <div key={index}>
                      <h4 className="font-semibold">{edu.degree}</h4>
                      <p className="text-muted-foreground">{edu.institution}</p>
                      <p className="text-sm text-muted-foreground">{edu.year}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{profile.email}</span>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.phone}</span>
                </div>
              )}
              {profile.linkedin_url && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={profile.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    LinkedIn
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          {profile.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* UN Experience */}
          {profile.un_experience && (
            <Card>
              <CardHeader>
                <CardTitle>UN Experience</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.un_organizations_worked.length > 0 ? (
                  <div className="space-y-2">
                    {profile.un_organizations_worked.map((org: string, index: number) => (
                      <Badge key={index} variant="outline">
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

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.preferred_locations.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm">Preferred Locations</h5>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.preferred_locations.map((location: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-sm">
                <span className="font-medium">Willing to relocate: </span>
                <span>{profile.willing_to_relocate ? 'Yes' : 'No'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}