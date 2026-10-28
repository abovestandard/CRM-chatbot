import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WebsiteDto, WebsitePlatform, WebsiteStatus } from "@crm-chatbot/shared-types";
import { websitesApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { AdminsTab } from "./AdminsTab";

const PLATFORMS: WebsitePlatform[] = [
  "WORDPRESS",
  "LARAVEL",
  "PHP",
  "REACT",
  "NODE",
  "NEXTJS",
  "SHOPIFY",
  "CUSTOM",
  "OTHER",
];

const STATUSES: WebsiteStatus[] = ["DRAFT", "TESTING", "LIVE"];

export function WebsiteSettingsTab({
  website,
  onUpdated,
}: {
  website: WebsiteDto;
  onUpdated: (website: WebsiteDto) => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(website.name);
  const [domain, setDomain] = useState(website.domain);
  const [platform, setPlatform] = useState<WebsitePlatform>(website.platform);
  const [status, setStatus] = useState<WebsiteStatus>(website.status);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await websitesApi.update(website.id, { name, domain, platform, status });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save website");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await websitesApi.remove(website.id);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete website");
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Website details</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="ws-name">Name</label>
            <input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-row">
            <label htmlFor="ws-domain">Domain</label>
            <input id="ws-domain" value={domain} onChange={(e) => setDomain(e.target.value)} required />
          </div>
          <div className="form-row">
            <label htmlFor="ws-platform">Platform</label>
            <select
              id="ws-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as WebsitePlatform)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="ws-status">Status</label>
            <select
              id="ws-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as WebsiteStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Danger zone</h3>
        <p style={{ color: "#666", fontSize: 14 }}>
          Permanently deletes this website and all of its admins, documents, URLs, AI settings, and
          chat history. This cannot be undone.
        </p>
        {!confirmingDelete ? (
          <button className="secondary" onClick={() => setConfirmingDelete(true)}>
            Delete website
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>Are you sure?</span>
            <button onClick={handleDelete} disabled={deleting} style={{ background: "#c0392b" }}>
              {deleting ? "Deleting..." : "Yes, delete permanently"}
            </button>
            <button className="secondary" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <AdminsTab websiteId={website.id} />
    </div>
  );
}
