import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { GraduationCap, Send, Target, Clock, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface DevelopmentPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  category: string;
  avgProficiency: number;
  requiredLevel: number;
  belowRequired: number;
}

const TRAINING_SUGGESTIONS: Record<string, string[]> = {
  "Cloud & Infrastructure": ["AWS/Azure certification track", "Hands-on lab exercises", "Cloud architecture workshop"],
  "Programming": ["Coding bootcamp modules", "Peer programming sessions", "Open-source contribution program"],
  "Data & Analytics": ["Data visualization workshop", "SQL/Python training course", "Analytics certification"],
  "Security": ["Security certification prep (CISSP/CEH)", "Incident response drills", "Security awareness program"],
  "AI & Machine Learning": ["ML fundamentals course", "AI ethics workshop", "Hands-on model building lab"],
  default: ["Online learning platform subscription", "Mentorship program enrollment", "Cross-team knowledge sharing sessions"],
};

function getSuggestions(category: string): string[] {
  return TRAINING_SUGGESTIONS[category] || TRAINING_SUGGESTIONS.default;
}

export default function DevelopmentPlanModal({
  open,
  onOpenChange,
  skillName,
  category,
  avgProficiency,
  requiredLevel,
  belowRequired,
}: DevelopmentPlanModalProps) {
  const [timeline, setTimeline] = useState("3");
  const suggestions = getSuggestions(category);

  const handleSendToManager = () => {
    toast.success(`Development plan for "${skillName}" sent to line manager`, {
      description: `Timeline: ${timeline} months · Target: Level ${requiredLevel}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Development Plan
          </DialogTitle>
          <DialogDescription>
            Pre-filled learning recommendation for {skillName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Skill Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Skill</p>
              <p className="font-medium text-sm">{skillName}</p>
              <Badge variant="outline" className="mt-1 text-[10px]">{category}</Badge>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Current Gap</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-destructive">{avgProficiency}</span>
                <span className="text-xs text-muted-foreground">/ {requiredLevel} required</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{belowRequired} staff below target</p>
            </div>
          </div>

          <Separator />

          {/* Training Suggestions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Suggested Training</h4>
            </div>
            <ul className="space-y-1.5">
              {suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Target & Timeline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1">
                <Target className="h-3 w-3" /> Target Proficiency
              </label>
              <div className="rounded-md border px-3 py-2 text-sm bg-muted/50">
                Level {requiredLevel}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> Timeline
              </label>
              <Select value={timeline} onValueChange={setTimeline}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSendToManager} className="gap-2">
            <Send className="h-4 w-4" />
            Send to Manager
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
