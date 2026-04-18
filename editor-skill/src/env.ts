import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export type EditorEnv = {
  publicRepoPath: string;
  policyRepoPath: string;
  publicRepoUrl?: string;
  policyRepoUrl?: string;
  githubTokenPath: string;
  dryRun: boolean;
};

const CONFIG_DIR = join(homedir(), ".config", "agentic-polsci-editor");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function loadEnv(overrides: Partial<EditorEnv> = {}): EditorEnv {
  let fileCfg: Partial<EditorEnv> = {};
  if (existsSync(CONFIG_FILE)) {
    fileCfg = JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as Partial<EditorEnv>;
  }
  const merged: EditorEnv = {
    publicRepoPath: overrides.publicRepoPath ?? fileCfg.publicRepoPath ?? "",
    policyRepoPath: overrides.policyRepoPath ?? fileCfg.policyRepoPath ?? "",
    publicRepoUrl: overrides.publicRepoUrl ?? fileCfg.publicRepoUrl,
    policyRepoUrl: overrides.policyRepoUrl ?? fileCfg.policyRepoUrl,
    githubTokenPath:
      overrides.githubTokenPath ?? fileCfg.githubTokenPath ?? join(CONFIG_DIR, "github-token"),
    dryRun: overrides.dryRun ?? fileCfg.dryRun ?? false,
  };
  return merged;
}
