import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, ChevronDown } from "lucide-react";
import { useState } from "react";

export const StandardInterviewWrapUp = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-green-200 bg-green-50/50">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 cursor-pointer hover:bg-green-100/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <div className="bg-green-500 text-white rounded-full p-1.5">
                  <Clock className="h-4 w-4" />
                </div>
                <span>Wrap-up</span>
                <span className="text-sm font-normal text-muted-foreground">(5 minutes)</span>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="text-green-500 font-bold">•</span>
                <span>Invite the candidate to ask any questions about the role or organization</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-500 font-bold">•</span>
                <span>Explain next steps in the recruitment process and expected timeline</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-500 font-bold">•</span>
                <span>Thank the candidate for their time and participation</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-500 font-bold">•</span>
                <span>Confirm contact details if needed</span>
              </li>
            </ul>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
