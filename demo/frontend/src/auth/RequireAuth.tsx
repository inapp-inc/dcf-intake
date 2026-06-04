import type { ReactNode } from "react";
import { LoginScreen } from "../components/layout/LoginScreen";
import { PageLoading } from "../components/ui/LoadingSpinner";
import { useAuth } from "./AuthProvider";

/**
 * Route guard: only renders children when a valid session exists.
 * Unauthenticated users see the login screen.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, login } = useAuth();

  if (loading) {
    return <PageLoading message="Restoring session…" />;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return <>{children}</>;
}
