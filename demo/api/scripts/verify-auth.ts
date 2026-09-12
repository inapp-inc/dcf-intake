/**
 * Local auth wiring check — POST /auth/login + GET /auth/me for all demo roles.
 * Run after `npm run build`. Uses a temp SQLite file (no Docker required).
 */
import http from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const workDir = mkdtempSync(join(tmpdir(), "ait-auth-verify-"));
process.env.DATABASE_URL = `sqlite://${join(workDir, "test.db")}`;
process.env.ARTIFACT_DIR = join(workDir, "artifacts");
process.env.JWT_SECRET = "verify-auth-test-secret-min-32-chars";
process.env.INTERNAL_API_KEY = "verify-internal-key-for-tests";

const { runMigrations } = await import("../dist/db/migrate.js");
await runMigrations();

const { createApp } = await import("../dist/app.js");

const CREDENTIALS: Record<string, [string, string]> = {
  screener: ["screener.demo", "ScreenerInit!"],
  supervisor: ["supervisor.demo", "SupervisorInit!"],
  worker: ["worker.demo", "WorkerField!"],
  admin: ["admin.demo", "AdminDemo!"],
};

async function request(
  base: string,
  method: string,
  path: string,
  body?: unknown,
  opts?: { token?: string; internalKey?: string },
): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts?.internalKey) headers["X-Internal-Key"] = opts.internalKey;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

const app = createApp();
const server = http.createServer(app);

await new Promise<void>((resolve) => server.listen(0, resolve));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1`;

let failed = 0;

for (const [role, [username, password]] of Object.entries(CREDENTIALS)) {
  const login = await request(base, "POST", "/auth/login", { username, password });
  if (login.status !== 200 || typeof login.json.accessToken !== "string") {
    console.error(`FAIL login ${role}:`, login.status, login.json);
    failed++;
    continue;
  }
  if (login.json.role !== role) {
    console.error(`FAIL login ${role}: expected role ${role}, got ${login.json.role}`);
    failed++;
    continue;
  }

  const token = login.json.accessToken as string;
  const me = await request(base, "GET", "/auth/me", undefined, { token });
  if (me.status !== 200 || me.json.role !== role) {
    console.error(`FAIL /auth/me ${role}:`, me.status, me.json);
    failed++;
    continue;
  }
  console.log(`OK ${role} -> ${me.json.displayName}`);
}

const bad = await request(base, "POST", "/auth/login", { username: "bad", password: "bad" });
if (bad.status !== 401) {
  console.error(`FAIL invalid credentials: expected 401, got ${bad.status}`);
  failed++;
} else {
  console.log("OK invalid credentials -> 401");
}

const noToken = await request(base, "GET", "/auth/me");
if (noToken.status !== 401) {
  console.error(`FAIL /auth/me without token: expected 401, got ${noToken.status}`);
  failed++;
} else {
  console.log("OK /auth/me without token -> 401");
}

const screenerLogin = await request(base, "POST", "/auth/login", {
  username: "screener.demo",
  password: "ScreenerInit!",
});
const screenerToken = screenerLogin.json.accessToken as string;
const casesList = await request(base, "GET", "/cases", undefined, { token: screenerToken });
if (casesList.status === 401 || casesList.status === 403) {
  console.error("FAIL GET /cases blocked by auth routing:", casesList.status, casesList.json);
  failed++;
} else if (casesList.status !== 200 || !Array.isArray(casesList.json.items)) {
  console.error("FAIL GET /cases:", casesList.status, casesList.json);
  failed++;
} else {
  console.log(`OK GET /cases with JWT (${casesList.json.items.length} items)`);
}

const caseId = "00000000-0000-4000-8000-000000000001";
const internalEvent = await request(
  base,
  "POST",
  `/internal/cases/${caseId}/events`,
  { type: "pipeline.stage.complete", stage: "verify" },
  { internalKey: process.env.INTERNAL_API_KEY },
);
if (internalEvent.status !== 200 || internalEvent.json.ok !== true) {
  console.error("FAIL internal events without JWT:", internalEvent.status, internalEvent.json);
  failed++;
} else {
  console.log("OK internal /events with X-Internal-Key (no JWT)");
}

const internalNoKey = await request(base, "POST", `/internal/cases/${caseId}/events`, {
  type: "pipeline.stage.complete",
});
if (internalNoKey.status !== 403) {
  console.error(`FAIL internal events without key: expected 403, got ${internalNoKey.status}`);
  failed++;
} else {
  console.log("OK internal /events without key -> 403");
}

server.close();

if (failed) {
  console.error(`Auth verify failed (${failed} checks)`);
  process.exit(1);
}
console.log("Auth verify passed.");
