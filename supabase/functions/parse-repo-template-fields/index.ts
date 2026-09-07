import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "node:buffer";

/** Extract {{placeholders}} from a PDF using pdf-parse */
async function extractFieldsFromPDF(fileBytes: Uint8Array): Promise<string[]> {
  const fields: string[] = [];
  const fieldRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

  try {
    const pdfParse = (await import("npm:pdf-parse@1.1.1/lib/pdf-parse.js")).default;
    const data = await pdfParse(Buffer.from(fileBytes));
    
    console.log("PDF text extracted, length:", data.text.length);
    console.log("PDF text sample:", data.text.substring(0, 500));

    let match;
    while ((match = fieldRegex.exec(data.text)) !== null) {
      if (!fields.includes(match[1])) {
        fields.push(match[1]);
      }
    }
  } catch (err: any) {
    console.error("pdf-parse failed:", err.message);
    
    // Fallback: raw text search
    const text = new TextDecoder("latin1").decode(fileBytes);
    let match;
    while ((match = fieldRegex.exec(text)) !== null) {
      if (!fields.includes(match[1])) {
        fields.push(match[1]);
      }
    }
  }

  console.log("Total fields found:", fields.length, fields);
  return fields;
}

/** Extract {{placeholders}} from a DOCX file */
async function extractFieldsFromDOCX(fileData: Blob): Promise<string[]> {
  const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
  const zip = await JSZip.loadAsync(await fileData.arrayBuffer());

  const fields: string[] = [];
  const fieldRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

  const xmlFiles = [
    "word/document.xml", "word/header1.xml", "word/header2.xml", "word/header3.xml",
    "word/footer1.xml", "word/footer2.xml", "word/footer3.xml",
  ];

  for (const xmlFile of xmlFiles) {
    const file = zip.file(xmlFile);
    if (file) {
      const content = await file.async("string");
      let match;
      while ((match = fieldRegex.exec(content)) !== null) {
        if (!fields.includes(match[1])) fields.push(match[1]);
      }
      const plainText = content.replace(/<[^>]+>/g, "");
      fieldRegex.lastIndex = 0;
      while ((match = fieldRegex.exec(plainText)) !== null) {
        if (!fields.includes(match[1])) fields.push(match[1]);
      }
    }
  }

  return fields;
}

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

    const { file_path } = await req.json();

    if (!file_path) {
      return new Response(JSON.stringify({ error: "file_path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("document-repository")
      .download(file_path);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download file: " + downloadError?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPDF = file_path.toLowerCase().endsWith(".pdf");
    let fields: string[];

    if (isPDF) {
      const bytes = new Uint8Array(await fileData.arrayBuffer());
      fields = await extractFieldsFromPDF(bytes);
    } else {
      fields = await extractFieldsFromDOCX(fileData);
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
