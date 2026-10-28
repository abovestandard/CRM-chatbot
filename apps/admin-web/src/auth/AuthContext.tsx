import { createContext, ReactNode, useContext, useState } from "react";
import { AuthenticatedUser } from "@crm-chatbot/shared-types";
import { authApi } from "../api/endpoints";
import { getToken, setToken as persistToken } from "../api/client";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = "crm_chatbot_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthenticatedUser) : null;
  });
  const [loading, setLoading] = useState(false);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const { token, user: loggedInUser } = await authApi.login({ email, password });
      persistToken(token);
      localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
      setUser(loggedInUser);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    persistToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}
