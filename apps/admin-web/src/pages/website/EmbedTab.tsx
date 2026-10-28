import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { WebsiteDto, WidgetLauncherStyle, WidgetSettingsDto } from "@crm-chatbot/shared-types";
import { widgetSettingsApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "http://localhost:4000";

export function EmbedTab({ website }: { website: WebsiteDto }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="${API_ORIGIN}/widget.js" data-api-key="${website.apiKey}" async></script>`;

  function handleCopy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      <div className="card">
        <h3>Embed the chatbot on your website</h3>
        <p style={{ color: "#666", fontSize: 14 }}>
          Paste this snippet before the closing <code>&lt;/body&gt;</code> tag of every page you
          want the chatbot to appear on. It works on any platform — WordPress, Laravel, a static
          site, anything that can render raw HTML.
        </p>
        {website.status === "DRAFT" && (
          <p className="error">
            This website's status is <strong>DRAFT</strong> — the widget will refuse to respond
            until you set it to Testing or Live in Settings.
          </p>
        )}
        <pre
          style={{
            background: "#1f2430",
            color: "#e6eaf7",
            padding: 12,
            borderRadius: 6,
            overflowX: "auto",
            fontSize: 13,
          }}
        >
          {snippet}
        </pre>
        <button onClick={handleCopy}>{copied ? "Copied!" : "Copy snippet"}</button>
      </div>

      <AppearanceCard websiteId={website.id} />
    </div>
  );
}

function AppearanceCard({ websiteId }: { websiteId: string }) {
  const [settings, setSettings] = useState<WidgetSettingsDto | null>(null);
  const [launcherStyle, setLauncherStyle] = useState<WidgetLauncherStyle>("BUBBLE");
  const [greetingText, setGreetingText] = useState("");
  const [inputPlaceholder, setInputPlaceholder] = useState("");
  const [brandColor, setBrandColor] = useState("#3457d5");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applySettings(s: WidgetSettingsDto) {
    setSettings(s);
    setLauncherStyle(s.launcherStyle);
    setGreetingText(s.greetingText);
    setInputPlaceholder(s.inputPlaceholder);
    setBrandColor(s.brandColor);
  }

  useEffect(() => {
    widgetSettingsApi.get(websiteId).then(applySettings);
  }, [websiteId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await widgetSettingsApi.update(websiteId, {
        launcherStyle,
        greetingText,
        inputPlaceholder,
        brandColor,
      });
      applySettings(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save appearance settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const updated = await widgetSettingsApi.uploadLogo(websiteId, file);
      applySettings(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload logo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleLogoRemove() {
    setUploading(true);
    try {
      const updated = await widgetSettingsApi.removeLogo(websiteId);
      applySettings(updated);
    } finally {
      setUploading(false);
    }
  }

  if (!settings) {
    return <div className="card">Loading...</div>;
  }

  return (
    <div className="card">
      <h3>Widget appearance</h3>

      <div className="form-row">
        <label>Logo / icon</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {settings.logoUrl ? (
            <img
              src={`${API_ORIGIN}${settings.logoUrl}`}
              alt="Widget logo"
              style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8, background: "#f0f0f0" }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              💬
            </div>
          )}
          <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoUpload} disabled={uploading} />
          {settings.logoUrl && (
            <button type="button" className="secondary" onClick={handleLogoRemove} disabled={uploading}>
              Remove
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="launcher-style">Launcher style</label>
          <select
            id="launcher-style"
            value={launcherStyle}
            onChange={(e) => setLauncherStyle(e.target.value as WidgetLauncherStyle)}
          >
            <option value="BUBBLE">Bubble — small floating chat window</option>
            <option value="FULLSCREEN">Full-screen — takes over the page like a search overlay</option>
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="greeting-text">Greeting text</label>
          <input
            id="greeting-text"
            value={greetingText}
            onChange={(e) => setGreetingText(e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="input-placeholder">Input placeholder</label>
          <input
            id="input-placeholder"
            value={inputPlaceholder}
            onChange={(e) => setInputPlaceholder(e.target.value)}
            maxLength={100}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="brand-color">Brand color</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              id="brand-color"
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              style={{ width: 44, height: 32, padding: 2 }}
            />
            <input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              pattern="^#[0-9a-fA-F]{6}$"
              style={{ width: 100 }}
            />
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save appearance"}
        </button>
      </form>
    </div>
  );
}
