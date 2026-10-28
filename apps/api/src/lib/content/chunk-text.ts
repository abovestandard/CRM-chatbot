const MAX_CHUNK_LENGTH = 1200;

// Splits on paragraph boundaries where possible, falling back to a hard
// slice for runs of text with no natural breaks (e.g. minified HTML output).
export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= MAX_CHUNK_LENGTH) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (paragraph.length <= MAX_CHUNK_LENGTH) {
      current = paragraph;
    } else {
      for (let i = 0; i < paragraph.length; i += MAX_CHUNK_LENGTH) {
        chunks.push(paragraph.slice(i, i + MAX_CHUNK_LENGTH));
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
