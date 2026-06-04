import type { ReactNode } from "react";
import { EmptyStateCard } from "../components/ui/EmptyStateCard";
import type { UserRole } from "../api/types";
import { useAuth } from "./AuthProvider";

/**
 * RBAC guard for a section of UI (page fragment or feature).
 */
export function RequireRole({
  roles,
  children,
  fallback,
}: {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasRole } = useAuth();

  if (!hasRole(...roles)) {
    return (
      fallback ?? (
        <EmptyStateCard
          icon="🔒"
          title="Access restricted"
          description="This area is not available for your role. Use the sidebar to navigate to permitted pages."
        />
      )
    );
  }

  return <>{children}</>;
}
