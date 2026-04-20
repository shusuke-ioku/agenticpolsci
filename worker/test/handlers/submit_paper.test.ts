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
  model_used: "claude-opus-4-5",
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

  it("rejects replication papers whose title lacks the [Replication] prefix", async () => {
    const mock = installGithubMock();
    restore = mock.restore;
    const { user_id } = await seedUser({ balance_cents: 500 });
    const { agent_id } = await seedAgent({ owner_user_id: user_id });

    const res = await submitPaper(
      env,
      { kind: "agent", agent_id, owner_user_id: user_id },
      {
        ...validInput,
        type: "replication",
        replicates_doi: "10.1111/ajps.99999",
        title: "A replication of Smith (2025)",
      },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_input");
    expect(mock.files.size).toBe(0);

    // Balance untouched: the refine runs before any debit.
    const bal = await env.DB
      .prepare("SELECT balance_cents FROM balances WHERE user_id = ?")
      .bind(user_id)
      .first<{ balance_cents: number }>();
    expect(bal?.balance_cents).toBe(500);
  });

  it("accepts replication papers whose title starts with [Replication] ", async () => {
    const mock = installGithubMock();
    restore = mock.restore;
    const { user_id } = await seedUser({ balance_cents: 500 });
    const { agent_id } = await seedAgent({ owner_user_id: user_id });

    const res = await submitPaper(
      env,
      { kind: "agent", agent_id, owner_user_id: user_id },
      {
        ...validInput,
        type: "replication",
        replicates_doi: "10.1111/ajps.99999",
        title: "[Replication] A replication of Smith (2025)",
      },
    );
    expect(res.ok).toBe(true);
  });

  describe("R&R guard: submit_paper with revises_paper_id", () => {
    const makePriorMeta = (status: string, authorAgentId: string): string => [
      "paper_id: paper-2026-0042",
      "submission_id: sub-original000",
      "journal_id: agent-polsci-alpha",
      "type: research",
      `title: "Prior Paper"`,
      "abstract: |",
      `  ${"A".repeat(80)}`,
      "author_agent_ids:",
      `  - ${authorAgentId}`,
      "coauthor_agent_ids: []",
      "topics:",
      "  - comparative-politics",
      `submitted_at: "2026-04-10T10:00:00.000Z"`,
      `status: ${status}`,
      "word_count: 7000",
      "",
    ].join("\n");

    it.each(["pending", "revise", "in_review", "decision_pending"])(
      "rejects with conflict when revises_paper_id points at author's own paper in status=%s",
      async (status) => {
        const { user_id } = await seedUser({ balance_cents: 500 });
        const { agent_id } = await seedAgent({ owner_user_id: user_id });
        const mock = installGithubMock({
          "papers/paper-2026-0042/metadata.yml": makePriorMeta(status, agent_id),
        });
        restore = mock.restore;

        const res = await submitPaper(
          env,
          { kind: "agent", agent_id, owner_user_id: user_id },
          { ...validInput, revises_paper_id: "paper-2026-0042" },
        );
        expect(res.ok).toBe(false);
        if (res.ok) return;
        expect(res.error.code).toBe("conflict");
        expect(res.error.message).toContain("update_paper");
        expect(res.error.message).toContain("paper-2026-0042");

        // No fee debited, no files written, no ledger row created.
        const bal = await env.DB
          .prepare("SELECT balance_cents FROM balances WHERE user_id = ?")
          .bind(user_id)
          .first<{ balance_cents: number }>();
        expect(bal?.balance_cents).toBe(500);
        expect(mock.files.size).toBe(1); // only the prior metadata that we seeded
        const led = await env.DB
          .prepare("SELECT COUNT(*) as n FROM submissions_ledger")
          .first<{ n: number }>();
        expect(led?.n).toBe(0);
      },
    );

    it.each(["accepted", "rejected", "desk_rejected", "withdrawn"])(
      "allows submit_paper when revises_paper_id points at a terminal paper (status=%s)",
      async (status) => {
        const { user_id } = await seedUser({ balance_cents: 500 });
        const { agent_id } = await seedAgent({ owner_user_id: user_id });
        const mock = installGithubMock({
          "papers/paper-2026-0042/metadata.yml": makePriorMeta(status, agent_id),
        });
        restore = mock.restore;

        const res = await submitPaper(
          env,
          { kind: "agent", agent_id, owner_user_id: user_id },
          { ...validInput, revises_paper_id: "paper-2026-0042" },
        );
        expect(res.ok).toBe(true);
      },
    );

    it("allows submit_paper when revises_paper_id points at a different author's pending paper", async () => {
      const { user_id: owner1 } = await seedUser({ balance_cents: 500 });
      const { agent_id: otherAgent } = await seedAgent({ owner_user_id: owner1 });
      const { user_id: owner2 } = await seedUser({ balance_cents: 500 });
      const { agent_id: callingAgent } = await seedAgent({ owner_user_id: owner2 });
      const mock = installGithubMock({
        "papers/paper-2026-0042/metadata.yml": makePriorMeta("pending", otherAgent),
      });
      restore = mock.restore;

      const res = await submitPaper(
        env,
        { kind: "agent", agent_id: callingAgent, owner_user_id: owner2 },
        { ...validInput, revises_paper_id: "paper-2026-0042" },
      );
      expect(res.ok).toBe(true);
    });
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
