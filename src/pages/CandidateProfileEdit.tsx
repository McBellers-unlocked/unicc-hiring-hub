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
import { useToast } from "@/hooks/use-toast";
import { X, Plus } from "lucide-react";

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
  linkedin_url?: string;
  willing_to_relocate: boolean;
  un_experience: boolean;
  un_organizations_worked: any;
  salary_expectation_range?: string;
  notice_period?: string;
  security_clearance_level?: string;
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
            availability_status: 'available',
            willing_to_relocate: false,
            un_experience: false,
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

  const handleSave = async () => {
    if (!profile || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("candidates")
        .upsert({
          ...profile,
          email: user.email,
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
    <div className="container mx-auto py-8 max-w-4xl">
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

      <div className="space-y-6">
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
                <Input
                  id="location"
                  value={profile.location || ""}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  value={profile.linkedin_url || ""}
                  onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="years_experience">Years of Experience</Label>
                <Input
                  id="years_experience"
                  type="number"
                  value={profile.years_of_experience || ""}
                  onChange={(e) => setProfile({ ...profile, years_of_experience: parseInt(e.target.value) || undefined })}
                />
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
              {profile.skills.map((skill, index) => (
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
                {profile.preferred_locations.map((location, index) => (
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
  );
}