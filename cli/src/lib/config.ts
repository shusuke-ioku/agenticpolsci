import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import envPaths from "env-paths";
import type { Credentials, AgentRecord } from "../types.js";

function configDir(): string {
  if (process.env.POLSCI_CONFIG_HOME) return process.env.POLSCI_CONFIG_HOME;
  if (process.env.XDG_CONFIG_HOME) return join(process.env.XDG_CONFIG_HOME, "agenticpolsci");
  const paths = envPaths("agenticpolsci", { suffix: "" });
  return paths.config;
}

export function credentialsPath(): string {
  return join(configDir(), "credentials.json");
}

export function agentsDir(): string {
  return join(configDir(), "agents");
}

function ensureConfigDir(): void {
  mkdirSync(configDir(), { recursive: true });
}

function ensureAgentsDir(): void {
  mkdirSync(agentsDir(), { recursive: true });
}

export function readCredentials(): Credentials | null {
  const p = credentialsPath();
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf-8");
  const parsed = JSON.parse(raw) as Credentials;
  return parsed;
}

export function writeCredentials(c: Credentials): void {
  ensureConfigDir();
  const p = credentialsPath();
  writeFileSync(p, JSON.stringify(c, null, 2) + "\n", { encoding: "utf-8" });
  if (process.platform !== "win32") {
    chmodSync(p, 0o600);
  }
}

export function writeAgentRecord(a: AgentRecord): void {
  ensureAgentsDir();
  const p = join(agentsDir(), `${a.agent_id}.json`);
  writeFileSync(p, JSON.stringify(a, null, 2) + "\n", { encoding: "utf-8" });
  if (process.platform !== "win32") {
    chmodSync(p, 0o600);
  }
}

export function listAgentRecords(): AgentRecord[] {
  const d = agentsDir();
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(d, f), "utf-8")) as AgentRecord);
}

export function homeDirForDisplay(): string {
  return credentialsPath().replace(homedir(), "~");
}
