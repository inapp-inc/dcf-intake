import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { UserRole } from "../api/types";
import type { AuthUser } from "./types";
import { clearAccessToken, getAccessToken, setAccessToken, subscribeSession } from "./session";

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string, expectedRole?: UserRole) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()));

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
  }, []);

  const restoreSession = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const profile = await api.me();
      setUser({
        userId: profile.userId,
        displayName: profile.displayName,
        role: profile.role,
        areaOffice: profile.areaOffice,
      });
    } catch {
      clearAccessToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => subscribeSession(() => setUser(null)), []);

  const login = useCallback(async (username: string, password: string, expectedRole?: UserRole) => {
    setLoading(true);
    try {
      const res = await api.login(username, password);
      setAccessToken(res.accessToken);
      const profile = await api.me();
      if (expectedRole && profile.role !== expectedRole) {
        clearAccessToken();
        setUser(null);
        throw new Error("ROLE_MISMATCH");
      }
      setUser({
        userId: profile.userId,
        displayName: profile.displayName,
        role: profile.role,
        areaOffice: profile.areaOffice,
      });
    } catch (e) {
      clearAccessToken();
      setUser(null);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && getAccessToken()),
      loading,
      login,
      logout,
      hasRole: (...roles) => (user ? roles.includes(user.role) : false),
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
