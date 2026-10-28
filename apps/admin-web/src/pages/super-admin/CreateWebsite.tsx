import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WebsitePlatform } from "@crm-chatbot/shared-types";
import { websitesApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";

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

export function CreateWebsite() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [platform, setPlatform] = useState<WebsitePlatform>("WORDPRESS");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const website = await websitesApi.create({ name, domain, platform });
      navigate(`/websites/${website.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create website");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2>Add website</h2>
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 420 }}>
        <div className="form-row">
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-row">
          <label htmlFor="domain">Domain</label>
          <input
            id="domain"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="platform">Platform</label>
          <select
            id="platform"
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
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create website"}
        </button>
      </form>
    </div>
  );
}
