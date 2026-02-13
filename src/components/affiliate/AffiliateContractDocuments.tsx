import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Pencil, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ContractDocument {
  id: string;
  user_id: string;
  samsaran_pr: string | null;
  affiliate_name: string | null;
  doc_type: string;
  status: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

interface DocFormData {
  samsaran_pr: string;
  affiliate_name: string;
  doc_type: string;
  status: string;
}

interface Props {
  userId: string;
  affiliateName: string;
  availablePRs: string[];
  filterPR?: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  contract: 'Contract',
  selection_report: 'Selection Report',
  rate_determination: 'Rate Determination',
  nda: 'NDA',
  pension_form: 'Pension Form',
  doi: 'DOI',
  id_document: 'ID',
  phf: 'PHF',
  tor: 'TOR',
  other: 'Other',
};

const emptyDocForm: DocFormData = {
  samsaran_pr: '',
  affiliate_name: '',
  doc_type: 'contract',
  status: 'draft',
};

export default function AffiliateContractDocuments({ userId, affiliateName, availablePRs, filterPR }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editingDoc, setEditingDoc] = useState<ContractDocument | null>(null);
  const [docForm, setDocForm] = useState<DocFormData>(emptyDocForm);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['affiliate-contract-documents', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_contract_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ContractDocument[];
    },
  });

  const openTagDialog = useCallback((file: File) => {
    setPendingFile(file);
    setEditingDoc(null);
    setDocForm({ ...emptyDocForm, affiliate_name: affiliateName });
    setDocDialogOpen(true);
  }, [affiliateName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) openTagDialog(file);
  }, [openTagDialog]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openTagDialog(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [openTagDialog]);

  const uploadMutation = useMutation({
    mutationFn: async (form: DocFormData) => {
      if (!pendingFile) throw new Error('No file selected');
      const filePath = `affiliate-documents/${userId}/${Date.now()}_${pendingFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('document-repository')
        .upload(filePath, pendingFile);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('affiliate_contract_documents')
        .insert({
          user_id: userId,
          samsaran_pr: form.samsaran_pr || null,
          affiliate_name: form.affiliate_name || null,
          doc_type: form.doc_type,
          status: form.status,
          file_name: pendingFile.name,
          file_path: filePath,
          file_size: pendingFile.size,
        });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-contract-documents', userId] });
      toast.success('Document uploaded');
      setDocDialogOpen(false);
      setPendingFile(null);
    },
    onError: (err: any) => toast.error(err.message || 'Upload failed'),
  });

  const updateTagsMutation = useMutation({
    mutationFn: async (form: DocFormData) => {
      if (!editingDoc) return;
      const { error } = await supabase
        .from('affiliate_contract_documents')
        .update({
          samsaran_pr: form.samsaran_pr || null,
          affiliate_name: form.affiliate_name || null,
          doc_type: form.doc_type,
          status: form.status,
        })
        .eq('id', editingDoc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-contract-documents', userId] });
      toast.success('Tags updated');
      setDocDialogOpen(false);
      setEditingDoc(null);
    },
    onError: (err: any) => toast.error(err.message || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: ContractDocument) => {
      await supabase.storage.from('document-repository').remove([doc.file_path]);
      const { error } = await supabase
        .from('affiliate_contract_documents')
        .delete()
        .eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-contract-documents', userId] });
      toast.success('Document deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Delete failed'),
  });

  const downloadFile = async (doc: ContractDocument) => {
    const { data } = supabase.storage.from('document-repository').getPublicUrl(doc.file_path);
    window.open(data.publicUrl, '_blank');
  };

  const openEditTags = (doc: ContractDocument) => {
    setEditingDoc(doc);
    setPendingFile(null);
    setDocForm({
      samsaran_pr: doc.samsaran_pr || '',
      affiliate_name: doc.affiliate_name || '',
      doc_type: doc.doc_type,
      status: doc.status,
    });
    setDocDialogOpen(true);
  };

  const handleSave = () => {
    if (editingDoc) {
      updateTagsMutation.mutate(docForm);
    } else {
      uploadMutation.mutate(docForm);
    }
  };

  const isSaving = uploadMutation.isPending || updateTagsMutation.isPending;

  const statusBadgeVariant = (s: string) => {
    if (s === 'verified') return 'default';
    if (s === 'uploaded') return 'secondary';
    return 'outline';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Contract Documents</span>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Add Document
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop a file here, or click to browse
            </p>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
          </div>

          {/* Documents table */}
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : !documents?.length ? (
            <div className="text-center py-4 text-muted-foreground">No documents uploaded yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Samsaran PR</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filterPR ? documents.filter(d => (d.samsaran_pr || '').toLowerCase().includes(filterPR.toLowerCase())) : documents).map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[200px]">{doc.file_name}</span>
                    </TableCell>
                    <TableCell>{doc.samsaran_pr || '-'}</TableCell>
                    <TableCell>{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(doc.status)} className="capitalize">{doc.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => downloadFile(doc)} title="Download">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditTags(doc)} title="Edit tags">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(doc)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tagging dialog */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDoc ? 'Edit Document Tags' : 'Tag Uploaded Document'}</DialogTitle>
          </DialogHeader>
          {pendingFile && (
            <p className="text-sm text-muted-foreground">File: {pendingFile.name}</p>
          )}
          <div className="space-y-4">
            <div>
              <Label>Related Samsaran PR</Label>
              <Select value={docForm.samsaran_pr} onValueChange={(v) => setDocForm({ ...docForm, samsaran_pr: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a PR..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePRs.map((pr) => (
                    <SelectItem key={pr} value={pr}>{pr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={docForm.affiliate_name} onChange={(e) => setDocForm({ ...docForm, affiliate_name: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={docForm.doc_type} onValueChange={(v) => setDocForm({ ...docForm, doc_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="selection_report">Selection Report</SelectItem>
                  <SelectItem value="rate_determination">Rate Determination</SelectItem>
                  <SelectItem value="nda">NDA</SelectItem>
                  <SelectItem value="pension_form">Pension Form</SelectItem>
                  <SelectItem value="doi">DOI</SelectItem>
                  <SelectItem value="id_document">ID</SelectItem>
                  <SelectItem value="phf">PHF</SelectItem>
                   <SelectItem value="tor">TOR</SelectItem>
                   <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={docForm.status} onValueChange={(v) => setDocForm({ ...docForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="uploaded">Uploaded</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
