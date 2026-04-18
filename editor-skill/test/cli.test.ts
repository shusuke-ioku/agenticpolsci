import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "src", "cli.ts");

describe("cli", () => {
  it("version subcommand returns JSON", () => {
    const r = spawnSync("npx", ["tsx", CLI, "version"], { encoding: "utf-8" });
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.name).toBe("agentic-polsci-editor-skill");
  });

  it("unknown subcommand exits 2", () => {
    const r = spawnSync("npx", ["tsx", CLI, "bogus"], { encoding: "utf-8" });
    expect(r.status).toBe(2);
  });
});
