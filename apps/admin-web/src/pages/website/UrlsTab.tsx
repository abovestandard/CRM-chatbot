import { FormEvent, useEffect, useState } from "react";
import { UrlSourceDto } from "@crm-chatbot/shared-types";
import { urlsApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";

export function UrlsTab({ websiteId }: { websiteId: string }) {
  const [urls, setUrls] = useState<UrlSourceDto[]>([]);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    urlsApi.list(websiteId).then(setUrls);
  }

  useEffect(refresh, [websiteId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await urlsApi.add(websiteId, { url });
      setUrl("");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add URL");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefresh(urlId: string) {
    await urlsApi.refresh(websiteId, urlId);
    refresh();
  }

  async function handleDelete(urlId: string) {
    await urlsApi.remove(websiteId, urlId);
    refresh();
  }

  return (
    <div className="card">
      <h3>URLs</h3>
      <p style={{ color: "#666", fontSize: 14 }}>
        Crawling and indexing land in Phase 2 — URLs are tracked as "Pending" for now.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="url"
          placeholder="https://example.com/page"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ flex: 1 }}
          required
        />
        <button type="submit" disabled={submitting}>
          Add
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>URL</th>
            <th>Status</th>
            <th>Last crawled</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {urls.map((u) => (
            <tr key={u.id}>
              <td>{u.url}</td>
              <td>
                <span className="badge">{u.status}</span>
              </td>
              <td>{u.lastCrawledAt ? new Date(u.lastCrawledAt).toLocaleString() : "—"}</td>
              <td style={{ display: "flex", gap: 8 }}>
                <button className="secondary" onClick={() => handleRefresh(u.id)}>
                  Refresh
                </button>
                <button className="secondary" onClick={() => handleDelete(u.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
