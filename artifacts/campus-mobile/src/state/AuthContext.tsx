import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMe, getStoredToken, storeToken } from "../api/client";
import type { UserProfile } from "../api/types";

type AuthContextValue = {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  setToken: (token: string | null) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setToken = useCallback(async (nextToken: string | null) => {
    await storeToken(nextToken);
    setTokenState(nextToken);
    if (!nextToken) setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = await getStoredToken();
    setTokenState(stored);
    if (!stored) {
      setIsLoading(false);
      return;
    }

    try {
      setUser(await getMe());
    } catch {
      await storeToken(null);
      setTokenState(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
  }, [setToken]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const value = useMemo(() => ({ token, user, isLoading, setToken, refreshUser, logout }), [token, user, isLoading, setToken, refreshUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
