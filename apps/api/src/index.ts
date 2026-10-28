import path from "path";
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { websitesRouter } from "./modules/websites/websites.routes";
import { aiConfigRouter } from "./modules/ai-config/ai-config.routes";
import { documentsRouter } from "./modules/documents/documents.routes";
import { urlsRouter } from "./modules/urls/urls.routes";
import { chatRouter } from "./modules/chat/chat.routes";
import { usageRouter } from "./modules/usage/usage.routes";
import { widgetRouter } from "./modules/widget/widget.routes";
import { widgetSettingsRouter } from "./modules/widget-settings/widget-settings.routes";

const app = express();

app.use(cors());
app.use(express.json());
// Serves /widget.js — the embeddable snippet website owners paste into their
// site. Static (not a route handler) so it gets normal caching semantics.
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/websites", websitesRouter);
app.use("/api/websites/:websiteId/ai-config", aiConfigRouter);
app.use("/api/websites/:websiteId/documents", documentsRouter);
app.use("/api/websites/:websiteId/urls", urlsRouter);
app.use("/api/websites/:websiteId/chat", chatRouter);
app.use("/api/websites/:websiteId/usage", usageRouter);
app.use("/api/websites/:websiteId/widget-settings", widgetSettingsRouter);
app.use("/api/widget", widgetRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
