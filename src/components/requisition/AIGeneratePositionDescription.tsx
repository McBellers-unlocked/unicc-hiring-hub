import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Paperclip, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContextInput {
  positionTitle: string;
  natureOfPosition?: string;
  gradeLevel?: string;
  dutyStation?: string;
  unitSectionDivision?: string;
  objectivesOfProgramme?: string;
}

export interface AIGeneratedPDResult {
  position_title: string | null;
  nature_of_position: string | null;
  grade: string | null;
  duty_station: string[];
  division: string | null;
  unit_section_division: string | null;
  purpose_of_position: string;
  main_duties_responsibilities: string;
  essential_experience: string;
  desirable_experience: string;
  essential_education: string;
  essential_education_level: string;
  desirable_education: string;
  additional_languages: Array<{ name: string; level: string }>;
  core_competencies: string[];
  management_competencies: string[];
  leadership_competencies: string[];
}

interface Props {
  getContext: () => ContextInput;
  currentPurpose: string;
  currentDuties: string;
  canGenerate: boolean;
  missingFieldsLabel?: string;
  onApply: (result: AIGeneratedPDResult, mode: "overwrite" | "fillEmpty") => void;
}

const ACCEPT = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const MAX_BYTES = 5 * 1024 * 1024;

async function extractPdfText(file: File): Promise<string> {
  // pdfjs-dist v5 ESM build
  const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
  // Use CDN worker to avoid bundling worker file
  try {
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  } catch {}
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const out: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items.map((it: any) => (typeof it.str === "string" ? it.str : "")).join(" ");
    out.push(pageText);
  }
  return out.join("\n\n");
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth: any = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  if (name.endsWith(".txt") || type.startsWith("text/")) {
    return await file.text();
  }
  if (name.endsWith(".pdf") || type === "application/pdf") {
    return await extractPdfText(file);
  }
  if (name.endsWith(".docx") || type.includes("officedocument.wordprocessingml")) {
    return await extractDocxText(file);
  }
  throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
}

export function AIGeneratePositionDescription({
  getContext,
  currentPurpose,
  currentDuties,
  canGenerate,
  missingFieldsLabel,
  onApply,
}: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    const accepted: File[] = [];
    for (const f of incoming) {
      if (f.size > MAX_BYTES) {
        toast({ title: "File too large", description: `${f.name} exceeds 5 MB and was skipped.`, variant: "destructive" });
        continue;
      }
      accepted.push(f);
    }
    const next = [...files, ...accepted];
    setFiles(next);
    if (fileRef.current) fileRef.current.value = "";
    if (accepted.length > 0) {
      // With a JD attached, the AI extracts every field — including title. Always auto-run.
      setTimeout(() => runGeneration("fillEmpty", next), 0);
    }
  };

  // Auto-run once a file is present (in case the first auto-run didn't fire, e.g. after remount).
  const hasFiles = files.length > 0;
  useEffect(() => {
    if (!hasFiles || loading) return;
    const t = setTimeout(() => runGeneration("fillEmpty"), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFiles]);

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const runGeneration = async (mode: "overwrite" | "fillEmpty", filesOverride?: File[]) => {
    const ctx = getContext();
    if (!ctx.positionTitle?.trim()) {
      toast({ title: "Position title required", description: "Enter a position title before generating.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const attachments: { filename: string; text: string }[] = [];
      const filesToUse = filesOverride ?? files;
      for (const f of filesToUse) {
        try {
          const text = await extractFileText(f);
          if (text && text.trim()) {
            attachments.push({ filename: f.name, text });
          } else {
            toast({ title: "No text extracted", description: `${f.name} produced no text and was skipped.`, variant: "destructive" });
          }
        } catch (err: any) {
          console.error("extract failed", f.name, err);
          toast({ title: "Could not read file", description: `${f.name}: ${err?.message || "parse error"}`, variant: "destructive" });
        }
      }

      const { data, error } = await supabase.functions.invoke("generate-position-description", {
        body: { ...ctx, attachments },
      });

      if (error) {
        console.error("generate-position-description invoke error", error);
        const ctxObj = (error as any).context;
        const status = ctxObj?.status;
        let serverMsg = "";
        try {
          if (ctxObj && typeof ctxObj.json === "function") {
            const j = await ctxObj.json();
            serverMsg = j?.error || j?.message || "";
          } else if (ctxObj && typeof ctxObj.text === "function") {
            serverMsg = await ctxObj.text();
          }
        } catch {}
        const msg =
          status === 402
            ? "AI credits exhausted. Add credits in workspace settings."
            : status === 429
              ? "AI rate limit reached. Please try again shortly."
              : serverMsg || error.message || "Generation failed";
        toast({ title: "AI generation failed", description: msg, variant: "destructive" });
        return;
      }

      const result = data as Partial<AIGeneratedPDResult>;
      const filled = {
        purpose_of_position: result.purpose_of_position || "",
        main_duties_responsibilities: result.main_duties_responsibilities || "",
        essential_experience: result.essential_experience || "",
        desirable_experience: result.desirable_experience || "",
        essential_education: result.essential_education || "",
        essential_education_level: result.essential_education_level || "",
        desirable_education: result.desirable_education || "",
        additional_languages: Array.isArray(result.additional_languages) ? result.additional_languages : [],
      };
      const anyContent =
        filled.purpose_of_position ||
        filled.main_duties_responsibilities ||
        filled.essential_experience ||
        filled.essential_education ||
        filled.additional_languages.length > 0;
      if (!anyContent) {
        toast({ title: "Empty response", description: "AI did not return content. Try again.", variant: "destructive" });
        return;
      }

      onApply(filled, mode);
      const fieldCount = Object.values(filled).filter((v) => (Array.isArray(v) ? v.length > 0 : !!v)).length;
      toast({
        title: mode === "fillEmpty" ? "Extracted from JD" : "Position description generated",
        description: `${fieldCount} field${fieldCount === 1 ? "" : "s"} ${mode === "fillEmpty" ? "filled" : "drafted"}. Review and refine as needed.`,
      });
    } catch (e: any) {
      toast({ title: "AI generation failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClick = () => {
    const hasExisting = (currentPurpose && currentPurpose.trim().length > 0) || (currentDuties && currentDuties.trim().length > 0);
    if (hasExisting) {
      setConfirmOpen(true);
    } else {
      runGeneration("overwrite");
    }
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      {/* Attach JD first */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="gap-2"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach existing JD
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={handlePickFiles}
        />
        <span className="text-xs text-muted-foreground">
          Optional: attach PDF, DOCX, or TXT job descriptions to ground the AI output.
        </span>
      </div>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <Badge key={`${f.name}-${i}`} variant="secondary" className="gap-1 pr-1">
              <span className="max-w-[220px] truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="rounded hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Then Generate */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={handleGenerateClick}
          disabled={loading || !canGenerate}
          className="gap-2"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Generating…" : "Generate with AI"}
        </Button>
        {!canGenerate && (
          <span className="text-xs text-muted-foreground">
            {missingFieldsLabel || "Fill position title, grade, and division to enable AI generation."}
          </span>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing content detected</AlertDialogTitle>
            <AlertDialogDescription>
              Purpose of position and/or main duties already have content. Choose how to apply the AI-generated text.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-wrap gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => runGeneration("fillEmpty")}>Fill only empty</AlertDialogAction>
            <AlertDialogAction onClick={() => runGeneration("overwrite")}>Overwrite both</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
