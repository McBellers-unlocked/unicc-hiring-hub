import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PDFIframeProps {
  blobUrl: string;
  fileName: string;
  scale: number;
  onLoad: () => void;
}

const PDFIframe: React.FC<PDFIframeProps> = ({ blobUrl, fileName, scale, onLoad }) => {
  if (!blobUrl) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <iframe
      src={blobUrl}
      className="w-full h-full border-0"
      title={fileName}
      style={{ 
        transform: `scale(${scale})`, 
        transformOrigin: 'top left',
        width: `${100 / scale}%`,
        height: `${100 / scale}%`
      }}
      onLoad={onLoad}
      onError={() => {
        console.error('PDF iframe failed to load');
      }}
    />
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
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  
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

  // Load PDF blob when component mounts or fileUrl changes
  useEffect(() => {
    if (currentFileType === 'pdf') {
      loadPdfBlob();
    }
  }, [fileUrl, currentFileType]);

  const loadPdfBlob = async () => {
    setLoading(true);
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

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      setPdfBlobUrl(blobUrl);
    } catch (error) {
      console.error('Failed to load PDF blob:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

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
          <PDFIframe 
            blobUrl={pdfBlobUrl}
            fileName={fileName}
            scale={scale}
            onLoad={() => setLoading(false)}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
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