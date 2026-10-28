import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireWebsiteAccess } from "../../middleware/rbac.middleware";
import { WidgetSettingsDto } from "@crm-chatbot/shared-types";

export const widgetSettingsRouter = Router({ mergeParams: true });
widgetSettingsRouter.use(authMiddleware, requireWebsiteAccess);

const LOGO_DIR = path.join(__dirname, "..", "..", "..", "public", "uploads", "logos");

function toDto(settings: {
  websiteId: string;
  launcherStyle: string;
  greetingText: string;
  inputPlaceholder: string;
  brandColor: string;
  logoUrl: string | null;
}): WidgetSettingsDto {
  return {
    websiteId: settings.websiteId,
    launcherStyle: settings.launcherStyle as WidgetSettingsDto["launcherStyle"],
    greetingText: settings.greetingText,
    inputPlaceholder: settings.inputPlaceholder,
    brandColor: settings.brandColor,
    logoUrl: settings.logoUrl,
  };
}

widgetSettingsRouter.get<{ websiteId: string }>("/", async (req, res) => {
  const settings = await prisma.widgetSettings.findUnique({ where: { websiteId: req.params.websiteId } });
  if (!settings) {
    return res.json({
      websiteId: req.params.websiteId,
      launcherStyle: "BUBBLE",
      greetingText: "How can we help you today?",
      inputPlaceholder: "Ask a question...",
      brandColor: "#3457d5",
      logoUrl: null,
    } satisfies WidgetSettingsDto);
  }
  res.json(toDto(settings));
});

const updateSchema = z.object({
  launcherStyle: z.enum(["BUBBLE", "FULLSCREEN"]),
  greetingText: z.string().min(1).max(200),
  inputPlaceholder: z.string().min(1).max(100),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #3457d5"),
});

widgetSettingsRouter.put<{ websiteId: string }>("/", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const websiteId = req.params.websiteId;
  const settings = await prisma.widgetSettings.upsert({
    where: { websiteId },
    update: parsed.data,
    create: { websiteId, ...parsed.data },
  });

  res.json(toDto(settings));
});

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return cb(new Error("Unsupported image type"));
    }
    cb(null, true);
  },
});

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

widgetSettingsRouter.post<{ websiteId: string }>("/logo", upload.single("logo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  const websiteId = req.params.websiteId;
  const ext = EXTENSION_BY_MIME[req.file.mimetype];
  fs.mkdirSync(LOGO_DIR, { recursive: true });

  // Fixed filename per website (no per-upload uniqueness needed) — old logo
  // is simply overwritten, with a cache-busting query param on the URL.
  const filename = `${websiteId}.${ext}`;
  fs.writeFileSync(path.join(LOGO_DIR, filename), req.file.buffer);

  const logoUrl = `/uploads/logos/${filename}?v=${Date.now()}`;
  const settings = await prisma.widgetSettings.upsert({
    where: { websiteId },
    update: { logoUrl },
    create: { websiteId, logoUrl },
  });

  res.status(201).json(toDto(settings));
});

widgetSettingsRouter.delete<{ websiteId: string }>("/logo", async (req, res) => {
  const websiteId = req.params.websiteId;
  const settings = await prisma.widgetSettings.findUnique({ where: { websiteId } });
  if (settings?.logoUrl) {
    const filename = path.basename(settings.logoUrl.split("?")[0]);
    fs.rm(path.join(LOGO_DIR, filename), { force: true }, () => {});
  }

  const updated = await prisma.widgetSettings.upsert({
    where: { websiteId },
    update: { logoUrl: null },
    create: { websiteId },
  });

  res.json(toDto(updated));
});
