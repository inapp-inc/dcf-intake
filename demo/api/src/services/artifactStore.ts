import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { config } from "../config.js";

function root(): string {
  return config.artifactDir;
}

function fullPath(key: string): string {
  const path = join(root(), key);
  mkdirSync(dirname(path), { recursive: true });
  return path;
}

export async function bootstrapArtifacts(): Promise<void> {
  mkdirSync(root(), { recursive: true });
}

export async function putObject(key: string, data: Buffer, contentType?: string): Promise<void> {
  void contentType;
  writeFileSync(fullPath(key), data);
}

export async function bucketReady(): Promise<boolean> {
  return existsSync(root());
}

export function findLatestAudioKey(caseId: string): string | undefined {
  const prefix = join(root(), "audio", "input", caseId);
  if (!existsSync(prefix)) return undefined;
  const files = readdirSync(prefix, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.endsWith(".keep"))
    .map((e) => `audio/input/${caseId}/${e.name}`)
    .sort();
  return files.at(-1);
}

export function getBytes(key: string): Buffer {
  return readFileSync(fullPath(key));
}

export function putJson(key: string, data: unknown): void {
  writeFileSync(fullPath(key), JSON.stringify(data, null, 2), "utf8");
}

export function getJson(key: string): unknown {
  return JSON.parse(readFileSync(fullPath(key), "utf8"));
}
