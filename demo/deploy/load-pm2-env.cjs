"use strict";

const fs = require("node:fs");
const path = require("node:path");

function parseEnvFile(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function resolveHostPath(root, value) {
  if (!value) return value;
  if (value.startsWith("./")) return path.resolve(root, value.slice(2));
  if (value.startsWith("../")) return path.resolve(root, value);
  return value;
}

function normalizeDatabaseUrl(root, url) {
  if (!url || !url.startsWith("sqlite:")) return url;
  const raw = url.replace(/^sqlite:\/\//, "").replace(/^sqlite:/, "");
  const dbPath = raw.startsWith("//") ? raw.slice(1) : raw;
  if (dbPath.startsWith("./") || dbPath.startsWith("../")) {
    return `sqlite:///${resolveHostPath(root, dbPath)}`;
  }
  return url;
}

function loadEnv(root) {
  const files = [path.join(root, ".env"), path.join(root, "config", "ai.env")];
  const env = {
    NODE_ENV: "production",
    HOST: "127.0.0.1",
    PORT: "11110",
  };

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    Object.assign(env, parseEnvFile(fs.readFileSync(file, "utf8")));
  }

  env.HOST = env.HOST || "127.0.0.1";
  env.PORT = env.PORT || "11110";
  env.NODE_ENV = env.NODE_ENV || "production";

  if (env.ARTIFACT_DIR) {
    env.ARTIFACT_DIR = resolveHostPath(root, env.ARTIFACT_DIR);
  } else {
    env.ARTIFACT_DIR = path.join(root, "data", "artifacts");
  }

  env.DATABASE_URL = normalizeDatabaseUrl(
    root,
    env.DATABASE_URL || "sqlite:///./data/ait.db",
  );

  const port = env.PORT;
  if (!env.API_BASE_URL || env.API_BASE_URL.includes("api:8080")) {
    env.API_BASE_URL = `http://127.0.0.1:${port}/api/v1`;
  }

  if (env.OLLAMA_BASE_URL && env.OLLAMA_BASE_URL.includes("host.docker.internal")) {
    env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
  }

  return env;
}

module.exports = { loadEnv, parseEnvFile };
