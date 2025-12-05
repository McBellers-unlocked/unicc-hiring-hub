import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Calendar, Briefcase } from "lucide-react";
import { StaffDetailModal } from "./StaffDetailModal";
import { format } from "date-fns";

interface StaffSearchCardProps {
  staff: any;
  viewMode: "grid" | "list";
}

export function StaffSearchCard({ staff, viewMode }: StaffSearchCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const initials = staff.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const skills = Array.isArray(staff.skills)
    ? staff.skills.slice(0, 3).map((s: any) => typeof s === 'string' ? s : s.name || '')
    : [];

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
              {skills.map((skill: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
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

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {skills.map((skill: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {staff.skills?.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{staff.skills.length - 3}
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
