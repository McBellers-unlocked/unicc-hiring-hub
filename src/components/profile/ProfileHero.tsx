import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, MapPin, Calendar, Briefcase, Globe, Linkedin } from "lucide-react";
import { getCountryFlagUrl, getAvailabilityInfo } from "@/lib/countryFlags";

interface ProfileHeroProps {
  profile: any;
  isOwnProfile: boolean;
  onEdit: () => void;
}

export default function ProfileHero({ profile, isOwnProfile, onEdit }: ProfileHeroProps) {
  const availabilityInfo = getAvailabilityInfo(profile.availability_status);
  
  return (
    <div className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
      
      <div className="relative p-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar */}
          <Avatar className="h-32 w-32 ring-4 ring-background shadow-lg">
            <AvatarImage src={profile.profile_photo_url} />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
              {profile.name.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          {/* Main Info */}
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
              {profile.current_position && (
                <p className="text-xl text-muted-foreground mt-1">{profile.current_position}</p>
              )}
              {profile.current_organization && (
                <p className="text-base text-muted-foreground flex items-center gap-2 mt-1">
                  <Briefcase className="h-4 w-4" />
                  {profile.current_organization}
                </p>
              )}
            </div>

            {/* Key Badges */}
            <div className="flex flex-wrap gap-2">
              {profile.location && (
                <Badge variant="outline" className="gap-1.5">
                  <MapPin className="h-3 w-3" />
                  {getCountryFlagUrl(profile.location) && (
                    <img 
                      src={getCountryFlagUrl(profile.location)} 
                      alt={`${profile.location} flag`} 
                      className="w-4 h-3 object-cover rounded-sm"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  {profile.location}
                </Badge>
              )}
              
              <Badge variant="outline" className="gap-1.5" title={availabilityInfo.description}>
                <div className={`h-2 w-2 rounded-full ${availabilityInfo.color}`} />
                {availabilityInfo.label}
              </Badge>

              {profile.years_of_experience && profile.years_of_experience > 0 && (
                <Badge variant="outline" className="gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {profile.years_of_experience}+ years exp.
                </Badge>
              )}

              {profile.un_experience && (
                <Badge className="gap-1.5 bg-accent text-accent-foreground">
                  UN Experience
                </Badge>
              )}

              {profile.willing_to_relocate && (
                <Badge variant="secondary" className="gap-1.5">
                  <Globe className="h-3 w-3" />
                  Open to relocation
                </Badge>
              )}
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-3 text-sm">
              {profile.linkedin_url && (
                <a 
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              )}
            </div>
          </div>

          {/* Edit Button */}
          {isOwnProfile && (
            <Button onClick={onEdit} size="lg" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
