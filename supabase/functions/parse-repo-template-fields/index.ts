import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Decompress a FlateDecode stream */
async function decompressStream(rawBytes: Uint8Array): Promise<string | null> {
  try {
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
    } catch { /* done */ }

    if (chunks.length === 0) return null;
    const total = chunks.reduce((a, c) => a + c.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder("latin1").decode(result);
  } catch {
    return null;
  }
}

/** Extract all text strings from a PDF content stream and concatenate them */
function extractTextFromContentStream(content: string): string {
  // PDF text is in parenthesized strings: (text) Tj or [(text) 0 (text)] TJ
  // Extract all text between parentheses, handling escape sequences
  const parts: string[] = [];
  let i = 0;
  while (i < content.length) {
    if (content[i] === '(') {
      let depth = 1;
      let text = '';
      i++;
      while (i < content.length && depth > 0) {
        if (content[i] === '\\') {
          i++;
          if (i < content.length) {
            switch (content[i]) {
              case 'n': text += '\n'; break;
              case 'r': text += '\r'; break;
              case 't': text += '\t'; break;
              case '(': text += '('; break;
              case ')': text += ')'; break;
              case '\\': text += '\\'; break;
              default: text += content[i]; break;
            }
          }
        } else if (content[i] === '(') {
          depth++;
          text += '(';
        } else if (content[i] === ')') {
          depth--;
          if (depth > 0) text += ')';
        } else {
          text += content[i];
        }
        i++;
      }
      parts.push(text);
    } else {
      i++;
    }
  }
  return parts.join('');
}

/** Try multiple decompression strategies */
async function tryDecompress(rawBytes: Uint8Array): Promise<string | null> {
  // Strategy 1: deflate (raw)
  const result1 = await decompressStream(rawBytes);
  if (result1 && result1.length > 0) return result1;

  // Strategy 2: skip first 2 bytes (zlib header) and try raw deflate
  if (rawBytes.length > 2) {
    const withoutHeader = rawBytes.slice(2);
    const result2 = await decompressStream(withoutHeader);
    if (result2 && result2.length > 0) return result2;
  }

  // Strategy 3: try "raw" format with DecompressionStream("raw")
  try {
    const ds = new DecompressionStream("raw" as any);
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
    } catch { /* done */ }
    if (chunks.length > 0) {
      const total = chunks.reduce((a, c) => a + c.length, 0);
      const result = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
      return new TextDecoder("latin1").decode(result);
    }
  } catch { /* ignore */ }

  return null;
}

/** Extract {{placeholders}} from a PDF's raw bytes */
async function extractFieldsFromPDF(fileBytes: Uint8Array): Promise<string[]> {
  const fields: string[] = [];
  const fieldRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

  const text = new TextDecoder("latin1").decode(fileBytes);
  
  console.log("PDF size:", fileBytes.length, "bytes, text length:", text.length);

  // 1. Direct search in raw bytes (works for uncompressed streams)
  let match;
  while ((match = fieldRegex.exec(text)) !== null) {
    if (!fields.includes(match[1])) {
      fields.push(match[1]);
      console.log("Found field in raw text:", match[1]);
    }
  }

  // 2. Find all streams and process them
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let streamMatch;
  let streamCount = 0;
  let decompressedCount = 0;
  
  while ((streamMatch = streamRegex.exec(text)) !== null) {
    streamCount++;
    const fullMatch = streamMatch[0];
    const newlineIdx = fullMatch.indexOf("\n") + 1;
    const endIdx = fullMatch.lastIndexOf("endstream");
    const streamContent = fullMatch.substring(newlineIdx, endIdx);

    // Check if this is a FlateDecode stream
    const beforeStream = text.substring(Math.max(0, streamMatch.index - 500), streamMatch.index);
    const isFlateDecode = beforeStream.includes("/FlateDecode");

    let contentText: string | null = null;

    if (isFlateDecode) {
      // Convert latin1 string back to bytes
      const rawBytes = new Uint8Array(streamContent.length);
      for (let i = 0; i < streamContent.length; i++) {
        rawBytes[i] = streamContent.charCodeAt(i);
      }
      contentText = await tryDecompress(rawBytes);
      if (contentText) {
        decompressedCount++;
        console.log(`Stream ${streamCount} decompressed: ${contentText.length} chars, sample: ${contentText.substring(0, 300)}`);
      } else {
        console.log(`Stream ${streamCount} decompression FAILED, raw size: ${rawBytes.length}`);
      }
    } else {
      contentText = streamContent;
      console.log(`Stream ${streamCount} uncompressed, size: ${contentText.length}, sample: ${contentText.substring(0, 200)}`);
    }

    if (!contentText) continue;

    // Extract concatenated text from PDF operators
    const concatenatedText = extractTextFromContentStream(contentText);
    
    if (concatenatedText.length > 0) {
      console.log(`Stream ${streamCount} extracted text (${concatenatedText.length} chars): ${concatenatedText.substring(0, 300)}`);
    }

    fieldRegex.lastIndex = 0;
    while ((match = fieldRegex.exec(concatenatedText)) !== null) {
      if (!fields.includes(match[1])) {
        fields.push(match[1]);
        console.log("Found field in concatenated text:", match[1]);
      }
    }

    // Also search the raw decompressed content directly
    fieldRegex.lastIndex = 0;
    while ((match = fieldRegex.exec(contentText)) !== null) {
      if (!fields.includes(match[1])) {
        fields.push(match[1]);
        console.log("Found field in raw stream:", match[1]);
      }
    }
  }

  console.log(`Processed ${streamCount} streams, ${decompressedCount} decompressed successfully`);
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
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
