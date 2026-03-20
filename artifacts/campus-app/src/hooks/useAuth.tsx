import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getMe, type UserProfile } from "@/lib/api";

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  setToken: (t: string | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("campus_token"));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    if (t) localStorage.setItem("campus_token", t);
    else localStorage.removeItem("campus_token");
  }, []);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem("campus_token")) { setIsLoading(false); return; }
    try {
      const u = await getMe();
      setUser(u);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [setToken]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, [setToken]);

  useEffect(() => { refreshUser(); }, [token, refreshUser]);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, setToken, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
