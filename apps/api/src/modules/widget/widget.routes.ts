import { randomUUID } from "crypto";
import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { extractProviderErrorMessage } from "../../lib/ai-providers/error";
import { AiProviderCallError, runChatTurn } from "../chat/chat.service";
import { WidgetSettingsDto } from "@crm-chatbot/shared-types";

export const widgetRouter = Router();

// Public — the widget script fetches its own appearance settings by apiKey
// before rendering. Nothing here is sensitive (unlike AiProviderConfig).
widgetRouter.get("/settings", async (req, res) => {
  const apiKey = typeof req.query.apiKey === "string" ? req.query.apiKey : "";
  const website = await prisma.website.findUnique({
    where: { apiKey },
    include: { widgetSettings: true },
  });
  if (!website) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const settings = website.widgetSettings;
  const dto: WidgetSettingsDto = {
    websiteId: website.id,
    launcherStyle: settings?.launcherStyle ?? "BUBBLE",
    greetingText: settings?.greetingText ?? "How can we help you today?",
    inputPlaceholder: settings?.inputPlaceholder ?? "Ask a question...",
    brandColor: settings?.brandColor ?? "#3457d5",
    logoUrl: settings?.logoUrl ?? null,
  };
  res.json(dto);
});

// This endpoint is reachable from any website that embeds the widget script,
// authenticated only by the website's apiKey (which is necessarily public —
// it ships in client-side JS). Rate limiting is the main abuse guard since a
// leaked/scraped key could otherwise run up the website owner's AI bill.
const widgetChatLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip ?? "")}:${(req.body as { apiKey?: string })?.apiKey ?? "unknown"}`,
});

const widgetChatSchema = z.object({
  apiKey: z.string().min(1),
  sessionId: z.string().uuid().optional(),
  visitorId: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(4000),
});

widgetRouter.post("/chat", widgetChatLimiter, async (req, res) => {
  const parsed = widgetChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { apiKey, sessionId, message } = parsed.data;
  const visitorId = parsed.data.visitorId ?? randomUUID();

  const website = await prisma.website.findUnique({ where: { apiKey } });
  if (!website) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  if (website.status === "DRAFT") {
    return res.status(403).json({ error: "This chatbot has not been made live yet" });
  }

  try {
    const response = await runChatTurn({ websiteId: website.id, visitorId, sessionId, message });
    res.json(response);
  } catch (err) {
    if (err instanceof AiProviderCallError) {
      return res.status(502).json({ error: extractProviderErrorMessage(err) });
    }
    console.error("Widget chat request failed:", err);
    res.status(500).json({ error: "Something went wrong handling that message" });
  }
});
