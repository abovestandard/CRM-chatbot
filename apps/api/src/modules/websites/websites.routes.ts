import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { AuthenticatedRequest, authMiddleware } from "../../middleware/auth.middleware";
import { requireRole, requireWebsiteAccess } from "../../middleware/rbac.middleware";
import { WebsiteAdminDto, WebsiteDto } from "@crm-chatbot/shared-types";

export const websitesRouter = Router();
websitesRouter.use(authMiddleware);

function toWebsiteDto(website: {
  id: string;
  name: string;
  domain: string;
  platform: string;
  status: string;
  apiKey: string;
  createdAt: Date;
}): WebsiteDto {
  return {
    id: website.id,
    name: website.name,
    domain: website.domain,
    platform: website.platform as WebsiteDto["platform"],
    status: website.status as WebsiteDto["status"],
    apiKey: website.apiKey,
    createdAt: website.createdAt.toISOString(),
  };
}

const createWebsiteSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  platform: z.enum([
    "WORDPRESS",
    "LARAVEL",
    "PHP",
    "REACT",
    "NODE",
    "NEXTJS",
    "SHOPIFY",
    "CUSTOM",
    "OTHER",
  ]),
});

// Super Admin: list every website. Website Admin: list only websites they belong to.
websitesRouter.get("/", async (req: AuthenticatedRequest, res) => {
  const websites =
    req.user!.role === "SUPER_ADMIN"
      ? await prisma.website.findMany({ orderBy: { createdAt: "desc" } })
      : await prisma.website.findMany({
          where: { admins: { some: { userId: req.user!.id } } },
          orderBy: { createdAt: "desc" },
        });

  res.json(websites.map(toWebsiteDto));
});

websitesRouter.post("/", requireRole("SUPER_ADMIN"), async (req: AuthenticatedRequest, res) => {
  const parsed = createWebsiteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const website = await prisma.website.create({
    data: { ...parsed.data, createdBy: req.user!.id },
  });
  res.status(201).json(toWebsiteDto(website));
});

websitesRouter.get("/:id", requireWebsiteAccess, async (req, res) => {
  const website = await prisma.website.findUnique({ where: { id: req.params.id } });
  if (!website) {
    return res.status(404).json({ error: "Website not found" });
  }
  res.json(toWebsiteDto(website));
});

const updateWebsiteSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  platform: z.enum([
    "WORDPRESS",
    "LARAVEL",
    "PHP",
    "REACT",
    "NODE",
    "NEXTJS",
    "SHOPIFY",
    "CUSTOM",
    "OTHER",
  ]),
  status: z.enum(["DRAFT", "TESTING", "LIVE"]),
});

websitesRouter.patch("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
  const parsed = updateWebsiteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await prisma.website.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: "Website not found" });
  }

  const website = await prisma.website.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(toWebsiteDto(website));
});

// Cascades to admins, documents, urls, ai config, chat sessions/messages, and
// usage events via the onDelete: Cascade relations in schema.prisma.
websitesRouter.delete("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
  const existing = await prisma.website.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: "Website not found" });
  }

  await prisma.website.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

const assignAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Super Admin creates (or attaches an existing) Website Admin user and links
// them to this website. No public self-registration (spec section 2).
websitesRouter.post(
  "/:id/admins",
  requireRole("SUPER_ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    const parsed = assignAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const website = await prisma.website.findUnique({ where: { id: req.params.id } });
    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }

    const { email, password } = parsed.data;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: { email, passwordHash, role: "WEBSITE_ADMIN" },
      });
    }

    await prisma.websiteUser.upsert({
      where: { websiteId_userId: { websiteId: website.id, userId: user.id } },
      update: {},
      create: { websiteId: website.id, userId: user.id, role: "WEBSITE_ADMIN" },
    });

    res.status(201).json({ userId: user.id, email: user.email, role: user.role } satisfies WebsiteAdminDto);
  },
);

websitesRouter.get("/:id/admins", requireWebsiteAccess, async (req, res) => {
  const links = await prisma.websiteUser.findMany({
    where: { websiteId: req.params.id },
    include: { user: true },
  });
  const admins: WebsiteAdminDto[] = links.map((link) => ({
    userId: link.user.id,
    email: link.user.email,
    role: link.user.role,
  }));
  res.json(admins);
});

websitesRouter.delete(
  "/:id/admins/:userId",
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    await prisma.websiteUser.deleteMany({
      where: { websiteId: req.params.id, userId: req.params.userId },
    });
    res.status(204).send();
  },
);
