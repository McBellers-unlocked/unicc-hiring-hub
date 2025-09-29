import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface InlineDocumentViewerProps {
  fileUrl: string;
  fileName: string;
  fileType?: 'pdf' | 'docx' | 'doc' | 'txt';
  className?: string;
}

export const InlineDocumentViewer: React.FC<InlineDocumentViewerProps> = ({ 
  fileUrl, 
  fileName, 
  fileType, 
  className 
}) => {
  const [zoom, setZoom] = useState(100);
  
  const detectFileType = (): 'pdf' | 'docx' | 'doc' | 'txt' => {
    if (fileType) return fileType;
    const extension = fileName.toLowerCase().split('.').pop();
    if (extension === 'pdf') return 'pdf';
    if (extension === 'docx') return 'docx';
    if (extension === 'doc') return 'doc';
    return 'txt';
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewInNewTab = () => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const currentFileType = detectFileType();

  const renderPDFViewer = () => (
    <div className="border border-border rounded-lg overflow-hidden bg-gray-50">
      <div className="flex items-center justify-between p-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">{fileName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            disabled={zoom <= 50}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm">{zoom}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            disabled={zoom >= 200}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="relative" style={{ height: '600px' }}>
        <object
          data={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=${zoom}`}
          type="application/pdf"
          width="100%"
          height="100%"
          className="border-0"
        >
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">PDF Viewer Not Available</p>
            <p className="text-muted-foreground mb-4">
              Your browser doesn't support embedded PDF viewing.
            </p>
            <Button onClick={handleViewInNewTab} className="mb-2">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </object>
      </div>
    </div>
  );

  const renderGoogleDocsViewer = () => {
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 bg-white border-b">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">{fileName}</span>
          </div>
        </div>
        <div className="relative" style={{ height: '600px' }}>
          <iframe
            src={googleViewerUrl}
            width="100%"
            height="100%"
            className="border-0"
            title={fileName}
            onError={() => {
              // Fallback if Google Viewer fails
              console.log('Google Viewer failed, showing fallback');
            }}
          />
        </div>
      </div>
    );
  };

  const renderFallbackViewer = () => (
    <div className="text-center py-12 space-y-4">
      <div className="border border-border rounded-lg p-8 bg-card">
        <FileText className="w-20 h-20 mx-auto mb-6 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-3">View Document</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          This document type requires external viewing. Click below to open or download the file.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={handleViewInNewTab} className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </Button>
          <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span>{fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewInNewTab}
              className="flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="viewer" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="viewer">Document Viewer</TabsTrigger>
            <TabsTrigger value="info">File Information</TabsTrigger>
          </TabsList>
          
          <TabsContent value="viewer" className="mt-4">
            {currentFileType === 'pdf' && renderPDFViewer()}
            {(currentFileType === 'docx' || currentFileType === 'doc') && renderGoogleDocsViewer()}
            {currentFileType === 'txt' && renderFallbackViewer()}
          </TabsContent>
          
          <TabsContent value="info" className="mt-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">File Name</p>
                  <p className="text-sm">{fileName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">File Type</p>
                  <p className="text-sm uppercase">{currentFileType}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleViewInNewTab} className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </Button>
                <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download File
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};