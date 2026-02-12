import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Replace {{placeholders}} in PDF bytes, handling both compressed and uncompressed streams */
async function fillPDF(fileBytes: Uint8Array, fieldValues: Record<string, string>): Promise<Uint8Array> {
  // Work with latin1 to preserve all byte values
  let text = new TextDecoder("latin1").decode(fileBytes);

  // Build replacement map
  const replacements: [RegExp, string][] = [];
  for (const [fieldName, value] of Object.entries(fieldValues)) {
    const safeValue = String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    replacements.push([
      new RegExp(`\\{\\{${fieldName}\\}\\}`, "g"),
      safeValue,
    ]);
  }

  // 1. Replace in uncompressed parts of the PDF
  for (const [regex, value] of replacements) {
    text = text.replace(regex, value);
  }

  // 2. Find and process FlateDecode streams
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  const streamReplacements: { start: number; end: number; newContent: string }[] = [];

  let streamMatch;
  while ((streamMatch = streamRegex.exec(text)) !== null) {
    const beforeStream = text.substring(Math.max(0, streamMatch.index - 500), streamMatch.index);
    if (!beforeStream.includes("/FlateDecode")) continue;

    try {
      const streamStartTag = text.substring(streamMatch.index, streamMatch.index + 20);
      const newlineOffset = streamStartTag.indexOf("\n") + 1;
      const contentStart = streamMatch.index + newlineOffset + "stream".length;
      // Adjust: the match starts at 'stream\n', content is after 'stream\n'
      const fullMatchText = streamMatch[0];
      const streamKeywordEnd = fullMatchText.indexOf("\n") + 1;
      const streamContent = fullMatchText.substring(streamKeywordEnd, fullMatchText.length - "endstream".length);

      const rawBytes = new Uint8Array(streamContent.length);
      for (let i = 0; i < streamContent.length; i++) {
        rawBytes[i] = streamContent.charCodeAt(i);
      }

      // Decompress
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

      if (chunks.length === 0) continue;

      const totalLength = chunks.reduce((a, c) => a + c.length, 0);
      const decompressed = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        decompressed.set(chunk, offset);
        offset += chunk.length;
      }

      let decompressedText = new TextDecoder("latin1").decode(decompressed);

      // Check if any placeholder exists in this stream
      let hasPlaceholder = false;
      for (const [regex] of replacements) {
        regex.lastIndex = 0;
        if (regex.test(decompressedText)) {
          hasPlaceholder = true;
          break;
        }
      }

      if (!hasPlaceholder) continue;

      // Apply replacements
      for (const [regex, value] of replacements) {
        regex.lastIndex = 0;
        decompressedText = decompressedText.replace(regex, value);
      }

      // Re-compress
      const modifiedBytes = new Uint8Array(decompressedText.length);
      for (let i = 0; i < decompressedText.length; i++) {
        modifiedBytes[i] = decompressedText.charCodeAt(i);
      }

      const cs = new CompressionStream("deflate");
      const cWriter = cs.writable.getWriter();
      const cReader = cs.readable.getReader();
      cWriter.write(modifiedBytes).catch(() => {});
      cWriter.close().catch(() => {});

      const compressedChunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await cReader.read();
          if (done) break;
          compressedChunks.push(value);
        }
      } catch { /* stream ended */ }

      const compressedTotal = compressedChunks.reduce((a, c) => a + c.length, 0);
      const compressed = new Uint8Array(compressedTotal);
      let cOffset = 0;
      for (const chunk of compressedChunks) {
        compressed.set(chunk, cOffset);
        cOffset += chunk.length;
      }

      const compressedStr = Array.from(compressed).map(b => String.fromCharCode(b)).join("");

      // Store replacement info
      const streamContentStart = streamMatch.index + streamKeywordEnd;
      const streamContentEnd = streamMatch.index + fullMatchText.length - "endstream".length;

      streamReplacements.push({
        start: streamContentStart,
        end: streamContentEnd,
        newContent: compressedStr,
      });

      // Also update /Length in the object dictionary
      const lengthMatch = beforeStream.match(/\/Length\s+(\d+)/);
      if (lengthMatch) {
        const lengthPos = text.lastIndexOf(lengthMatch[0], streamMatch.index);
        if (lengthPos >= 0) {
          const newLengthStr = `/Length ${compressedTotal}`;
          const oldLengthStr = lengthMatch[0];
          // Pad with spaces if new is shorter to avoid shifting offsets
          const paddedLength = newLengthStr.padEnd(oldLengthStr.length, " ");
          text = text.substring(0, lengthPos) + paddedLength + text.substring(lengthPos + oldLengthStr.length);
          // Reset stream regex since we modified the text
          streamRegex.lastIndex = streamMatch.index + fullMatchText.length;
        }
      }
    } catch { /* skip failed streams */ }
  }

  // Apply stream content replacements in reverse order to preserve offsets
  streamReplacements.sort((a, b) => b.start - a.start);
  for (const rep of streamReplacements) {
    text = text.substring(0, rep.start) + rep.newContent + text.substring(rep.end);
  }

  // Convert back to bytes
  const result = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    result[i] = text.charCodeAt(i);
  }

  return result;
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
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

        const regex = new RegExp(`\\{\\{${fieldName}\\}\\}`, "g");
        content = content.replace(regex, safeValue);

        const splitRegex = new RegExp(
          `\\{\\{(<[^>]*>)*${fieldName}(<[^>]*>)*\\}\\}`,
          "g"
        );
        content = content.replace(splitRegex, safeValue);
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
