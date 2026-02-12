import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Extract {{placeholders}} from a PDF's raw bytes, handling both compressed and uncompressed streams */
async function extractFieldsFromPDF(fileBytes: Uint8Array): Promise<string[]> {
  const fields: string[] = [];
  const fieldRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

  const text = new TextDecoder("latin1").decode(fileBytes);

  // 1. Search uncompressed text in the raw PDF bytes
  let match;
  while ((match = fieldRegex.exec(text)) !== null) {
    if (!fields.includes(match[1])) {
      fields.push(match[1]);
    }
  }

  // 2. Find and decompress FlateDecode streams
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let streamMatch;
  while ((streamMatch = streamRegex.exec(text)) !== null) {
    try {
      // Get the raw stream bytes using the match position
      const streamStart = streamMatch.index + streamMatch[0].indexOf("\n") + 1;
      const streamContent = text.substring(streamStart, streamMatch.index + streamMatch[0].length - "endstream".length);
      
      // Try to decompress if it's a FlateDecode stream
      // Check the object dictionary before this stream for /FlateDecode
      const beforeStream = text.substring(Math.max(0, streamMatch.index - 500), streamMatch.index);
      if (beforeStream.includes("/FlateDecode")) {
        try {
          const rawBytes = new Uint8Array(streamContent.length);
          for (let i = 0; i < streamContent.length; i++) {
            rawBytes[i] = streamContent.charCodeAt(i);
          }
          
          const ds = new DecompressionStream("deflate");
          const writer = ds.writable.getWriter();
          const reader = ds.readable.getReader();
          
          writer.write(rawBytes).catch(() => {});
          writer.close().catch(() => {});
          
          const chunks: Uint8Array[] = [];
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
            }
          } catch { /* stream ended */ }
          
          if (chunks.length > 0) {
            const totalLength = chunks.reduce((a, c) => a + c.length, 0);
            const decompressed = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
              decompressed.set(chunk, offset);
              offset += chunk.length;
            }
            
            const decompressedText = new TextDecoder("latin1").decode(decompressed);
            fieldRegex.lastIndex = 0;
            while ((match = fieldRegex.exec(decompressedText)) !== null) {
              if (!fields.includes(match[1])) {
                fields.push(match[1]);
              }
            }
          }
        } catch { /* decompression failed, skip */ }
      }
    } catch { /* skip this stream */ }
  }

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
        if (!fields.includes(match[1])) {
          fields.push(match[1]);
        }
      }
      const plainText = content.replace(/<[^>]+>/g, "");
      fieldRegex.lastIndex = 0;
      while ((match = fieldRegex.exec(plainText)) !== null) {
        if (!fields.includes(match[1])) {
          fields.push(match[1]);
        }
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
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
