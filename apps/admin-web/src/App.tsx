import { ReactNode } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { CreateWebsite } from "./pages/super-admin/CreateWebsite";
import { WebsiteDetail } from "./pages/website/WebsiteDetail";

function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>AI Chatbot CRM</h1>
        <p style={{ fontSize: 13, color: "#9aa1b3" }}>{user?.email}</p>
        <p style={{ fontSize: 12, color: "#9aa1b3", marginBottom: 24 }}>{user?.role}</p>
        <Link to="/">Websites</Link>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            logout();
          }}
        >
          Log out
        </a>
      </aside>
      <div className="content">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell>
              <Dashboard />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/websites/new"
        element={
          <ProtectedRoute requireRole="SUPER_ADMIN">
            <Shell>
              <CreateWebsite />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/websites/:id"
        element={
          <ProtectedRoute>
            <Shell>
              <WebsiteDetail />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
