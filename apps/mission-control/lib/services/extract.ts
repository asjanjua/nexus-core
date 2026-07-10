/**
 * Document text extraction service.
 *
 * Supported formats: DOCX, PPTX, XLSX, PDF (pdf-parse), plain text, Markdown.
 *
 * PDF extraction uses `pdf-parse` (pure JS, no native deps, wraps pdf.js).
 * Falls back to the BT/ET operator heuristic scanner if pdf-parse throws
 * (e.g. malformed or encrypted PDFs), so ingestion never hard-fails on PDF.
 */

import JSZip from "jszip";
// Import the internal lib directly, not the package root. pdf-parse's index.js
// runs a debug self-test whenever `module.parent` is falsy — which also fires
// inside webpack/Next.js bundles that don't preserve a real require chain.
// The internal lib has no such check.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export type ExtractionResult = {
  text: string;
  method: string;
  charCount: number;
  extractionConfidence: number;
};

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

const methodScore: Record<string, number> = {
  pdf_parse: 0.85,       // real extraction via pdf-parse
  pdf_text_scan: 0.62,   // capped — heuristic fallback only
  docx_xml: 0.84,
  pptx_xml: 0.76,
  xlsx_xml: 0.74,        // improved from 0.72 now that we read cell data
  plain_text: 0.90,
  unsupported: 0.25
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Score driven by extracted character count AND method quality. */
function deriveConfidence(charCount: number, method: string): number {
  const minChars = 700;
  const charScore = clamp(charCount / minChars, 0, 1);
  const baseScore = methodScore[method] ?? 0.35;
  const final = charScore * 0.50 + baseScore * 0.50;
  // Hard cap for pdf heuristic — never over-promise
  const cap = method === "pdf_text_scan" ? 0.62 : 0.99;
  return Number(clamp(final, 0.05, cap).toFixed(2));
}

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

function stripXml(input: string): string {
  return input
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<a:p[^>]*>/g, "\n")   // PowerPoint paragraphs
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------

async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  const text = stripXml(xml ?? "");
  const charCount = text.length;
  return { text, method: "docx_xml", charCount, extractionConfidence: deriveConfidence(charCount, "docx_xml") };
}

// ---------------------------------------------------------------------------
// PPTX
// ---------------------------------------------------------------------------

async function extractFromPptx(buffer: Buffer): Promise<ExtractionResult> {
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((n) => n.startsWith("ppt/slides/slide") && n.endsWith(".xml"))
    .sort();
  const parts = await Promise.all(
    slideNames.map(async (n) => stripXml((await zip.file(n)?.async("string")) ?? ""))
  );
  const text = parts.join("\n").trim();
  const charCount = text.length;
  return { text, method: "pptx_xml", charCount, extractionConfidence: deriveConfidence(charCount, "pptx_xml") };
}

// ---------------------------------------------------------------------------
// XLSX — reads sharedStrings + actual cell values from all worksheets
// ---------------------------------------------------------------------------

async function extractFromXlsx(buffer: Buffer): Promise<ExtractionResult> {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Build sharedStrings lookup
  const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("string") ?? "";
  const sharedStrings: string[] = [];
  const siMatches = sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g);
  for (const m of siMatches) {
    sharedStrings.push(stripXml(m[1]));
  }

  // 2. Extract cell values from every worksheet
  const sheetNames = Object.keys(zip.files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort();

  const rows: string[] = [];
  for (const sheetName of sheetNames) {
    const sheetXml = await zip.file(sheetName)?.async("string") ?? "";
    // Match each <c ...><v>...</v></c> or <c ...><is>...</is></c>
    const cellMatches = sheetXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g);
    const rowValues: string[] = [];
    for (const cell of cellMatches) {
      const attrs = cell[1];
      const inner = cell[2];
      const typeMatch = /t="([^"]+)"/.exec(attrs);
      const cellType = typeMatch?.[1];

      // Shared string reference
      if (cellType === "s") {
        const vMatch = /<v>(\d+)<\/v>/.exec(inner);
        if (vMatch) {
          const idx = parseInt(vMatch[1], 10);
          if (sharedStrings[idx]) rowValues.push(sharedStrings[idx]);
        }
      } else if (cellType === "inlineStr") {
        const isMatch = /<is>([\s\S]*?)<\/is>/.exec(inner);
        if (isMatch) rowValues.push(stripXml(isMatch[1]));
      } else {
        // Numeric / date / formula result
        const vMatch = /<v>([^<]+)<\/v>/.exec(inner);
        if (vMatch) rowValues.push(vMatch[1].trim());
      }
    }
    if (rowValues.length) rows.push(rowValues.join(" | "));
  }

  const text = rows.join("\n").trim();
  const charCount = text.length;
  return { text, method: "xlsx_xml", charCount, extractionConfidence: deriveConfidence(charCount, "xlsx_xml") };
}

// ---------------------------------------------------------------------------
// PDF — real extraction via pdf-parse, with heuristic fallback
//
// pdf-parse wraps pdf.js and handles compressed (FlateDecode) streams,
// multi-column layouts, and standard fonts correctly. If it throws
// (encrypted, corrupt, or otherwise unparseable PDFs), we fall back to the
// BT/ET operator heuristic scanner so ingestion never hard-fails on PDF.
// ---------------------------------------------------------------------------

async function extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const data = await pdfParse(buffer);
    const text = data.text.replace(/\s+/g, " ").trim();
    const charCount = text.length;
    return { text, method: "pdf_parse", charCount, extractionConfidence: deriveConfidence(charCount, "pdf_parse") };
  } catch {
    return extractFromPdfHeuristic(buffer);
  }
}

function extractFromPdfHeuristic(buffer: Buffer): ExtractionResult {
  const raw = buffer.toString("latin1"); // latin1 preserves byte values

  const parts: string[] = [];

  // Extract between BT...ET blocks
  const btBlocks = raw.matchAll(/BT\s([\s\S]*?)ET/g);
  for (const block of btBlocks) {
    const content = block[1];

    // Tj operator: (text string) Tj
    const tjMatches = content.matchAll(/\(([^)]*)\)\s*Tj/g);
    for (const m of tjMatches) {
      parts.push(m[1].replace(/\\n/g, "\n").replace(/\\\(/g, "(").replace(/\\\)/g, ")"));
    }

    // TJ operator: [(text)(text)...] TJ
    const tjArrayMatches = content.matchAll(/\[([^\]]*)\]\s*TJ/g);
    for (const m of tjArrayMatches) {
      const strings = m[1].matchAll(/\(([^)]*)\)/g);
      for (const s of strings) {
        parts.push(s[1]);
      }
    }
  }

  // Fallback: visible ASCII run extraction from full buffer
  // Catches PDFs that don't use strict BT/ET conventions
  if (parts.length === 0) {
    const asciiRuns = raw
      .replace(/[^\x20-\x7E\n]/g, " ")
      .replace(/\s{3,}/g, "\n")
      .trim();
    // Only keep runs that look like English words (have a-z chars)
    const words = asciiRuns.split("\n").filter((line) => /[a-zA-Z]{3,}/.test(line));
    parts.push(...words);
  }

  const text = parts
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const charCount = text.length;
  return { text, method: "pdf_text_scan", charCount, extractionConfidence: deriveConfidence(charCount, "pdf_text_scan") };
}

// ---------------------------------------------------------------------------
// Plain text / Markdown
// ---------------------------------------------------------------------------

function extractFromPlainText(buffer: Buffer): ExtractionResult {
  const text = buffer.toString("utf-8").replace(/\s+/g, " ").trim();
  const charCount = text.length;
  return { text, method: "plain_text", charCount, extractionConfidence: deriveConfidence(charCount, "plain_text") };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function extractTextFromBuffer(filename: string, buffer: Buffer): Promise<ExtractionResult> {
  const lower = filename.toLowerCase();
  const unsupported: ExtractionResult = {
    text: "",
    method: "unsupported",
    charCount: 0,
    extractionConfidence: deriveConfidence(0, "unsupported")
  };

  try {
    if (lower.endsWith(".docx")) return await extractFromDocx(buffer);
    if (lower.endsWith(".pptx")) return await extractFromPptx(buffer);
    if (lower.endsWith(".xlsx")) return await extractFromXlsx(buffer);
    if (lower.endsWith(".pdf")) return await extractFromPdf(buffer);
    if (lower.endsWith(".txt") || lower.endsWith(".md")) return extractFromPlainText(buffer);
  } catch {
    return unsupported;
  }

  return unsupported;
}
