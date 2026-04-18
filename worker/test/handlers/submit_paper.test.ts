import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { submitPaper } from "../../src/handlers/submit_paper.js";
import { ensureMigrated, seedUser, seedAgent } from "../helpers/db.js";
import { installGithubMock } from "../helpers/github-mock.js";

const validInput = {
  title: "Electoral Institutions and Legislative Gridlock",
  abstract:
    "We use panel data from 60 democracies 1990-2020 to estimate the effect of proportionality on legislative gridlock.",
  paper_markdown: "# Paper\n\nBody of the paper.\n".padEnd(400, "x"),
  paper_redacted_markdown: "# Paper\n\n**Author:** [redacted]\n\nBody.\n".padEnd(400, "x"),
  type: "research" as const,
  topics: ["comparative-politics", "electoral-systems"],
  coauthor_agent_ids: [] as string[],
  word_count: 7412,
};

describe("submit_paper", () => {
  let restore: () => void = () => {};
  beforeEach(async () => {
    await ensureMigrated();
  });
  afterEach(() => restore());

  it("debits $1, mints a paper_id, and commits three files", async () => {
    const mock = installGithubMock();
    restore = mock.restore;
    const { user_id } = await seedUser({ balance_cents: 500 });
    const { agent_id } = await seedAgent({ owner_user_id: user_id });

    const res = await submitPaper(
      env,
      { kind: "agent", agent_id, owner_user_id: user_id },
      validInput,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.paper_id).toMatch(/^paper-\d{4}-0001$/);
    expect(res.value.submission_id).toMatch(/^sub-[a-z0-9]{12}$/);

    // Balance debited.
    const bal = await env.DB
      .prepare("SELECT balance_cents FROM balances WHERE user_id = ?")
      .bind(user_id)
      .first<{ balance_cents: number }>();
    expect(bal?.balance_cents).toBe(400);

    // Four files committed.
    const p = res.value.paper_id;
    expect(mock.files.has(`papers/${p}/paper.md`)).toBe(true);
    expect(mock.files.has(`papers/${p}/paper.redacted.md`)).toBe(true);
    expect(mock.files.has(`papers/${p}/metadata.yml`)).toBe(true);
    const meta = mock.files.get(`papers/${p}/metadata.yml`)!.content;
    expect(meta).toContain(`submission_id: ${res.value.submission_id}`);
    expect(meta).toContain("status: pending");

    // Ledger row has commit_sha populated.
    const led = await env.DB
      .prepare("SELECT github_commit_sha FROM submissions_ledger WHERE submission_id = ?")
      .bind(res.value.submission_id)
      .first<{ github_commit_sha: string | null }>();
    expect(led?.github_commit_sha).toBeTruthy();
  });

  it("rejects with insufficient_balance when balance < 100", async () => {
    const mock = installGithubMock();
    restore = mock.restore;
    const { user_id } = await seedUser({ balance_cents: 50 });
    const { agent_id } = await seedAgent({ owner_user_id: user_id });
    const res = await submitPaper(
      env,
      { kind: "agent", agent_id, owner_user_id: user_id },
      validInput,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("insufficient_balance");
    // No files committed.
    expect(mock.files.size).toBe(0);
    // No ledger row.
    const led = await env.DB
      .prepare("SELECT COUNT(*) as n FROM submissions_ledger")
      .first<{ n: number }>();
    expect(led?.n).toBe(0);
  });

  it("assigns monotone seq per year on concurrent submits", async () => {
    const mock = installGithubMock();
    restore = mock.restore;
    const { user_id } = await seedUser({ balance_cents: 500 });
    const { agent_id } = await seedAgent({ owner_user_id: user_id });

    const r1 = await submitPaper(
      env,
      { kind: "agent", agent_id, owner_user_id: user_id },
      validInput,
    );
    const r2 = await submitPaper(
      env,
      { kind: "agent", agent_id, owner_user_id: user_id },
      validInput,
    );
    if (!r1.ok || !r2.ok) throw new Error("both should succeed");
    expect(r1.value.paper_id).not.toBe(r2.value.paper_id);
    const seq1 = Number(r1.value.paper_id.slice(-4));
    const seq2 = Number(r2.value.paper_id.slice(-4));
    expect(seq2).toBe(seq1 + 1);
  });
});
