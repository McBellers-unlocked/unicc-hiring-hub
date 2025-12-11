import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Mail, Calendar, GraduationCap, Briefcase, Award, Globe, Edit3 } from 'lucide-react';

interface ProfileContentProps {
  profile: {
    id: string;
    slug?: string;
    name: string;
    email: string;
    phone?: string;
    location?: string;
    professional_summary?: string;
    work_experience?: any[];
    education?: any[];
    skills?: string[];
    languages?: any[];
    certifications?: any[];
    un_organizations_worked?: string[];
    years_of_experience?: number;
    availability_status?: string;
  };
}

export default function ProfileContent({ profile }: ProfileContentProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    // Handle YYYY-MM format
    if (dateString.includes('-') && dateString.length <= 7) {
      const [year, month] = dateString.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
    
    // Try to parse as a full date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short'
    });
  };

  return (
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
              <p className="text-muted-foreground leading-relaxed">
                {profile.professional_summary}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Work Experience */}
        {profile.work_experience && profile.work_experience.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {profile.work_experience.map((exp: any, index: number) => (
                  <div key={index} className="border-l-2 border-muted pl-4">
                    <h3 className="font-semibold">{exp.position}</h3>
                    <p className="text-primary font-medium">{exp.company || exp.organization}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(exp.start_date || exp.startDate)} - {(exp.end_date || exp.endDate) ? formatDate(exp.end_date || exp.endDate) : 'Present'}
                      </div>
                      {exp.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {exp.location}
                        </div>
                      )}
                    </div>
                    {exp.description && (
                      <p className="text-muted-foreground mt-2">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {profile.education && profile.education.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.education.map((edu: any, index: number) => {
                  console.log('Dashboard Education entry:', edu);
                  return (
                  <div key={index} className="border-l-2 border-muted pl-4">
                    <h3 className="font-semibold">
                      {edu.degree || edu.degree_type} 
                      {(edu.field_of_study || edu.field) && ` in ${edu.field_of_study || edu.field}`}
                    </h3>
                    <p className="text-primary font-medium">{edu.institution}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {(edu.start_date || edu.startDate) ? formatDate(edu.start_date || edu.startDate) : (edu.start_year || 'Unknown')} - 
                        {(edu.end_date || edu.endDate) ? formatDate(edu.end_date || edu.endDate) : ((edu.is_current || edu.isCurrent) ? 'Present' : (edu.end_year || 'Present'))}
                      </div>
                      {edu.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {edu.location}
                        </div>
                      )}
                    </div>
                    {edu.description && (
                      <p className="text-muted-foreground mt-2">{edu.description}</p>
                    )}
                  </div>
                );
                })}
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
            <CardTitle>Contact Information</CardTitle>
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
            {profile.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{profile.location}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
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

        {/* Languages */}
        {profile.languages && profile.languages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Languages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profile.languages.map((lang: any, index: number) => {
                  const languageName = typeof lang.language === 'string' 
                    ? lang.language.charAt(0).toUpperCase() + lang.language.slice(1)
                    : String(lang.language || '');
                  const proficiencyLevel = typeof lang.proficiency === 'string'
                    ? lang.proficiency
                    : String(lang.proficiency || '');
                  
                  return (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{languageName}</span>
                      <Badge variant="outline" className="text-xs">
                        {proficiencyLevel}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certifications */}
        {profile.certifications && profile.certifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.certifications.map((cert: any, index: number) => (
                  <div key={index}>
                    <h4 className="font-medium text-sm">{cert.name}</h4>
                    <p className="text-xs text-muted-foreground">{cert.issuing_organization}</p>
                    {cert.date_earned && (
                      <p className="text-xs text-muted-foreground">
                        Earned: {formatDate(cert.date_earned)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* UN Experience */}
        {profile.un_organizations_worked && profile.un_organizations_worked.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>UN System Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.un_organizations_worked.map((org: string, index: number) => (
                  <Badge key={index} variant="outline">
                    {org}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Profile Action */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={() => navigate(`/candidate-profile/${profile.slug || profile.id}/edit`)}
              className="w-full flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}