import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink, ZoomIn, ZoomOut, Loader2, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImageBasedPDFViewer } from './ImageBasedPDFViewer';

// Configure PDF.js worker for fallback
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

console.log('ReliableDocumentViewer loaded with iframe-first approach');

interface IframePDFViewerProps {
  fileUrl: string;
  fileName: string;
  onLoadError: () => void;
}

const IframePDFViewer: React.FC<IframePDFViewerProps> = ({ fileUrl, fileName, onLoadError }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const getProxyUrl = (originalUrl: string) => {
    const urlParts = originalUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'application-files');
    if (bucketIndex === -1) return originalUrl;
    
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    return `https://cxpnvbphjpntrvvgjhli.supabase.co/functions/v1/file-proxy?path=${encodeURIComponent(filePath)}`;
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    console.log('Iframe PDF viewer failed, falling back to PDF.js');
    setHasError(true);
    setIsLoading(false);
    onLoadError();
  };

  if (hasError) {
    return null; // Let parent handle fallback
  }

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
      <iframe
        src={getProxyUrl(fileUrl)}
        title={fileName}
        className="w-full h-full border-0"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        style={{ minHeight: '600px' }}
      />
    </div>
  );
};

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
    console.log('PDF loaded successfully! Pages:', numPages);
    setNumPages(numPages);
    setIsLoading(false);
    onLoadSuccess({ numPages });
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF Document load error:', error);
    console.error('Current worker source:', pdfjs.GlobalWorkerOptions.workerSrc);
    
    // Log detailed error information
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
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
                  <p className="text-xs text-muted-foreground mt-1">PDF worker failed to load - try refreshing the page</p>
                  <p className="text-xs text-muted-foreground">You can still download the file below</p>
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
  const [viewerMode, setViewerMode] = useState<'enhanced' | 'iframe' | 'pdfjs' | 'fallback'>('enhanced');
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [browserSupportsIframe, setBrowserSupportsIframe] = useState(true);
  
  const detectFileType = (): 'pdf' | 'docx' | 'doc' | 'txt' => {
    if (fileType) return fileType;
    const extension = fileName.toLowerCase().split('.').pop();
    if (extension === 'pdf') return 'pdf';
    if (extension === 'docx') return 'docx';
    if (extension === 'doc') return 'doc';
    return 'txt';
  };

  const currentFileType = detectFileType();

  // Detect browser capabilities
  useEffect(() => {
    // Simple check for browser PDF support
    const userAgent = navigator.userAgent.toLowerCase();
    const isModernBrowser = !userAgent.includes('ie') && 
                           !userAgent.includes('edge/') && 
                           (userAgent.includes('chrome') || userAgent.includes('firefox') || userAgent.includes('safari'));
    setBrowserSupportsIframe(isModernBrowser);
    
    if (!isModernBrowser) {
      setViewerMode('pdfjs'); // Skip iframe for older browsers
    }
  }, []);

  const getProxyUrl = (originalUrl: string) => {
    const urlParts = originalUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'application-files');
    if (bucketIndex === -1) return originalUrl;
    
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    return `https://cxpnvbphjpntrvvgjhli.supabase.co/functions/v1/file-proxy?path=${encodeURIComponent(filePath)}`;
  };

  // Load PDF data for PDF.js fallback
  useEffect(() => {
    if (currentFileType === 'pdf' && viewerMode === 'pdfjs') {
      loadPdfData();
    }
  }, [fileUrl, currentFileType, viewerMode]);

  const loadPdfData = async () => {
    setLoading(true);
    console.log('Loading PDF data for PDF.js fallback');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      const proxyUrl = getProxyUrl(fileUrl);
      const response = await fetch(proxyUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load PDF: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('PDF ArrayBuffer loaded for PDF.js, size:', arrayBuffer.byteLength);
      setPdfData(arrayBuffer);
      
    } catch (error) {
      console.error('Failed to load PDF data for PDF.js:', error);
      setViewerMode('fallback');
    } finally {
      setLoading(false);
    }
  };

  const handleEnhancedError = () => {
    console.log('Enhanced PDF viewer failed, switching to iframe');
    setViewerMode('iframe');
  };

  const handleIframeError = () => {
    console.log('Iframe viewer failed, switching to PDF.js');
    setViewerMode('pdfjs');
  };

  const handlePDFJSError = () => {
    console.log('PDF.js viewer failed, switching to fallback mode');
    setViewerMode('fallback');
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
      const response = await fetch(proxyUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
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
    window.open(getProxyUrl(fileUrl), '_blank');
  };

  const renderPDFContent = () => {
    if (currentFileType !== 'pdf') return null;

    // Progressive enhancement: enhanced -> iframe -> PDF.js -> fallback
    switch (viewerMode) {
      case 'enhanced':
        return (
          <ImageBasedPDFViewer
            fileUrl={fileUrl}
            fileName={fileName}
            className="border-0"
          />
        );

      case 'iframe':
        return (
          <div className="relative bg-background" style={{ height: '600px' }}>
            <IframePDFViewer
              fileUrl={fileUrl}
              fileName={fileName}
              onLoadError={handleIframeError}
            />
          </div>
        );

      case 'pdfjs':
        return (
          <div className="relative bg-background" style={{ height: '600px' }}>
            <ReactPDFViewer
              pdfData={pdfData}
              fileName={fileName}
              scale={scale}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onLoadSuccess={(pdf) => {
                setNumPages(pdf.numPages);
              }}
              onLoadError={handlePDFJSError}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
          </div>
        );

      case 'fallback':
      default:
        return (
          <div className="relative bg-muted/20" style={{ height: '600px' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-24 mx-auto mb-6 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-12 h-12 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">PDF Viewer Unavailable</h3>
                <p className="text-muted-foreground mb-4">
                  This PDF cannot be displayed in your browser. Please download the file or open it in a new tab to view it.
                </p>
                <div className="flex justify-center gap-3">
                  <Button 
                    onClick={handleViewInNewTab} 
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
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
                <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                  <p className="mb-1"><strong>Troubleshooting:</strong></p>
                  <p>• Try using Chrome, Firefox, or Safari</p>
                  <p>• Check if your browser allows PDF viewing</p>
                  <p>• Disable browser extensions that might block PDFs</p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  const renderPDFViewer = () => {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 bg-muted border-b">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">{fileName}</span>
            <Badge variant="outline">PDF</Badge>
          </div>
          {viewerMode === 'pdfjs' && (
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
          )}
        </div>

        {/* Viewer Mode Debug Panel */}
        <div className="p-3 bg-muted/50 border-b">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Viewing Mode:</span>
              <Badge variant="outline" className="capitalize">
                {viewerMode === 'enhanced' && 'Enhanced Server-Side'}
                {viewerMode === 'iframe' && 'Browser Native'}
                {viewerMode === 'pdfjs' && 'PDF.js Renderer'}
                {viewerMode === 'fallback' && 'External/Download Only'}
              </Badge>
            </div>
            <div className="flex gap-1">
              <Button 
                variant={viewerMode === 'enhanced' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewerMode('enhanced')}
              >
                Enhanced
              </Button>
              <Button 
                variant={viewerMode === 'iframe' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewerMode('iframe')}
              >
                Browser
              </Button>
              <Button 
                variant={viewerMode === 'pdfjs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewerMode('pdfjs')}
              >
                PDF.js
              </Button>
            </div>
          </div>
        </div>
        
        {renderPDFContent()}
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