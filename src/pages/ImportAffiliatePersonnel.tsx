import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, ArrowLeft, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportResult {
  success: boolean;
  summary: {
    total_processed: number;
    created: number;
    updated: number;
    errors: number;
  };
  errors?: string[];
}

export default function ImportAffiliatePersonnel() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please select a CSV file',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
      setResult(null);
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please drop a CSV file',
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
        description: 'Please select a CSV file to import',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const csvData = await file.text();

      const { data, error } = await supabase.functions.invoke('import-affiliate-personnel', {
        body: { csvData },
      });

      if (error) throw error;

      setResult(data as ImportResult);

      toast({
        title: 'Import Complete',
        description: `${data.summary.created} created, ${data.summary.updated} updated, ${data.summary.errors} errors`,
        variant: data.summary.errors > 0 ? 'destructive' : 'default',
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import affiliate personnel',
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
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Import Affiliate Personnel</CardTitle>
                <CardDescription>
                  Upload a CSV to import Individual Consultants (ICs), Interns, and UN Volunteers (UNVs)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">IC</Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Intern</Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">UNV</Badge>
            </div>

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
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-12 h-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {file ? file.name : 'Click to select CSV file'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or drag and drop
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
              {loading ? 'Importing...' : 'Import Affiliate Personnel'}
            </Button>

            {result && (
              <div className="space-y-4">
                <Alert variant={result.summary.errors > 0 ? 'destructive' : 'default'}>
                  <div className="flex items-center gap-2">
                    {result.summary.errors > 0 ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    <AlertDescription>
                      <strong>Import Complete:</strong> {result.summary.created} created, {result.summary.updated} updated, {result.summary.errors} errors
                    </AlertDescription>
                  </div>
                </Alert>

                {result.errors && result.errors.length > 0 && (
                  <div className="bg-destructive/10 p-4 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-2">Errors:</p>
                    <ul className="text-sm text-destructive/80 space-y-1 max-h-40 overflow-y-auto">
                      {result.errors.map((error, i) => (
                        <li key={i} className="font-mono text-xs">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.summary.created + result.summary.updated > 0 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/admin/affiliate-personnel')}
                  >
                    View Affiliate Personnel
                  </Button>
                )}
              </div>
            )}

            <div className="text-sm text-muted-foreground border-t pt-4">
              <p className="font-medium mb-2">Expected CSV columns:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span>• Email Address</span>
                <span>• First name / Last name</span>
                <span>• Worker type / App type short</span>
                <span>• Division / Unit</span>
                <span>• Job title</span>
                <span>• Line manager</span>
                <span>• Office location / DS short</span>
                <span>• Contract Start/End Date</span>
                <span>• Current Grade</span>
                <span>• Staff number</span>
                <span>• First Incumbency Date (original contract start)</span>
              </div>
              <p className="mt-3 text-xs">
                <strong>Note:</strong> Existing users (matched by email) will be updated. New users will be created with accounts.
                If "First Incumbency Date" is not provided for new records, it will default to the Contract Start Date.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
