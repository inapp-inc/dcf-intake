import type { UserRole } from "./form51a/types.js";

export type DemoUserRecord = {
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  areaOffice: string;
};

/** Demo-only accounts — not for production. */
export const DEMO_USERS: DemoUserRecord[] = [
  {
    username: "screener.demo",
    password: "ScreenerInit!",
    role: "screener",
    displayName: "Jamie Rivera",
    areaOffice: "Springfield",
  },
  {
    username: "supervisor.demo",
    password: "SupervisorInit!",
    role: "supervisor",
    displayName: "Alex Morgan",
    areaOffice: "Springfield",
  },
  {
    username: "worker.demo",
    password: "WorkerField!",
    role: "worker",
    displayName: "Sam Okonkwo",
    areaOffice: "Springfield",
  },
  {
    username: "admin.demo",
    password: "AdminDemo!",
    role: "admin",
    displayName: "Taylor Chen",
    areaOffice: "Central Office",
  },
];

export function findDemoUser(username: string, password: string): DemoUserRecord | null {
  const normalized = username.trim().toLowerCase();
  return (
    DEMO_USERS.find(
      (u) => u.username.toLowerCase() === normalized && u.password === password,
    ) ?? null
  );
}
