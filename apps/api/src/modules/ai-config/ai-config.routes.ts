import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireWebsiteAccess } from "../../middleware/rbac.middleware";
import { encryptSecret } from "../../lib/crypto";
import { AiProviderConfigDto } from "@crm-chatbot/shared-types";

export const aiConfigRouter = Router({ mergeParams: true });
aiConfigRouter.use(authMiddleware, requireWebsiteAccess);

function toDto(config: {
  websiteId: string;
  provider: string;
  modelName: string;
  allowGeneralKnowledge: boolean;
  isActive: boolean;
  apiKeyEncrypted: string | null;
}): AiProviderConfigDto {
  return {
    websiteId: config.websiteId,
    provider: config.provider as AiProviderConfigDto["provider"],
    modelName: config.modelName,
    allowGeneralKnowledge: config.allowGeneralKnowledge,
    isActive: config.isActive,
    hasApiKey: Boolean(config.apiKeyEncrypted),
  };
}

aiConfigRouter.get<{ websiteId: string }>("/", async (req, res) => {
  const config = await prisma.aiProviderConfig.findUnique({
    where: { websiteId: req.params.websiteId },
  });
  if (!config) {
    return res.json({
      websiteId: req.params.websiteId,
      provider: "OPENAI",
      modelName: "gpt-4o-mini",
      allowGeneralKnowledge: false,
      isActive: false,
      hasApiKey: false,
    } satisfies AiProviderConfigDto);
  }
  res.json(toDto(config));
});

const updateSchema = z.object({
  provider: z.enum(["OPENAI", "GEMINI"]),
  modelName: z.string().min(1),
  apiKey: z.string().min(1).optional(),
  allowGeneralKnowledge: z.boolean(),
  isActive: z.boolean(),
});

aiConfigRouter.put<{ websiteId: string }>("/", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { provider, modelName, apiKey, allowGeneralKnowledge, isActive } = parsed.data;
  const websiteId = req.params.websiteId;

  const config = await prisma.aiProviderConfig.upsert({
    where: { websiteId },
    update: {
      provider,
      modelName,
      allowGeneralKnowledge,
      isActive,
      ...(apiKey ? { apiKeyEncrypted: encryptSecret(apiKey) } : {}),
    },
    create: {
      websiteId,
      provider,
      modelName,
      allowGeneralKnowledge,
      isActive,
      apiKeyEncrypted: apiKey ? encryptSecret(apiKey) : null,
    },
  });

  res.json(toDto(config));
});
