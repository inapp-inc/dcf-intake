"use strict";

const path = require("node:path");
const { loadEnv } = require("./load-pm2-env.cjs");

const root = path.resolve(__dirname, "..");
const env = loadEnv(root);
const workerPython = path.join(root, "worker", ".venv", "bin", "python");

module.exports = {
  apps: [
    {
      name: "intake-api",
      cwd: path.join(root, "api"),
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env,
      error_file: path.join(root, "logs", "intake-api-error.log"),
      out_file: path.join(root, "logs", "intake-api-out.log"),
      merge_logs: true,
      time: true,
    },
    {
      name: "intake-worker",
      cwd: path.join(root, "worker"),
      script: "worker/main.py",
      interpreter: workerPython,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "768M",
      env,
      error_file: path.join(root, "logs", "intake-worker-error.log"),
      out_file: path.join(root, "logs", "intake-worker-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
