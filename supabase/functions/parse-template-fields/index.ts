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

    const { file_path, template_id } = await req.json();

    if (!file_path || !template_id) {
      return new Response(JSON.stringify({ error: "file_path and template_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("document-templates")
      .download(file_path);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download template: " + downloadError?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DOCX files are ZIP archives. We need to read word/document.xml
    // Use the JSZip library to extract
    const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
    const zip = await JSZip.loadAsync(await fileData.arrayBuffer());

    const fields: string[] = [];
    const fieldRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

    // Search through all XML files in the docx for placeholders
    const xmlFiles = ["word/document.xml", "word/header1.xml", "word/header2.xml", "word/header3.xml", "word/footer1.xml", "word/footer2.xml", "word/footer3.xml"];

    for (const xmlFile of xmlFiles) {
      const file = zip.file(xmlFile);
      if (file) {
        const content = await file.async("string");
        
        // DOCX XML may split placeholders across multiple XML runs
        // First, try to find intact placeholders
        let match;
        while ((match = fieldRegex.exec(content)) !== null) {
          if (!fields.includes(match[1])) {
            fields.push(match[1]);
          }
        }

        // Also try to find placeholders that might be split across XML tags
        // Remove XML tags and search the plain text
        const plainText = content.replace(/<[^>]+>/g, "");
        fieldRegex.lastIndex = 0;
        while ((match = fieldRegex.exec(plainText)) !== null) {
          if (!fields.includes(match[1])) {
            fields.push(match[1]);
          }
        }
      }
    }

    // Update the template record with detected fields
    const { error: updateError } = await supabase
      .from("document_templates")
      .update({ fields: fields })
      .eq("id", template_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update template: " + updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ fields }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
