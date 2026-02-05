import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface ImportSeparationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  last_name: string;
  first_name: string;
  email?: string;
  operation_type: string;
  reason?: string;
  status: string;
  job_title?: string;
  grade?: string;
  contract_type?: string;
  duty_station?: string;
  pd_number?: string;
  supervisor?: string;
  section_unit?: string;
  supervisor_staff_number?: string;
  separation_type?: string;
  event_type?: string;
  tentative_date?: string;
  effective_date?: string;
  is_international: boolean;
  notice_days_required: number;
  staff_number?: string;
  main_hr_focal_point?: string;
  comments?: string;
  actions_in_hr_plan?: string;
  clearance_status?: string;
}

// Excel serial date to JS Date conversion
const excelDateToJSDate = (excelSerial: number): string | null => {
  if (!excelSerial || isNaN(excelSerial)) return null;
  const utc_days = Math.floor(excelSerial - 25569);
  const date = new Date(utc_days * 86400 * 1000);
  return date.toISOString().split('T')[0];
};

// Parse date that could be string or Excel serial
const parseDate = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'number') {
    return excelDateToJSDate(value);
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  return null;
};

// Clean status value - strip numbered prefix
const cleanStatus = (status: string | undefined): string => {
  if (!status) return 'Not started';
  // Remove numbered prefix like "1. Not started" -> "Not started"
  const cleaned = status.replace(/^\d+\.\s*/, '').trim();
  // Map to valid values
  const statusMap: Record<string, string> = {
    'not started': 'Not started',
    'in progress': 'In progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  };
  return statusMap[cleaned.toLowerCase()] || cleaned;
};

export const ImportSeparationsDialog = ({
  open,
  onOpenChange,
}: ImportSeparationsDialogProps) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importComplete, setImportComplete] = useState(false);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setWarnings([]);
    setParsedData([]);
    setImportComplete(false);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      const newWarnings: string[] = [];
      const parsed: ParsedRow[] = [];

      jsonData.forEach((row: any, index: number) => {
        const rowNum = index + 2; // Account for header row

        // Skip rows without required fields
        if (!row['Last Name'] && !row['First Name']) {
          return;
        }

        // Validate required fields
        if (!row['Last Name']) {
          newWarnings.push(`Row ${rowNum}: Missing last name`);
        }
        if (!row['First Name']) {
          newWarnings.push(`Row ${rowNum}: Missing first name`);
        }

        const parsedRow: ParsedRow = {
          last_name: String(row['Last Name'] || '').trim(),
          first_name: String(row['First Name'] || '').trim(),
          email: row['Email'] ? String(row['Email']).trim() : undefined,
          operation_type: String(row['Operation Type'] || row['Type'] || 'Separation').trim(),
          reason: row['Reason'] ? String(row['Reason']).trim() : undefined,
          status: cleanStatus(String(row['Status'] || '')),
          job_title: row['Job Title'] || row['Functional Title'] ? String(row['Job Title'] || row['Functional Title']).trim() : undefined,
          grade: row['Grade'] ? String(row['Grade']).trim() : undefined,
          contract_type: row['Contract Type'] ? String(row['Contract Type']).trim() : undefined,
          duty_station: row['Duty Station'] || row['Official Duty Station'] ? String(row['Duty Station'] || row['Official Duty Station']).trim() : undefined,
          pd_number: row['PD Number'] || row['PD'] ? String(row['PD Number'] || row['PD']).trim() : undefined,
          supervisor: row['Supervisor'] ? String(row['Supervisor']).trim() : undefined,
          section_unit: row['Section'] || row['Unit'] || row['Section/Unit'] ? String(row['Section'] || row['Unit'] || row['Section/Unit']).trim() : undefined,
          supervisor_staff_number: row['Supervisor Staff Number'] ? String(row['Supervisor Staff Number']).trim() : undefined,
          separation_type: row['Separation Type'] ? String(row['Separation Type']).trim() : undefined,
          event_type: row['Event Type'] ? String(row['Event Type']).trim() : undefined,
          tentative_date: parseDate(row['Tentative Separation Date'] || row['Tentative Date'] || row['Last Working Day']) || undefined,
          effective_date: parseDate(row['Effective Date']) || undefined,
          is_international: String(row['International'] || row['Is International'] || '').toLowerCase() === 'yes' || 
                           String(row['International'] || row['Is International'] || '').toLowerCase() === 'true',
          notice_days_required: parseInt(String(row['Notice Days'] || row['Notice Days Required'] || '30')) || 30,
          staff_number: row['Staff Number'] || row['Index Number'] ? String(row['Staff Number'] || row['Index Number']).trim() : undefined,
          main_hr_focal_point: row['HR Focal Point'] || row['Main HR Focal Point'] ? String(row['HR Focal Point'] || row['Main HR Focal Point']).trim() : undefined,
          comments: row['Comments'] || row['Notes'] ? String(row['Comments'] || row['Notes']).trim() : undefined,
          actions_in_hr_plan: row['Actions In HR Plan'] || row['Actions'] ? String(row['Actions In HR Plan'] || row['Actions']).trim() : undefined,
          clearance_status: row['Clearance Status'] ? String(row['Clearance Status']).trim() : undefined,
        };

        // Only add if we have required fields
        if (parsedRow.last_name && parsedRow.first_name) {
          parsed.push(parsedRow);
        }
      });

      setParsedData(parsed);
      setWarnings(newWarnings);

      if (parsed.length === 0) {
        newWarnings.push('No valid rows found in the file');
      }
    } catch (error) {
      toast.error('Failed to parse file: ' + (error as Error).message);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsLoading(true);

    try {
      // Insert separations in batches
      const batchSize = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < parsedData.length; i += batchSize) {
        const batch = parsedData.slice(i, i + batchSize);
        
        const insertData = batch.map(row => ({
          last_name: row.last_name,
          first_name: row.first_name,
          email: row.email || null,
          operation_type: row.operation_type,
          reason: row.reason || null,
          status: row.status,
          job_title: row.job_title || null,
          grade: row.grade || null,
          contract_type: row.contract_type || null,
          duty_station: row.duty_station || null,
          pd_number: row.pd_number || null,
          supervisor: row.supervisor || null,
          section_unit: row.section_unit || null,
          supervisor_staff_number: row.supervisor_staff_number || null,
          separation_type: row.separation_type || null,
          event_type: row.event_type || null,
          tentative_date: row.tentative_date || null,
          effective_date: row.effective_date || null,
          is_international: row.is_international,
          notice_days_required: row.notice_days_required,
          staff_number: row.staff_number || null,
          main_hr_focal_point: row.main_hr_focal_point || null,
          comments: row.comments || null,
          actions_in_hr_plan: row.actions_in_hr_plan || null,
          clearance_status: row.clearance_status || null,
        }));

        const { error } = await supabase
          .from('hr_separations')
          .insert(insertData);

        if (error) {
          console.error('Batch insert error:', error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['hr-separations'] });

      if (errorCount === 0) {
        toast.success(`Successfully imported ${successCount} separations`);
        setImportComplete(true);
      } else {
        toast.warning(`Imported ${successCount} separations, ${errorCount} failed`);
      }
    } catch (error) {
      toast.error('Import failed: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setWarnings([]);
    setImportComplete(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Separations
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to import separation records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!importComplete ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
              </div>

              {isParsing && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing file...
                </div>
              )}

              {parsedData.length > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Found {parsedData.length} valid separation records to import
                  </AlertDescription>
                </Alert>
              )}

              {warnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="max-h-32 overflow-y-auto">
                      {warnings.slice(0, 10).map((w, i) => (
                        <div key={i} className="text-sm">{w}</div>
                      ))}
                      {warnings.length > 10 && (
                        <div className="text-sm font-medium mt-1">
                          ...and {warnings.length - 10} more warnings
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Import completed successfully!
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importComplete ? 'Close' : 'Cancel'}
          </Button>
          {!importComplete && (
            <Button 
              onClick={handleImport} 
              disabled={parsedData.length === 0 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import {parsedData.length} Records
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
