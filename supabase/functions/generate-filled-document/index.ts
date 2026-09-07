import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { template_id, field_values } = await req.json();

    if (!template_id || !field_values) {
      return new Response(JSON.stringify({ error: "template_id and field_values are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get template record
    const { data: template, error: templateError } = await supabase
      .from("document_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the template file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("document-templates")
      .download(template.file_path);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download template" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
    const zip = await JSZip.loadAsync(await fileData.arrayBuffer());

    // Replace placeholders in all relevant XML files
    const xmlFiles = ["word/document.xml", "word/header1.xml", "word/header2.xml", "word/header3.xml", "word/footer1.xml", "word/footer2.xml", "word/footer3.xml"];

    for (const xmlFile of xmlFiles) {
      const file = zip.file(xmlFile);
      if (file) {
        let content = await file.async("string");

        // Replace each field placeholder with its value
        for (const [fieldName, value] of Object.entries(field_values)) {
          const safeValue = String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

          // Replace intact placeholders
          const regex = new RegExp(`\\{\\{${fieldName}\\}\\}`, "g");
          content = content.replace(regex, safeValue);

          // Also handle placeholders split across XML runs
          // Pattern: {{field}} might be split as: {{, field, }}
          // We need to handle cases where XML tags appear between the braces
          const splitRegex = new RegExp(
            `\\{\\{(<[^>]*>)*${fieldName}(<[^>]*>)*\\}\\}`,
            "g"
          );
          content = content.replace(splitRegex, safeValue);
        }

        zip.file(xmlFile, content);
      }
    }

    // Generate the modified docx
    const outputBuffer = await zip.generateAsync({ type: "uint8array" });

    const fileName = `${template.name.replace(/\.[^.]+$/, "")}_filled.docx`;

    return new Response(outputBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
