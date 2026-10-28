import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { WebsiteDto } from "@crm-chatbot/shared-types";
import { websitesApi } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { WebsiteSettingsTab } from "./WebsiteSettingsTab";
import { DocumentsTab } from "./DocumentsTab";
import { UrlsTab } from "./UrlsTab";
import { AiSettingsTab } from "./AiSettingsTab";
import { TestChatTab } from "./TestChatTab";
import { UsageTab } from "./UsageTab";
import { EmbedTab } from "./EmbedTab";

type TabKey = "settings" | "documents" | "urls" | "ai" | "chat" | "embed" | "usage";

export function WebsiteDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [website, setWebsite] = useState<WebsiteDto | null>(null);
  const [tab, setTab] = useState<TabKey>(user?.role === "SUPER_ADMIN" ? "settings" : "documents");

  useEffect(() => {
    if (id) websitesApi.get(id).then(setWebsite);
  }, [id]);

  if (!id) return null;
  if (!website) return <p>Loading...</p>;

  const tabs: { key: TabKey; label: string; visible: boolean }[] = [
    { key: "settings", label: "Settings", visible: user?.role === "SUPER_ADMIN" },
    { key: "documents", label: "Documents", visible: true },
    { key: "urls", label: "URLs", visible: true },
    { key: "ai", label: "AI Settings", visible: true },
    { key: "chat", label: "Test Chat", visible: true },
    { key: "embed", label: "Embed", visible: true },
    { key: "usage", label: "Usage", visible: true },
  ];

  return (
    <div>
      <h2>{website.name}</h2>
      <p style={{ color: "#666" }}>
        {website.domain} · {website.platform} · <span className="badge">{website.status}</span>
      </p>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #ddd" }}>
        {tabs
          .filter((t) => t.visible)
          .map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? "" : "secondary"}
              style={{ borderRadius: "6px 6px 0 0" }}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
      </div>

      {tab === "settings" && <WebsiteSettingsTab website={website} onUpdated={setWebsite} />}
      {tab === "documents" && <DocumentsTab websiteId={id} />}
      {tab === "urls" && <UrlsTab websiteId={id} />}
      {tab === "ai" && <AiSettingsTab websiteId={id} />}
      {tab === "chat" && <TestChatTab websiteId={id} />}
      {tab === "embed" && <EmbedTab website={website} />}
      {tab === "usage" && <UsageTab websiteId={id} />}
    </div>
  );
}
