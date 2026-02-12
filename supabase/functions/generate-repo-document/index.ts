import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Decompress a FlateDecode stream */
async function decompressStream(rawBytes: Uint8Array): Promise<Uint8Array | null> {
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
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
  } catch { return null; }
}

/** Compress data with deflate */
async function compressStream(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  const reader = cs.readable.getReader();
  writer.write(data).catch(() => {});
  writer.close().catch(() => {});
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } catch { /* done */ }
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

/** 
 * Replace {{placeholders}} inside PDF text operators.
 * Handles text split across multiple PDF string operators like ({{) (name) (}})
 * by concatenating text within TJ arrays and Tj operators.
 */
function replaceInContentStream(content: string, fieldValues: Record<string, string>): string {
  // Strategy: Find sequences of text operators and replace placeholders
  // PDF uses (text) Tj and [(text) kerning (text)] TJ
  
  // First, try simple replacement in parenthesized strings
  let modified = content;
  
  for (const [fieldName, value] of Object.entries(fieldValues)) {
    const safeValue = String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    
    // Replace within single parenthesized strings
    const placeholder = `{{${fieldName}}}`;
    const escapedPlaceholder = placeholder.replace(/\{/g, "\\{").replace(/\}/g, "\\}");
    
    // Direct replacement in string literals
    modified = modified.split(placeholder).join(safeValue);
  }
  
  // Handle placeholders split across TJ array elements: [({{) 0 (name) 0 (}})] TJ
  // We need to find TJ arrays, concatenate text, replace, and rebuild
  const tjArrayRegex = /\[((?:\s*\([^)]*\)\s*[-\d.]*\s*)+)\]\s*TJ/g;
  modified = modified.replace(tjArrayRegex, (fullMatch, arrayContent) => {
    // Extract all text parts from the TJ array
    const textParts: { text: string; original: string }[] = [];
    const partRegex = /\(([^)]*)\)/g;
    let partMatch;
    while ((partMatch = partRegex.exec(arrayContent)) !== null) {
      textParts.push({ text: partMatch[1], original: partMatch[0] });
    }
    
    // Concatenate all text
    let concatenated = textParts.map(p => p.text).join('');
    
    // Check if any placeholder exists
    let hasReplacement = false;
    for (const [fieldName, value] of Object.entries(fieldValues)) {
      const placeholder = `{{${fieldName}}}`;
      if (concatenated.includes(placeholder)) {
        const safeValue = String(value)
          .replace(/\\/g, "\\\\")
          .replace(/\(/g, "\\(")
          .replace(/\)/g, "\\)");
        concatenated = concatenated.split(placeholder).join(safeValue);
        hasReplacement = true;
      }
    }
    
    if (!hasReplacement) return fullMatch;
    
    // Rebuild as a single text string
    return `[(${concatenated})] TJ`;
  });
  
  return modified;
}

/** Replace {{placeholders}} in PDF bytes */
async function fillPDF(fileBytes: Uint8Array, fieldValues: Record<string, string>): Promise<Uint8Array> {
  let text = new TextDecoder("latin1").decode(fileBytes);

  // Process each stream
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  const replacements: { matchStart: number; matchEnd: number; newStreamBytes: Uint8Array; isCompressed: boolean }[] = [];

  let streamMatch;
  while ((streamMatch = streamRegex.exec(text)) !== null) {
    const fullMatch = streamMatch[0];
    const newlineIdx = fullMatch.indexOf("\n") + 1;
    const streamContentStr = fullMatch.substring(newlineIdx, fullMatch.length - "endstream".length);
    
    const beforeStream = text.substring(Math.max(0, streamMatch.index - 500), streamMatch.index);
    const isCompressed = beforeStream.includes("/FlateDecode");

    let decompressedText: string;
    
    if (isCompressed) {
      const rawBytes = new Uint8Array(streamContentStr.length);
      for (let i = 0; i < streamContentStr.length; i++) {
        rawBytes[i] = streamContentStr.charCodeAt(i);
      }
      const decompressedBytes = await decompressStream(rawBytes);
      if (!decompressedBytes) continue;
      decompressedText = new TextDecoder("latin1").decode(decompressedBytes);
    } else {
      decompressedText = streamContentStr;
    }

    // Apply replacements
    const modifiedText = replaceInContentStream(decompressedText, fieldValues);
    
    if (modifiedText === decompressedText) continue; // No changes

    // Convert back to bytes
    const modifiedBytes = new Uint8Array(modifiedText.length);
    for (let i = 0; i < modifiedText.length; i++) {
      modifiedBytes[i] = modifiedText.charCodeAt(i);
    }

    let finalBytes: Uint8Array;
    if (isCompressed) {
      finalBytes = await compressStream(modifiedBytes);
    } else {
      finalBytes = modifiedBytes;
    }

    const contentStart = streamMatch.index + "stream".length + (fullMatch.charAt("stream".length) === '\r' ? 2 : 1);
    const contentEnd = streamMatch.index + fullMatch.length - "endstream".length;

    replacements.push({
      matchStart: contentStart,
      matchEnd: contentEnd,
      newStreamBytes: finalBytes,
      isCompressed,
    });
  }

  if (replacements.length === 0) {
    // No compressed streams had changes, try direct replacement in raw bytes
    for (const [fieldName, value] of Object.entries(fieldValues)) {
      const placeholder = `{{${fieldName}}}`;
      const safeValue = String(value)
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
      text = text.split(placeholder).join(safeValue);
    }
    const result = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) result[i] = text.charCodeAt(i);
    return result;
  }

  // Apply replacements in reverse order
  replacements.sort((a, b) => b.matchStart - a.matchStart);
  
  let resultBytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) resultBytes[i] = text.charCodeAt(i);

  for (const rep of replacements) {
    const before = resultBytes.slice(0, rep.matchStart);
    const after = resultBytes.slice(rep.matchEnd);
    const newResult = new Uint8Array(before.length + rep.newStreamBytes.length + after.length);
    newResult.set(before, 0);
    newResult.set(rep.newStreamBytes, before.length);
    newResult.set(after, before.length + rep.newStreamBytes.length);
    resultBytes = newResult;

    // Update /Length in the object dictionary  
    // Search backwards from stream start for /Length
    const headerSection = new TextDecoder("latin1").decode(before.slice(Math.max(0, before.length - 500)));
    const lengthMatch = headerSection.match(/\/Length\s+(\d+)/);
    if (lengthMatch) {
      const oldLengthStr = lengthMatch[0];
      const newLengthStr = `/Length ${rep.newStreamBytes.length}`;
      const paddedNew = newLengthStr.padEnd(oldLengthStr.length, " ");
      
      const headerStr = new TextDecoder("latin1").decode(resultBytes);
      const lengthPos = headerStr.lastIndexOf(oldLengthStr, rep.matchStart);
      if (lengthPos >= 0) {
        for (let i = 0; i < paddedNew.length; i++) {
          resultBytes[lengthPos + i] = paddedNew.charCodeAt(i);
        }
      }
    }
  }

  return resultBytes;
}

/** Replace {{placeholders}} in a DOCX file */
async function fillDOCX(fileData: Blob, fieldValues: Record<string, string>): Promise<Uint8Array> {
  const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
  const zip = await JSZip.loadAsync(await fileData.arrayBuffer());

  const xmlFiles = [
    "word/document.xml", "word/header1.xml", "word/header2.xml", "word/header3.xml",
    "word/footer1.xml", "word/footer2.xml", "word/footer3.xml",
  ];

  for (const xmlFile of xmlFiles) {
    const file = zip.file(xmlFile);
    if (file) {
      let content = await file.async("string");
      for (const [fieldName, value] of Object.entries(fieldValues)) {
        const safeValue = String(value)
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
        content = content.replace(new RegExp(`\\{\\{${fieldName}\\}\\}`, "g"), safeValue);
        content = content.replace(new RegExp(`\\{\\{(<[^>]*>)*${fieldName}(<[^>]*>)*\\}\\}`, "g"), safeValue);
      }
      zip.file(xmlFile, content);
    }
  }

  return await zip.generateAsync({ type: "uint8array" });
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

    const { file_path, field_values } = await req.json();

    if (!file_path || !field_values) {
      return new Response(JSON.stringify({ error: "file_path and field_values are required" }), {
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
    let outputBuffer: Uint8Array;
    let contentType: string;
    let fileExtension: string;

    if (isPDF) {
      const bytes = new Uint8Array(await fileData.arrayBuffer());
      outputBuffer = await fillPDF(bytes, field_values);
      contentType = "application/pdf";
      fileExtension = "pdf";
    } else {
      outputBuffer = await fillDOCX(fileData, field_values);
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      fileExtension = "docx";
    }

    const fileName = file_path.split("/").pop()?.replace(/\.[^.]+$/, "") || "document";

    return new Response(outputBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}_filled.${fileExtension}"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
