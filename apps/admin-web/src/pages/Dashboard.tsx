import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WebsiteDto } from "@crm-chatbot/shared-types";
import { websitesApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";

// The API already scopes the result by role (Super Admin sees every
// website, a Website Admin only sees the ones they're linked to), so a
// single dashboard component works for both roles.
export function Dashboard() {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<WebsiteDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    websitesApi
      .list()
      .then(setWebsites)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Websites</h2>
        {user?.role === "SUPER_ADMIN" && (
          <Link to="/websites/new">
            <button>+ Add website</button>
          </Link>
        )}
      </div>

      <div className="card">
        {loading ? (
          <p>Loading...</p>
        ) : websites.length === 0 ? (
          <p>No websites connected yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Domain</th>
                <th>Platform</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {websites.map((w) => (
                <tr key={w.id}>
                  <td>{w.name}</td>
                  <td>{w.domain}</td>
                  <td>{w.platform}</td>
                  <td>
                    <span className="badge">{w.status}</span>
                  </td>
                  <td>
                    <Link to={`/websites/${w.id}`}>Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
