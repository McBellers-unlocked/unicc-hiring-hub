import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Database, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DataQualityMetrics {
  assessmentCoverage: number;
  lastUpdatedMedianDays: number;
  managerVerifiedPercent: number;
  totalStaff: number;
  staffWithAssessments: number;
}

export default function SkillsDataQuality() {
  const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDataQuality();
  }, []);

  const fetchDataQuality = async () => {
    try {
      // Get total staff count
      const { count: totalStaff } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      // Get staff with assessments
      const { data: assessments } = await supabase
        .from("skill_assessments")
        .select("user_id, updated_at, manager_assessment")
        .eq("scope", "team");

      const uniqueUsersWithAssessments = new Set(assessments?.map((a) => a.user_id) || []);
      const staffWithAssessments = uniqueUsersWithAssessments.size;

      // Calculate assessment coverage
      const assessmentCoverage = totalStaff
        ? Math.round((staffWithAssessments / totalStaff) * 100)
        : 0;

      // Calculate median last updated (in days)
      const now = new Date();
      const updateDays = (assessments || [])
        .map((a) => {
          const updated = new Date(a.updated_at);
          return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
        })
        .sort((a, b) => a - b);

      const lastUpdatedMedianDays = updateDays.length
        ? updateDays[Math.floor(updateDays.length / 2)]
        : 0;

      // Calculate manager verified percentage
      const withManagerAssessment = (assessments || []).filter(
        (a) => a.manager_assessment !== null
      ).length;
      const managerVerifiedPercent = assessments?.length
        ? Math.round((withManagerAssessment / assessments.length) * 100)
        : 0;

      setMetrics({
        assessmentCoverage,
        lastUpdatedMedianDays,
        managerVerifiedPercent,
        totalStaff: totalStaff || 0,
        staffWithAssessments,
      });
    } catch (error) {
      console.error("Error fetching data quality:", error);
    } finally {
      setLoading(false);
    }
  };

  const getQualityStatus = () => {
    if (!metrics) return { label: "Unknown", variant: "secondary" as const, icon: AlertCircle };
    
    const score =
      (metrics.assessmentCoverage >= 70 ? 1 : 0) +
      (metrics.lastUpdatedMedianDays <= 30 ? 1 : 0) +
      (metrics.managerVerifiedPercent >= 30 ? 1 : 0);

    if (score >= 3) return { label: "Good", variant: "default" as const, icon: CheckCircle2 };
    if (score >= 2) return { label: "Fair", variant: "secondary" as const, icon: Clock };
    return { label: "Needs Attention", variant: "destructive" as const, icon: AlertCircle };
  };

  const status = getQualityStatus();
  const StatusIcon = status.icon;

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="h-16 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="border-dashed">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              Data Quality
            </span>
            <Badge variant={status.variant} className="gap-1 text-xs">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0 space-y-3">
          {/* Assessment Coverage */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Assessment Coverage</span>
                  <span className="font-medium">{metrics?.assessmentCoverage}%</span>
                </div>
                <Progress 
                  value={metrics?.assessmentCoverage || 0} 
                  className="h-1.5"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{metrics?.staffWithAssessments} of {metrics?.totalStaff} staff have assessments</p>
            </TooltipContent>
          </Tooltip>

          {/* Last Updated */}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Last Updated (median)</span>
            <span className={`font-medium ${metrics && metrics.lastUpdatedMedianDays > 60 ? "text-destructive" : ""}`}>
              {metrics?.lastUpdatedMedianDays} days ago
            </span>
          </div>

          {/* Manager Verified */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Manager Verified</span>
                  <span className="font-medium">{metrics?.managerVerifiedPercent}%</span>
                </div>
                <Progress 
                  value={metrics?.managerVerifiedPercent || 0} 
                  className="h-1.5"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Assessments with manager validation</p>
            </TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}