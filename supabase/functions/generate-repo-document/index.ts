import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, PDFRawStream, PDFName, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

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
  // Try skipping 2-byte zlib header
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

/**
 * Unescape PDF string escapes
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
 * Extract the content of a PDF string literal starting at pos (opening '(').
 */
function extractPdfString(content: string, pos: number): { raw: string; end: number } | null {
  if (content[pos] !== "(") return null;
  let depth = 1;
  let i = pos + 1;
  const len = content.length;
  while (i < len && depth > 0) {
    const ch = content[i];
    if (ch === "\\") { i += 2; continue; }
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    i++;
  }
  if (depth !== 0) return null;
  return { raw: content.substring(pos + 1, i - 1), end: i };
}

// ── Position-aware text extraction ──

interface CharPosition {
  char: string;
  x: number;
  y: number;
  fontSize: number;
}

/**
 * Parse a PDF content stream and extract each character with its (x, y) position.
 * Tracks Tm (text matrix), Tf (font size), Td (text position), and TJ kern adjustments.
 */
function parseTextWithPositions(content: string): CharPosition[] {
  const chars: CharPosition[] = [];
  const len = content.length;

  // Graphics state
  let fontSize = 12;
  // Text matrix components: [a, b, c, d, e, f] where e=x, f=y
  let tmX = 0;
  let tmY = 0;
  let tmA = 1; // horizontal scale from Tm
  // Line matrix (set by Td/TD/T*/Tm)
  let lineX = 0;
  let lineY = 0;

  // Tokenizer: split content into tokens
  const tokens: string[] = [];
  let i = 0;
  while (i < len) {
    const ch = content[i];
    // Skip whitespace
    if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") { i++; continue; }
    // PDF string literal
    if (ch === "(") {
      const extracted = extractPdfString(content, i);
      if (extracted) {
        tokens.push("(" + extracted.raw + ")");
        i = extracted.end;
      } else { i++; }
      continue;
    }
    // PDF array
    if (ch === "[") {
      // Collect the whole array as one token including brackets
      let depth = 1;
      let j = i + 1;
      while (j < len && depth > 0) {
        if (content[j] === "(") {
          const ex = extractPdfString(content, j);
          if (ex) { j = ex.end; continue; }
        }
        if (content[j] === "[") depth++;
        else if (content[j] === "]") depth--;
        j++;
      }
      tokens.push(content.substring(i, j));
      i = j;
      continue;
    }
    // Regular token (number, operator, name)
    let j = i;
    while (j < len && content[j] !== " " && content[j] !== "\n" && content[j] !== "\r" && content[j] !== "\t" && content[j] !== "(" && content[j] !== "[" && content[j] !== "]") {
      j++;
    }
    if (j > i) {
      tokens.push(content.substring(i, j));
      i = j;
    } else {
      i++;
    }
  }

  // Process tokens looking for operators
  const stack: string[] = [];

  for (const token of tokens) {
    // Check if it's an operator (alphabetic, not starting with / or digit or ( or [)
    const isOp = /^[A-Za-z\*\'\"]+$/.test(token) && !token.startsWith("/");

    if (!isOp) {
      stack.push(token);
      continue;
    }

    // Process operators
    switch (token) {
      case "Tm": {
        // a b c d e f Tm
        if (stack.length >= 6) {
          const f = parseFloat(stack[stack.length - 1]);
          const e = parseFloat(stack[stack.length - 2]);
          const a = parseFloat(stack[stack.length - 6]);
          tmX = e;
          tmY = f;
          tmA = a;
          lineX = e;
          lineY = f;
        }
        stack.length = 0;
        break;
      }
      case "Td":
      case "TD": {
        // tx ty Td
        if (stack.length >= 2) {
          const ty = parseFloat(stack[stack.length - 1]);
          const tx = parseFloat(stack[stack.length - 2]);
          lineX += tx;
          lineY += ty;
          tmX = lineX;
          tmY = lineY;
        }
        stack.length = 0;
        break;
      }
      case "Tf": {
        // /FontName size Tf
        if (stack.length >= 2) {
          const size = parseFloat(stack[stack.length - 1]);
          if (!isNaN(size) && size > 0) fontSize = size;
        }
        stack.length = 0;
        break;
      }
      case "Tj": {
        // (string) Tj
        if (stack.length >= 1) {
          const strToken = stack[stack.length - 1];
          if (strToken.startsWith("(") && strToken.endsWith(")")) {
            const raw = strToken.substring(1, strToken.length - 1);
            const text = unescapePdfString(raw);
            // Estimate char width as fontSize * 0.5 (approximate for standard fonts)
            const charWidth = fontSize * tmA * 0.5;
            for (let ci = 0; ci < text.length; ci++) {
              chars.push({
                char: text[ci],
                x: tmX + ci * charWidth,
                y: tmY,
                fontSize,
              });
            }
            tmX += text.length * charWidth;
          }
        }
        stack.length = 0;
        break;
      }
      case "TJ": {
        // [(string)kern(string)...] TJ
        if (stack.length >= 1) {
          const arrToken = stack[stack.length - 1];
          if (arrToken.startsWith("[")) {
            // Parse array contents
            const inner = arrToken.substring(1, arrToken.length - 1);
            let ai = 0;
            const innerLen = inner.length;
            const charWidth = fontSize * tmA * 0.5;
            while (ai < innerLen) {
              if (inner[ai] === "(") {
                const extracted = extractPdfString(inner, ai);
                if (extracted) {
                  const text = unescapePdfString(extracted.raw);
                  for (let ci = 0; ci < text.length; ci++) {
                    chars.push({
                      char: text[ci],
                      x: tmX + ci * charWidth,
                      y: tmY,
                      fontSize,
                    });
                  }
                  tmX += text.length * charWidth;
                  ai = extracted.end;
                } else { ai++; }
              } else if (inner[ai] === " " || inner[ai] === "\n" || inner[ai] === "\r" || inner[ai] === "\t") {
                ai++;
              } else {
                // Number (kern value) - negative moves right, positive moves left
                let numStr = "";
                while (ai < innerLen && (inner[ai] === "-" || inner[ai] === "." || (inner[ai] >= "0" && inner[ai] <= "9"))) {
                  numStr += inner[ai];
                  ai++;
                }
                if (numStr) {
                  const kern = parseFloat(numStr);
                  // Kern is in thousandths of a unit of text space
                  tmX -= kern * fontSize * tmA / 1000;
                }
              }
            }
          }
        }
        stack.length = 0;
        break;
      }
      case "BT": {
        // Reset text position at start of text block
        // (Tm will be set explicitly if needed)
        stack.length = 0;
        break;
      }
      case "ET": {
        stack.length = 0;
        break;
      }
      default: {
        // Unknown operator, clear stack
        stack.length = 0;
        break;
      }
    }
  }

  return chars;
}

interface PlaceholderMatch {
  fieldName: string;
  value: string;
  startX: number;
  startY: number;
  endX: number;
  fontSize: number;
  pageIndex: number;
}

/**
 * Replace {{placeholders}} in PDF using white-out and overlay technique.
 * 1. Parse content streams for text positions
 * 2. Find placeholders across all characters
 * 3. Draw white rectangles over placeholder regions
 * 4. Draw replacement text at the placeholder's position
 */
async function fillPDF(fileBytes: Uint8Array, fieldValues: Record<string, string>): Promise<Uint8Array> {
  console.log("fillPDF (overlay) called with field keys:", Object.keys(fieldValues));

  const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const context = pdfDoc.context;

  let totalReplacements = 0;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    const pageRef = pdfDoc.getPage(pageIdx).ref;

    // Get page content stream(s)
    const allChars: CharPosition[] = [];

    // Enumerate all streams and find ones belonging to this page
    const allRefs = context.enumerateIndirectObjects();
    
    // Get the page's Contents entry
    const pageDict = page.node;
    const contentsEntry = pageDict.get(PDFName.of("Contents"));
    
    // Collect content stream refs for this page
    const contentRefs: any[] = [];
    if (contentsEntry) {
      const resolved = context.lookup(contentsEntry);
      if (resolved && typeof resolved.size === "function") {
        // It's an array
        for (let ci = 0; ci < resolved.size(); ci++) {
          contentRefs.push(resolved.get(ci));
        }
      } else {
        // Single ref
        contentRefs.push(contentsEntry);
      }
    }

    // Parse each content stream for this page
    for (const ref of contentRefs) {
      const streamObj = context.lookup(ref);
      if (!(streamObj instanceof PDFRawStream)) continue;

      const dict = streamObj.dict;
      const filterEntry = dict.get(PDFName.of("Filter"));
      const isFlate = filterEntry?.toString() === "/FlateDecode";
      const rawBytes = streamObj.contents;

      let text: string;
      if (isFlate) {
        const decompressed = await decompressStream(rawBytes);
        if (!decompressed) continue;
        text = new TextDecoder("latin1").decode(decompressed);
      } else {
        text = new TextDecoder("latin1").decode(rawBytes);
      }

      if (!text.includes("{")) continue;

      const streamChars = parseTextWithPositions(text);
      allChars.push(...streamChars);
    }

    if (allChars.length === 0) continue;

    // Build full text from all characters on this page
    const fullText = allChars.map(c => c.char).join("");

    // Find all placeholder matches
    const matches: PlaceholderMatch[] = [];
    for (const [fieldName, value] of Object.entries(fieldValues)) {
      const placeholder = `{{${fieldName}}}`;
      let searchFrom = 0;
      while (true) {
        const idx = fullText.indexOf(placeholder, searchFrom);
        if (idx === -1) break;

        const firstChar = allChars[idx];
        const lastChar = allChars[idx + placeholder.length - 1];
        const charWidth = firstChar.fontSize * 0.5; // approximate

        matches.push({
          fieldName,
          value: String(value),
          startX: firstChar.x,
          startY: firstChar.y,
          endX: lastChar.x + charWidth,
          fontSize: firstChar.fontSize,
          pageIndex: pageIdx,
        });
        searchFrom = idx + placeholder.length;
      }
    }

    if (matches.length === 0) continue;

    console.log(`Page ${pageIdx + 1}: Found ${matches.length} placeholder(s): ${matches.map(m => m.fieldName).join(", ")}`);

    // Apply white-out and overlay for each match
    const { height: pageHeight } = page.getSize();

    for (const match of matches) {
      const rectWidth = (match.endX - match.startX) + 4;
      const rectHeight = match.fontSize + 4;

      // White-out the original text
      page.drawRectangle({
        x: match.startX - 1,
        y: match.startY - 2,
        width: rectWidth,
        height: rectHeight,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      });

      // Draw replacement text
      page.drawText(match.value, {
        x: match.startX,
        y: match.startY,
        size: match.fontSize,
        font,
        color: rgb(0, 0, 0),
      });

      totalReplacements++;
    }
  }

  console.log(`Total replacements: ${totalReplacements}`);
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
