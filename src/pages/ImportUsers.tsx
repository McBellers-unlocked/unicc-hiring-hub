import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, ArrowLeft } from 'lucide-react';

export default function ImportUsers() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
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

    try {
      // Read the file as text
      const csvData = await file.text();

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('import-users-csv', {
        body: { csvData },
      });

      if (error) throw error;

      toast({
        title: 'Import Successful',
        description: `${data.inserted} users inserted, ${data.updated} updated, ${data.errors} errors`,
      });

      setFile(null);
      if (data.errors === 0) {
        setTimeout(() => navigate(-1), 2000);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import users',
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
            <CardTitle>Import Users from CSV</CardTitle>
            <CardDescription>
              Upload a CSV file to bulk import users into the system. The CSV should have the following columns:
              First name, Last name, Email Address, Nationality, Gender, Worker type, Office location, Division, Unit, Line manager
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
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
              {loading ? 'Importing...' : 'Import Users'}
            </Button>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Notes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Existing users (matched by email) will be updated</li>
                <li>New users will be created with "Candidate" role</li>
                <li>Invalid rows will be skipped</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
