import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Edit, Briefcase, FileText, Calendar, ChevronRight, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WelcomeHeaderProps {
  profile: {
    id: string;
    slug?: string;
    name: string;
    current_position?: string | null;
    current_organization?: string | null;
    profile_photo_url?: string | null;
    profile_completion_percentage?: number;
  };
  activeApplicationsCount: number;
  upcomingInterviewsCount: number;
}

export default function WelcomeHeader({ 
  profile, 
  activeApplicationsCount, 
  upcomingInterviewsCount 
}: WelcomeHeaderProps) {
  const navigate = useNavigate();
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const firstName = profile.name?.split(' ')[0] || 'there';
  const completionPercentage = profile.profile_completion_percentage || 0;

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-xl p-6 border">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Avatar and Welcome Message */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            {profile.profile_photo_url ? (
              <AvatarImage src={profile.profile_photo_url} alt={profile.name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {firstName}!
            </h1>
            {(profile.current_position || profile.current_organization) && (
              <p className="text-muted-foreground mt-0.5">
                {profile.current_position}
                {profile.current_position && profile.current_organization && ' at '}
                {profile.current_organization}
              </p>
            )}
          </div>
        </div>

        {/* Right: Quick Stats and Edit Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Quick Stats Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Profile</span>
                <span className="font-semibold">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="w-12 h-1.5" />
            </Badge>
            
            <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{activeApplicationsCount}</span>
              <span className="text-xs text-muted-foreground">Applications</span>
            </Badge>
            
            {upcomingInterviewsCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border-primary/20">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-semibold">{upcomingInterviewsCount}</span>
                <span className="text-xs">Interview{upcomingInterviewsCount !== 1 ? 's' : ''}</span>
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/hiring-guide')}
              className="shrink-0 text-muted-foreground"
            >
              <HelpCircle className="h-4 w-4 mr-1.5" />
              Process Guide
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/candidate-profile/${profile.slug || profile.id}/edit`)}
              className="shrink-0"
            >
              <Edit className="h-4 w-4 mr-1.5" />
              Edit Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
