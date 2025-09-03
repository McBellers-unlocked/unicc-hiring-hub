import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Eye, Upload } from 'lucide-react';

interface PHFManagerProps {
  applicationId: string;
  phfData: any;
  phfCompleted: boolean;
  phfPdfUrl?: string | null;
  candidatePhfUrl?: string | null;
  onUpdate: () => void;
}

export const PHFManager: React.FC<PHFManagerProps> = ({
  applicationId,
  phfData,
  phfCompleted,
  phfPdfUrl,
  candidatePhfUrl,
  onUpdate
}) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const handleGeneratePDF = async () => {
    if (!phfCompleted) {
      toast({
        title: "PHF Incomplete",
        description: "The Personal History Form must be completed before generating PDF",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-phf-pdf', {
        body: { applicationId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "PHF PDF generated successfully"
      });

      onUpdate();
    } catch (error) {
      console.error('Error generating PHF PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PHF PDF",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Personal History Form (PHF)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Form Status:</span>
            <Badge variant={phfCompleted ? "default" : "secondary"}>
              {phfCompleted ? 'Completed' : 'Incomplete'}
            </Badge>
          </div>
          
          {phfCompleted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePDF}
              disabled={generating}
            >
              <FileText className="h-4 w-4 mr-1" />
              {generating ? 'Generating...' : 'Generate PDF'}
            </Button>
          )}
        </div>

        {phfPdfUrl && (
          <div className="border rounded-lg p-4 bg-green-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <div>
                  <div className="font-medium text-sm">Generated PHF (UNICC Format)</div>
                  <div className="text-xs text-muted-foreground">
                    Official UNICC Sel-A XV v1.5 format
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(phfPdfUrl, 'PHF_Generated.pdf')}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        )}

        {candidatePhfUrl && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium text-sm">Candidate Uploaded PHF</div>
                  <div className="text-xs text-muted-foreground">
                    Original document provided by candidate
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(candidatePhfUrl, 'PHF_Candidate.pdf')}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        )}

        {!phfCompleted && (
          <div className="text-center py-4 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Complete the PHF form to generate PDF documents</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};