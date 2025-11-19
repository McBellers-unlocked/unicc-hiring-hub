import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ConsultancyLevelGuidance() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto p-0 text-sm">
          <HelpCircle className="h-4 w-4 mr-1" />
          View Guidance
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Guidance on Consultancy Levels</DialogTitle>
          <DialogDescription>
            For hiring managers selecting appropriate consultancy band levels
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* International Consultancies */}
            <div>
              <h3 className="text-lg font-semibold mb-3">International Consultancies</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold mb-1">Band Level A: Equivalent to P2-P3</h4>
                  <p className="text-sm text-muted-foreground">
                    Services related to projects or technical tasks of a narrow scope, for which 
                    limited technical skills are required. Minimum first university degree, and up 
                    to 5 years of relevant experience.
                  </p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold mb-1">Band Level B: Equivalent to P3-P4</h4>
                  <p className="text-sm text-muted-foreground">
                    Services related to projects or technical tasks of moderate complexity or 
                    specialization. This level of rate is typically used for individuals with 
                    specialized qualifications. Minimum first university degree for lower end of 
                    range, an advanced university degree for mid and high end of range, and 5 to 
                    10 years of relevant experience.
                  </p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold mb-1">Band Level C: Equivalent to P4-P5</h4>
                  <p className="text-sm text-muted-foreground">
                    Services related to projects or technical tasks of high complexity and depth 
                    requiring expert technical knowledge and skills. Minimum an advanced university 
                    degree, and over 10 years of relevant experience.
                  </p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold mb-1">Band Level D: Equivalent P5+</h4>
                  <p className="text-sm text-muted-foreground">
                    Services related to projects or technical tasks of high political complexity, 
                    depth and visibility requiring senior expertise in the technical area. The 
                    individuals are typically credible, established experts recognized in their 
                    specific area of work. Minimum an advanced university degree, and over 15 years 
                    of relevant experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
