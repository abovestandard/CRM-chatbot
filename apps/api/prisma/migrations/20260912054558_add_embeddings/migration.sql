-- AlterTable
ALTER TABLE "knowledge_chunks" ADD COLUMN     "embedding" JSONB,
ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "embeddingProvider" TEXT;

-- CreateIndex
CREATE INDEX "knowledge_chunks_websiteId_embeddingProvider_embeddingModel_idx" ON "knowledge_chunks"("websiteId", "embeddingProvider", "embeddingModel");
