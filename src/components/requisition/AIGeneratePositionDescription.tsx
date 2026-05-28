import { useRef, useState } from "react";
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

interface Props {
  getContext: () => ContextInput;
  currentPurpose: string;
  currentDuties: string;
  onApply: (result: { purpose_of_position: string; main_duties_responsibilities: string }, mode: "overwrite" | "fillEmpty") => void;
}

const ACCEPT = ".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const MAX_BYTES = 5 * 1024 * 1024;

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AIGeneratePositionDescription({ getContext, currentPurpose, currentDuties, onApply }: Props) {
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
    setFiles((prev) => [...prev, ...accepted]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const runGeneration = async (mode: "overwrite" | "fillEmpty") => {
    const ctx = getContext();
    if (!ctx.positionTitle?.trim()) {
      toast({ title: "Position title required", description: "Enter a position title before generating.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const attachments = await Promise.all(
        files.map(async (f) => ({
          filename: f.name,
          mimeType: f.type || "application/octet-stream",
          base64: await fileToBase64(f),
        }))
      );

      const { data, error } = await supabase.functions.invoke("generate-position-description", {
        body: { ...ctx, attachments },
      });

      if (error) {
        const status = (error as any).context?.status;
        const msg =
          status === 402
            ? "AI credits exhausted. Add credits in workspace settings."
            : status === 429
            ? "AI rate limit reached. Please try again shortly."
            : error.message || "Generation failed";
        toast({ title: "AI generation failed", description: msg, variant: "destructive" });
        return;
      }

      const result = data as { purpose_of_position?: string; main_duties_responsibilities?: string };
      if (!result?.purpose_of_position && !result?.main_duties_responsibilities) {
        toast({ title: "Empty response", description: "AI did not return content. Try again.", variant: "destructive" });
        return;
      }

      onApply(
        {
          purpose_of_position: result.purpose_of_position || "",
          main_duties_responsibilities: result.main_duties_responsibilities || "",
        },
        mode,
      );
      toast({ title: "Position description generated", description: "Review and refine the AI-generated content." });
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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleGenerateClick}
          disabled={loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Generating…" : "Generate with AI"}
        </Button>
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
          Optional: attach PDF/DOCX/TXT job descriptions to ground the AI output.
        </span>
      </div>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <Badge key={`${f.name}-${i}`} variant="secondary" className="gap-1 pr-1">
              <span className="max-w-[200px] truncate">{f.name}</span>
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
