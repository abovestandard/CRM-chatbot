import { Response, Router } from "express";
import { z } from "zod";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { requireWebsiteAccess } from "../../middleware/rbac.middleware";
import { extractProviderErrorMessage } from "../../lib/ai-providers/error";
import { AiProviderCallError, runChatTurn } from "./chat.service";

export const chatRouter = Router({ mergeParams: true });
// Used from the "Test Chat" screen in the CRM, so it goes through normal
// admin auth + website access scoping. The public visitor-facing widget uses
// a separate, apiKey-based route (see modules/widget/widget.routes.ts).
chatRouter.use(authMiddleware, requireWebsiteAccess);

const chatSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().min(1),
});

chatRouter.post("/", async (req: AuthenticatedRequest<{ websiteId: string }>, res: Response) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const response = await runChatTurn({
      websiteId: req.params.websiteId,
      visitorId: `admin-test-${req.user!.id}`,
      sessionId: parsed.data.sessionId,
      message: parsed.data.message,
    });
    res.json(response);
  } catch (err) {
    if (err instanceof AiProviderCallError) {
      return res.status(502).json({ error: extractProviderErrorMessage(err) });
    }
    console.error("Chat request failed:", err);
    res.status(500).json({ error: "Something went wrong handling that message" });
  }
});
