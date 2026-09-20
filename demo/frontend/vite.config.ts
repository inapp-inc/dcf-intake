import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function normalizeBaseForVite(raw: string | undefined): string {
  const v = (raw ?? "/").trim();
  if (!v || v === "/") return "/";
  const withLeading = v.startsWith("/") ? v : `/${v}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, demoRoot, ""), ...loadEnv(mode, process.cwd(), "") };
  const base = normalizeBaseForVite(env.VITE_BASE_PATH);
  const apiPort = env.PORT || "11110";

  const appBase = base.replace(/\/+$/, "") || "";
  const apiProxy = appBase ? `${appBase}/api` : "/api";
  const wsProxy = appBase ? `${appBase}/ws` : "/ws";

  return {
    plugins: [react()],
    base,
    build: { outDir: "dist" },
    server: {
      port: 3000,
      proxy: {
        [apiProxy]: { target: `http://localhost:${apiPort}`, changeOrigin: true },
        [wsProxy]: { target: `ws://localhost:${apiPort}`, ws: true },
      },
    },
  };
});
