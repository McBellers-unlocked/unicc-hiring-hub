import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Briefcase, GraduationCap, Globe, Award, Eye, Building2, Calendar } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CandidateDetailModal } from "./CandidateDetailModal";
import { StaffDetailModal } from "@/components/internal-talent/StaffDetailModal";
import { AssessedSkillBadge } from "@/components/internal-talent/AssessedSkillBadge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface CandidateSearchCardProps {
  candidate: any;
  viewMode: "grid" | "list";
  matchScore?: number;
}

export function CandidateSearchCard({
  candidate,
  viewMode,
  matchScore,
}: CandidateSearchCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  const isInternal = candidate._source === "internal";

  // Fetch skill assessments for internal candidates only
  const { data: skillAssessments } = useQuery({
    queryKey: ['candidate-skill-assessments-preview', candidate.id],
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
        .eq('user_id', candidate.id)
        .eq('status', 'approved');
      return data || [];
    },
    enabled: isInternal && !!candidate?.id,
    staleTime: 5 * 60 * 1000
  });

  // Build assessment map for internal candidates
  const skillAssessmentMap = isInternal
    ? new Map(
        (skillAssessments || []).map((a: any) => [
          a.skill_definitions?.name?.toLowerCase(),
          {
            selfAssessment: a.self_assessment,
            managerAssessment: a.manager_assessment,
            requiredLevel: a.required_level,
            status: a.status
          }
        ])
      )
    : new Map();

  // Get assessed skill names for internal candidates
  const assessedSkillNames = isInternal
    ? (skillAssessments || [])
        .map((a: any) => a.skill_definitions?.name)
        .filter(Boolean)
    : [];

  const initials = (candidate.name || "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Get profile skills
  const profileSkills = Array.isArray(candidate.skills)
    ? candidate.skills.map((s: any) => (typeof s === "string" ? s : s.name || ""))
    : [];

  // Merge skills for internal, just profile for external (limit to 8 for fixed-height container)
  const allSkills = isInternal
    ? [...new Set([...assessedSkillNames, ...profileSkills])].slice(0, 8)
    : profileSkills.slice(0, 8);
  const totalSkillCount = isInternal
    ? [...new Set([...assessedSkillNames, ...profileSkills])].length
    : profileSkills.length;

  // Find highest education level (external only)
  const getHighestEducation = (educationArray: any[]) => {
    if (!Array.isArray(educationArray) || educationArray.length === 0) return null;
    const degreeRank = (degree: string) => {
      const degreeStr = degree?.toLowerCase() || "";
      if (degreeStr.includes("phd") || degreeStr.includes("doctorate")) return 3;
      if (degreeStr.includes("master") || degreeStr.includes("mba")) return 2;
      if (degreeStr.includes("bachelor")) return 1;
      return 0;
    };
    return educationArray.reduce((highest, current) => {
      const currentRank = degreeRank(current.degree || current.level);
      const highestRank = degreeRank(highest.degree || highest.level);
      return currentRank > highestRank ? current : highest;
    });
  };

  const education = !isInternal ? getHighestEducation(candidate.education) : null;

  const SourceBadge = () => (
    <Badge
      variant="outline"
      className={`gap-1 shrink-0 ${
        isInternal
          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
      }`}
    >
      {isInternal ? (
        <>
          <Building2 className="h-3 w-3" />
          Internal
        </>
      ) : (
        <>
          <Globe className="h-3 w-3" />
          External
        </>
      )}
    </Badge>
  );

  const MatchScoreBadge = () =>
    matchScore !== undefined ? (
      <Badge
        variant={matchScore >= 70 ? "default" : "outline"}
        className={
          matchScore >= 70
            ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
            : matchScore >= 50
            ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
            : "bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
        }
      >
        {matchScore}% match
      </Badge>
    ) : null;

  if (viewMode === "list") {
    return (
      <>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={candidate.profile_photo_url} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{candidate.name}</h3>
                  <SourceBadge />
                  <MatchScoreBadge />
                  {candidate.un_experience && !isInternal && (
                    <Badge variant="outline" className="gap-1">
                      <Award className="h-3 w-3" />
                      UN
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {candidate.position || "No title"}
                  {candidate.organization && ` at ${candidate.organization}`}
                </p>
              </div>

              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                {isInternal && candidate.division && (
                  <div className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    <span>{candidate.division}</span>
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{candidate.location}</span>
                  </div>
                )}
                {candidate.years_of_experience !== null && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{candidate.years_of_experience} yrs</span>
                  </div>
                )}
                {isInternal && candidate.current_grade && (
                  <Badge variant="outline">{candidate.current_grade}</Badge>
                )}
              </div>

              <Button onClick={() => setShowDetail(true)} size="sm" variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                View
              </Button>
            </div>

            {allSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {allSkills.map((skill: string, idx: number) =>
                  isInternal ? (
                    <AssessedSkillBadge
                      key={idx}
                      skillName={skill}
                      assessment={skillAssessmentMap.get(skill.toLowerCase())}
                    />
                  ) : (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {isInternal ? (
          <StaffDetailModal
            staff={candidate}
            open={showDetail}
            onClose={() => setShowDetail(false)}
          />
        ) : (
          <CandidateDetailModal
            candidate={candidate}
            open={showDetail}
            onClose={() => setShowDetail(false)}
          />
        )}
      </>
    );
  }

  // Grid view
  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer min-h-[380px] flex flex-col" onClick={() => setShowDetail(true)}>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={candidate.profile_photo_url} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{candidate.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {candidate.position || "Not specified"}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 flex-1 flex flex-col">
          <div className="flex gap-2 flex-wrap">
            <SourceBadge />
            {isInternal && candidate.current_grade && (
              <Badge variant="outline">{candidate.current_grade}</Badge>
            )}
          </div>

          <MatchScoreBadge />

          {candidate.organization && (
            <p className="text-sm truncate">{candidate.organization}</p>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            {isInternal && candidate.division && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {candidate.division}
                  {candidate.unit && ` / ${candidate.unit}`}
                </span>
              </div>
            )}

            {candidate.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{candidate.location}</span>
              </div>
            )}

            {candidate.years_of_experience !== null && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 flex-shrink-0" />
                <span>
                  {isInternal
                    ? `${candidate.years_of_experience} years at UNICC`
                    : `${candidate.years_of_experience} years experience`}
                </span>
              </div>
            )}

            {isInternal && candidate.entry_on_duty_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>Since {format(new Date(candidate.entry_on_duty_date), "MMM yyyy")}</span>
              </div>
            )}

            {!isInternal && education && (
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{education.degree || education.level}</span>
              </div>
            )}

            {!isInternal && candidate.languages?.length > 0 && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {candidate.languages.slice(0, 2).map((l: any) => l.language || l).join(", ")}
                </span>
              </div>
            )}
          </div>

          {!isInternal && candidate.un_experience && (
            <Badge variant="outline" className="gap-1">
              <Award className="h-3 w-3" />
              UN Experience
            </Badge>
          )}

          <div className="h-[72px] overflow-hidden border-t pt-2 mt-auto">
            <div className="flex flex-wrap gap-1">
              {allSkills.map((skill: string, idx: number) =>
                isInternal ? (
                  <AssessedSkillBadge
                    key={idx}
                    skillName={skill}
                    assessment={skillAssessmentMap.get(skill.toLowerCase())}
                  />
                ) : (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                )
              )}
            </div>
          </div>
          {totalSkillCount > 0 && (
            <div className="text-xs text-muted-foreground">
              {totalSkillCount} skill{totalSkillCount !== 1 ? 's' : ''} total
            </div>
          )}
        </CardContent>
      </Card>

      {isInternal ? (
        <StaffDetailModal
          staff={candidate}
          open={showDetail}
          onClose={() => setShowDetail(false)}
        />
      ) : (
        <CandidateDetailModal
          candidate={candidate}
          open={showDetail}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}
