import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  TOKEN_KEY, getMe, logoutCurrentSession, setUnauthorizedHandler,
  type UserProfile,
} from "@/lib/api";

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  role: UserProfile["role"] | null;
  isLoading: boolean;
  setToken: (t: string | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const u = await getMe();
      setUser(u);
    } catch {
      // Token rejected — clear and force re-auth.
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [setToken]);

  const logout = useCallback(async () => {
    // Best-effort server-side revocation; always clear client even if it fails.
    try { await logoutCurrentSession(); } catch (e) { console.warn("[auth] logout API call failed", e); }
    setToken(null);
    setUser(null);
  }, [setToken]);

  // Wire up the global 401 handler so any rejected request kicks the user out
  // of the protected pages and back to /auth.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setTokenState(null);
      setUser(null);
    });
  }, []);

  useEffect(() => { refreshUser(); }, [token, refreshUser]);

  return (
    <AuthContext.Provider value={{
      token, user,
      role: user?.role ?? null,
      isLoading, setToken, refreshUser, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
