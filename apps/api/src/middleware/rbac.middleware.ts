import { NextFunction, Response } from "express";
import { UserRole } from "@crm-chatbot/shared-types";
import { AuthenticatedRequest } from "./auth.middleware";
import { prisma } from "../db/prisma";

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

// Enforces per-website data isolation (spec section 12): a Super Admin can
// access any website; a Website Admin must have an explicit WebsiteUser
// membership row for the :websiteId route param.
export async function requireWebsiteAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const websiteId = req.params.websiteId ?? req.params.id;
  if (!req.user || !websiteId) {
    return res.status(400).json({ error: "Missing website id" });
  }

  if (req.user.role === "SUPER_ADMIN") {
    return next();
  }

  const membership = await prisma.websiteUser.findUnique({
    where: { websiteId_userId: { websiteId, userId: req.user.id } },
  });

  if (!membership) {
    return res.status(403).json({ error: "You do not have access to this website" });
  }

  next();
}
