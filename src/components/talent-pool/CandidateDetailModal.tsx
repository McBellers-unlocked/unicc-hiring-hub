import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, Briefcase, GraduationCap, Globe, Award, Mail, 
  Phone, FileUser, MessageSquare, Flag, UserPlus 
} from "lucide-react";
import { CandidateNotes } from "./CandidateNotes";
import { CandidateFlags } from "./CandidateFlags";

interface CandidateDetailModalProps {
  candidate: any;
  open: boolean;
  onClose: () => void;
}

export function CandidateDetailModal({
  candidate,
  open,
  onClose,
}: CandidateDetailModalProps) {
  const initials = candidate.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={candidate.profile_photo_url} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-2xl">{candidate.name}</DialogTitle>
              <p className="text-muted-foreground">
                {candidate.current_position} {candidate.current_organization && `at ${candidate.current_organization}`}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {candidate.un_experience && (
                  <Badge variant="outline" className="gap-1">
                    <Award className="h-3 w-3" />
                    UN Experience
                  </Badge>
                )}
                {candidate.willing_to_relocate && (
                  <Badge variant="outline">Open to Relocation</Badge>
                )}
                {candidate.has_security_clearance && (
                  <Badge variant="outline">Security Clearance</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Contact Information</h3>
                {candidate.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.email}</span>
                  </div>
                )}
                {candidate.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.phone}</span>
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.location}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Quick Facts</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.years_of_experience || 0} years experience</span>
                </div>
                {candidate.education && Array.isArray(candidate.education) && candidate.education.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.education[0].degree || candidate.education[0].level}</span>
                  </div>
                )}
              </div>
            </div>

            {candidate.professional_summary && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Professional Summary</h3>
                  <p className="text-sm text-muted-foreground">{candidate.professional_summary}</p>
                </div>
              </>
            )}

            {candidate.skills && Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {candidate.languages && Array.isArray(candidate.languages) && candidate.languages.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Languages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.languages.map((lang: any, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {typeof lang === 'string' ? lang : `${lang.language} (${lang.proficiency || 'Unknown'})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="experience" className="space-y-4">
            {candidate.work_experience && Array.isArray(candidate.work_experience) && candidate.work_experience.length > 0 ? (
              candidate.work_experience.map((exp: any, idx: number) => (
                <div key={idx} className="border-l-2 border-primary pl-4 pb-4">
                  <h4 className="font-semibold">{exp.title || exp.position}</h4>
                  <p className="text-sm text-muted-foreground">{exp.company || exp.organization}</p>
                  <p className="text-sm text-muted-foreground">
                    {exp.start_date} - {exp.end_date || 'Present'}
                  </p>
                  {exp.description && (
                    <p className="text-sm mt-2">{exp.description}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No work experience listed</p>
            )}

            {candidate.education && Array.isArray(candidate.education) && candidate.education.length > 0 && (
              <>
                <Separator />
                <h3 className="font-semibold">Education</h3>
                {candidate.education.map((edu: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-primary pl-4 pb-4">
                    <h4 className="font-semibold">{edu.degree || edu.level}</h4>
                    <p className="text-sm text-muted-foreground">{edu.institution || edu.school}</p>
                    <p className="text-sm text-muted-foreground">{edu.year || edu.end_date}</p>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="notes">
            <CandidateNotes candidateId={candidate.id} />
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <CandidateFlags candidateId={candidate.id} />
            
            <Separator />
            
            <div className="space-y-2">
              <h3 className="font-semibold">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add to Job
                </Button>
                <Button variant="outline" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Send Email
                </Button>
                <Button variant="outline" className="gap-2">
                  <FileUser className="h-4 w-4" />
                  Export Profile
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
