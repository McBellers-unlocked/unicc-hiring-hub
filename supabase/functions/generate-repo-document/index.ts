import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, PDFRawStream, PDFName, PDFNumber } from "https://esm.sh/pdf-lib@1.17.1";

/** Decompress a FlateDecode stream */
async function decompressStream(rawBytes: Uint8Array): Promise<Uint8Array | null> {
  for (const format of ["deflate", "raw"] as const) {
    try {
      const ds = new DecompressionStream(format as string);
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
        return result;
      }
    } catch { /* try next */ }
  }
  if (rawBytes.length > 2) {
    try {
      const ds = new DecompressionStream("deflate" as string);
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      writer.write(rawBytes.slice(2)).catch(() => {});
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
        return result;
      }
    } catch { /* give up */ }
  }
  return null;
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
 * Replace {{placeholders}} in text content, handling PDF text operators.
 * Handles text split across multiple PDF string operators like ({{) (name) (}})
 */
function replaceInContentStream(content: string, fieldValues: Record<string, string>): string {
  let modified = content;

  for (const [fieldName, value] of Object.entries(fieldValues)) {
    const safeValue = String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

    // Replace literal braces form
    const placeholder = `{{${fieldName}}}`;
    modified = modified.split(placeholder).join(safeValue);

    // Replace escaped braces form (as PDF strings may encode them)
    const escapedPlaceholder = `\\{\\{${fieldName}\\}\\}`;
    modified = modified.split(escapedPlaceholder).join(safeValue);
  }

  // Handle placeholders split across TJ array elements
  const tjArrayRegex = /\[((?:\s*\([^)]*\)\s*[-\d.]*\s*)+)\]\s*TJ/g;
  modified = modified.replace(tjArrayRegex, (fullMatch, arrayContent) => {
    const textParts: string[] = [];
    const partRegex = /\(([^)]*)\)/g;
    let partMatch;
    while ((partMatch = partRegex.exec(arrayContent)) !== null) {
      // Unescape braces within each text part
      textParts.push(partMatch[1].replace(/\\\{/g, "{").replace(/\\\}/g, "}"));
    }

    let concatenated = textParts.join('');
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
    return `[(${concatenated})] TJ`;
  });

  // Also handle individual Tj operators with split placeholders
  // Match sequences of adjacent (text) Tj operators
  const tjSequenceRegex = /(?:\(([^)]*)\)\s*Tj\s*){2,}/g;
  modified = modified.replace(tjSequenceRegex, (fullMatch) => {
    const parts: string[] = [];
    const singleTjRegex = /\(([^)]*)\)\s*Tj/g;
    let m;
    while ((m = singleTjRegex.exec(fullMatch)) !== null) {
      parts.push(m[1].replace(/\\\{/g, "{").replace(/\\\}/g, "}"));
    }
    let concatenated = parts.join('');
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
    return `(${concatenated}) Tj`;
  });

  return modified;
}

/** Replace {{placeholders}} in PDF bytes using pdf-lib for structural integrity */
async function fillPDF(fileBytes: Uint8Array, fieldValues: Record<string, string>): Promise<Uint8Array> {
  console.log("fillPDF called with field keys:", Object.keys(fieldValues));
  console.log("fillPDF field values:", JSON.stringify(fieldValues).substring(0, 500));
  
  const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const context = pdfDoc.context;

  let totalModified = 0;

  // Iterate all indirect objects looking for streams
  const allRefs = context.enumerateIndirectObjects();

  for (const [ref, obj] of allRefs) {
    // Only process stream objects
    if (!(obj instanceof PDFRawStream)) continue;

    const dict = obj.dict;
    const filterEntry = dict.get(PDFName.of("Filter"));
    const isFlate = filterEntry?.toString() === "/FlateDecode";

    // Get raw stream bytes
    const rawBytes = obj.contents;

    let decompressedText: string;

    if (isFlate) {
      const decompressedBytes = await decompressStream(rawBytes);
      if (!decompressedBytes) continue;
      decompressedText = new TextDecoder("latin1").decode(decompressedBytes);
    } else {
      decompressedText = new TextDecoder("latin1").decode(rawBytes);
    }

    // Debug: check for placeholder-like patterns
    if (decompressedText.includes("{{") || decompressedText.includes("\\{\\{")) {
      console.log(`Stream has placeholder patterns. Sample (500 chars): ${decompressedText.substring(0, 500)}`);
    }

    // Check if this stream has any placeholders
    const modifiedText = replaceInContentStream(decompressedText, fieldValues);
    if (modifiedText === decompressedText) continue;

    totalModified++;

    // Encode modified text back to bytes
    const modifiedBytes = new Uint8Array(modifiedText.length);
    for (let i = 0; i < modifiedText.length; i++) {
      modifiedBytes[i] = modifiedText.charCodeAt(i);
    }

    let finalBytes: Uint8Array;
    if (isFlate) {
      finalBytes = await compressStream(modifiedBytes);
    } else {
      finalBytes = modifiedBytes;
    }

    // Replace the stream contents in-place using pdf-lib's API
    // Create a new PDFRawStream with the same dict but new contents
    const newDict = dict.clone(context);
    newDict.set(PDFName.of("Length"), PDFNumber.of(finalBytes.length));

    const newStream = PDFRawStream.of(newDict, finalBytes);
    context.assign(ref, newStream);
  }

  console.log(`Modified ${totalModified} streams in PDF`);

  // pdf-lib rebuilds the xref table on save
  return await pdfDoc.save();
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
    console.error("generate-repo-document error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
