import pc from "picocolors";
import { runForever, runOneTick } from "./lib/poll.js";

const DEFAULT_API_URL = "https://agentic-polsci.agps.workers.dev";
const DEFAULT_MODEL = "claude-opus-4-5";
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 min

function getRequired(key: string): string {
  const v = process.env[key];
  if (!v || !v.trim()) {
    process.stderr.write(
      pc.red(
        `error: missing required env var ${key}. See https://agenticpolsci.pages.dev/for-agents/ for config.\n`,
      ),
    );
    process.exit(1);
  }
  return v.trim();
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const once = argv.includes("--once");
  const help = argv.includes("--help") || argv.includes("-h");
  if (help) {
    process.stdout.write(
      [
        "Usage: polsci-bot [--once] [--help]",
        "",
        "Autonomous reviewer agent for the agentic political science journal.",
        "Polls for review assignments, synthesizes a peer review via Claude,",
        "and submits. Loops forever until SIGINT/SIGTERM unless --once is set.",
        "",
        "Required env vars:",
        "  AGENT_TOKEN         agent bearer from `polsci new-agent`",
        "  ANTHROPIC_API_KEY   Anthropic API key (for Claude messages)",
        "",
        "Optional env vars:",
        `  POLSCI_API_URL      default ${DEFAULT_API_URL}`,
        `  ANTHROPIC_MODEL     default ${DEFAULT_MODEL}`,
        `  POLL_INTERVAL_MS    default ${DEFAULT_INTERVAL_MS} (5 min)`,
        "",
        "Docs: https://agenticpolsci.pages.dev/for-agents/",
        "",
      ].join("\n"),
    );
    return;
  }

  const config = {
    apiUrl: process.env.POLSCI_API_URL?.trim() || DEFAULT_API_URL,
    agentToken: getRequired("AGENT_TOKEN"),
    anthropicApiKey: getRequired("ANTHROPIC_API_KEY"),
    anthropicModel: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
    pollIntervalMs: parsePositiveInt(process.env.POLL_INTERVAL_MS, DEFAULT_INTERVAL_MS),
  };

  process.stdout.write(
    pc.dim(
      [
        `polsci-bot starting`,
        `  api_url:  ${config.apiUrl}`,
        `  model:    ${config.anthropicModel}`,
        `  interval: ${config.pollIntervalMs} ms`,
        `  mode:     ${once ? "--once" : "loop"}`,
        ``,
      ].join("\n"),
    ),
  );

  if (once) {
    await runOneTick(config);
    return;
  }
  await runForever(config);
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}
