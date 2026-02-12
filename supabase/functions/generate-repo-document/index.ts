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
 * Unescape PDF string escapes: \( -> (, \) -> ), \\ -> \, \{ -> {, \} -> }
 */
function unescapePdfString(s: string): string {
  let result = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length) {
      const next = s[i + 1];
      if (next === "(") { result += "("; i++; }
      else if (next === ")") { result += ")"; i++; }
      else if (next === "\\") { result += "\\"; i++; }
      else if (next === "{") { result += "{"; i++; }
      else if (next === "}") { result += "}"; i++; }
      else if (next === "n") { result += "\n"; i++; }
      else if (next === "r") { result += "\r"; i++; }
      else if (next === "t") { result += "\t"; i++; }
      else { result += s[i]; }
    } else {
      result += s[i];
    }
  }
  return result;
}

/**
 * Escape a string for use inside a PDF string literal: ( ) \ must be escaped
 */
function escapePdfString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

interface TextOperator {
  /** Start index in stream */
  start: number;
  /** End index in stream (exclusive) */
  end: number;
  /** The full match string in the stream */
  fullMatch: string;
  /** The unescaped text this operator renders */
  text: string;
  /** Type of operator */
  type: "Tj" | "TJ";
}

/**
 * Extract the content of a PDF string literal starting at pos (which points to the opening '(').
 * Returns the raw content (with escapes intact) and the index after the closing ')'.
 */
function extractPdfString(content: string, pos: number): { raw: string; end: number } | null {
  if (content[pos] !== "(") return null;
  let depth = 1;
  let i = pos + 1;
  const len = content.length;
  while (i < len && depth > 0) {
    const ch = content[i];
    if (ch === "\\") { i += 2; continue; } // skip escaped char
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    i++;
  }
  if (depth !== 0) return null;
  return { raw: content.substring(pos + 1, i - 1), end: i };
}

/**
 * Parse all text-showing operators from a PDF content stream using manual scanning.
 * Finds both (string) Tj and [(string)kern...] TJ operators.
 * O(n) complexity, no regex backtracking.
 */
function parseTextOperators(content: string): TextOperator[] {
  const operators: TextOperator[] = [];
  const len = content.length;
  let i = 0;

  while (i < len) {
    const ch = content[i];

    // Look for '(' - start of a PDF string that might be followed by Tj
    if (ch === "(") {
      const extracted = extractPdfString(content, i);
      if (!extracted) { i++; continue; }
      // Skip whitespace after the closing ')'
      let j = extracted.end;
      while (j < len && (content[j] === " " || content[j] === "\r" || content[j] === "\n" || content[j] === "\t")) j++;
      // Check for "Tj" operator
      if (j + 1 < len && content[j] === "T" && content[j + 1] === "j" && (j + 2 >= len || !/[a-zA-Z]/.test(content[j + 2]))) {
        operators.push({
          start: i,
          end: j + 2,
          fullMatch: content.substring(i, j + 2),
          text: unescapePdfString(extracted.raw),
          type: "Tj",
        });
        i = j + 2;
        continue;
      }
      i = extracted.end;
      continue;
    }

    // Look for '[' - start of a TJ array
    if (ch === "[") {
      const arrStart = i;
      i++; // skip '['
      const parts: string[] = [];
      let valid = true;
      // Scan array contents
      while (i < len && content[i] !== "]") {
        if (content[i] === "(") {
          const extracted = extractPdfString(content, i);
          if (!extracted) { valid = false; break; }
          parts.push(unescapePdfString(extracted.raw));
          i = extracted.end;
        } else {
          i++;
        }
      }
      if (!valid || i >= len) { i = arrStart + 1; continue; }
      i++; // skip ']'
      // Skip whitespace
      while (i < len && (content[i] === " " || content[i] === "\r" || content[i] === "\n" || content[i] === "\t")) i++;
      // Check for "TJ" operator
      if (i + 1 < len && content[i] === "T" && content[i + 1] === "J" && (i + 2 >= len || !/[a-zA-Z]/.test(content[i + 2]))) {
        if (parts.length > 0) {
          operators.push({
            start: arrStart,
            end: i + 2,
            fullMatch: content.substring(arrStart, i + 2),
            text: parts.join(""),
            type: "TJ",
          });
        }
        i += 2;
        continue;
      }
      // Not a TJ array, continue from after ']'
      continue;
    }

    i++;
  }

  return operators;
}

/**
 * Replace {{placeholders}} in text content, handling PDF text operators.
 * Handles placeholders split across ANY number of separate BT/ET blocks,
 * TJ arrays, or Tj operators by parsing all text operators sequentially,
 * concatenating their text, finding placeholders, and mapping replacements
 * back to the individual operators.
 */
function replaceInContentStream(content: string, fieldValues: Record<string, string>): string {
  // Quick check: if no braces at all, skip expensive parsing
  if (!content.includes("{") && !content.includes("\\{")) return content;

  // Step 1: Parse all text operators (O(n) manual scan)
  const operators = parseTextOperators(content);
  if (operators.length === 0) return content;

  // Step 2: Build concatenated text with character-to-operator mapping
  let fullText = "";
  const charMap: { opIndex: number; charInOp: number }[] = [];

  for (let opIdx = 0; opIdx < operators.length; opIdx++) {
    const op = operators[opIdx];
    for (let ci = 0; ci < op.text.length; ci++) {
      charMap.push({ opIndex: opIdx, charInOp: ci });
      fullText += op.text[ci];
    }
  }

  // Step 3: Find all placeholder positions in concatenated text
  interface Replacement {
    textStart: number;
    textEnd: number;
    fieldName: string;
    value: string;
  }
  const replacements: Replacement[] = [];

  for (const [fieldName, value] of Object.entries(fieldValues)) {
    const placeholder = `{{${fieldName}}}`;
    let searchFrom = 0;
    while (true) {
      const idx = fullText.indexOf(placeholder, searchFrom);
      if (idx === -1) break;
      replacements.push({
        textStart: idx,
        textEnd: idx + placeholder.length,
        fieldName,
        value: String(value),
      });
      searchFrom = idx + placeholder.length;
    }
  }

  if (replacements.length === 0) {
    // No placeholders found across operators -- try simple direct replacement as fallback
    let modified = content;
    for (const [fieldName, value] of Object.entries(fieldValues)) {
      const safeValue = escapePdfString(String(value));
      const placeholder = `{{${fieldName}}}`;
      modified = modified.split(placeholder).join(safeValue);
      const escapedPlaceholder = `\\{\\{${fieldName}\\}\\}`;
      modified = modified.split(escapedPlaceholder).join(safeValue);
    }
    return modified;
  }

  console.log(`Found ${replacements.length} placeholder(s) across operators: ${replacements.map(r => r.fieldName).join(", ")}`);

  // Sort replacements by position (reverse order so we can modify without shifting)
  replacements.sort((a, b) => b.textStart - a.textStart);

  // Step 4: Apply replacements to operator texts
  // Clone operator texts
  const opTexts = operators.map(op => op.text);

  for (const rep of replacements) {
    // Find which operators are involved
    const firstCharMap = charMap[rep.textStart];
    const lastCharMap = charMap[rep.textEnd - 1];

    if (firstCharMap.opIndex === lastCharMap.opIndex) {
      // Placeholder is within a single operator
      const opIdx = firstCharMap.opIndex;
      const before = opTexts[opIdx].substring(0, firstCharMap.charInOp);
      const after = opTexts[opIdx].substring(lastCharMap.charInOp + 1);
      opTexts[opIdx] = before + rep.value + after;
    } else {
      // Placeholder spans multiple operators
      // First operator: replace from charInOp to end with value
      const firstOpIdx = firstCharMap.opIndex;
      opTexts[firstOpIdx] = opTexts[firstOpIdx].substring(0, firstCharMap.charInOp) + rep.value;

      // Middle operators: clear text entirely
      for (let oi = firstOpIdx + 1; oi < lastCharMap.opIndex; oi++) {
        opTexts[oi] = "";
      }

      // Last operator: remove from start through charInOp
      const lastOpIdx = lastCharMap.opIndex;
      opTexts[lastOpIdx] = opTexts[lastOpIdx].substring(lastCharMap.charInOp + 1);
    }
  }

  // Step 5: Rebuild the stream by replacing operator matches with new text
  // Work backwards so positions don't shift
  let modified = content;
  for (let i = operators.length - 1; i >= 0; i--) {
    const op = operators[i];
    const newText = opTexts[i];

    // Only modify if text actually changed
    if (newText === op.text) continue;

    const escapedNewText = escapePdfString(newText);

    let replacement: string;
    if (op.type === "Tj") {
      replacement = `(${escapedNewText}) Tj`;
    } else {
      // TJ: wrap in array with single string
      replacement = `[(${escapedNewText})] TJ`;
    }

    modified = modified.substring(0, op.start) + replacement + modified.substring(op.end);
  }

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

    // Skip streams that clearly have no placeholder-related content
    if (!decompressedText.includes("{")) continue;

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
