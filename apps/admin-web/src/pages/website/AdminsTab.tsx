import { FormEvent, useEffect, useState } from "react";
import { WebsiteAdminDto } from "@crm-chatbot/shared-types";
import { websitesApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";

export function AdminsTab({ websiteId }: { websiteId: string }) {
  const [admins, setAdmins] = useState<WebsiteAdminDto[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    websitesApi.listAdmins(websiteId).then(setAdmins);
  }

  useEffect(refresh, [websiteId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await websitesApi.assignAdmin(websiteId, email, password);
      setEmail("");
      setPassword("");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign admin");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(userId: string) {
    await websitesApi.removeAdmin(websiteId, userId);
    refresh();
  }

  return (
    <div>
      <div className="card">
        <h3>Website admins</h3>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.userId}>
                <td>{a.email}</td>
                <td>{a.role}</td>
                <td>
                  <button className="secondary" onClick={() => handleRemove(a.userId)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Assign new admin</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="admin-password">
              Password (used only if this is a new user)
            </label>
            <input
              id="admin-password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Assigning..." : "Assign admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
