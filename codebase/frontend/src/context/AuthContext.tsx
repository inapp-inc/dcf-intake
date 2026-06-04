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

const STORAGE_KEY = "dcf-ait-token";

interface AuthState {
  token: string | null;
  role: UserRole | null;
  displayName: string;
  loading: boolean;
  login: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [role, setRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me(token)
      .then((u) => {
        setRole(u.role);
        setDisplayName(u.displayName);
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (r: UserRole) => {
    const res = await api.demoLogin(r, `${r.charAt(0).toUpperCase()}${r.slice(1)} Demo`);
    localStorage.setItem(STORAGE_KEY, res.accessToken);
    setToken(res.accessToken);
    setRole(r);
    setDisplayName(`${r.charAt(0).toUpperCase()}${r.slice(1)} Demo`);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setRole(null);
    setDisplayName("");
  }, []);

  const value = useMemo(
    () => ({ token, role, displayName, loading, login, logout }),
    [token, role, displayName, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
