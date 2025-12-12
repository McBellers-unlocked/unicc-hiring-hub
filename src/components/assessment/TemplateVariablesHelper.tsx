import { Info, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AVAILABLE_VARIABLES } from "@/lib/emailTemplateVariables";

export function TemplateVariablesHelper() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Collapsible className="mb-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <Info className="w-4 h-4" />
          Available Template Variables
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="bg-muted/50 rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-3">
            Use these variables in email content to personalize messages. They will be replaced with actual candidate data.
          </p>
          <div className="space-y-2">
            {AVAILABLE_VARIABLES.map((v) => (
              <div key={v.variable} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className="font-mono cursor-pointer hover:bg-secondary/80"
                    onClick={() => copyToClipboard(v.variable)}
                  >
                    {v.variable}
                    <Copy className="w-3 h-3 ml-1" />
                  </Badge>
                  <span className="text-sm text-muted-foreground">{v.description}</span>
                </div>
                <span className="text-sm text-muted-foreground italic">e.g., "{v.example}"</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Tip: For generic emails, just type "Dear Colleagues" instead of using variables.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
