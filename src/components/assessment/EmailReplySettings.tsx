import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquareReply, Bot, FileText } from "lucide-react";

interface EmailReplySettingsProps {
  email: {
    reply_enabled?: boolean;
    reply_mode?: "ai" | "pre_written";
    reply_style?: string;
    reply_ai_prompt?: string;
    reply_pre_written?: string;
    reply_delay_min?: number;
    reply_delay_max?: number;
  };
  onUpdate: (field: string, value: any) => void;
}

const REPLY_STYLES = [
  { value: "clarification", label: "Ask for Clarification", description: "Request more details or ask probing questions" },
  { value: "new_info", label: "Provide New Information", description: "Add new context, policy updates, or constraints" },
  { value: "push_back", label: "Push Back Politely", description: "Express concerns or suggest alternatives" },
  { value: "escalate", label: "Escalate the Matter", description: "Indicate senior involvement or escalation" },
  { value: "urgency", label: "Increase Urgency", description: "Communicate shortened timelines or immediate action needed" },
];

export function EmailReplySettings({ email, onUpdate }: EmailReplySettingsProps) {
  const replyEnabled = email.reply_enabled ?? false;
  const replyMode = email.reply_mode ?? "ai";
  const replyStyle = email.reply_style ?? "clarification";
  const replyDelayMin = email.reply_delay_min ?? 4;
  const replyDelayMax = email.reply_delay_max ?? 8;

  return (
    <Card className="mt-4 border-dashed">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareReply className="w-4 h-4 text-muted-foreground" />
            <Label className="font-medium">Auto-Reply Settings</Label>
          </div>
          <Switch
            checked={replyEnabled}
            onCheckedChange={(checked) => onUpdate("reply_enabled", checked)}
          />
        </div>

        {replyEnabled && (
          <div className="space-y-4 pt-2 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Reply Mode
                </Label>
                <Select
                  value={replyMode}
                  onValueChange={(v) => onUpdate("reply_mode", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai">
                      <span className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        AI-Generated
                      </span>
                    </SelectItem>
                    <SelectItem value="pre_written">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Pre-Written
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Delay Range (minutes)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={replyDelayMin}
                    onChange={(e) => onUpdate("reply_delay_min", parseInt(e.target.value) || 4)}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={replyDelayMax}
                    onChange={(e) => onUpdate("reply_delay_max", parseInt(e.target.value) || 8)}
                    className="w-20"
                  />
                </div>
              </div>
            </div>

            {replyMode === "ai" && (
              <>
                <div className="space-y-2">
                  <Label>Reply Style</Label>
                  <Select
                    value={replyStyle}
                    onValueChange={(v) => onUpdate("reply_style", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPLY_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          <div>
                            <div className="font-medium">{style.label}</div>
                            <div className="text-xs text-muted-foreground">{style.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Custom AI Instructions (optional)</Label>
                  <Textarea
                    value={email.reply_ai_prompt || ""}
                    onChange={(e) => onUpdate("reply_ai_prompt", e.target.value)}
                    placeholder="E.g., 'Focus on GDPR implications' or 'Reference the upcoming board meeting'"
                    rows={2}
                  />
                </div>
              </>
            )}

            {replyMode === "pre_written" && (
              <div className="space-y-2">
                <Label>Pre-Written Reply</Label>
                <Textarea
                  value={email.reply_pre_written || ""}
                  onChange={(e) => onUpdate("reply_pre_written", e.target.value)}
                  placeholder="Write the exact reply that will be sent..."
                  rows={4}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
