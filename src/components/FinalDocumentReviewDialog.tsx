import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle2 } from "lucide-react";

interface JobRequisition {
  position_title?: string;
  grade?: string;
  unit_section_division?: string;
  duty_station?: string;
  nature_of_position?: string;
  positions_available?: number;
  purpose_of_position?: string;
  objectives_of_programme?: string;
  main_duties_responsibilities?: string;
  essential_experience?: string;
  desirable_experience?: string;
  essential_education?: string;
  desirable_education?: string;
}

interface FinalDocumentReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: Partial<JobRequisition>;
  onProceed: () => void;
}

export function FinalDocumentReviewDialog({
  open,
  onOpenChange,
  formData,
  onProceed,
}: FinalDocumentReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Final Document Review
          </DialogTitle>
          <DialogDescription>
            Clean version with all changes applied - ready for submission
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Position Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Position Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Position Title</dt>
                  <dd className="mt-1 text-sm">{formData.position_title || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Grade</dt>
                  <dd className="mt-1 text-sm">{formData.grade || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Unit/Section/Division</dt>
                  <dd className="mt-1 text-sm">{formData.unit_section_division || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Duty Station</dt>
                  <dd className="mt-1 text-sm">{formData.duty_station || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Nature of Position</dt>
                  <dd className="mt-1 text-sm">{formData.nature_of_position || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Number of Positions</dt>
                  <dd className="mt-1 text-sm">{formData.positions_available || 1}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Position Description Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Position Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Purpose of the Position</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.purpose_of_position || 'N/A'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Objectives of the Programme</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.objectives_of_programme || 'N/A'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Main Duties and Responsibilities</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.main_duties_responsibilities || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Requirements Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Essential Experience</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.essential_experience || 'N/A'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Desirable Experience</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.desirable_experience || 'N/A'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Essential Education</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.essential_education || 'N/A'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Desirable Education</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.desirable_education || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back to Edit
          </Button>
          <Button 
            onClick={() => {
              onOpenChange(false);
              onProceed();
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Looks Good - Proceed to Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
