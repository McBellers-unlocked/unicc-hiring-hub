import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, ChevronDown } from "lucide-react";
import { useState } from "react";

export const StandardInterviewIntro = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-blue-200 bg-blue-50/50">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 cursor-pointer hover:bg-blue-100/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <div className="bg-blue-500 text-white rounded-full p-1.5">
                  <Clock className="h-4 w-4" />
                </div>
                <span>Standard Introduction</span>
                <span className="text-sm font-normal text-muted-foreground">(5 minutes)</span>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">
              The HR Representative will:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Welcome the candidate and thank them for attending</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Introduce each panel member and their role</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Reassure the candidate that panel members will be taking notes throughout</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Explain that the candidate can ask for any question to be repeated</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Encourage concise, focused answers (aim for 3-5 minutes per response)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Explain the interview structure and timing</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Ask if the candidate has any questions before beginning</span>
              </li>
            </ul>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
