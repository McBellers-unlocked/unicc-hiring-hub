import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { 
  Building2, MapPin, Mail, Calendar, Briefcase, 
  User, Award, Clock, Users 
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AssessedSkillBadge } from "./AssessedSkillBadge";

interface StaffDetailModalProps {
  staff: any;
  open: boolean;
  onClose: () => void;
}

export function StaffDetailModal({ staff, open, onClose }: StaffDetailModalProps) {
  // Fetch skill assessments for this staff member
  const { data: skillAssessments } = useQuery({
    queryKey: ['staff-skill-assessments', staff?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_assessments')
        .select(`
          self_assessment,
          manager_assessment,
          required_level,
          status,
          skill_definitions (name)
        `)
        .eq('user_id', staff.id)
        .eq('status', 'approved');
      
      if (error) throw error;
      return data;
    },
    enabled: !!staff?.id && open
  });

  // Create a map of skill name -> assessment data
  const skillAssessmentMap = new Map(
    (skillAssessments || []).map((a: any) => [
      a.skill_definitions?.name?.toLowerCase(),
      {
        selfAssessment: a.self_assessment,
        managerAssessment: a.manager_assessment,
        requiredLevel: a.required_level,
        status: a.status
      }
    ])
  );

  if (!staff) return null;

  const initials = staff.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const skills = Array.isArray(staff.skills)
    ? staff.skills.map((s: any) => typeof s === 'string' ? s : s.name || '')
    : [];

  const tenure = staff.entry_on_duty_date
    ? formatDistanceToNow(new Date(staff.entry_on_duty_date))
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-xl">{staff.name}</DialogTitle>
              <p className="text-muted-foreground">{staff.job_title || "No title"}</p>
              <div className="flex gap-2 mt-2">
                {staff.current_grade && (
                  <Badge variant="outline">{staff.current_grade}</Badge>
                )}
                {staff.division && (
                  <Badge variant="secondary">{staff.division}</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="tenure">Tenure</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${staff.email}`} className="text-primary hover:underline">
                    {staff.email}
                  </a>
                </div>
                {staff.duty_station && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{staff.duty_station}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Quick Facts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Division</p>
                    <p className="font-medium">{staff.division || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unit</p>
                    <p className="font-medium">{staff.unit || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Grade</p>
                    <p className="font-medium">{staff.current_grade || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tenure</p>
                    <p className="font-medium">{tenure || "—"}</p>
                  </div>
                  {staff.nationality && (
                    <div>
                      <p className="text-sm text-muted-foreground">Nationality</p>
                      <p className="font-medium">{staff.nationality}</p>
                    </div>
                  )}
                  {staff.gender && (
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="font-medium">{staff.gender}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Skills & Expertise
                </CardTitle>
              </CardHeader>
              <CardContent>
                {skills.length > 0 ? (
                  <TooltipProvider>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill: string, i: number) => {
                        const assessment = skillAssessmentMap.get(skill.toLowerCase());
                        return (
                          <AssessedSkillBadge 
                            key={i}
                            skillName={skill}
                            assessment={assessment}
                          />
                        );
                      })}
                    </div>
                  </TooltipProvider>
                ) : (
                  <p className="text-muted-foreground text-sm">No skills recorded yet.</p>
                )}
              </CardContent>
            </Card>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground space-y-1">
              <p><span className="inline-block w-3 h-3 rounded-full bg-purple-100 border border-purple-200 mr-2" />Purple: Excellence (+2 above)</p>
              <p><span className="inline-block w-3 h-3 rounded-full bg-blue-100 border border-blue-200 mr-2" />Blue: Exceeding (+1)</p>
              <p><span className="inline-block w-3 h-3 rounded-full bg-emerald-100 border border-emerald-200 mr-2" />Green: Meeting requirement</p>
              <p><span className="inline-block w-3 h-3 rounded-full bg-amber-100 border border-amber-200 mr-2" />Yellow: Minor gap (-1)</p>
              <p><span className="inline-block w-3 h-3 rounded-full bg-red-100 border border-red-200 mr-2" />Red: Gap (-2 or more)</p>
              <p><span className="inline-block w-3 h-3 rounded-full bg-muted border mr-2" />Grey: Not assessed</p>
            </div>
          </TabsContent>

          <TabsContent value="tenure" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  UNICC Tenure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {staff.entry_on_duty_date ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Entry on Duty Date</p>
                      <p className="text-2xl font-semibold">
                        {format(new Date(staff.entry_on_duty_date), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time at UNICC</p>
                      <p className="text-xl font-medium text-primary">{tenure}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Entry on duty date not recorded.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organization" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Organizational Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Division</p>
                    <p className="font-medium">{staff.division || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unit</p>
                    <p className="font-medium">{staff.unit || "—"}</p>
                  </div>
                </div>

                {staff.line_manager && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reports to</p>
                    <p className="font-medium">{staff.line_manager}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Coming soon:</strong> Org chart visualization and team member views.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button asChild>
            <a href={`mailto:${staff.email}`}>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
