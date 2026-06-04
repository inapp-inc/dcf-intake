import type { UserRole } from "../api/types";

export type AuthUser = {
  userId: string;
  displayName: string;
  role: UserRole;
  areaOffice?: string;
};
