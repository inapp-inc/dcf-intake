import { NAV } from "../constants/nav";
import type { UserRole } from "../api/types";

/** Whether this nav page is valid for the signed-in role. */
export function isPageAllowedForRole(role: UserRole, page: string): boolean {
  if (page === "case-record") return role === "supervisor" || role === "worker";
  return NAV[role].some((item) => item.id === page);
}

/** First sidebar page for the role (always in NAV — avoids redirect loops). */
export function defaultPageForRole(role: UserRole): string {
  return NAV[role][0]?.id ?? "dashboard";
}

/** Safe redirect when the current page is invalid for the role. */
export function fallbackPageForRole(role: UserRole, current: string): string {
  if (isPageAllowedForRole(role, current)) return current;
  return defaultPageForRole(role);
}
