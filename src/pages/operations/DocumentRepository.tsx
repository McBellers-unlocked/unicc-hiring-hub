import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Trash2, Download, Search, FileText, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import DocumentTemplatesTab from "@/components/operations/DocumentTemplatesTab";

const CATEGORIES = ["Policies", "Templates", "Guidelines", "Forms", "SOPs", "Other"];

interface DocumentRecord {
  id: string;
  name: string;
  category: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  uploader_name?: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  file_path: string;
  file_type: string | null;
  fields: string[];
  uploaded_by: string | null;
  created_at: string;
  uploader_name?: string;
}

const DocumentRepository = () => {
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = userRoles.includes("Admin");

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [uploadCategory, setUploadCategory] = useState("Other");

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("document_repository")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading documents", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const uploaderIds = [...new Set((data || []).map((d) => d.uploaded_by).filter(Boolean))];
    let uploaderMap: Record<string, string> = {};
    if (uploaderIds.length > 0) {
      const { data: users } = await supabase.from("users").select("id, name").in("id", uploaderIds);
      if (users) uploaderMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
    }

    setDocuments(
      (data || []).map((d) => ({
        ...d,
        uploader_name: d.uploaded_by ? uploaderMap[d.uploaded_by] || "Unknown" : "Unknown",
      }))
    );
    setLoading(false);
  };

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    const { data, error } = await supabase
      .from("document_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading templates", description: error.message, variant: "destructive" });
      setTemplatesLoading(false);
      return;
    }

    const uploaderIds = [...new Set((data || []).map((d) => d.uploaded_by).filter(Boolean))];
    let uploaderMap: Record<string, string> = {};
    if (uploaderIds.length > 0) {
      const { data: users } = await supabase.from("users").select("id, name").in("id", uploaderIds);
      if (users) uploaderMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
    }

    setTemplates(
      (data || []).map((d) => ({
        ...d,
        fields: (d.fields as string[]) || [],
        uploader_name: d.uploaded_by ? uploaderMap[d.uploaded_by] || "Unknown" : "Unknown",
      }))
    );
    setTemplatesLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
    fetchTemplates();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const filePath = `${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage.from("document-repository").upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("document_repository").insert({
      name: file.name,
      category: uploadCategory,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: user.id,
    });

    if (insertError) {
      toast({ title: "Failed to save record", description: insertError.message, variant: "destructive" });
    } else {
      toast({ title: "Document uploaded successfully" });
      fetchDocuments();
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async (doc: DocumentRecord) => {
    const { data } = supabase.storage.from("document-repository").getPublicUrl(doc.file_path);
    window.open(data.publicUrl, "_blank");
  };

  const handleDelete = async (doc: DocumentRecord) => {
    const { error: storageError } = await supabase.storage.from("document-repository").remove([doc.file_path]);
    if (storageError) {
      toast({ title: "Failed to delete file", description: storageError.message, variant: "destructive" });
      return;
    }
    const { error: dbError } = await supabase.from("document_repository").delete().eq("id", doc.id);
    if (dbError) {
      toast({ title: "Failed to delete record", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Document deleted" });
      fetchDocuments();
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filtered = documents.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Document Repository</h1>
          <p className="text-muted-foreground">Upload documents and use fillable templates.</p>
        </div>

        <Tabs defaultValue="documents" className="w-full">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Document Repository</CardTitle>
                    <CardDescription>Upload and manage shared organizational documents.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAdmin && (
                  <div className="flex flex-wrap items-end gap-3 p-4 border border-dashed border-border rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium text-foreground mb-1 block">Category</label>
                      <Select value={uploadCategory} onValueChange={setUploadCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                      />
                      <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? "Uploading…" : "Upload Document"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Loading documents…</p>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>No documents found.</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Uploaded By</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{doc.category}</Badge>
                            </TableCell>
                            <TableCell>{doc.uploader_name}</TableCell>
                            <TableCell>{format(new Date(doc.created_at), "dd MMM yyyy")}</TableCell>
                            <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <DocumentTemplatesTab
              templates={templates}
              loading={templatesLoading}
              onRefresh={fetchTemplates}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default DocumentRepository;
