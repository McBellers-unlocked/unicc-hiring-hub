import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle2, AlertCircle, Database, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';

export default function ImportWHED() {
  const [content, setContent] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{
    count: number;
    universities: any[];
    countries: string[];
  } | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    inserted: number;
    total: number;
    countries: number;
    errors?: string[];
  } | null>(null);

  const handleParse = async () => {
    if (!content.trim()) {
      toast.error('Please paste the WHED PDF content first');
      return;
    }

    setParsing(true);
    setPreview(null);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('import-whed-universities', {
        body: { action: 'parse', content }
      });

      if (error) throw error;

      if (data.success) {
        setPreview(data);
        toast.success(`Found ${data.count} universities from ${data.countries.length} countries`);
      } else {
        toast.error(data.error || 'Failed to parse content');
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      toast.error(error.message || 'Failed to parse content');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!content.trim()) {
      toast.error('Please paste the WHED PDF content first');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('import-whed-universities', {
        body: { action: 'import', content }
      });

      if (error) throw error;

      if (data.success) {
        setResult(data);
        toast.success(`Successfully imported ${data.inserted} universities`);
      } else {
        toast.error(data.error || 'Failed to import');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import');
    } finally {
      setImporting(false);
    }
  };

  const loadSampleData = async () => {
    try {
      // Fetch the PDF content from the parsed document
      const response = await fetch('/data/INTERNATIONAL_HANDBOOK.pdf');
      if (!response.ok) {
        toast.error('Sample data file not found. Please paste the PDF content manually.');
        return;
      }
      toast.info('PDF file found. Please use a PDF parsing tool to extract the text and paste it here.');
    } catch (error) {
      toast.error('Unable to load sample data');
    }
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Import WHED Universities</h1>
          <p className="text-muted-foreground">
            Import universities from the World Higher Education Database (WHED) for automatic education verification.
          </p>
        </div>

        {/* Instructions */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p><strong>How to import:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Open the WHED PDF (INTERNATIONAL_HANDBOOK.pdf)</li>
              <li>Select all content and copy it</li>
              <li>Paste it in the text area below</li>
              <li>Click "Parse Content" to preview the extracted universities</li>
              <li>If the preview looks good, click "Import to Database"</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Paste WHED Content
            </CardTitle>
            <CardDescription>
              Paste the full text content from the WHED PDF document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste the WHED PDF content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="font-mono text-xs"
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {content.length > 0 ? `${content.length.toLocaleString()} characters` : 'No content'}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setContent('')}
                  disabled={!content || parsing || importing}
                >
                  Clear
                </Button>
                <Button 
                  onClick={handleParse}
                  disabled={!content.trim() || parsing || importing}
                >
                  {parsing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Parse Content
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {preview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Parse Preview
              </CardTitle>
              <CardDescription>
                Found {preview.count.toLocaleString()} universities from {preview.countries.length} countries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Countries */}
              <div>
                <p className="text-sm font-medium mb-2">Countries ({preview.countries.length}):</p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {preview.countries.map(country => (
                    <Badge key={country} variant="outline" className="text-xs">
                      {country}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Sample universities */}
              <div>
                <p className="text-sm font-medium mb-2">Sample universities (first 20):</p>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {preview.universities.slice(0, 20).map((uni, i) => (
                    <div key={i} className="text-sm p-2 bg-muted/50 rounded-md">
                      <span className="font-medium">{uni.name}</span>
                      <span className="text-muted-foreground"> — {uni.country}</span>
                      {uni.alternative_names.length > 0 && (
                        <p className="text-xs text-muted-foreground italic">
                          Also: {uni.alternative_names.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleImport}
                disabled={importing}
                className="w-full"
              >
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import {preview.count.toLocaleString()} Universities to Database
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Alert className={result.success ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500'}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              {result.success ? (
                <div className="space-y-2">
                  <p className="font-medium text-green-600">Import completed successfully!</p>
                  <ul className="text-sm space-y-1">
                    <li>• Inserted: {result.inserted.toLocaleString()} universities</li>
                    <li>• Countries: {result.countries}</li>
                  </ul>
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-amber-600 font-medium">Some errors occurred:</p>
                      <ul className="text-xs text-amber-600">
                        {result.errors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p>Import failed. Please check the logs and try again.</p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Layout>
  );
}
