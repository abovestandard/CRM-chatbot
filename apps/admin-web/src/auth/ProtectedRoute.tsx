import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { UserRole } from "@crm-chatbot/shared-types";
import { useAuth } from "./AuthContext";

export function ProtectedRoute({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: UserRole;
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
