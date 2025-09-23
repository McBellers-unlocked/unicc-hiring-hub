import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, CheckCircle, XCircle, Users, AlertTriangle } from 'lucide-react';
import { processPHFDocument, createCandidateFromPHF, type PHFExtractedData, type ImportResult } from '@/lib/phfImportUtils';

interface Job {
  id: string;
  title: string;
  notice_no: string;
}

interface ImportStatus {
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: ImportResult;
  error?: string;
}

export default function PHFImport() {
  const { userRoles } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatuses, setImportStatuses] = useState<ImportStatus[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);

  const isAdmin = userRoles.includes('Admin');
  const isHR = userRoles.includes('HR Assistant');

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, notice_no')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJobs(data || []);
      
      // Auto-select the Associate Policy Officer job if it exists
      const targetJob = data?.find(job => 
        job.title.includes('Associate Policy') && job.notice_no === 'ICC/25/VAL/4'
      );
      if (targetJob) {
        setSelectedJobId(targetJob.id);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch jobs",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isAdmin || isHR) {
      fetchJobs();
    }
  }, [isAdmin, isHR]);

  // Redirect if not authorized
  if (!isAdmin && !isHR) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const supportedFiles = selectedFiles.filter(file => 
      file.name.endsWith('.docx') || file.name.endsWith('.doc') || file.name.endsWith('.pdf')
    );
    
    if (supportedFiles.length !== selectedFiles.length) {
      toast({
        title: "Invalid Files",
        description: "Only Word documents (.doc, .docx) and PDF files (.pdf) are supported",
        variant: "destructive",
      });
    }
    
    setFiles(supportedFiles);
    setImportStatuses(supportedFiles.map(file => ({
      fileName: file.name,
      status: 'pending'
    })));
  };

  const processAllFiles = async () => {
    if (!selectedJobId) {
      toast({
        title: "Job Required",
        description: "Please select a job to import applications for",
        variant: "destructive",
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: "Files Required",
        description: "Please select PHF documents to import",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const processedResults: ImportResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Update status to processing
      setImportStatuses(prev => prev.map((status, index) => 
        index === i ? { ...status, status: 'processing' } : status
      ));

      try {
        const result = await processPHFDocument(file, selectedJobId);
        processedResults.push(result);
        
        // Update status to completed
        setImportStatuses(prev => prev.map((status, index) => 
          index === i ? { ...status, status: 'completed', result } : status
        ));
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Update status to error
        setImportStatuses(prev => prev.map((status, index) => 
          index === i ? { ...status, status: 'error', error: errorMessage } : status
        ));
      }
    }

    setResults(processedResults);
    setIsProcessing(false);

    const successCount = processedResults.filter(r => r.success).length;
    const totalCount = files.length;

    toast({
      title: "Import Complete",
      description: `Successfully imported ${successCount} of ${totalCount} PHF documents`,
      variant: successCount === totalCount ? "default" : "destructive",
    });
  };

  const resetImport = () => {
    setFiles([]);
    setImportStatuses([]);
    setResults([]);
  };

  const completedCount = importStatuses.filter(s => s.status === 'completed').length;
  const errorCount = importStatuses.filter(s => s.status === 'error').length;
  const progressPercentage = files.length > 0 ? (completedCount + errorCount) / files.length * 100 : 0;

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">PHF Import</h1>
          <Badge variant="outline" className="text-sm">
            Bulk Import System
          </Badge>
        </div>

        {/* Job Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Target Job Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Job for Applications
                </label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a job..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} - {job.notice_no}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedJobId && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All imported PHF documents will create applications for the selected job.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              PHF Document Upload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  multiple
                  accept=".doc,.docx,.pdf"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90"
                  disabled={isProcessing}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Select Word documents (.doc, .docx) or PDF files (.pdf) containing PHF data. You can select multiple files.
                </p>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Selected Files: {files.length}
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        {file.name}
                        <Badge variant="outline" className="text-xs">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={processAllFiles} 
                  disabled={!selectedJobId || files.length === 0 || isProcessing}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import All PHFs
                    </>
                  )}
                </Button>
                
                {(files.length > 0 || results.length > 0) && (
                  <Button variant="outline" onClick={resetImport} disabled={isProcessing}>
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        {isProcessing && (
          <Card>
            <CardHeader>
              <CardTitle>Import Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={progressPercentage} className="w-full" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    Processed: {completedCount + errorCount} of {files.length}
                  </span>
                  <span>
                    Success: {completedCount} | Errors: {errorCount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Status */}
        {importStatuses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Import Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importStatuses.map((status, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {status.fileName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {status.status === 'pending' && (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                          {status.status === 'processing' && (
                            <Badge variant="default">Processing</Badge>
                          )}
                          {status.status === 'completed' && (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Completed
                              </Badge>
                            </>
                          )}
                          {status.status === 'error' && (
                            <>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <Badge variant="destructive">Error</Badge>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {status.result && (
                          <div className="text-sm">
                            {status.result.success ? (
                              <span className="text-green-600">
                                Candidate: {status.result.candidateName}
                              </span>
                            ) : (
                              <span className="text-red-600">
                                {status.result.error}
                              </span>
                            )}
                          </div>
                        )}
                        {status.error && (
                          <span className="text-red-600 text-sm">
                            {status.error}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Results Summary */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Import Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {results.filter(r => r.success).length}
                  </div>
                  <div className="text-sm text-green-600">Successful Imports</div>
                </div>
                
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">
                    {results.filter(r => !r.success).length}
                  </div>
                  <div className="text-sm text-red-600">Failed Imports</div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.length}
                  </div>
                  <div className="text-sm text-blue-600">Total Processed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}