import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ZoomIn, ZoomOut, Download, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PDFImage {
  pageNumber: number;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

interface PDFProcessingResult {
  success: boolean;
  fileName: string;
  totalPages: number;
  images: PDFImage[];
  metadata: {
    scale: number;
    format: string;
    processedAt: string;
  };
}

interface ImageBasedPDFViewerProps {
  fileUrl: string;
  fileName: string;
  className?: string;
}

export const ImageBasedPDFViewer: React.FC<ImageBasedPDFViewerProps> = ({
  fileUrl,
  fileName,
  className = ""
}) => {
  const [pdfData, setPdfData] = useState<PDFProcessingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  useEffect(() => {
    processPDF();
  }, [fileName, scale]);

  const processPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke('pdf-to-images', {
        body: {
          fileName,
          scale,
          format: 'webp'
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to process PDF');
      }

      setPdfData(data);
      setCurrentPage(1);
      setLoadedImages(new Set());

    } catch (err) {
      console.error('PDF processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleImageLoad = (pageNumber: number) => {
    setLoadedImages(prev => new Set([...prev, pageNumber]));
  };

  const handleImageError = (pageNumber: number) => {
    console.error(`Failed to load image for page ${pageNumber}`);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExternal = () => {
    window.open(fileUrl, '_blank');
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{fileName}</h3>
            <Badge variant="secondary">Processing PDF...</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{fileName}</h3>
            <Badge variant="destructive">Processing Failed</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenExternal}>
              <ExternalLink className="w-4 h-4 mr-1" />
              Open External
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={processPDF} variant="outline">
              Retry Processing
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pdfData) {
    return null;
  }

  const currentImage = pdfData.images.find(img => img.pageNumber === currentPage);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{fileName}</h3>
          <Badge variant="secondary">{pdfData.totalPages} pages</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={scale >= 3.0}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenExternal}>
            <ExternalLink className="w-4 h-4 mr-1" />
            Open
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Page Navigation */}
        <div className="flex items-center justify-between mb-4 p-2 bg-muted rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {pdfData.totalPages}
            </span>
            <span className="text-xs text-muted-foreground">
              (Zoom: {Math.round(scale * 100)}%)
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(pdfData.totalPages, prev + 1))}
            disabled={currentPage >= pdfData.totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* PDF Page Display */}
        <div className="border rounded-lg bg-white overflow-auto max-h-[600px]">
          {currentImage && (
            <div className="flex justify-center p-4">
              {!loadedImages.has(currentPage) && (
                <Skeleton 
                  className="rounded"
                  style={{ 
                    width: currentImage.width, 
                    height: currentImage.height 
                  }}
                />
              )}
              <img
                src={currentImage.imageUrl}
                alt={`Page ${currentPage} of ${fileName}`}
                className={`max-w-full h-auto shadow-sm ${
                  loadedImages.has(currentPage) ? 'block' : 'hidden'
                }`}
                onLoad={() => handleImageLoad(currentPage)}
                onError={() => handleImageError(currentPage)}
                style={{
                  width: currentImage.width,
                  height: currentImage.height
                }}
              />
            </div>
          )}
        </div>

        {/* Thumbnail Navigation */}
        <div className="mt-4 border-t pt-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pdfData.images.map((image) => (
              <button
                key={image.pageNumber}
                onClick={() => setCurrentPage(image.pageNumber)}
                className={`flex-shrink-0 border rounded p-1 transition-colors ${
                  currentPage === image.pageNumber 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted hover:border-muted-foreground'
                }`}
              >
                <img
                  src={image.thumbnailUrl}
                  alt={`Page ${image.pageNumber}`}
                  className="w-12 h-16 object-cover"
                />
                <div className="text-xs text-center mt-1 text-muted-foreground">
                  {image.pageNumber}
                </div>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};