import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Attachment {
  filename: string;
  text: string;
}

interface RequestBody {
  positionTitle?: string;
  natureOfPosition?: string;
  gradeLevel?: string;
  dutyStation?: string;
  unitSectionDivision?: string;
  objectivesOfProgramme?: string;
  attachments?: Attachment[];
}

const MAX_PER_FILE = 20000;
const MAX_TOTAL_CONTEXT = 50000;

const VALID_EDU_LEVELS = [
  "Secondary",
  "First Level University",
  "Advanced University",
  "Professional",
];
const VALID_LANG_LEVELS = ["beginner", "intermediate", "expert"];

const NATURE_OPTIONS = [
  "Fixed term",
  "Temporary",
  "Individual Consultant",
  "STDA",
  "Intern",
];
const GRADE_OPTIONS = [
  "G3", "G4", "G5", "G6", "G7",
  "P1", "P2", "P3", "P4", "P5",
  "D1", "D2",
];
const DUTY_STATIONS_BASE = ["Brindisi", "Geneva", "Lyon", "New York", "Rome", "Valencia"];

const DIVISION_KEYS = ["CS", "DD", "DS", "DO", "MS", "OP"] as const;
const DIVISION_NAMES: Record<string, string> = {
  CS: "Cybersecurity division (CS)",
  DD: "Digital Delivery division (DD)",
  DS: "Digital Solutions Centre (DS)",
  DO: "Director (DO)",
  MS: "Management and Strategy (MS)",
  OP: "Operations (OP)",
};
const DIVISION_UNITS: Record<string, string[]> = {
  CS: [
    "CISO Section (CISO)",
    "Investigative Support Unit (CSI)",
    "Cybersecurity Solutions & Strategy Unit (CSS)",
    "Cybersecurity Assurance & Architecture Section (CSA)",
    "Cybersecurity Engineering Unit (CSE)",
    "Cybersecurity Networking Unit (CSN)",
    "Cybersecurity Operations Section (CSO)",
    "Organizational Resilience Unit (CSR)",
  ],
  DD: [
    "Data and Artificial Intelligence Section (DDA)",
    "Digital Development Center Section (DDC)",
    "Digital Business Solutions Section (DDD)",
    "Artificial Intelligence and Machine Learning Unit (DDAI)",
    "Data Management Unit (DDAM)",
    "Enterprise Service Management Unit (DDES)",
    "Enterprise Solutions Section (DDE)",
    "Hyperautomation Solutions Unit (DDHA)",
    "MS Dynamics Unit (DDMS)",
    "Projects & Programmes Section (DDP)",
    "Programme Portfolio Unit (DDPG)",
    "Project Portfolio Unit (DDPM)",
    "Governance PMO Unit (DDPO)",
  ],
  DS: [
    "Digital Products Unit (DSDP)",
    "Business Solutions Unit (DSB)",
    "Digital Customer Services Unit (DSCS)",
    "Unite Digital Workspace Services Unit (DSDW)",
    "Learning Services Unit (DSL)",
    "Digital Public Solutions Unit (DSPS)",
  ],
  DO: [
    "UNICC Directorate (DOD)",
    "External Relations and Strategic Partnerships Section (DOE)",
    "Digital ID Programme (DOP)",
    "Business Relationship Management Section (DBR)",
  ],
  MS: [
    "Policy (Legal) Unit (MSL)",
    "Business Control Section (MSB)",
    "Process and Change Unit (MSBP)",
    "Finance and Accounting Section (MSF)",
    "GRC & QA Unit (MSG)",
    "Human Resources Section (MSH)",
    "Talent Unit (MSHT)",
    "Procurement Section (MSP)",
  ],
  OP: [
    "Infrastructure and Platform Operations Unit (OPBO)",
    "Customer IT Resilience Team (OPBR)",
    "Data Center Support Unit (OPBS)",
    "Customer Services Centre (OPC)",
    "Service Desk Unit (OPCS)",
    "Cloud Services Section (OPD)",
    "Cloud Operations and Platform Service Unit (OPDA)",
    "Digital Workplace Service Unit (OPDM)",
    "Infrastructure and Operations Business Section (OPM)",
    "Service Excellence Unit (OPMX)",
    "On-premise Services (OPO)",
    "Platform Architecture and Service Automation Unit (OPOA)",
    "Oracle Unit (OPOU)",
    "SAP Unit (OPOS)",
  ],
};
const ALL_UNITS = Object.values(DIVISION_UNITS).flat();

const CORE_COMPETENCIES = [
  "Knowing and managing yourself",
  "Producing results",
  "Moving forward in a changing environment",
  "Setting an example",
];
const MANAGEMENT_COMPETENCIES = [
  "Ensuring effective use of resources",
  "Building and promoting partnerships across the Organization and beyond",
];
const LEADERSHIP_COMPETENCIES = [
  "Driving UNICC to a successful future",
  "Promoting innovation and Organizational learning",
  "Promoting UNICC's position",
];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const pickFromList = (val: unknown, allowed: string[]): string | null => {
  if (typeof val !== "string") return null;
  const t = val.trim();
  if (!t) return null;
  // exact
  const exact = allowed.find((a) => a.toLowerCase() === t.toLowerCase());
  if (exact) return exact;
  // contains (e.g. "P3 (Project Manager)" -> "P3")
  const contained = allowed.find((a) =>
    new RegExp(`(^|[^A-Za-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`, "i").test(t),
  );
  return contained || null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Missing authorization" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json(401, { error: "Unauthorized" });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return json(500, { error: "LOVABLE_API_KEY not configured" });
    }

    const body = (await req.json()) as RequestBody;

    const hasAttachments = Array.isArray(body.attachments) && body.attachments.length > 0;

    // Title is no longer strictly required when a JD is attached — the AI will extract it.
    if (!hasAttachments && (!body.positionTitle || body.positionTitle.trim().length < 2)) {
      return json(400, { error: "positionTitle is required when no JD is attached" });
    }

    let attachmentContext = "";
    if (hasAttachments) {
      const parts: string[] = [];
      let total = 0;
      for (const att of body.attachments!) {
        const text = (att.text || "").trim();
        if (!text) continue;
        const truncated = text.slice(0, MAX_PER_FILE);
        const block = `--- Attached JD: ${att.filename} ---\n${truncated}\n`;
        if (total + block.length > MAX_TOTAL_CONTEXT) break;
        parts.push(block);
        total += block.length;
      }
      attachmentContext = parts.join("\n");
    }

    const ctx: string[] = [];
    if (body.positionTitle) ctx.push(`Position Title (already entered): ${body.positionTitle}`);
    if (body.natureOfPosition) ctx.push(`Nature of Position (already entered): ${body.natureOfPosition}`);
    if (body.gradeLevel) ctx.push(`Grade/Level (already entered): ${body.gradeLevel}`);
    if (body.dutyStation) ctx.push(`Duty Station (already entered): ${body.dutyStation}`);
    if (body.unitSectionDivision) ctx.push(`Unit/Section/Division (already entered): ${body.unitSectionDivision}`);
    if (body.objectivesOfProgramme) ctx.push(`Programme Objectives: ${body.objectivesOfProgramme}`);

    const divisionsList = DIVISION_KEYS.map((k) => `${k} = ${DIVISION_NAMES[k]}`).join("; ");
    const unitsList = Object.entries(DIVISION_UNITS)
      .map(([k, units]) => `${k}: [${units.map((u) => `"${u}"`).join(", ")}]`)
      .join("\n  ");

    const systemPrompt = `You are an HR specialist drafting UN/UNICC position descriptions. Write in a professional UN tone, third person, present tense. Be specific and concise.

${hasAttachments
  ? "You have one or more attached job descriptions. EXTRACT the requested fields from the attached JD(s) as faithfully as possible. Prefer the attached text verbatim or lightly edited. Only return null for a field if it is genuinely absent from the JD and cannot be inferred with high confidence."
  : "No JD is attached. Generate plausible content from the position title, nature, and grade. For closed-list fields (nature_of_position, grade, duty_station, division, unit_section_division, competencies) return null unless you are confident."}

Output STRICT JSON with EXACTLY these keys. Use null for any field you cannot determine. Use [] for empty arrays.
{
  "position_title": "Short job title, e.g. 'Senior Cybersecurity Engineer'. null if not in JD.",
  "nature_of_position": "EXACTLY one of: ${NATURE_OPTIONS.map((n) => `'${n}'`).join(", ")}. Map: permanent/regular -> 'Fixed term'; temporary appointment -> 'Temporary'; consultant/consultancy -> 'Individual Consultant'; secondment/STDA -> 'STDA'; internship/intern -> 'Intern'. null otherwise.",
  "grade": "EXACTLY one of: ${GRADE_OPTIONS.map((g) => `'${g}'`).join(", ")}. null otherwise.",
  "duty_station": ["EXACT subset of: ${DUTY_STATIONS_BASE.map((s) => `'${s}'`).join(", ")} (plus 'Remote' only if nature is Intern or Individual Consultant). [] if not stated."],
  "division": "EXACTLY one key from: ${divisionsList}. null otherwise.",
  "unit_section_division": "EXACT string from the unit list for the chosen division, OR the division's main name itself. null if uncertain. Allowed units per division:\n  ${unitsList}",
  "purpose_of_position": "2-4 sentences, the context and main purpose. null if not determinable.",
  "main_duties_responsibilities": "Markdown bulleted list of 6-10 duties. Each bullet: WHAT (active verb), WHY (purpose/scope), HOW (process/tasks). null if not determinable.",
  "essential_experience": "Plain text. Required minimum years and type of experience. Use UN phrasing. null if not determinable.",
  "desirable_experience": "Plain text. null if not stated.",
  "essential_education": "Plain text. Required field(s) of study, e.g. 'Advanced university degree in Computer Science, Information Systems, or related field.' null if not determinable.",
  "essential_education_level": "EXACTLY one of: 'Secondary', 'First Level University', 'Advanced University', 'Professional'. null otherwise.",
  "desirable_education": "Plain text. null if not stated.",
  "additional_languages": [ { "name": "<Language>", "level": "beginner" | "intermediate" | "expert" } ],
  "core_competencies": ["EXACT subset of: ${CORE_COMPETENCIES.map((c) => `'${c}'`).join(", ")}"],
  "management_competencies": ["EXACT subset of: ${MANAGEMENT_COMPETENCIES.map((c) => `'${c}'`).join(", ")}"],
  "leadership_competencies": ["EXACT subset of: ${LEADERSHIP_COMPETENCIES.map((c) => `'${c}'`).join(", ")}"]
}

Rules:
- Do not invent specific project, client, donor, or person names.
- Where a supervisor reference is needed, use the literal placeholder "[SUPERVISOR TITLE]".
- For essential_education_level, map: Bachelor/Licence/Undergraduate -> "First Level University"; Master/PhD/Doctorate/Advanced -> "Advanced University"; High School/Secondary -> "Secondary"; Professional Certification only -> "Professional".
- For language levels: native/fluent/proficient/C1/C2 -> "expert"; working/B1/B2/intermediate -> "intermediate"; basic/A1/A2 -> "beginner".
- Do NOT include English in additional_languages. Only list OTHER languages mentioned in the JD.
- Competencies: pick only those clearly evidenced in the JD. Match the listed names by meaning if the JD uses synonyms.
- Output ONLY the JSON object. No headings, no preambles, no commentary, no code fences.`;

    const userPrompt = `Context:\n${ctx.length ? ctx.join("\n") : "(no metadata entered yet — extract everything from the JD)"}\n\n${attachmentContext ? `Reference job description(s):\n${attachmentContext}\n\n` : ""}Return the JSON object now.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return json(429, { error: "Rate limited. Please try again shortly." });
    }
    if (aiRes.status === 402) {
      return json(402, { error: "AI credits exhausted. Add credits to your workspace." });
    }
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      return json(500, { error: `AI error ${aiRes.status}` });
    }

    const data = await aiRes.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    let parsed: Record<string, unknown> = {};
    try {
      let txt = content.trim();
      if (txt.includes("```")) {
        const m = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) txt = m[1].trim();
      }
      parsed = JSON.parse(txt);
    } catch (e) {
      console.error("JSON parse failed", e, content);
      return json(500, { error: "AI returned non-JSON response" });
    }

    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const strOrNull = (v: unknown) => {
      const s = str(v).trim();
      return s ? s : null;
    };

    const eduLevelRaw = str(parsed.essential_education_level).trim();
    const eduLevel = VALID_EDU_LEVELS.includes(eduLevelRaw) ? eduLevelRaw : "";

    const rawLangs = Array.isArray(parsed.additional_languages) ? parsed.additional_languages : [];
    const additional_languages = rawLangs
      .map((l: any) => ({
        name: str(l?.name).trim(),
        level: VALID_LANG_LEVELS.includes(str(l?.level).toLowerCase().trim())
          ? str(l?.level).toLowerCase().trim()
          : "",
      }))
      .filter((l) => l.name && l.name.toLowerCase() !== "english" && l.level);

    // Enum validation
    const nature_of_position = pickFromList(parsed.nature_of_position, NATURE_OPTIONS);
    const grade = pickFromList(parsed.grade, GRADE_OPTIONS);

    const isRemoteEligible = nature_of_position === "Intern" || nature_of_position === "Individual Consultant";
    const dutyAllowed = isRemoteEligible ? [...DUTY_STATIONS_BASE, "Remote"] : DUTY_STATIONS_BASE;
    const rawDuty = Array.isArray(parsed.duty_station)
      ? parsed.duty_station
      : typeof parsed.duty_station === "string"
        ? [parsed.duty_station]
        : [];
    const duty_station = Array.from(
      new Set(
        rawDuty
          .map((d: unknown) => pickFromList(d, dutyAllowed))
          .filter((d): d is string => !!d),
      ),
    );

    const division = pickFromList(parsed.division, [...DIVISION_KEYS]);
    let unit_section_division: string | null = null;
    const rawUnit = str(parsed.unit_section_division).trim();
    if (rawUnit) {
      if (division) {
        const allowed = [
          DIVISION_NAMES[division],
          ...DIVISION_UNITS[division],
        ];
        unit_section_division = pickFromList(rawUnit, allowed);
      }
      if (!unit_section_division) {
        unit_section_division = pickFromList(rawUnit, ALL_UNITS);
      }
    }

    // Competencies
    const filterList = (raw: unknown, allowed: string[]) =>
      (Array.isArray(raw) ? raw : [])
        .map((c) => pickFromList(c, allowed))
        .filter((c): c is string => !!c)
        .filter((c, i, a) => a.indexOf(c) === i);

    let core_competencies = filterList(parsed.core_competencies, CORE_COMPETENCIES);
    let management_competencies = filterList(parsed.management_competencies, MANAGEMENT_COMPETENCIES);
    let leadership_competencies = filterList(parsed.leadership_competencies, LEADERSHIP_COMPETENCIES);

    // Enforce form rules: Intern -> max 2 core, no management/leadership.
    // Non-Intern -> max 3 across all three groups (core first priority).
    if (nature_of_position === "Intern") {
      core_competencies = core_competencies.slice(0, 2);
      management_competencies = [];
      leadership_competencies = [];
    } else {
      const MAX_TOTAL = 3;
      core_competencies = core_competencies.slice(0, MAX_TOTAL);
      const remainingAfterCore = MAX_TOTAL - core_competencies.length;
      management_competencies = management_competencies.slice(0, Math.max(0, remainingAfterCore));
      const remainingAfterMgmt = MAX_TOTAL - core_competencies.length - management_competencies.length;
      leadership_competencies = leadership_competencies.slice(0, Math.max(0, remainingAfterMgmt));
    }

    return json(200, {
      position_title: strOrNull(parsed.position_title),
      nature_of_position,
      grade,
      duty_station,
      division,
      unit_section_division,
      purpose_of_position: str(parsed.purpose_of_position),
      main_duties_responsibilities: str(parsed.main_duties_responsibilities),
      essential_experience: str(parsed.essential_experience),
      desirable_experience: str(parsed.desirable_experience),
      essential_education: str(parsed.essential_education),
      essential_education_level: eduLevel,
      desirable_education: str(parsed.desirable_education),
      additional_languages,
      core_competencies,
      management_competencies,
      leadership_competencies,
    });
  } catch (e) {
    console.error("generate-position-description error", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
