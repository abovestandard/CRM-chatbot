import fs from "fs/promises";
import mammoth from "mammoth";

// Best-effort text extraction per supported document type (documents.routes.ts
// restricts uploads to these mime types). Throws on failure so the caller can
// mark the document FAILED instead of silently indexing nothing.
export async function extractTextFromFile(storagePath: string, mimeType: string): Promise<string> {
  switch (mimeType) {
    case "application/pdf": {
      const { PDFParse } = await import("pdf-parse");
      const data = await fs.readFile(storagePath);
      const parser = new PDFParse({ data });
      try {
        const result = await parser.getText();
        return result.text;
      } finally {
        await parser.destroy();
      }
    }
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const result = await mammoth.extractRawText({ path: storagePath });
      return result.value;
    }
    case "application/msword": {
      // Legacy .doc binary format isn't supported by mammoth (docx-only);
      // best effort is to read it as text, which will be noisy but non-fatal.
      return fs.readFile(storagePath, "utf-8");
    }
    case "text/plain":
    case "text/csv":
      return fs.readFile(storagePath, "utf-8");
    default:
      throw new Error(`Unsupported file type for text extraction: ${mimeType}`);
  }
}
