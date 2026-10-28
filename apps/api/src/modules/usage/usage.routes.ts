import { Router } from "express";
import { prisma } from "../../db/prisma";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireWebsiteAccess } from "../../middleware/rbac.middleware";
import { UsageSummaryDto } from "@crm-chatbot/shared-types";

export const usageRouter = Router({ mergeParams: true });
usageRouter.use(authMiddleware, requireWebsiteAccess);

usageRouter.get<{ websiteId: string }>("/", async (req, res) => {
  const websiteId = req.params.websiteId;

  const [totalChatSessions, totalMessages, documentsIndexed, urlsIndexed] = await Promise.all([
    prisma.chatSession.count({ where: { websiteId } }),
    prisma.chatMessage.count({ where: { session: { websiteId } } }),
    prisma.document.count({ where: { websiteId, status: "INDEXED" } }),
    prisma.urlSource.count({ where: { websiteId, status: "INDEXED" } }),
  ]);

  const summary: UsageSummaryDto = {
    websiteId,
    totalChatSessions,
    totalMessages,
    documentsIndexed,
    urlsIndexed,
  };

  res.json(summary);
});
