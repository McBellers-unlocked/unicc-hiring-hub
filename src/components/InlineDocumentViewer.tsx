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
            variant="outline"
            size="sm"
            onClick={handleViewInNewTab}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Full Screen
          </Button>
        </div>
      </div>
      <div className="relative" style={{ height: '600px' }}>
        <iframe
          src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
          width="100%"
          height="100%"
          className="border-0"
          title={fileName}
          style={{ backgroundColor: '#f5f5f5' }}
        />
      </div>
    </div>
  );

  const renderOfficeDocViewer = () => {
    // Try Microsoft Office Online viewer first, then Google Docs viewer as fallback
    const microsoftViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 bg-white border-b">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">{fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewInNewTab}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Full Screen
            </Button>
          </div>
        </div>
        <div className="relative" style={{ height: '600px' }}>
          <Tabs defaultValue="microsoft" className="h-full">
            <TabsList className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm">
              <TabsTrigger value="microsoft" className="text-xs">Office Online</TabsTrigger>
              <TabsTrigger value="google" className="text-xs">Google Viewer</TabsTrigger>
            </TabsList>
            
            <TabsContent value="microsoft" className="h-full mt-0">
              <iframe
                src={microsoftViewerUrl}
                width="100%"
                height="100%"
                className="border-0"
                title={`${fileName} - Microsoft Office Online`}
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </TabsContent>
            
            <TabsContent value="google" className="h-full mt-0">
              <iframe
                src={googleViewerUrl}
                width="100%"
                height="100%"
                className="border-0"
                title={`${fileName} - Google Docs Viewer`}
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </TabsContent>
          </Tabs>
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
            {(currentFileType === 'docx' || currentFileType === 'doc') && renderOfficeDocViewer()}
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