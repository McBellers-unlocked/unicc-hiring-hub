import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Award, User } from "lucide-react";
import BatterySkillIndicator from "./BatterySkillIndicator";

interface StaffSkillAssessment {
  userId: string;
  userName: string;
  selfAssessment: number | null;
  managerAssessment: number | null;
  requiredLevel: number | null;
  hasCredential: boolean;
}

interface DivisionSkillDrillDownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division: string;
  skillId: string;
  skillName: string;
  isCredential?: boolean;
}

export default function DivisionSkillDrillDown({
  open,
  onOpenChange,
  division,
  skillId,
  skillName,
  isCredential = false,
}: DivisionSkillDrillDownProps) {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffSkillAssessment[]>([]);

  useEffect(() => {
    if (open && division && skillId) {
      fetchStaffWithSkill();
    }
  }, [open, division, skillId]);

  const fetchStaffWithSkill = async () => {
    setLoading(true);
    try {
      // Get users in this division
      const { data: users } = await supabase
        .from("users")
        .select("id, name")
        .eq("division", division);

      if (!users || users.length === 0) {
        setStaff([]);
        return;
      }

      const userIds = users.map(u => u.id);

      // Get skill assessments for these users
      const { data: assessments } = await supabase
        .from("skill_assessments")
        .select("user_id, self_assessment, manager_assessment, required_level, has_credential")
        .eq("skill_id", skillId)
        .eq("scope", "team")
        .in("user_id", userIds);

      const assessmentMap = new Map(
        (assessments || []).map(a => [a.user_id, a])
      );

      const staffData: StaffSkillAssessment[] = users
        .map(user => {
          const assessment = assessmentMap.get(user.id);
          return {
            userId: user.id,
            userName: user.name || "Unknown",
            selfAssessment: assessment?.self_assessment ?? null,
            managerAssessment: assessment?.manager_assessment ?? null,
            requiredLevel: assessment?.required_level ?? null,
            hasCredential: assessment?.has_credential ?? false,
          };
        })
        .filter(s => s.selfAssessment !== null || s.hasCredential)
        .sort((a, b) => {
          const aLevel = a.managerAssessment ?? a.selfAssessment ?? 0;
          const bLevel = b.managerAssessment ?? b.selfAssessment ?? 0;
          return bLevel - aLevel;
        });

      setStaff(staffData);
    } catch (error) {
      console.error("Error fetching staff skill data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGapStatus = (actual: number | null, required: number | null) => {
    if (actual === null || required === null) return null;
    const gap = actual - required;
    if (gap >= 0) return { label: "Met", variant: "default" as const };
    if (gap >= -1) return { label: "Near", variant: "secondary" as const };
    return { label: "Gap", variant: "destructive" as const };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCredential && <Award className="h-5 w-5 text-primary" />}
            {skillName} — {division} Division
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No staff with this skill in {division}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  {isCredential ? (
                    <TableHead className="text-center">Has Credential</TableHead>
                  ) : (
                    <>
                      <TableHead className="text-center">Self</TableHead>
                      <TableHead className="text-center">Manager</TableHead>
                      <TableHead className="text-center">Required</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => {
                  const actualLevel = s.managerAssessment ?? s.selfAssessment;
                  const gapStatus = getGapStatus(actualLevel, s.requiredLevel);
                  
                  return (
                    <TableRow key={s.userId}>
                      <TableCell className="font-medium">{s.userName}</TableCell>
                      {isCredential ? (
                        <TableCell className="text-center">
                          {s.hasCredential ? (
                            <Badge variant="default" className="bg-green-600">Yes</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="text-center">
                            {s.selfAssessment !== null ? (
                              <BatterySkillIndicator 
                                selfAssessment={s.selfAssessment} 
                                requiredLevel={s.requiredLevel}
                                compact 
                              />
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {s.managerAssessment !== null ? (
                              <BatterySkillIndicator 
                                selfAssessment={s.managerAssessment} 
                                requiredLevel={s.requiredLevel}
                                compact 
                              />
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {s.requiredLevel !== null ? (
                              <span className="text-sm text-muted-foreground">
                                L{s.requiredLevel}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {gapStatus ? (
                              <Badge variant={gapStatus.variant}>{gapStatus.label}</Badge>
                            ) : "—"}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
