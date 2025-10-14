import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Briefcase, GraduationCap, Globe, Award, Eye } from "lucide-react";
import { useState } from "react";
import { CandidateDetailModal } from "./CandidateDetailModal";

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

  const initials = candidate.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const topSkills = (candidate.skills as string[] || []).slice(0, 5);
  const education = Array.isArray(candidate.education) && candidate.education.length > 0
    ? candidate.education[0]
    : null;

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
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{candidate.name}</h3>
                  {matchScore !== undefined && (
                    <Badge variant={matchScore >= 70 ? "default" : matchScore >= 50 ? "secondary" : "outline"}>
                      {matchScore}% match
                    </Badge>
                  )}
                  {candidate.un_experience && (
                    <Badge variant="outline" className="gap-1">
                      <Award className="h-3 w-3" />
                      UN
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {candidate.current_position} {candidate.current_organization && `at ${candidate.current_organization}`}
                </p>
              </div>

              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                {candidate.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{candidate.location}</span>
                  </div>
                )}
                {candidate.years_of_experience && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{candidate.years_of_experience} yrs</span>
                  </div>
                )}
              </div>

              <Button onClick={() => setShowDetail(true)} size="sm" variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                View
              </Button>
            </div>

            {topSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {topSkills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <CandidateDetailModal
          candidate={candidate}
          open={showDetail}
          onClose={() => setShowDetail(false)}
        />
      </>
    );
  }

  // Grid view
  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowDetail(true)}>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={candidate.profile_photo_url} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{candidate.name}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {candidate.current_position || "Not specified"}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {matchScore !== undefined && (
            <Badge variant={matchScore >= 70 ? "default" : matchScore >= 50 ? "secondary" : "outline"} className="w-full justify-center">
              {matchScore}% match
            </Badge>
          )}

          {candidate.current_organization && (
            <p className="text-sm truncate">{candidate.current_organization}</p>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            {candidate.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{candidate.location}</span>
              </div>
            )}

            {candidate.years_of_experience !== null && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 flex-shrink-0" />
                <span>{candidate.years_of_experience} years experience</span>
              </div>
            )}

            {education && (
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{education.degree || education.level}</span>
              </div>
            )}

            {candidate.languages && Array.isArray(candidate.languages) && candidate.languages.length > 0 && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {candidate.languages.slice(0, 2).map((l: any) => l.language || l).join(", ")}
                </span>
              </div>
            )}
          </div>

          {candidate.un_experience && (
            <Badge variant="outline" className="gap-1">
              <Award className="h-3 w-3" />
              UN Experience
            </Badge>
          )}

          {topSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {topSkills.map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <CandidateDetailModal
        candidate={candidate}
        open={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </>
  );
}
