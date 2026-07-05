// Ambient type declaration for the internal pdf-parse entry point.
// @types/pdf-parse only covers the package root ("pdf-parse"); we import
// "pdf-parse/lib/pdf-parse.js" directly to bypass a debug self-test in the
// root index.js that can misfire inside bundled environments. See the
// comment in extract.ts for why.
declare module "pdf-parse/lib/pdf-parse.js" {
  import type { PDFParse } from "pdf-parse";
  const pdfParseLib: PDFParse;
  export default pdfParseLib;
}
