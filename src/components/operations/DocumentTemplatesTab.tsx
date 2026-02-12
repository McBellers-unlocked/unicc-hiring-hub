import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Trash2, FileText, Search, FileEdit, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { StaffSearchCombobox, parseName, type StaffMember } from "@/components/operations/StaffSearchCombobox";
import { Separator } from "@/components/ui/separator";

const TEMPLATE_CATEGORIES = ["Letters", "Contracts", "Certificates", "Memos", "General"];

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

interface DocumentTemplatesTabProps {
  templates: DocumentTemplate[];
  loading: boolean;
  onRefresh: () => void;
}

const fieldToLabel = (field: string) =>
  field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Map template placeholder names to staff data
const STAFF_FIELD_MAP: Record<string, (s: StaffMember) => string> = (() => {
  const nameGetter = (s: StaffMember) => s.name;
  const firstNameGetter = (s: StaffMember) => parseName(s.name).firstName;
  const lastNameGetter = (s: StaffMember) => parseName(s.name).lastName;
  const emailGetter = (s: StaffMember) => s.email;
  const gradeGetter = (s: StaffMember) => s.grade || '';
  const titleGetter = (s: StaffMember) => s.job_title || '';
  const stationGetter = (s: StaffMember) => s.duty_station || '';
  const unitGetter = (s: StaffMember) => s.section_unit || '';
  const supervisorGetter = (s: StaffMember) => s.supervisor || '';
  const staffNumGetter = (s: StaffMember) => s.staff_number || '';

  return {
    name: nameGetter, staff_name: nameGetter, full_name: nameGetter, fullname: nameGetter,
    first_name: firstNameGetter, firstname: firstNameGetter,
    last_name: lastNameGetter, lastname: lastNameGetter, surname: lastNameGetter,
    email: emailGetter,
    grade: gradeGetter, level: gradeGetter,
    job_title: titleGetter, jobtitle: titleGetter, title: titleGetter, position: titleGetter,
    duty_station: stationGetter, dutystation: stationGetter, location: stationGetter,
    section: unitGetter, unit: unitGetter, section_unit: unitGetter, sectionunit: unitGetter,
    supervisor: supervisorGetter, line_manager: supervisorGetter, linemanager: supervisorGetter, manager: supervisorGetter,
    staff_number: staffNumGetter, staffnumber: staffNumGetter,
  };
})();

const DocumentTemplatesTab = ({ templates, loading, onRefresh }: DocumentTemplatesTabProps) => {
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = userRoles.includes("Admin");

  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("General");
  const [uploadDescription, setUploadDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Fill template dialog
  const [fillTemplate, setFillTemplate] = useState<DocumentTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.name.endsWith(".docx")) {
      toast({ title: "Only .docx files are supported for templates", variant: "destructive" });
      return;
    }

    setUploading(true);
    const filePath = `${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("document-templates")
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    // Insert template record
    const { data: insertedTemplate, error: insertError } = await supabase
      .from("document_templates")
      .insert({
        name: file.name,
        category: uploadCategory,
        description: uploadDescription || null,
        file_path: filePath,
        file_type: file.type,
        uploaded_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !insertedTemplate) {
      toast({ title: "Failed to save template", description: insertError?.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    // Parse template fields
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-template-fields`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({ file_path: filePath, template_id: insertedTemplate.id }),
        }
      );
      const result = await res.json();
      if (result.fields?.length > 0) {
        toast({ title: "Template uploaded", description: `Detected ${result.fields.length} placeholder field(s).` });
      } else {
        toast({ title: "Template uploaded", description: "No placeholder fields detected. Add {{field_name}} placeholders to your .docx file." });
      }
    } catch {
      toast({ title: "Template uploaded", description: "Field detection may have failed. You can re-upload if needed." });
    }

    setUploadDescription("");
    onRefresh();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (template: DocumentTemplate) => {
    await supabase.storage.from("document-templates").remove([template.file_path]);
    const { error } = await supabase.from("document_templates").delete().eq("id", template.id);
    if (error) {
      toast({ title: "Failed to delete template", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template deleted" });
      onRefresh();
    }
  };

  const openFillDialog = (template: DocumentTemplate) => {
    setFillTemplate(template);
    const initial: Record<string, string> = {};
    (template.fields || []).forEach((f) => (initial[f] = ""));
    setFieldValues(initial);
  };

  const handleStaffSelect = (staff: StaffMember) => {
    if (!fillTemplate) return;
    setFieldValues((prev) => {
      const updated = { ...prev };
      (fillTemplate.fields || []).forEach((field) => {
        const normalized = field.toLowerCase().replace(/[\s-]/g, '_');
        const getter = STAFF_FIELD_MAP[normalized];
        if (getter) {
          const value = getter(staff);
          if (value) updated[field] = value;
        }
      });
      return updated;
    });
  };

  const handleGenerate = async () => {
    if (!fillTemplate) return;
    setGenerating(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-filled-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({ template_id: fillTemplate.id, field_values: fieldValues }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fillTemplate.name.replace(/\.[^.]+$/, "")}_filled.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Document downloaded successfully" });
      setFillTemplate(null);
    } catch (err: any) {
      toast({ title: "Failed to generate document", description: err.message, variant: "destructive" });
    }

    setGenerating(false);
  };

  const filtered = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Document Templates</CardTitle>
              <CardDescription>
                Upload .docx templates with {"{{placeholder}}"} fields. Users can fill in the fields and download completed documents.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload area (admin only) */}
          {isAdmin && (
            <div className="flex flex-wrap items-end gap-3 p-4 border border-dashed border-border rounded-lg bg-muted/30">
              <div className="flex-1 min-w-[160px]">
                <Label className="mb-1 block">Category</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label className="mb-1 block">Description (optional)</Label>
                <Input
                  placeholder="Brief description…"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                />
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                  accept=".docx"
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading…" : "Upload Template"}
                </Button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates…"
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
                {TEMPLATE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading templates…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No templates found.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Fields</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {t.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{(t.fields || []).length} fields</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(t.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {(t.fields || []).length > 0 && (
                          <Button variant="outline" size="sm" onClick={() => openFillDialog(t)}>
                            <FileEdit className="h-4 w-4 mr-1" />
                            Use Template
                          </Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(t)}>
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

      {/* Fill Template Dialog */}
      <Dialog open={!!fillTemplate} onOpenChange={(open) => !open && setFillTemplate(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fill Template: {fillTemplate?.name}</DialogTitle>
            {fillTemplate?.description && (
              <DialogDescription>{fillTemplate.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Auto-fill from staff profile</Label>
              <StaffSearchCombobox onSelect={handleStaffSelect} />
              <p className="text-xs text-muted-foreground">Select a staff member to auto-populate matching fields below.</p>
            </div>
            <Separator />
            {(fillTemplate?.fields || []).map((field) => (
              <div key={field} className="space-y-1">
                <Label>{fieldToLabel(field)}</Label>
                {field.includes("address") || field.includes("description") || field.includes("body") || field.includes("content") ? (
                  <Textarea
                    value={fieldValues[field] || ""}
                    onChange={(e) => setFieldValues((prev) => ({ ...prev, [field]: e.target.value }))}
                    placeholder={`Enter ${fieldToLabel(field).toLowerCase()}…`}
                  />
                ) : (
                  <Input
                    value={fieldValues[field] || ""}
                    onChange={(e) => setFieldValues((prev) => ({ ...prev, [field]: e.target.value }))}
                    placeholder={`Enter ${fieldToLabel(field).toLowerCase()}…`}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFillTemplate(null)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Filled Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DocumentTemplatesTab;
