import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Eye, Search, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DocumentViewerProps {
  fileUrl: string;
  fileName: string;
  fileType?: 'pdf' | 'docx' | 'doc' | 'txt';
  className?: string;
}

interface ParsedDocument {
  success: boolean;
  content?: string;
  fileName?: string;
  error?: string;
}

export const DocumentViewer = ({ fileUrl, fileName, fileType, className }: DocumentViewerProps) => {
  const [parsedContent, setParsedContent] = useState<ParsedDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('text');
  const [searchTerm, setSearchTerm] = useState('');

  const detectFileType = (): 'pdf' | 'docx' | 'doc' | 'txt' => {
    if (fileType) return fileType;
    const extension = fileName.toLowerCase().split('.').pop();
    if (extension === 'pdf') return 'pdf';
    if (extension === 'docx') return 'docx';
    if (extension === 'doc') return 'doc';
    return 'txt';
  };

  const parseDocument = async () => {
    if (!fileUrl) return;
    
    setLoading(true);
    try {
      // Call the parse-phf-document edge function
      const { data, error } = await supabase.functions.invoke('parse-phf-document', {
        body: { fileName: fileName }
      });

      if (error) {
        setParsedContent({
          success: false,
          error: error.message || 'Failed to parse document'
        });
      } else {
        setParsedContent(data);
      }
    } catch (error) {
      console.error('Error parsing document:', error);
      setParsedContent({
        success: false,
        error: 'Failed to connect to document parser'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    parseDocument();
  }, [fileUrl, fileName]);

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  const getFilteredContent = () => {
    if (!parsedContent?.content) return '';
    if (!searchTerm) return parsedContent.content;
    return highlightSearchTerm(parsedContent.content, searchTerm);
  };

  const canShowPDF = () => {
    const type = detectFileType();
    return type === 'pdf' && fileUrl;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>{fileName}</span>
            <Badge variant="outline">{detectFileType().toUpperCase()}</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(fileUrl, '_blank')}
            className="flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Extracted Text</span>
            </TabsTrigger>
            <TabsTrigger 
              value="original" 
              disabled={!canShowPDF()}
              className="flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Original Document</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            {/* Search functionality */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search in document..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-input rounded-md w-full text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                >
                  Clear
                </Button>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : parsedContent?.success ? (
              <div className="border border-border rounded-lg p-6 bg-card">
                <div 
                  className="prose max-w-none text-sm leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: getFilteredContent() 
                  }}
                />
                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                  Character count: {parsedContent.content?.length.toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Unable to extract text</p>
                  <p className="text-sm text-muted-foreground">
                    {parsedContent?.error || 'Document parsing failed. You can still view the original document.'}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="original">
            {canShowPDF() ? (
              <div className="text-center py-8 space-y-4">
                <div className="border border-border rounded-lg p-8 bg-card">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">View Original Document</h3>
                  <p className="text-muted-foreground mb-4">
                    Click the button below to open the PDF in a new tab for full viewing experience.
                  </p>
                  <Button
                    onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
                    className="flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Open PDF in New Tab</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Original document preview not available for this file type.</p>
                <p className="text-sm">Use the download button to view the original document.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};