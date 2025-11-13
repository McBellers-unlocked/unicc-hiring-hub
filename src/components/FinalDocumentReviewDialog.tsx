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
import { Eye, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  requisitionId?: string;
}

export function FinalDocumentReviewDialog({
  open,
  onOpenChange,
  formData,
  onProceed,
  requisitionId,
}: FinalDocumentReviewDialogProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (open && requisitionId) {
      generatePdfPreview();
    }
  }, [open, requisitionId]);

  const generatePdfPreview = async () => {
    if (!requisitionId) return;
    
    setLoadingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-requisition-pdf', {
        body: { requisitionId }
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        setPdfUrl(data.pdfUrl);
      }
    } catch (error) {
      console.error('Error generating PDF preview:', error);
    } finally {
      setLoadingPdf(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Final Document Review - PDF Preview
          </DialogTitle>
          <DialogDescription>
            Review the clean version before sending to Division Chief
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {/* PDF Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>PDF Preview</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPdf ? (
                <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Generating PDF preview...</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <div className="border rounded-lg overflow-hidden bg-muted">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-96"
                    title="PDF Preview"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Unable to load PDF preview</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed view toggle */}
          {showDetails && (
            <>
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
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back to Edit
          </Button>
          <Button onClick={onProceed} className="bg-primary">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Send to Chief of Division
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
