import { prisma } from "../../db/prisma";

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "to", "of", "in", "on",
  "for", "with", "and", "or", "but", "if", "then", "so", "as", "at", "by", "from", "about",
  "into", "over", "after", "do", "does", "did", "can", "could", "will", "would", "should",
  "what", "which", "who", "when", "where", "why", "how", "i", "you", "he", "she", "it", "we",
  "they", "this", "that", "these", "those", "my", "your", "our", "their", "have", "has", "had",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Fallback retrieval used when semantic (embedding) search isn't available —
// no AI provider/API key configured yet for the website, or the embedding
// call failed. Scores every chunk by literal keyword overlap with the
// question. Crude (no synonyms, no cross-language matching) but better than
// sending no context at all. Prefer semantic-search.ts's retrieveRelevantChunks
// wherever a provider/apiKey is available.
export async function keywordSearch(
  websiteId: string,
  question: string,
  limit = 5,
): Promise<string[]> {
  const questionWords = new Set(tokenize(question));
  if (questionWords.size === 0) return [];

  const chunks = await prisma.knowledgeChunk.findMany({
    where: { websiteId },
    select: { content: true },
    take: 500,
  });

  const scored = chunks
    .map((chunk) => {
      const chunkWords = tokenize(chunk.content);
      const score = chunkWords.reduce((acc, w) => acc + (questionWords.has(w) ? 1 : 0), 0);
      return { content: chunk.content, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((c) => c.content);
}
