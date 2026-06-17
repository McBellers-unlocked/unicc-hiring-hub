import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Paperclip, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
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

const NATURE_OPTIONS = ["Fixed term", "Temporary", "Individual Consultant", "STDA", "Intern"];
const GRADE_OPTIONS = ["G3", "G4", "G5", "G6", "G7", "P1", "P2", "P3", "P4", "P5", "D1", "D2"];
const DUTY_STATIONS = ["Brindisi", "Geneva", "Lyon", "New York", "Rome", "Valencia"];
const DIVISION_UNITS: Record<string, string[]> = {
  CS: ["CISO Section (CISO)", "Investigative Support Unit (CSI)", "Cybersecurity Solutions & Strategy Unit (CSS)", "Cybersecurity Assurance & Architecture Section (CSA)", "Cybersecurity Engineering Unit (CSE)", "Cybersecurity Networking Unit (CSN)", "Cybersecurity Operations Section (CSO)", "Organizational Resilience Unit (CSR)"],
  DD: ["Data and Artificial Intelligence Section (DDA)", "Digital Development Center Section (DDC)", "Digital Business Solutions Section (DDD)", "Artificial Intelligence and Machine Learning Unit (DDAI)", "Data Management Unit (DDAM)", "Enterprise Service Management Unit (DDES)", "Enterprise Solutions Section (DDE)", "Hyperautomation Solutions Unit (DDHA)", "MS Dynamics Unit (DDMS)", "Projects & Programmes Section (DDP)", "Programme Portfolio Unit (DDPG)", "Project Portfolio Unit (DDPM)", "Governance PMO Unit (DDPO)"],
  DS: ["Digital Products Unit (DSDP)", "Business Solutions Unit (DSB)", "Digital Customer Services Unit (DSCS)", "Unite Digital Workspace Services Unit (DSDW)", "Learning Services Unit (DSL)", "Digital Public Solutions Unit (DSPS)"],
  DO: ["UNICC Directorate (DOD)", "External Relations and Strategic Partnerships Section (DOE)", "Digital ID Programme (DOP)", "Business Relationship Management Section (DBR)"],
  MS: ["Policy (Legal) Unit (MSL)", "Business Control Section (MSB)", "Process and Change Unit (MSBP)", "Finance and Accounting Section (MSF)", "GRC & QA Unit (MSG)", "Human Resources Section (MSH)", "Talent Unit (MSHT)", "Procurement Section (MSP)"],
  OP: ["Infrastructure and Platform Operations Unit (OPBO)", "Customer IT Resilience Team (OPBR)", "Data Center Support Unit (OPBS)", "Customer Services Centre (OPC)", "Service Desk Unit (OPCS)", "Cloud Services Section (OPD)", "Cloud Operations and Platform Service Unit (OPDA)", "Digital Workplace Service Unit (OPDM)", "Infrastructure and Operations Business Section (OPM)", "Service Excellence Unit (OPMX)", "On-premise Services (OPO)", "Platform Architecture and Service Automation Unit (OPOA)", "Oracle Unit (OPOU)", "SAP Unit (OPOS)"],
};
const DIVISION_NAMES: Record<string, string> = {
  CS: "Cybersecurity division (CS)",
  DD: "Digital Delivery division (DD)",
  DS: "Digital Solutions Centre (DS)",
  DO: "Director (DO)",
  MS: "Management and Strategy (MS)",
  OP: "Operations (OP)",
};
const CORE_COMPETENCIES = ["Knowing and managing yourself", "Producing results", "Moving forward in a changing environment", "Setting an example"];
const MANAGEMENT_COMPETENCIES = ["Ensuring effective use of resources", "Building and promoting partnerships across the Organization and beyond"];
const LEADERSHIP_COMPETENCIES = ["Driving UNICC to a successful future", "Promoting innovation and Organizational learning", "Promoting UNICC's position"];

const compact = (value: string) => value.replace(/\s+/g, " ").trim();
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const limit = (value: string, max = 3500) => compact(value).slice(0, max).trim();

const firstCapture = (source: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = source.match(pattern);
    const value = match?.[1] ? compact(match[1]) : "";
    if (value) return value.replace(/^[\s:–—-]+|[\s:–—-]+$/g, "");
  }
  return "";
};

const extractSection = (text: string, starts: RegExp[], stops: RegExp[]) => {
  const source = compact(text);
  const startMatches = starts
    .map((pattern) => {
      const match = source.match(pattern);
      return match ? { index: match.index ?? 0, end: (match.index ?? 0) + match[0].length } : null;
    })
    .filter((match): match is { index: number; end: number } => !!match)
    .sort((a, b) => a.index - b.index);
  if (!startMatches.length) return "";
  const start = startMatches[0].end;
  let end = source.length;
  const tail = source.slice(start);
  for (const stop of stops) {
    const match = tail.match(stop);
    if (match && typeof match.index === "number" && match.index > 25) {
      end = Math.min(end, start + match.index);
    }
  }
  return limit(source.slice(start, end));
};

const splitEssentialDesirable = (section: string) => {
  const source = compact(section);
  if (!source) return { essential: "", desirable: "" };
  const essentialIndex = source.search(/\bessential\b\s*:?/i);
  const desirableIndex = source.search(/\bdesirable\b\s*:?/i);
  if (essentialIndex >= 0 && desirableIndex > essentialIndex) {
    return {
      essential: limit(source.slice(essentialIndex).replace(/^essential\s*:?\s*/i, ""), 2200),
      desirable: limit(source.slice(desirableIndex).replace(/^desirable\s*:?\s*/i, ""), 1600),
    };
  }
  if (desirableIndex >= 0) {
    return {
      essential: limit(source.slice(0, desirableIndex), 2200),
      desirable: limit(source.slice(desirableIndex).replace(/^desirable\s*:?\s*/i, ""), 1600),
    };
  }
  return { essential: limit(source, 2200), desirable: "" };
};

const pickFromList = (value: string, allowed: string[]) => {
  const normalized = value.toLowerCase();
  return allowed.find((item) => normalized.includes(item.toLowerCase())) || "";
};

const parseFilenameHints = (filenameText: string) => {
  const base = filenameText.replace(/\.[a-z0-9]+$/i, "").replace(/^\d+\s*[-_–—]\s*/, "");
  const grade = firstCapture(base, [/\b(G[3-7]|P[1-5]|D[12])\b/i]).toUpperCase();
  const parts = base.split(/\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean);
  const title = parts.find((part) => !/^\d+$/.test(part) && !/^(G[3-7]|P[1-5]|D[12]|VAL|GVA|BRI|ROM|NY|FT)$/i.test(part)) || "";
  return { title, grade };
};

const detectNature = (source: string) => {
  if (/\b(individual\s+consultant|consultancy|consultant)\b/i.test(source)) return "Individual Consultant";
  if (/\b(internship|intern)\b/i.test(source)) return "Intern";
  if (/\b(stda|secondment|short\s+term\s+development)\b/i.test(source)) return "STDA";
  if (/\b(temporary|ta\b|temporary\s+appointment)\b/i.test(source)) return "Temporary";
  if (/\b(fixed\s*[- ]?term|\bft\b|regular)\b/i.test(source)) return "Fixed term";
  return "";
};

const detectDutyStations = (source: string, nature: string) => {
  const aliases: Record<string, string[]> = {
    Brindisi: ["brindisi", "bri"],
    Geneva: ["geneva", "gva"],
    Lyon: ["lyon", "lyo"],
    "New York": ["new york", "nyc", "ny"],
    Rome: ["rome", "rom"],
    Valencia: ["valencia", "val"],
  };
  const found = DUTY_STATIONS.filter((station) => aliases[station].some((alias) => new RegExp(`\\b${alias}\\b`, "i").test(source)));
  if ((nature === "Intern" || nature === "Individual Consultant") && /\bremote\b/i.test(source)) found.push("Remote");
  return Array.from(new Set(found));
};

const detectDivisionAndUnit = (source: string) => {
  const lower = source.toLowerCase();
  for (const [division, units] of Object.entries(DIVISION_UNITS)) {
    for (const unit of units) {
      const code = unit.match(/\(([^)]+)\)/)?.[1] || "";
      const name = unit.replace(/\s*\([^)]+\)/, "").toLowerCase();
      if (lower.includes(unit.toLowerCase()) || lower.includes(name) || (code && new RegExp(`\\b${escapeRegExp(code)}\\b`, "i").test(source))) {
        return { division, unit };
      }
    }
  }
  for (const [division, name] of Object.entries(DIVISION_NAMES)) {
    if (lower.includes(name.toLowerCase()) || new RegExp(`\\b${division}\\b`, "i").test(source)) {
      return { division, unit: name };
    }
  }
  return { division: "", unit: "" };
};

const formatDuties = (section: string) => {
  const parts = section
    .split(/(?:^|\s)(?:[•●▪-]|\d+[.)])\s+/)
    .map((part) => limit(part, 700))
    .filter((part) => part.length > 20);
  if (parts.length >= 2) return parts.slice(0, 12).map((part) => `- ${part}`).join("\n");
  return limit(section, 3500);
};

const educationLevel = (education: string) => {
  if (/\b(advanced university|master|masters|doctorate|doctoral|ph\.?d)\b/i.test(education)) return "Advanced University";
  if (/\b(first[- ]level university|bachelor|undergraduate|licence)\b/i.test(education)) return "First Level University";
  if (/\b(secondary|high school)\b/i.test(education)) return "Secondary";
  if (/\b(certification|professional qualification)\b/i.test(education)) return "Professional";
  return "";
};

const detectLanguages = (source: string) => {
  const languages = ["Arabic", "Chinese", "French", "Russian", "Spanish", "Italian", "Portuguese", "German"];
  return languages
    .filter((name) => new RegExp(`\\b${name}\\b`, "i").test(source))
    .map((name) => {
      const index = source.toLowerCase().indexOf(name.toLowerCase());
      const nearby = source.slice(Math.max(0, index - 90), index + 160);
      const level = /\b(native|fluent|proficient|excellent|c1|c2)\b/i.test(nearby)
        ? "expert"
        : /\b(basic|a1|a2)\b/i.test(nearby)
          ? "beginner"
          : "intermediate";
      return { name, level };
    });
};

const detectCompetencies = (source: string, nature: string) => {
  const find = (items: string[]) => items.filter((item) => new RegExp(escapeRegExp(item).replace(/\s+/g, "\\s+"), "i").test(source));
  let core = find(CORE_COMPETENCIES);
  let management = find(MANAGEMENT_COMPETENCIES);
  let leadership = find(LEADERSHIP_COMPETENCIES);
  if (nature === "Intern") {
    core = core.slice(0, 2);
    management = [];
    leadership = [];
  } else {
    const combined = [...core.map((v) => ["core", v] as const), ...management.map((v) => ["management", v] as const), ...leadership.map((v) => ["leadership", v] as const)].slice(0, 3);
    core = combined.filter(([type]) => type === "core").map(([, value]) => value);
    management = combined.filter(([type]) => type === "management").map(([, value]) => value);
    leadership = combined.filter(([type]) => type === "leadership").map(([, value]) => value);
  }
  return { core_competencies: core, management_competencies: management, leadership_competencies: leadership };
};

const parseAttachedJobDescription = (attachments: { filename: string; text: string }[], ctx: ContextInput): AIGeneratedPDResult => {
  const filenameText = attachments.map((attachment) => attachment.filename).join(" ");
  const documentText = attachments.map((attachment) => attachment.text).join("\n\n");
  const source = compact(`${filenameText}\n${documentText}`);
  const filenameHints = parseFilenameHints(filenameText);
  const title = firstCapture(source, [
    /\b(?:position|post|job)\s+title\s*:?\s*(.{3,140}?)(?=\s+(?:nature|grade|level|unit|section|division|duty\s+station|organizational|purpose|reports)\b|$)/i,
    /\btitle\s*:?\s*(.{3,140}?)(?=\s+(?:nature|grade|level|unit|section|division|duty\s+station|organizational|purpose|reports)\b|$)/i,
  ]) || filenameHints.title || ctx.positionTitle || null;
  const nature = pickFromList(source, NATURE_OPTIONS) || detectNature(source) || ctx.natureOfPosition || null;
  const grade = firstCapture(source, [/\b(?:grade|level)\s*:?\s*(G[3-7]|P[1-5]|D[12])\b/i, /\b(G[3-7]|P[1-5]|D[12])\b/i]).toUpperCase() || filenameHints.grade || ctx.gradeLevel || null;
  const { division, unit } = detectDivisionAndUnit(source);
  const purpose = extractSection(source, [/\bpurpose\s+of\s+(?:the\s+)?position\s*:?/i, /\bmain\s+purpose\s*:?/i], [/\b(?:main\s+)?duties\s+(?:and\s+)?responsibilities\b/i, /\bkey\s+duties\b/i, /\brecruitment\s+profile\b/i, /\beducation\b/i, /\bexperience\b/i]);
  const dutiesSection = extractSection(source, [/\b(?:main\s+)?duties\s+(?:and\s+)?responsibilities\s*:?/i, /\bkey\s+duties\s*:?/i, /\bfunctions\s*:?/i], [/\brecruitment\s+profile\b/i, /\beducation\b/i, /\bexperience\b/i, /\blanguages?\b/i, /\bcompetenc(?:y|ies)\b/i]);
  const educationSection = extractSection(source, [/\beducation\s*:?/i, /\bacademic\s+qualifications\s*:?/i], [/\bexperience\s*:?/i, /\blanguages?\s*:?/i, /\bcompetenc(?:y|ies)\s*:?/i, /\bskills\s*:?/i]);
  const experienceSection = extractSection(source, [/\bexperience\s*:?/i, /\bwork\s+experience\s*:?/i, /\bprofessional\s+experience\s*:?/i], [/\beducation\s*:?/i, /\blanguages?\s*:?/i, /\bcompetenc(?:y|ies)\s*:?/i, /\bskills\s*:?/i]);
  const education = splitEssentialDesirable(educationSection);
  const experience = splitEssentialDesirable(experienceSection);
  const competencies = detectCompetencies(source, nature || "");

  return {
    position_title: title,
    nature_of_position: nature,
    grade,
    duty_station: detectDutyStations(source, nature || ""),
    division: division || null,
    unit_section_division: unit || null,
    purpose_of_position: purpose,
    main_duties_responsibilities: formatDuties(dutiesSection),
    essential_experience: experience.essential,
    desirable_experience: experience.desirable,
    essential_education: education.essential,
    essential_education_level: educationLevel(education.essential),
    desirable_education: education.desirable,
    additional_languages: detectLanguages(source),
    ...competencies,
  };
};

const hasExtractedContent = (result: AIGeneratedPDResult) =>
  !!result.position_title || !!result.nature_of_position || !!result.grade || result.duty_station.length > 0 || !!result.unit_section_division || !!result.purpose_of_position || !!result.main_duties_responsibilities || !!result.essential_experience || !!result.essential_education || result.core_competencies.length > 0 || result.management_competencies.length > 0 || result.leadership_competencies.length > 0;

async function extractPdfText(file: File): Promise<string> {
  // pdfjs-dist v5 ESM build
  const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
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

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const runGeneration = async (mode: "overwrite" | "fillEmpty", filesOverride?: File[]) => {
    const ctx = getContext();
    const filesToUse = filesOverride ?? files;
    const hasAttachments = filesToUse.length > 0;
    if (!hasAttachments && !ctx.positionTitle?.trim()) {
      toast({ title: "Position title required", description: "Enter a position title or attach a JD before generating.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const attachments: { filename: string; text: string }[] = [];
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
      const filled: AIGeneratedPDResult = {
        position_title: result.position_title ?? null,
        nature_of_position: result.nature_of_position ?? null,
        grade: result.grade ?? null,
        duty_station: Array.isArray(result.duty_station) ? result.duty_station : [],
        division: result.division ?? null,
        unit_section_division: result.unit_section_division ?? null,
        purpose_of_position: result.purpose_of_position || "",
        main_duties_responsibilities: result.main_duties_responsibilities || "",
        essential_experience: result.essential_experience || "",
        desirable_experience: result.desirable_experience || "",
        essential_education: result.essential_education || "",
        essential_education_level: result.essential_education_level || "",
        desirable_education: result.desirable_education || "",
        additional_languages: Array.isArray(result.additional_languages) ? result.additional_languages : [],
        core_competencies: Array.isArray(result.core_competencies) ? result.core_competencies : [],
        management_competencies: Array.isArray(result.management_competencies) ? result.management_competencies : [],
        leadership_competencies: Array.isArray(result.leadership_competencies) ? result.leadership_competencies : [],
      };
      const anyContent =
        !!filled.position_title ||
        !!filled.nature_of_position ||
        !!filled.grade ||
        filled.duty_station.length > 0 ||
        !!filled.unit_section_division ||
        !!filled.purpose_of_position ||
        !!filled.main_duties_responsibilities ||
        !!filled.essential_experience ||
        !!filled.essential_education ||
        filled.additional_languages.length > 0 ||
        filled.core_competencies.length > 0 ||
        filled.management_competencies.length > 0 ||
        filled.leadership_competencies.length > 0;
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
          disabled={loading || (!canGenerate && !hasFiles)}
          className="gap-2"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Generating…" : "Generate with AI"}
        </Button>
        {!canGenerate && !hasFiles && (
          <span className="text-xs text-muted-foreground">
            {missingFieldsLabel || "Fill position title, grade, and division — or attach a JD — to enable AI generation."}
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
