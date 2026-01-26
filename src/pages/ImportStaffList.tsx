import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, ArrowLeft, Users, UserCog, Network, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportResult {
  staffCreated: number;
  staffUpdated: number;
  affiliatesCreated: number;
  affiliatesUpdated: number;
  errors: number;
  errorDetails: string[];
  warnings: number;
  warningDetails: string[];
  rowsWithWarnings: number;
  affiliateBreakdown: {
    IC: { created: number; updated: number };
    Intern: { created: number; updated: number };
    UNV: { created: number; updated: number };
  };
}

export default function ImportStaffList() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const parseFileToCSV = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      return await file.text();
    }
    
    // Handle Excel files
    if (extension === 'xlsx' || extension === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_csv(firstSheet);
    }
    
    throw new Error('Unsupported file format. Please use CSV, XLSX, or XLS.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      const validExtensions = ['csv', 'xlsx', 'xls'];
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (validTypes.includes(selectedFile.type) || (extension && validExtensions.includes(extension))) {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please select a CSV or Excel file',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    const validExtensions = ['csv', 'xlsx', 'xls'];
    const extension = droppedFile.name.split('.').pop()?.toLowerCase();
    
    if (extension && validExtensions.includes(extension)) {
      setFile(droppedFile);
      setResult(null);
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please drop a CSV or Excel file',
        variant: 'destructive',
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to import',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const csvData = await parseFileToCSV(file);

      const { data, error } = await supabase.functions.invoke('import-staff-list', {
        body: { csvData },
      });

      if (error) throw error;

      setResult(data);
      
      const totalCreated = data.staffCreated + data.affiliatesCreated;
      const totalUpdated = data.staffUpdated + data.affiliatesUpdated;
      
      const hasWarnings = data.warnings > 0;
      const hasErrors = data.errors > 0;
      
      toast({
        title: 'Import Complete',
        description: `${totalCreated} created, ${totalUpdated} updated${hasWarnings ? `, ${data.rowsWithWarnings} with warnings` : ''}${hasErrors ? `, ${data.errors} errors` : ''}`,
        variant: hasErrors ? 'destructive' : hasWarnings ? 'default' : 'default',
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import staff list',
        variant: 'destructive',
      });
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
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Staff List
            </CardTitle>
            <CardDescription>
              Upload a CSV or Excel file containing both Staff and Affiliate personnel.
              The system will automatically detect the personnel type and affiliate type for each record.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personnel Type Info */}
            <div className="flex flex-wrap gap-2 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">Staff</Badge>
                <span className="text-sm text-muted-foreground">Regular staff members</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">IC</Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-700">Intern</Badge>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">UNV</Badge>
                <span className="text-sm text-muted-foreground">Affiliate personnel types</span>
              </div>
            </div>

            {/* Column Info */}
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">Expected columns (flexible matching):</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <span>• Email / Email Address</span>
                <span>• First Name, Last Name</span>
                <span>• Personnel Type</span>
                <span>• Worker Type / App Type Short</span>
                <span>• Division, Unit</span>
                <span>• Job Title</span>
                <span>• Line Manager</span>
                <span>• Duty Station</span>
                <span>• Nationality</span>
                <span>• Current Grade</span>
                <span>• Contract Start/End Date</span>
                <span>• Entry On Duty Date</span>
              </div>
            </div>

            {/* File Upload Area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-12 h-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {file ? file.name : 'Click to select file'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or drag and drop (CSV, XLSX, XLS)
                  </p>
                </div>
              </label>
            </div>

            {file && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium">Selected file:</p>
                <p className="text-sm text-muted-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Size: {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!file || loading}
              className="w-full"
            >
              {loading ? 'Importing...' : 'Import Staff List'}
            </Button>

            {/* Import Results */}
            {result && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Staff Results */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Staff
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span className="font-medium text-green-600">{result.staffCreated}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Updated:</span>
                          <span className="font-medium text-blue-600">{result.staffUpdated}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Affiliate Results */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserCog className="w-4 h-4" />
                        Affiliates
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span className="font-medium text-green-600">{result.affiliatesCreated}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Updated:</span>
                          <span className="font-medium text-blue-600">{result.affiliatesUpdated}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Affiliate Breakdown */}
                {result.affiliatesCreated + result.affiliatesUpdated > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Affiliate Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <Badge className="bg-purple-100 text-purple-700 mb-1">IC</Badge>
                          <p className="text-xs text-muted-foreground">
                            {result.affiliateBreakdown.IC.created} created, {result.affiliateBreakdown.IC.updated} updated
                          </p>
                        </div>
                        <div>
                          <Badge className="bg-green-100 text-green-700 mb-1">Intern</Badge>
                          <p className="text-xs text-muted-foreground">
                            {result.affiliateBreakdown.Intern.created} created, {result.affiliateBreakdown.Intern.updated} updated
                          </p>
                        </div>
                        <div>
                          <Badge className="bg-orange-100 text-orange-700 mb-1">UNV</Badge>
                          <p className="text-xs text-muted-foreground">
                            {result.affiliateBreakdown.UNV.created} created, {result.affiliateBreakdown.UNV.updated} updated
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Warnings */}
                {result.warnings > 0 && (
                  <Card className="border-yellow-500 bg-yellow-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
                        <AlertTriangle className="w-4 h-4" />
                        Warnings ({result.warnings}) - {result.rowsWithWarnings} rows affected
                      </CardTitle>
                      <CardDescription className="text-yellow-600">
                        These records were imported but have incomplete data
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-yellow-700">
                        {result.warningDetails.slice(0, 30).map((warning, idx) => (
                          <p key={idx}>• {warning}</p>
                        ))}
                        {result.warningDetails.length > 30 && (
                          <p className="font-medium">... and {result.warningDetails.length - 30} more warnings</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Errors */}
                {result.errors > 0 && (
                  <Card className="border-destructive">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-destructive">
                        <XCircle className="w-4 h-4" />
                        Errors ({result.errors}) - rows skipped
                      </CardTitle>
                      <CardDescription className="text-destructive/70">
                        These rows could not be imported due to missing or invalid email
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-muted-foreground">
                        {result.errorDetails.slice(0, 20).map((error, idx) => (
                          <p key={idx}>• {error}</p>
                        ))}
                        {result.errorDetails.length > 20 && (
                          <p className="font-medium">... and {result.errorDetails.length - 20} more errors</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Success Actions */}
                {result.errors === 0 && (result.staffCreated + result.staffUpdated + result.affiliatesCreated + result.affiliatesUpdated > 0) && (
                  <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">
                      Import completed successfully!
                      {result.warnings > 0 && ` (${result.rowsWithWarnings} rows have incomplete data)`}
                    </span>
                  </div>
                )}

                {/* Quick Links */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/admin/affiliate-personnel">
                      <UserCog className="w-4 h-4 mr-2" />
                      View Affiliate Personnel
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/admin/org-chart">
                      <Network className="w-4 h-4 mr-2" />
                      View Organization Chart
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
