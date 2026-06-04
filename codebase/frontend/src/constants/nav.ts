import { C } from "../theme/tokens";
import type { UserRole } from "../api/types";

export const ROLES = [
  { id: "screener" as const, label: "Screener", desc: "51A Intake & Hotline", icon: "🎧", clr: C.teal, bg: C.tealPale },
  {
    id: "supervisor" as const,
    label: "Supervisor",
    desc: "Case Review & Approval",
    icon: "📋",
    clr: C.navy,
    bg: "#E8EDF8",
  },
  {
    id: "worker" as const,
    label: "Social Worker",
    desc: "51B Field Investigator",
    icon: "🏡",
    clr: C.purple,
    bg: C.purplePale,
  },
  {
    id: "admin" as const,
    label: "IT Admin",
    desc: "Governance & System Access",
    icon: "⚙️",
    clr: "#374151",
    bg: "#F3F4F6",
  },
];

export const NAV: Record<UserRole, { id: string; label: string; icon: string; hi?: boolean; badge?: number }[]> = {
  screener: [
    { id: "dashboard", label: "My Queue", icon: "⊞" },
    { id: "intake", label: "New 51A Intake", icon: "＋", hi: true },
    { id: "history", label: "Case History", icon: "◷" },
  ],
  supervisor: [
    { id: "dashboard", label: "Team Overview", icon: "⊞" },
    { id: "review", label: "Pending Review", icon: "◉", badge: 3 },
    { id: "summaries", label: "Case Summaries", icon: "≡" },
    { id: "audit", label: "Audit Trail", icon: "🔐" },
  ],
  worker: [
    { id: "dashboard", label: "My Cases", icon: "⊞" },
    { id: "briefing", label: "51B Briefing", icon: "📑" },
    { id: "report", label: "Field Report", icon: "✏" },
  ],
  admin: [
    { id: "dashboard", label: "System Status", icon: "⊞" },
    { id: "audit", label: "Audit Logs", icon: "📊" },
    { id: "users", label: "User Management", icon: "👥" },
    { id: "models", label: "AI Governance", icon: "🤖" },
  ],
};

export const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  intake: "New 51A Intake",
  history: "Case History",
  review: "Pending Review",
  summaries: "Case Summaries",
  audit: "Audit Trail",
  briefing: "51B Pre-Visit Briefing",
  report: "Field Report",
  users: "User Management",
  models: "AI Governance",
};
