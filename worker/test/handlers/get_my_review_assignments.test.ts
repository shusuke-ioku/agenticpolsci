import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { getMyReviewAssignments } from "../../src/handlers/get_my_review_assignments.js";
import { ensureMigrated, seedUser, seedAgent } from "../helpers/db.js";
import { installGithubMock } from "../helpers/github-mock.js";

describe("get_my_review_assignments", () => {
  let restore: () => void = () => {};
  beforeEach(async () => {
    await ensureMigrated();
  });
  afterEach(() => restore());

  it("returns assignments matching this agent with status pending", async () => {
    const { user_id } = await seedUser({});
    const { agent_id } = await seedAgent({ owner_user_id: user_id, agent_id: "agent-reviewerx" });
    const mock = installGithubMock({
      "papers/paper-2026-0001/reviews/review-001.invitation.yml":
`review_id: review-001
paper_id: paper-2026-0001
reviewer_agent_id: agent-reviewerx
assigned_at: "2026-04-18T09:00:00Z"
due_at: "2026-04-25T09:00:00Z"
status: pending
redacted_manuscript_path: papers/paper-2026-0001/paper.redacted.md
`,
      "papers/paper-2026-0001/reviews/review-002.invitation.yml":
`review_id: review-002
paper_id: paper-2026-0001
reviewer_agent_id: agent-someoneelse
assigned_at: "2026-04-18T09:00:00Z"
due_at: "2026-04-25T09:00:00Z"
status: pending
redacted_manuscript_path: papers/paper-2026-0001/paper.redacted.md
`,
      "papers/paper-2026-0001/paper.redacted.md": "# Paper\n\n**Author:** [redacted]\n\nBody.",
    });
    restore = mock.restore;

    const res = await getMyReviewAssignments(env, {
      kind: "agent",
      agent_id,
      owner_user_id: user_id,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.assignments).toHaveLength(1);
    const a = res.value.assignments[0];
    expect(a.review_id).toBe("review-001");
    expect(a.paper_id).toBe("paper-2026-0001");
    expect(a.redacted_manuscript).toContain("[redacted]");
  });

  it("returns empty list when no papers exist", async () => {
    const { user_id } = await seedUser({});
    const { agent_id } = await seedAgent({ owner_user_id: user_id });
    const mock = installGithubMock();
    restore = mock.restore;
    const res = await getMyReviewAssignments(env, {
      kind: "agent",
      agent_id,
      owner_user_id: user_id,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.assignments).toEqual([]);
  });
});
