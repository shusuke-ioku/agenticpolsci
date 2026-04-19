import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { seedPaper, seedAgent } from "./fixtures/public-repo-fixture.js";
import { cleanupTempDir } from "./fixtures/git-fixture.js";

describe("editor-skill notify (CLI)", () => {
  let root: string;
  beforeEach(() => {
    root = join(tmpdir(), `cli-notify-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
    seedAgent(root, { agent_id: "agent-r1", owner_user_id: "user-u" });
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "in_review",
      author_agent_ids: ["agent-a"],
      invitations: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", status: "pending", due_at: "2026-05-01T00:00:00Z" },
      ],
    });
  });
  afterEach(() => cleanupTempDir(root));

  it("prints a skip message when POLSCI_WORKER_URL / POLSCI_OPERATOR_API_TOKEN are unset", () => {
    const out = execFileSync(
      "npx",
      ["tsx", "src/cli.ts", "notify", "--public-repo", root],
      {
        encoding: "utf-8",
        env: { ...process.env, POLSCI_WORKER_URL: "", POLSCI_OPERATOR_API_TOKEN: "" },
      },
    );
    expect(out).toMatch(/skipped/i);
    const json = JSON.parse(out.split("\n").filter((l) => l.trim().startsWith("{")).join("\n") || "{}");
    expect(json.skipped).toBe(true);
  });

  it("posts the batch and prints the worker summary when env vars are set", async () => {
    const http = await import("node:http");
    let recorded: any = null;
    const server = http.createServer((req, res) => {
      let buf = "";
      req.on("data", (c) => { buf += c; });
      req.on("end", () => {
        recorded = { url: req.url, auth: req.headers.authorization, body: JSON.parse(buf) };
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ sent: 1, skipped_dedupe: 0, failed: [] }));
      });
    });
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as any).port;
    try {
      const out = execFileSync(
        "npx",
        ["tsx", "src/cli.ts", "notify", "--public-repo", root],
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            POLSCI_WORKER_URL: `http://127.0.0.1:${port}`,
            POLSCI_OPERATOR_API_TOKEN: "op-cli-test",
          },
        },
      );
      const json = JSON.parse(out.split("\n").filter((l) => l.trim().startsWith("{")).join("\n"));
      expect(json.ok).toBe(true);
      expect(json.summary.sent).toBe(1);
      expect(recorded.url).toBe("/v1/internal/notify");
      expect(recorded.auth).toBe("Bearer op-cli-test");
      expect(recorded.body.items.some((i: any) => i.kind === "reviewer_assignment")).toBe(true);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("exits 0 and reports error when worker returns 5xx", async () => {
    const http = await import("node:http");
    const server = http.createServer((_req, res) => {
      res.writeHead(503);
      res.end("boom");
    });
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as any).port;
    try {
      const out = execFileSync(
        "npx",
        ["tsx", "src/cli.ts", "notify", "--public-repo", root],
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            POLSCI_WORKER_URL: `http://127.0.0.1:${port}`,
            POLSCI_OPERATOR_API_TOKEN: "op",
          },
        },
      );
      const json = JSON.parse(out.split("\n").filter((l) => l.trim().startsWith("{")).join("\n"));
      expect(json.ok).toBe(false);
      expect(json.reason).toMatch(/worker_error: 503/);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
