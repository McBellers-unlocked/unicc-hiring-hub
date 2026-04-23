import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, ArrowLeft, FileSpreadsheet, X } from 'lucide-react';

const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const isValidFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.type) || file.type === '';
  return extOk && mimeOk;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

interface DropZoneProps {
  title: string;
  subtitle: string;
  inputId: string;
}

function DropZone({ title, subtitle, inputId }: DropZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (selected: File | undefined | null) => {
    if (!selected) return;
    if (!isValidFile(selected)) {
      toast({
        title: 'Invalid file type',
        description: 'Only CSV, XLS, or XLSX files are allowed.',
        variant: 'destructive',
      });
      return;
    }
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    // Placeholder: backend wiring to be added later
    await new Promise((r) => setTimeout(r, 600));
    setUploading(false);
    toast({
      title: 'File ready',
      description: `${file.name} accepted. Backend ingestion will be wired up next.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/40'
          }`}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drag & drop your file here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Accepted formats: .csv, .xls, .xlsx
          </p>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        {file && (
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileSpreadsheet className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ImportUserbase() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto py-8 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Import Userbase</CardTitle>
            <CardDescription>
              Upload GSM and Samsaran extracts to refresh the user base data.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DropZone
            title="Import GSM Extract"
            subtitle="Upload a CSV or Excel file containing GSM Assignment details data"
            inputId="gsm-extract-input"
          />
          <DropZone
            title="Import Samsaran Extract"
            subtitle="Upload a Samsaran worker extract"
            inputId="samsaran-extract-input"
          />
        </div>
      </div>
    </Layout>
  );
}
