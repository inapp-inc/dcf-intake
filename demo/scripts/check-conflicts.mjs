#!/usr/bin/env node
/**
 * Demo stack guardrails: duplicate API routes, nav wiring, forbidden legacy patterns.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const demoDir = join(import.meta.dirname, "..");
const apiRoutes = join(demoDir, "api/src/routes");
const frontendSrc = join(demoDir, "frontend/src");

let failed = false;
function fail(msg) {
  console.error(`CONFLICT: ${msg}`);
  failed = true;
}

// --- Duplicate API routes (method + path) ---
const routeRe = /router\.(get|post|patch|put|delete)\(\s*["'`]([^"'`]+)["'`]/g;
const routes = new Map();

for (const file of readdirSync(apiRoutes).filter((f) => f.endsWith(".ts"))) {
  const text = readFileSync(join(apiRoutes, file), "utf8");
  let m;
  while ((m = routeRe.exec(text)) !== null) {
    const key = `${m[1].toUpperCase()} ${m[2]}`;
    const prev = routes.get(key);
    if (prev) fail(`Duplicate endpoint ${key} in ${file} (also in ${prev})`);
    else routes.set(key, file);
  }
}

// --- Forbidden legacy frontend files ---
const forbiddenFiles = [
  "frontend/src/context/AuthContext.tsx",
  "frontend/src/pages/PlaceholderPage.tsx",
];
for (const rel of forbiddenFiles) {
  const p = join(demoDir, rel);
  if (existsSync(p)) fail(`Remove legacy file ${rel} — use src/auth/ and real page components instead`);
}

// --- Forbidden patterns in frontend/src ---
const walkTs = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules") continue;
      walkTs(p, out);
    } else if (/\.(tsx?)$/.test(name)) out.push(p);
  }
  return out;
};

const forbiddenPatterns = [
  { re: /from\s+["'][^"']*context\/AuthContext["']/g, msg: "Import from context/AuthContext — use ../auth or ../auth/AuthProvider" },
  { re: /api\.me\s*\(\s*[^)]/g, msg: "api.me() must take no arguments (session token is internal)" },
  { re: /api\.demoLogin\s*\(\s*token\b/g, msg: "api.demoLogin(role) — do not pass token as first argument" },
  { re: /api\.\w+\s*\(\s*token\s*,/g, msg: "Do not pass token into api.* — use authRequest in client.ts" },
  { re: /createContext\s*<\s*AuthContextValue/g, msg: "Duplicate AuthContext — only auth/AuthProvider.tsx may define auth state" },
];

for (const file of walkTs(frontendSrc)) {
  const rel = relative(demoDir, file);
  if (rel.includes("auth/AuthProvider.tsx")) continue;
  const text = readFileSync(file, "utf8");
  if (/HF_API_TOKEN|HUGGINGFACE_API_KEY|router\.huggingface\.co/.test(text)) {
    fail(`${rel}: HF credentials/endpoints must stay server-side (api + ai-bundle only)`);
  }
  for (const { re, msg } of forbiddenPatterns) {
    re.lastIndex = 0;
    if (re.test(text)) fail(`${rel}: ${msg}`);
  }
}

// --- NAV page ids must be handled in RoleViews (per role) ---
const navText = readFileSync(join(frontendSrc, "constants/nav.ts"), "utf8");
const roleViewsText = readFileSync(join(frontendSrc, "routes/RoleViews.tsx"), "utf8");

const navBlockRe = /(\w+):\s*\[([\s\S]*?)\],/g;
let navMatch;
while ((navMatch = navBlockRe.exec(navText)) !== null) {
  const role = navMatch[1];
  if (!["screener", "supervisor", "worker", "admin"].includes(role)) continue;
  const ids = [...navMatch[2].matchAll(/id:\s*"([^"]+)"/g)].map((x) => x[1]);
  for (const id of ids) {
    if (role === "admin") {
      if (!roleViewsText.includes('role === "admin"') || !roleViewsText.includes("AdminDashboard")) {
        fail("admin routes missing in RoleViews");
      }
      continue;
    }
    if (!roleViewsText.includes(`page === "${id}"`) && !(role === "supervisor" && ["dashboard", "review", "summaries"].includes(id))) {
      fail(`NAV id "${id}" for ${role} may be unwired in RoleViews.tsx`);
    }
  }
}

// --- Single api export ---
const clientText = readFileSync(join(frontendSrc, "api/client.ts"), "utf8");
const exportApiCount = (clientText.match(/export const api\s*=/g) || []).length;
if (exportApiCount !== 1) fail(`Expected one 'export const api' in client.ts, found ${exportApiCount}`);

// --- Auth router mounted in API app ---
const appText = readFileSync(join(demoDir, "api/src/app.ts"), "utf8");
if (!appText.includes("authRouter") || !/api\.use\(authRouter\)/.test(appText)) {
  fail("authRouter must be registered in api/src/app.ts");
}
for (const ep of ["POST /auth/login", "POST /auth/demo-login", "GET /auth/me"]) {
  if (!routes.has(ep)) fail(`Missing auth endpoint ${ep} in api/src/routes/auth.ts`);
}

// --- Route mount structure (prevents worker 401 / JWT bleed) ---
if (!/api\.use\(\s*["']\/internal["']\s*,\s*requireInternalKey/.test(appText)) {
  fail('Mount worker routes with api.use("/internal", requireInternalKey, internalRouter) in app.ts');
}
if (!/protectedApi\.use\(requireAuth\)/.test(appText)) {
  fail("JWT must be applied once on protectedApi in app.ts — not per route module");
}
if (/router\.use\(requireInternalKey\)/.test(readFileSync(join(demoDir, "api/src/routes/internal.ts"), "utf8"))) {
  fail("Do not use router.use(requireInternalKey) in internal.ts — mount enforces the key on /internal/*");
}

for (const file of readdirSync(apiRoutes).filter((f) => f.endsWith(".ts") && f !== "auth.ts" && f !== "health.ts")) {
  const text = readFileSync(join(apiRoutes, file), "utf8");
  if (/router\.use\(requireAuth\)/.test(text)) {
    fail(`${file} must not use router.use(requireAuth) — use protectedApi in app.ts instead`);
  }
}

// Internal routes are registered under /internal mount; verify source paths exist.
const internalText = readFileSync(join(apiRoutes, "internal.ts"), "utf8");
for (const srcPath of ["/cases/:caseId/nlp-merge", "/cases/:caseId/events", "/audit"]) {
  if (!internalText.includes(`"${srcPath}"`) && !internalText.includes(`'${srcPath}'`)) {
    fail(`internal.ts missing route ${srcPath} (mounted at /internal${srcPath})`);
  }
}

const redisBusText = readFileSync(join(demoDir, "worker/worker/redis_bus.py"), "utf8");
if (!/def enqueue\s*\(/.test(redisBusText)) {
  fail("worker/worker/redis_bus.py must define enqueue() — pipeline stages chain jobs after transcribe");
}

// --- Demo credentials in sync (API ↔ frontend) ---
const apiUsersText = readFileSync(join(demoDir, "api/src/domain/demoUsers.ts"), "utf8");
const feUsersText = readFileSync(join(frontendSrc, "constants/demoUsers.ts"), "utf8");
const credRe = /username:\s*"([^"]+)"[\s\S]*?password:\s*"([^"]+)"/g;
const apiCreds = new Map();
let cm;
while ((cm = credRe.exec(apiUsersText)) !== null) apiCreds.set(cm[1], cm[2]);
const feCreds = new Map();
credRe.lastIndex = 0;
while ((cm = credRe.exec(feUsersText)) !== null) feCreds.set(cm[1], cm[2]);
for (const [user, pass] of apiCreds) {
  if (feCreds.get(user) !== pass) {
    fail(`Demo credential mismatch for ${user} — sync api/src/domain/demoUsers.ts and frontend/src/constants/demoUsers.ts`);
  }
}
if (apiCreds.size !== 4 || feCreds.size !== 4) {
  fail(`Expected 4 demo accounts, found api=${apiCreds.size} frontend=${feCreds.size}`);
}

// --- Frontend client paths must exist on API ---
function normPath(p) {
  return p
    .replace(/\$\{[^}]+\}/g, ":id")
    .replace(/\?[^`"']*/g, "")
    .replace(/\/+$/, "");
}

const backendKeys = new Set(
  [...routes.keys()].map((k) => {
    const [method, path] = k.split(" ");
    return `${method} ${path.replace(/:[^/]+/g, ":id")}`;
  }),
);

/** Each entry: [HTTP method, path template as in client.ts] */
const clientEndpoints = [
  ["POST", "/auth/login"],
  ["POST", "/auth/demo-login"],
  ["GET", "/auth/me"],
  ["GET", "/cases"],
  ["POST", "/cases"],
  ["GET", "/cases/:id"],
  ["POST", "/cases/:id/audio"],
  ["GET", "/cases/:id/form51a"],
  ["PATCH", "/cases/:id/form51a"],
  ["POST", "/cases/:id/form51a/confirm-section"],
  ["POST", "/cases/:id/form51a/reextract"],
  ["POST", "/cases/:id/form51a/complete-checkpoint"],
  ["GET", "/cases/:id/form51a/official"],
  ["GET", "/cases/:id/transcript"],
  ["GET", "/cases/:id/risk"],
  ["GET", "/cases/:id/triage-flags"],
  ["POST", "/cases/:id/triage-decisions"],
  ["GET", "/cases/:id/background-checks"],
  ["GET", "/cases/:id/assistant-messages"],
  ["POST", "/cases/:id/assistant-messages"],
  ["GET", "/cases/:id/pipeline"],
  ["POST", "/cases/:id/submit"],
  ["GET", "/screening/pending"],
  ["POST", "/screening/:id/decision"],
  ["GET", "/cases/:id/briefing"],
  ["POST", "/cases/:id/field-notes"],
  ["POST", "/cases/:id/report51b/draft"],
  ["GET", "/cases/:id/report51b/draft"],
  ["POST", "/cases/:id/report51b/approve"],
  ["POST", "/cases/:id/report51b/compliance-check"],
  ["GET", "/audit/cases/:id"],
  ["GET", "/admin/health"],
  ["GET", "/admin/models"],
];

for (const [method, path] of clientEndpoints) {
  const key = `${method} ${path}`;
  if (!backendKeys.has(key)) {
    fail(`Frontend api client calls ${key} but no matching API route is registered`);
  }
}

// --- AI defaults consistency (config/ai-defaults.env is source of truth) ---
const aiDefaultsPath = join(demoDir, "config/ai-defaults.env");
if (!existsSync(aiDefaultsPath)) {
  fail("Missing config/ai-defaults.env — AI default values must stay in sync");
}
const aiDefaults = Object.fromEntries(
  readFileSync(aiDefaultsPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const envExampleText = readFileSync(join(demoDir, ".env.example"), "utf8");
if (/HF_API_TOKEN=hf_[A-Za-z0-9]{10,}/.test(envExampleText)) {
  fail(".env.example must not contain a real HF_API_TOKEN — use demo/.env for secrets");
}

function envExampleValue(key) {
  const m = envExampleText.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m?.[1]?.trim() ?? "";
}

for (const key of ["HF_MODEL", "HF_ASR_MODEL", "LLM_PROVIDER", "HF_API_BASE"]) {
  const expected = aiDefaults[key];
  const inExample = envExampleValue(key);
  if (expected && inExample && inExample !== expected) {
    fail(`.env.example ${key}=${inExample} does not match config/ai-defaults.env (${expected})`);
  }
}

const configTs = readFileSync(join(demoDir, "api/src/config.ts"), "utf8");
const configPy = readFileSync(join(demoDir, "worker/worker/config.py"), "utf8");
const composeText = readFileSync(join(demoDir, "docker-compose.yml"), "utf8");

if (!configTs.includes(`"${aiDefaults.HF_MODEL}"`)) {
  fail(`api/src/config.ts HF_MODEL default must be ${aiDefaults.HF_MODEL}`);
}
if (!configPy.includes(`"${aiDefaults.HF_MODEL}"`)) {
  fail(`worker/worker/config.py HF_MODEL default must be ${aiDefaults.HF_MODEL}`);
}
if (!composeText.includes(`HF_MODEL:-${aiDefaults.HF_MODEL}`)) {
  fail(`docker-compose.yml HF_MODEL default must be ${aiDefaults.HF_MODEL}`);
}
if (!composeText.includes(`HF_ASR_MODEL:-${aiDefaults.HF_ASR_MODEL}`)) {
  fail(`docker-compose.yml HF_ASR_MODEL default must be ${aiDefaults.HF_ASR_MODEL}`);
}

// --- HF env var names used consistently in API + worker ---
for (const name of ["HF_API_TOKEN", "HF_MODEL", "HF_API_BASE", "HF_ASR_MODEL", "HF_ASR_API_URL"]) {
  if (!configTs.includes(name) && name !== "HF_ASR_MODEL" && name !== "HF_ASR_API_URL") {
    fail(`api/src/config.ts should reference ${name}`);
  }
  if (!configPy.includes(name)) {
    fail(`worker/worker/config.py should reference ${name}`);
  }
}

if (failed) process.exit(1);
console.log(`OK — ${routes.size} API routes, auth wired, ${clientEndpoints.length} client endpoints matched, AI defaults synced`);
