import { C } from "../theme/tokens";
import type { UserRole } from "../api/types";

export const ROLES = [
  { id: "screener" as const, label: "Screener", desc: "Initial Report Intake & Hotline", icon: "🎧", clr: C.teal, bg: C.tealPale },
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
    desc: "Field Investigation",
    icon: "🏡",
    clr: C.purple,
    bg: C.purplePale,
  },
  {
    id: "admin" as const,
    label: "System Admin",
    desc: "Triage config & system governance",
    icon: "⚙️",
    clr: "#374151",
    bg: "#F3F4F6",
  },
];

export const NAV: Record<UserRole, { id: string; label: string; icon: string; badge?: number }[]> = {
  screener: [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "dashboard", label: "My Queue", icon: "⊞" },
    { id: "intake", label: "New Initial Report", icon: "＋" },
    { id: "history", label: "Case History", icon: "◷" },
  ],
  supervisor: [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "dashboard", label: "Team Overview", icon: "⊞" },
    { id: "review", label: "Pending Review", icon: "◉" },
    { id: "screening", label: "Field Screening", icon: "→" },
    { id: "summaries", label: "Case Summaries", icon: "≡" },
    { id: "audit", label: "Audit Trail", icon: "🔐" },
  ],
  worker: [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "dashboard", label: "My Cases", icon: "⊞" },
    { id: "briefing", label: "Field Briefing", icon: "📑" },
    { id: "report", label: "Field Report", icon: "✏" },
  ],
  admin: [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "dashboard", label: "System Status", icon: "⊞" },
    { id: "triage-config", label: "Triage Keywords", icon: "⚡" },
    { id: "risk-framework", label: "Risk Scoring", icon: "📈" },
    { id: "audit", label: "Audit Logs", icon: "📊" },
    { id: "users", label: "User Management", icon: "👥" },
    { id: "models", label: "AI Governance", icon: "🤖" },
  ],
};

export const PAGE_LABELS: Record<string, string> = {
  home: "Home",
  dashboard: "Dashboard",
  intake: "New Initial Report",
  history: "Case History",
  review: "Pending Review",
  screening: "Field Screening",
  summaries: "Case Summaries",
  audit: "Audit Trail",
  "case-record": "Case Record",
  "triage-config": "Triage Keywords",
  "risk-framework": "Risk Scoring",
  briefing: "Field Pre-Visit Briefing",
  report: "Field Report",
  users: "User Management",
  models: "AI Governance",
};
