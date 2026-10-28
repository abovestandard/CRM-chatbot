import { AiProvider } from "@crm-chatbot/shared-types";
import { KnowledgeSourceType, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { chunkText } from "./chunk-text";
import { embedText, EMBEDDING_MODELS } from "../embeddings/embed-text";

// Cap how many chunks of a single document/URL get embedded per index run —
// keeps a huge page/document from generating an unbounded number of paid
// embedding API calls. Chunks beyond the cap still get indexed for keyword
// search, just without a vector.
const MAX_CHUNKS_TO_EMBED = 50;

// Shared by document upload and URL crawl indexing: chunks the extracted
// text, embeds each chunk with the website's configured AI provider when
// available (falls back to keyword-only chunks otherwise), and replaces any
// previously indexed chunks for this source.
export async function indexChunks(params: {
  websiteId: string;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  text: string;
  embeddingProvider: AiProvider | null;
  embeddingApiKey: string | null;
}): Promise<void> {
  const { websiteId, sourceType, sourceId, text, embeddingProvider, embeddingApiKey } = params;
  const chunks = chunkText(text);

  await prisma.knowledgeChunk.deleteMany({ where: { websiteId, sourceType, sourceId } });
  if (chunks.length === 0) return;

  const canEmbed = Boolean(embeddingProvider && embeddingApiKey);
  const embeddingModel = embeddingProvider ? EMBEDDING_MODELS[embeddingProvider] : null;

  const rows = await Promise.all(
    chunks.map(async (content, i) => {
      if (!canEmbed || i >= MAX_CHUNKS_TO_EMBED) {
        return { websiteId, sourceType, sourceId, content, embedding: Prisma.DbNull, embeddingProvider: null, embeddingModel: null };
      }
      try {
        const vector = await embedText(embeddingProvider!, embeddingApiKey!, content);
        return { websiteId, sourceType, sourceId, content, embedding: vector, embeddingProvider, embeddingModel };
      } catch (err) {
        console.error(`Failed to embed a chunk for ${sourceType} ${sourceId}:`, err);
        return { websiteId, sourceType, sourceId, content, embedding: Prisma.DbNull, embeddingProvider: null, embeddingModel: null };
      }
    }),
  );

  await prisma.knowledgeChunk.createMany({ data: rows });
}
