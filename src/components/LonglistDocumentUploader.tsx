import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Check } from 'lucide-react';

interface LonglistDocumentUploaderProps {
  applicationId: string;
  currentFiles: {
    phf_document?: string;
    motivation_letter?: string;
  };
  onUploadComplete: () => void;
}

export const LonglistDocumentUploader = ({ 
  applicationId, 
  currentFiles, 
  onUploadComplete 
}: LonglistDocumentUploaderProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<{ phf: boolean; motivation: boolean }>({
    phf: false,
    motivation: false
  });
  const [selectedFiles, setSelectedFiles] = useState<{
    phf: File | null;
    motivation: File | null;
  }>({
    phf: null,
    motivation: null
  });

  const uploadDocument = async (file: File, documentType: 'phf_document' | 'motivation_letter') => {
    try {
      const uploadKey = documentType === 'phf_document' ? 'phf' : 'motivation';
      setUploading(prev => ({ ...prev, [uploadKey]: true }));

      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${applicationId}_${documentType}_${timestamp}.${fileExtension}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('application-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('application-files')
        .getPublicUrl(fileName);

      // Update the application with the file URL
      const updateData = {
        files: {
          ...currentFiles,
          [documentType]: urlData.publicUrl
        }
      };

      const { error: updateError } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', applicationId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `${documentType === 'phf_document' ? 'PHF' : 'Motivation letter'} uploaded successfully`,
      });

      // Clear the selected file
      setSelectedFiles(prev => ({ ...prev, [uploadKey]: null }));
      
      // Reset file input
      const fileInput = document.getElementById(`${uploadKey}-file-input`) as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      onUploadComplete();

    } catch (error) {
      console.error(`Error uploading ${documentType}:`, error);
      toast({
        title: "Error",
        description: `Failed to upload ${documentType === 'phf_document' ? 'PHF' : 'motivation letter'}`,
        variant: "destructive",
      });
    } finally {
      const uploadKey = documentType === 'phf_document' ? 'phf' : 'motivation';
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleFileSelect = (file: File | null, type: 'phf' | 'motivation') => {
    setSelectedFiles(prev => ({ ...prev, [type]: file }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload Documents for Longlisted Candidate</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PHF Document Upload */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="phf-file-input" className="text-sm font-medium">
              Personal History Form (PHF)
            </Label>
            {currentFiles.phf_document && (
              <div className="flex items-center space-x-1 text-green-600 text-sm">
                <Check className="w-4 h-4" />
                <span>Already uploaded</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Input
              id="phf-file-input"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null, 'phf')}
              disabled={uploading.phf}
              className="flex-1"
            />
            <Button
              onClick={() => selectedFiles.phf && uploadDocument(selectedFiles.phf, 'phf_document')}
              disabled={!selectedFiles.phf || uploading.phf}
              size="sm"
            >
              {uploading.phf ? 'Uploading...' : 'Upload PHF'}
            </Button>
          </div>
          
          {currentFiles.phf_document && (
            <p className="text-sm text-muted-foreground">
              Current PHF will be replaced if you upload a new one.
            </p>
          )}
        </div>

        {/* Motivation Letter Upload */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="motivation-file-input" className="text-sm font-medium">
              Motivation Letter
            </Label>
            {currentFiles.motivation_letter && (
              <div className="flex items-center space-x-1 text-green-600 text-sm">
                <Check className="w-4 h-4" />
                <span>Already uploaded</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Input
              id="motivation-file-input"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null, 'motivation')}
              disabled={uploading.motivation}
              className="flex-1"
            />
            <Button
              onClick={() => selectedFiles.motivation && uploadDocument(selectedFiles.motivation, 'motivation_letter')}
              disabled={!selectedFiles.motivation || uploading.motivation}
              size="sm"
            >
              {uploading.motivation ? 'Uploading...' : 'Upload Letter'}
            </Button>
          </div>
          
          {currentFiles.motivation_letter && (
            <p className="text-sm text-muted-foreground">
              Current motivation letter will be replaced if you upload a new one.
            </p>
          )}
        </div>

        <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
          <FileText className="w-4 h-4 inline mr-1" />
          <strong>Note:</strong> Upload PDF or Word documents (.pdf, .doc, .docx). 
          These will be viewable inline when hiring managers review the application.
        </div>
      </CardContent>
    </Card>
  );
};