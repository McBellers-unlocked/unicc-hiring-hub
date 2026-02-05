import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportAppointmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ImportResult {
  success: boolean;
  summary: {
    total_processed: number;
    created: number;
    linked: number;
    warnings: number;
    errors: number;
  };
  warnings: string[];
  errors: string[];
}

export function ImportAppointmentsDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportAppointmentsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    // Read and preview first few rows
    const text = await selectedFile.text();
    const lines = text.split('\n').slice(0, 6);
    const parsed = lines.map(line => parseCSVLine(line).slice(0, 8));
    setPreview(parsed);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv')) {
      setFile(droppedFile);
      setResult(null);
      
      const text = await droppedFile.text();
      const lines = text.split('\n').slice(0, 6);
      const parsed = lines.map(line => parseCSVLine(line).slice(0, 8));
      setPreview(parsed);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    try {
      const csvData = await file.text();
      
      const { data, error } = await supabase.functions.invoke('import-appointments', {
        body: { csvData },
      });

      if (error) throw error;

      setResult(data);
      
      if (data.success && data.summary.created > 0) {
        toast.success(`Imported ${data.summary.created} appointments`);
        onImportComplete();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      toast.error(errorMessage);
      setResult({
        success: false,
        summary: { total_processed: 0, created: 0, linked: 0, warnings: 0, errors: 1 },
        warnings: [],
        errors: [errorMessage],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Appointments from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import appointment records
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          {!result && (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop a CSV file, or click to select
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Preview Table */}
          {preview.length > 0 && !result && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-sm font-medium">
                Preview (first 5 rows)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className={i === 0 ? 'bg-muted/50 font-medium' : ''}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 border-t truncate max-w-[120px]">
                            {cell || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Importing appointments...</p>
              <Progress value={undefined} className="animate-pulse" />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 text-center">
                  <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-600">{result.summary.created}</p>
                  <p className="text-sm text-muted-foreground">Created</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-center">
                  <Link className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-600">{result.summary.linked}</p>
                  <p className="text-sm text-muted-foreground">Linked to Users</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4 text-center">
                  <AlertCircle className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-amber-600">
                    {result.summary.warnings + result.summary.errors}
                  </p>
                  <p className="text-sm text-muted-foreground">Issues</p>
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Warnings:
                  </p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    Errors:
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    {result.errors.map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button 
                onClick={handleImport} 
                disabled={!file || isImporting}
              >
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simple CSV line parser
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
