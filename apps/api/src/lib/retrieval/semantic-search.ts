import { AiProvider } from "@crm-chatbot/shared-types";
import { prisma } from "../../db/prisma";
import { embedText, EMBEDDING_MODELS } from "../embeddings/embed-text";
import { cosineSimilarity } from "../embeddings/similarity";
import { keywordSearch } from "./keyword-search";

// Cosine similarity on OpenAI/Gemini text embeddings — real semantic search
// (handles synonyms, paraphrasing, and cross-language matches that literal
// keyword overlap can't), computed in-process since pgvector isn't installed
// on the target Postgres (see NOTE in prisma/schema.prisma). Falls back to
// keyword search whenever embeddings aren't available so retrieval never
// goes completely empty just because a provider isn't configured yet.
const SIMILARITY_THRESHOLD = 0.5;

export async function retrieveRelevantChunks(
  websiteId: string,
  question: string,
  provider: AiProvider | null,
  apiKey: string | null,
  limit = 5,
): Promise<string[]> {
  if (!provider || !apiKey) {
    return keywordSearch(websiteId, question, limit);
  }

  let questionEmbedding: number[];
  try {
    questionEmbedding = await embedText(provider, apiKey, question);
  } catch (err) {
    console.error("Failed to embed question, falling back to keyword search:", err);
    return keywordSearch(websiteId, question, limit);
  }

  const embeddingModel = EMBEDDING_MODELS[provider];
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { websiteId, embeddingProvider: provider, embeddingModel },
    select: { content: true, embedding: true },
  });

  if (chunks.length === 0) {
    return keywordSearch(websiteId, question, limit);
  }

  const scored = chunks
    .map((chunk) => ({
      content: chunk.content,
      score: cosineSimilarity(questionEmbedding, chunk.embedding as unknown as number[]),
    }))
    .filter((c) => c.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((c) => c.content);
}
