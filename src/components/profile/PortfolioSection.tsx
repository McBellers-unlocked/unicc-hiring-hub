import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Download, Trash2, Eye, FolderOpen } from "lucide-react";

interface PortfolioFile {
  id: string;
  name: string;
  type: string;
  category: string;
  size: number;
  url: string;
  uploadedAt: string;
}

interface PortfolioSectionProps {
  portfolioFiles: PortfolioFile[];
  email: string;
  onChange: (files: PortfolioFile[]) => void;
}

const FILE_CATEGORIES = [
  { value: 'cv', label: 'CV/Resume', icon: FileText },
  { value: 'certificate', label: 'Certificates', icon: FileText },
  { value: 'portfolio', label: 'Portfolio Work', icon: FolderOpen },
  { value: 'transcript', label: 'Transcripts', icon: FileText },
  { value: 'reference', label: 'References', icon: FileText },
  { value: 'other', label: 'Other Documents', icon: FileText },
];

const FILE_TYPE_COLORS = {
  'application/pdf': 'destructive',
  'application/msword': 'secondary',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'secondary',
  'image/jpeg': 'default',
  'image/png': 'default',
  'image/webp': 'default',
  'default': 'outline'
} as const;

export default function PortfolioSection({ portfolioFiles, email, onChange }: PortfolioSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('cv');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('image')) return '🖼️';
    if (type.includes('spreadsheet') || type.includes('excel')) return '📊';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📽️';
    return '📎';
  };

  const uploadFiles = async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    const uploadedFiles: PortfolioFile[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];

        if (!allowedTypes.includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported file type`,
            variant: "destructive",
          });
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds the 10MB limit`,
            variant: "destructive",
          });
          continue;
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const fileName = `${email.replace('@', '_')}/portfolio/${selectedCategory}/${timestamp}_${file.name}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('application-files')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('application-files')
          .getPublicUrl(data.path);

        const portfolioFile: PortfolioFile = {
          id: `${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          category: selectedCategory,
          size: file.size,
          url: publicUrlData.publicUrl,
          uploadedAt: new Date().toISOString(),
        };

        uploadedFiles.push(portfolioFile);
      }

      // Update the portfolio files array
      onChange([...portfolioFiles, ...uploadedFiles]);

      toast({
        title: "Success",
        description: `${uploadedFiles.length} file(s) uploaded successfully`,
      });

    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileToDelete: PortfolioFile) => {
    try {
      // Extract file path from URL
      const urlParts = fileToDelete.url.split('/');
      const pathIndex = urlParts.findIndex(part => part === 'application-files');
      if (pathIndex !== -1) {
        const filePath = urlParts.slice(pathIndex + 1).join('/');
        
        // Delete from Supabase Storage
        const { error } = await supabase.storage
          .from('application-files')
          .remove([filePath]);

        if (error) throw error;
      }

      // Remove from portfolio files array
      onChange(portfolioFiles.filter(file => file.id !== fileToDelete.id));

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      uploadFiles(files);
    }
  };

  const openFile = (url: string) => {
    window.open(url, '_blank');
  };

  const downloadFile = (file: PortfolioFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupedFiles = FILE_CATEGORIES.reduce((acc, category) => {
    acc[category.value] = portfolioFiles.filter(file => file.category === category.value);
    return acc;
  }, {} as Record<string, PortfolioFile[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Portfolio & Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 space-y-4">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h3 className="font-medium">Upload Documents</h3>
            <p className="text-sm text-muted-foreground">
              Support for PDF, Word, Excel, PowerPoint, and Images (max 10MB each)
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {FILE_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Choose Files"}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
        </div>

        {/* Files by Category */}
        <div className="space-y-6">
          {FILE_CATEGORIES.map((category) => {
            const files = groupedFiles[category.value] || [];
            if (files.length === 0) return null;

            return (
              <div key={category.value} className="space-y-3">
                <div className="flex items-center gap-2">
                  <category.icon className="h-4 w-4" />
                  <h4 className="font-medium">{category.label}</h4>
                  <Badge variant="secondary">{files.length}</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {files.map((file) => (
                    <div key={file.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="text-lg">{getFileTypeIcon(file.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate" title={file.name}>
                              {file.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span>{new Date(file.uploadedAt).toLocaleDateString('en-GB')}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openFile(file.url)}
                            title="Preview"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadFile(file)}
                            title="Download"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFile(file)}
                            className="text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {portfolioFiles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents uploaded yet</p>
            <p className="text-sm">Upload your CV, certificates, and portfolio work to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}