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
    password: "Screener51a!",
    role: "screener",
    displayName: "Jamie Rivera",
    areaOffice: "Springfield",
  },
  {
    username: "supervisor.demo",
    password: "Supervisor51a!",
    role: "supervisor",
    displayName: "Alex Morgan",
    areaOffice: "Springfield",
  },
  {
    username: "worker.demo",
    password: "Worker51b!",
    role: "worker",
    displayName: "Sam Okonkwo",
    areaOffice: "Springfield",
  },
  {
    username: "admin.demo",
    password: "AdminDemo!",
    role: "admin",
    displayName: "Taylor Chen",
    areaOffice: "DCF Central",
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
