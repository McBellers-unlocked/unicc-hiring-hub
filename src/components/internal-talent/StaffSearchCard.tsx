import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Calendar, Briefcase } from "lucide-react";
import { StaffDetailModal } from "./StaffDetailModal";
import { AssessedSkillBadge } from "./AssessedSkillBadge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface StaffSearchCardProps {
  staff: any;
  viewMode: "grid" | "list";
}

export function StaffSearchCard({ staff, viewMode }: StaffSearchCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch skill assessments for this staff member
  const { data: skillAssessments } = useQuery({
    queryKey: ['staff-skill-assessments-preview', staff.id],
    queryFn: async () => {
      const { data } = await supabase
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
      return data || [];
    },
    enabled: !!staff?.id,
    staleTime: 5 * 60 * 1000
  });

  // Build assessment map
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

  // Get assessed skill names
  const assessedSkillNames = (skillAssessments || [])
    .map((a: any) => a.skill_definitions?.name)
    .filter(Boolean);

  // Get profile skills
  const profileSkills = Array.isArray(staff.skills)
    ? staff.skills.map((s: any) => typeof s === 'string' ? s : s.name || '')
    : [];

  // Merge and deduplicate skills (limit to 3 for preview)
  const allSkills = [...new Set([...assessedSkillNames, ...profileSkills])].slice(0, 3);
  const totalSkillCount = [...new Set([...assessedSkillNames, ...profileSkills])].length;

  const initials = staff.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const tenure = staff.entry_on_duty_date
    ? Math.floor((Date.now() - new Date(staff.entry_on_duty_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : null;

  if (viewMode === "list") {
    return (
      <>
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setModalOpen(true)}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{staff.name}</h3>
                {staff.current_grade && (
                  <Badge variant="outline" className="shrink-0">{staff.current_grade}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{staff.job_title || "No title"}</p>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              {staff.division && (
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {staff.division}
                </div>
              )}
              {staff.duty_station && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {staff.duty_station}
                </div>
              )}
              {tenure !== null && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {tenure} yr{tenure !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            <div className="hidden lg:flex gap-1">
              {allSkills.map((skill: string, i: number) => (
                <AssessedSkillBadge
                  key={i}
                  skillName={skill}
                  assessment={skillAssessmentMap.get(skill.toLowerCase())}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <StaffDetailModal
          staff={staff}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </>
    );
  }

  // Grid view
  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setModalOpen(true)}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{staff.name}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {staff.job_title || "No title"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 text-sm">
            {(staff.division || staff.unit) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {staff.division}{staff.unit ? ` / ${staff.unit}` : ""}
                </span>
              </div>
            )}
            {staff.duty_station && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{staff.duty_station}</span>
              </div>
            )}
            {staff.entry_on_duty_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4 shrink-0" />
                <span>Since {format(new Date(staff.entry_on_duty_date), "MMM yyyy")}</span>
              </div>
            )}
          </div>

          {allSkills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allSkills.map((skill: string, i: number) => (
                <AssessedSkillBadge
                  key={i}
                  skillName={skill}
                  assessment={skillAssessmentMap.get(skill.toLowerCase())}
                />
              ))}
              {totalSkillCount > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{totalSkillCount - 3}
                </Badge>
              )}
            </div>
          )}

          {staff.current_grade && (
            <div className="pt-2 border-t">
              <Badge variant="outline">{staff.current_grade}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <StaffDetailModal
        staff={staff}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
