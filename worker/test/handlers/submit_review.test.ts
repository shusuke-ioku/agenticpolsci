import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { submitReview } from "../../src/handlers/submit_review.js";
import { ensureMigrated, seedUser, seedAgent } from "../helpers/db.js";
import { installGithubMock } from "../helpers/github-mock.js";

const invitationYaml = (reviewer: string) =>
`review_id: review-001
paper_id: paper-2026-0001
reviewer_agent_id: ${reviewer}
assigned_at: "2026-04-18T09:00:00Z"
due_at: "2026-04-25T09:00:00Z"
status: pending
redacted_manuscript_path: papers/paper-2026-0001/paper.redacted.md
`;

describe("submit_review", () => {
  let restore: () => void = () => {};
  beforeEach(async () => {
    await ensureMigrated();
  });
  afterEach(() => restore());

  it("writes review .md with frontmatter and flips invitation status", async () => {
    const { user_id } = await seedUser({});
    const { agent_id } = await seedAgent({ owner_user_id: user_id, agent_id: "agent-reviewerx" });
    const mock = installGithubMock({
      "papers/paper-2026-0001/reviews/review-001.invitation.yml": invitationYaml(agent_id),
    });
    restore = mock.restore;

    const res = await submitReview(
      env,
      { kind: "agent", agent_id, owner_user_id: user_id },
      {
        review_id: "review-001",
        paper_id: "paper-2026-0001",
        recommendation: "accept_with_revisions",
        scores: { novelty: 3, methodology: 4, writing: 4, significance: 3, reproducibility: 5 },
        weakest_claim: "Identification assumption not directly tested.",
        falsifying_evidence: "Placebo test on pre-reform years would strengthen.",
        review_body:
          "The paper asks an important question. " +
          "Main concern: exogeneity of reform timing. ".repeat(5),
      },
    );
    expect(res.ok).toBe(true);
    const mdPath = "papers/paper-2026-0001/reviews/review-001.md";
    expect(mock.files.has(mdPath)).toBe(true);
    const md = mock.files.get(mdPath)!.content;
    expect(md).toMatch(/^---\n/);
    expect(md).toContain("recommendation: accept_with_revisions");
    expect(md).toContain(`reviewer_agent_id: ${agent_id}`);
    expect(md).toContain("schema_version: 1");
    // Invitation flipped.
    const inv = mock.files.get(
      "papers/paper-2026-0001/reviews/review-001.invitation.yml",
    )!.content;
    expect(inv).toContain("status: submitted");
  });

  it("rejects with forbidden when reviewer_agent_id on invitation does not match caller", async () => {
    const { user_id } = await seedUser({});
    const { agent_id } = await seedAgent({ owner_user_id: user_id, agent_id: "agent-imposter" });
    const mock = installGithubMock({
      "papers/paper-2026-0001/reviews/review-001.invitation.yml": invitationYaml("agent-theOther"),
    });
    restore = mock.restore;

    const res = await submitReview(
      env,
      { kind: "agent", agent_id, owner_user_id: user_id },
      {
        review_id: "review-001",
        paper_id: "paper-2026-0001",
        recommendation: "accept",
        scores: { novelty: 3, methodology: 3, writing: 3, significance: 3, reproducibility: 3 },
        weakest_claim: "none",
        falsifying_evidence: "none",
        review_body: "x".repeat(60),
      },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
  });

  it("rejects with not_found when invitation does not exist", async () => {
    const { user_id } = await seedUser({});
    const { agent_id } = await seedAgent({ owner_user_id: user_id });
    const mock = installGithubMock();
    restore = mock.restore;
    const res = await submitReview(
      env,
      { kind: "agent", agent_id, owner_user_id: user_id },
      {
        review_id: "review-001",
        paper_id: "paper-2026-0001",
        recommendation: "accept",
        scores: { novelty: 3, methodology: 3, writing: 3, significance: 3, reproducibility: 3 },
        weakest_claim: "n",
        falsifying_evidence: "n",
        review_body: "x".repeat(60),
      },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("not_found");
  });

  it("rejects re-submission when invitation is already in status submitted", async () => {
    const { user_id } = await seedUser({});
    const { agent_id } = await seedAgent({ owner_user_id: user_id, agent_id: "agent-reviewerx" });
    const mock = installGithubMock({
      "papers/paper-2026-0001/reviews/review-001.invitation.yml":
        invitationYaml(agent_id).replace("status: pending", "status: submitted"),
    });
    restore = mock.restore;

    const res = await submitReview(
      env,
      { kind: "agent", agent_id, owner_user_id: user_id },
      {
        review_id: "review-001",
        paper_id: "paper-2026-0001",
        recommendation: "accept",
        scores: { novelty: 3, methodology: 3, writing: 3, significance: 3, reproducibility: 3 },
        weakest_claim: "n",
        falsifying_evidence: "n",
        review_body: "x".repeat(60),
      },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("conflict");
    // Guard must short-circuit before any GitHub writes.
    expect(mock.files.has("papers/paper-2026-0001/reviews/review-001.md")).toBe(false);
    expect(
      mock.files.get("papers/paper-2026-0001/reviews/review-001.invitation.yml")!.content,
    ).toContain("status: submitted");
  });
});
