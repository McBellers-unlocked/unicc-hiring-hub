import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink, ZoomIn, ZoomOut, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Set up PDF.js worker using fixed version for reliability
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js';

interface ReactPDFViewerProps {
  pdfData: ArrayBuffer | null;
  fileName: string;
  scale: number;
  onLoadSuccess: (pdf: any) => void;
  onLoadError: (error: Error) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const ReactPDFViewer: React.FC<ReactPDFViewerProps> = ({ 
  pdfData, 
  fileName, 
  scale, 
  onLoadSuccess, 
  onLoadError,
  currentPage,
  onPageChange
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  if (!pdfData) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    onLoadSuccess({ numPages });
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setIsLoading(false);
    onLoadError(error);
  };

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading PDF...
          </div>
        </div>
      )}
      
      <div className="flex flex-col h-full">
        {/* Page Navigation */}
        {numPages > 1 && (
          <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {numPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* PDF Document */}
        <div className="flex-1 overflow-auto bg-gray-100 flex justify-center p-4">
          <Document
            file={pdfData}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div />} // We handle loading ourselves
            error={
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Unable to display PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">Try downloading the file</p>
                </div>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              loading={<div />} // We handle loading ourselves
              error={
                <div className="flex items-center justify-center p-8">
                  <p className="text-sm text-muted-foreground">Failed to load page {currentPage}</p>
                </div>
              }
              className="shadow-lg"
            />
          </Document>
        </div>
      </div>
    </div>
  );
};

interface ReliableDocumentViewerProps {
  fileUrl: string;
  fileName: string;
  fileType?: 'pdf' | 'docx' | 'doc' | 'txt';
  className?: string;
}

export const ReliableDocumentViewer: React.FC<ReliableDocumentViewerProps> = ({ 
  fileUrl, 
  fileName, 
  fileType, 
  className 
}) => {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [hasError, setHasError] = useState(false);
  
  const detectFileType = (): 'pdf' | 'docx' | 'doc' | 'txt' => {
    if (fileType) return fileType;
    const extension = fileName.toLowerCase().split('.').pop();
    if (extension === 'pdf') return 'pdf';
    if (extension === 'docx') return 'docx';
    if (extension === 'doc') return 'doc';
    return 'txt';
  };

  const currentFileType = detectFileType();

  const getProxyUrl = (originalUrl: string) => {
    // Extract the file path from the Supabase storage URL
    const urlParts = originalUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'application-files');
    if (bucketIndex === -1) return originalUrl;
    
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    return `https://cxpnvbphjpntrvvgjhli.supabase.co/functions/v1/file-proxy?path=${encodeURIComponent(filePath)}`;
  };

  // Load PDF data when component mounts or fileUrl changes
  useEffect(() => {
    if (currentFileType === 'pdf') {
      loadPdfData();
    }
  }, [fileUrl, currentFileType]);

  const loadPdfData = async () => {
    setLoading(true);
    setHasError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      const proxyUrl = getProxyUrl(fileUrl);
      console.log('Loading PDF from:', proxyUrl);
      
      const response = await fetch(proxyUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to load PDF:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`Failed to load PDF: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('PDF ArrayBuffer size:', arrayBuffer.byteLength);
      setPdfData(arrayBuffer);
      
    } catch (error) {
      console.error('Failed to load PDF data:', error);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      const proxyUrl = getProxyUrl(fileUrl);
      console.log('Downloading file from:', proxyUrl);
      
      const response = await fetch(proxyUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error('Download failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInNewTab = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      const proxyUrl = getProxyUrl(fileUrl);
      console.log('Opening file from:', proxyUrl);
      
      // Create a form to POST the authorization data for viewing
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = proxyUrl;
      form.target = '_blank';
      
      const tokenInput = document.createElement('input');
      tokenInput.type = 'hidden';
      tokenInput.name = 'token';
      tokenInput.value = session.access_token;
      form.appendChild(tokenInput);
      
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    } catch (error) {
      console.error('View failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPDFViewer = () => {
    if (hasError) {
      return (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-muted border-b">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">{fileName}</span>
              <Badge variant="outline">PDF</Badge>
            </div>
          </div>
          <div className="relative bg-background" style={{ height: '600px' }}>
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Unable to display PDF</p>
                <p className="text-xs text-muted-foreground mt-1">Try downloading the file</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 bg-muted border-b">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">{fileName}</span>
            <Badge variant="outline">PDF</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScale(Math.min(2.0, scale + 0.1))}
              disabled={scale >= 2.0}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="relative bg-background" style={{ height: '600px' }}>
          <ReactPDFViewer
            pdfData={pdfData}
            fileName={fileName}
            scale={scale}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onLoadSuccess={(pdf) => {
              setNumPages(pdf.numPages);
              setLoading(false);
            }}
            onLoadError={(error) => {
              console.error('React-PDF error:', error);
              setHasError(true);
              setLoading(false);
            }}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDocumentViewer = () => (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">{fileName}</span>
          <Badge variant="outline">{currentFileType.toUpperCase()}</Badge>
        </div>
      </div>
      
      <div className="relative bg-muted/20" style={{ height: '600px' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-24 mx-auto mb-6 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">View Document</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              This document type requires external viewing. Click below to open or download the file.
            </p>
            <div className="flex justify-center gap-3">
              <Button 
                onClick={handleViewInNewTab} 
                className="flex items-center gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Open in New Tab
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownload} 
                className="flex items-center gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span className="truncate">{fileName}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewInNewTab}
              className="flex items-center gap-1"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Open
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-1"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentFileType === 'pdf' ? renderPDFViewer() : renderDocumentViewer()}
      </CardContent>
    </Card>
  );
};