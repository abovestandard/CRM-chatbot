import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../../db/prisma";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { requireWebsiteAccess } from "../../middleware/rbac.middleware";
import { DocumentDto } from "@crm-chatbot/shared-types";
import { extractTextFromFile } from "../../lib/content/extract-text";
import { indexChunks } from "../../lib/content/index-chunks";
import { decryptSecret } from "../../lib/crypto";

export const documentsRouter = Router({ mergeParams: true });
documentsRouter.use(authMiddleware, requireWebsiteAccess);

const UPLOAD_ROOT = path.join(__dirname, "..", "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const websiteDir = path.join(UPLOAD_ROOT, req.params.websiteId);
    fs.mkdirSync(websiteDir, { recursive: true });
    cb(null, websiteDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
]);

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Unsupported file type"));
    }
    cb(null, true);
  },
});

function toDto(doc: {
  id: string;
  websiteId: string;
  filename: string;
  fileType: string;
  status: string;
  createdAt: Date;
}): DocumentDto {
  return {
    id: doc.id,
    websiteId: doc.websiteId,
    filename: doc.filename,
    fileType: doc.fileType,
    status: doc.status as DocumentDto["status"],
    createdAt: doc.createdAt.toISOString(),
  };
}

documentsRouter.get<{ websiteId: string }>("/", async (req, res) => {
  const docs = await prisma.document.findMany({
    where: { websiteId: req.params.websiteId },
    orderBy: { createdAt: "desc" },
  });
  res.json(docs.map(toDto));
});

// Extraction runs synchronously and blocks the response — acceptable for the
// file sizes this endpoint allows (20MB). Embeds each chunk with the
// website's configured AI provider when available (see lib/embeddings);
// otherwise chunks are indexed for keyword-only search.
async function indexDocument(doc: {
  id: string;
  websiteId: string;
  storagePath: string;
  fileType: string;
}): Promise<"INDEXED" | "FAILED"> {
  try {
    const text = await extractTextFromFile(doc.storagePath, doc.fileType);
    const config = await prisma.aiProviderConfig.findUnique({ where: { websiteId: doc.websiteId } });
    const embeddingApiKey = config?.apiKeyEncrypted ? decryptSecret(config.apiKeyEncrypted) : null;

    await indexChunks({
      websiteId: doc.websiteId,
      sourceType: "DOCUMENT",
      sourceId: doc.id,
      text,
      embeddingProvider: config?.provider ?? null,
      embeddingApiKey,
    });
    return "INDEXED";
  } catch (err) {
    console.error(`Failed to index document ${doc.id}:`, err);
    return "FAILED";
  }
}

documentsRouter.post("/", upload.single("file"), async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const created = await prisma.document.create({
    data: {
      websiteId: req.params.websiteId,
      filename: req.file.originalname,
      fileType: req.file.mimetype,
      storagePath: req.file.path,
      status: "PROCESSING",
      uploadedBy: req.user!.id,
    },
  });

  const status = await indexDocument(created);
  const doc = await prisma.document.update({ where: { id: created.id }, data: { status } });

  res.status(201).json(toDto(doc));
});

documentsRouter.delete<{ websiteId: string; documentId: string }>("/:documentId", async (req, res) => {
  const doc = await prisma.document.findFirst({
    where: { id: req.params.documentId, websiteId: req.params.websiteId },
  });
  if (!doc) {
    return res.status(404).json({ error: "Document not found" });
  }

  await prisma.knowledgeChunk.deleteMany({
    where: { websiteId: doc.websiteId, sourceType: "DOCUMENT", sourceId: doc.id },
  });
  await prisma.document.delete({ where: { id: doc.id } });
  fs.rm(doc.storagePath, { force: true }, () => {});
  res.status(204).send();
});
