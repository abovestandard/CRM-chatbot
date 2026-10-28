import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { requireWebsiteAccess } from "../../middleware/rbac.middleware";
import { UrlSourceDto } from "@crm-chatbot/shared-types";
import { fetchAndExtractUrlText } from "../../lib/content/fetch-url-content";
import { indexChunks } from "../../lib/content/index-chunks";
import { decryptSecret } from "../../lib/crypto";

export const urlsRouter = Router({ mergeParams: true });
urlsRouter.use(authMiddleware, requireWebsiteAccess);

function toDto(url: {
  id: string;
  websiteId: string;
  url: string;
  status: string;
  lastCrawledAt: Date | null;
  createdAt: Date;
}): UrlSourceDto {
  return {
    id: url.id,
    websiteId: url.websiteId,
    url: url.url,
    status: url.status as UrlSourceDto["status"],
    lastCrawledAt: url.lastCrawledAt ? url.lastCrawledAt.toISOString() : null,
    createdAt: url.createdAt.toISOString(),
  };
}

urlsRouter.get<{ websiteId: string }>("/", async (req, res) => {
  const urls = await prisma.urlSource.findMany({
    where: { websiteId: req.params.websiteId },
    orderBy: { createdAt: "desc" },
  });
  res.json(urls.map(toDto));
});

const addUrlSchema = z.object({ url: z.string().url() });

// Fetches and indexes synchronously, same tradeoff as document upload. Embeds
// each chunk with the website's configured AI provider when available (see
// lib/embeddings); otherwise chunks are indexed for keyword-only search.
async function indexUrl(url: { id: string; websiteId: string; url: string }): Promise<"INDEXED" | "FAILED"> {
  try {
    const text = await fetchAndExtractUrlText(url.url);
    const config = await prisma.aiProviderConfig.findUnique({ where: { websiteId: url.websiteId } });
    const embeddingApiKey = config?.apiKeyEncrypted ? decryptSecret(config.apiKeyEncrypted) : null;

    await indexChunks({
      websiteId: url.websiteId,
      sourceType: "URL",
      sourceId: url.id,
      text,
      embeddingProvider: config?.provider ?? null,
      embeddingApiKey,
    });
    return "INDEXED";
  } catch (err) {
    console.error(`Failed to index URL ${url.id} (${url.url}):`, err);
    return "FAILED";
  }
}

urlsRouter.post("/", async (req: AuthenticatedRequest, res) => {
  const parsed = addUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const created = await prisma.urlSource.create({
    data: {
      websiteId: req.params.websiteId,
      url: parsed.data.url,
      status: "PROCESSING",
      createdBy: req.user!.id,
    },
  });

  const status = await indexUrl(created);
  const url = await prisma.urlSource.update({
    where: { id: created.id },
    data: { status, lastCrawledAt: new Date() },
  });

  res.status(201).json(toDto(url));
});

urlsRouter.post<{ websiteId: string; urlId: string }>("/:urlId/refresh", async (req, res) => {
  const existing = await prisma.urlSource.findFirst({
    where: { id: req.params.urlId, websiteId: req.params.websiteId },
  });
  if (!existing) {
    return res.status(404).json({ error: "URL not found" });
  }

  await prisma.urlSource.update({ where: { id: existing.id }, data: { status: "PROCESSING" } });
  const status = await indexUrl(existing);
  const updated = await prisma.urlSource.update({
    where: { id: existing.id },
    data: { status, lastCrawledAt: new Date() },
  });

  res.json(toDto(updated));
});

urlsRouter.delete<{ websiteId: string; urlId: string }>("/:urlId", async (req, res) => {
  const url = await prisma.urlSource.findFirst({
    where: { id: req.params.urlId, websiteId: req.params.websiteId },
  });
  if (!url) {
    return res.status(404).json({ error: "URL not found" });
  }

  await prisma.knowledgeChunk.deleteMany({
    where: { websiteId: url.websiteId, sourceType: "URL", sourceId: url.id },
  });
  await prisma.urlSource.delete({ where: { id: url.id } });
  res.status(204).send();
});
