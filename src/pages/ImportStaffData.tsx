import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';

interface ImportResult {
  success: boolean;
  summary: {
    total_processed: number;
    updated: number;
    not_found: number;
    errors: number;
  };
  not_found_emails?: string[];
  errors?: string[];
}

export default function ImportStaffData() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast.error("Please select an Excel (.xlsx, .xls) or CSV file");
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        setFile(droppedFile);
        setResult(null);
      } else {
        toast.error("Please select an Excel (.xlsx, .xls) or CSV file");
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      let csvData: string;

      if (file.name.endsWith('.csv')) {
        csvData = await file.text();
      } else {
        // Parse Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        csvData = XLSX.utils.sheet_to_csv(firstSheet);
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to import data");
        return;
      }

      const { data, error } = await supabase.functions.invoke('import-staff-masterdb', {
        body: { csvData },
      });

      if (error) {
        console.error('Import error:', error);
        toast.error(`Import failed: ${error.message}`);
        return;
      }

      setResult(data as ImportResult);
      
      if (data.success) {
        toast.success(`Successfully updated ${data.summary.updated} staff members`);
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import staff data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              Import Staff MasterDB Data
            </CardTitle>
            <CardDescription>
              Upload the MasterDB Excel file to update staff job titles and entry on duty dates.
              The system will match records by email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your MasterDB file here, or click to browse
              </p>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="max-w-xs mx-auto"
              />
            </div>

            {file && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-medium">Selected file: {file.name}</p>
                <p className="text-sm text-muted-foreground">
                  Size: {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}

            <Button 
              onClick={handleImport} 
              disabled={!file || loading}
              className="w-full"
            >
              {loading ? "Importing..." : "Import Staff Data"}
            </Button>

            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    {result.success ? 'Import Complete' : 'Import Failed'}
                  </span>
                </div>
                
                {result.summary && (
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>Total Processed: <strong>{result.summary.total_processed}</strong></div>
                    <div>Updated: <strong className="text-green-600">{result.summary.updated}</strong></div>
                    <div>Not Found: <strong className="text-amber-600">{result.summary.not_found}</strong></div>
                    <div>Errors: <strong className="text-red-600">{result.summary.errors}</strong></div>
                  </div>
                )}

                {result.not_found_emails && result.not_found_emails.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      Show emails not found ({result.not_found_emails.length} shown)
                    </summary>
                    <div className="mt-2 text-xs bg-background/50 p-2 rounded max-h-32 overflow-y-auto">
                      {result.not_found_emails.map((email, i) => (
                        <div key={i} className="text-muted-foreground">{email}</div>
                      ))}
                    </div>
                  </details>
                )}

                {result.errors && result.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-red-600">
                      Show errors ({result.errors.length})
                    </summary>
                    <div className="mt-2 text-xs bg-background/50 p-2 rounded max-h-32 overflow-y-auto">
                      {result.errors.map((err, i) => (
                        <div key={i} className="text-red-600">{err}</div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            <div className="bg-muted/30 p-4 rounded-lg text-sm">
              <h4 className="font-medium mb-2">Expected Columns:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Email Address</strong> (required) - Used to match staff members</li>
                <li><strong>Job title</strong> - Will update job_title field</li>
                <li><strong>Entry On Duty Date Who</strong> - Will update entry_on_duty_date field</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
