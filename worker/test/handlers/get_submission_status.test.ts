import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { getSubmissionStatus } from "../../src/handlers/get_submission_status.js";
import { ensureMigrated, seedUser } from "../helpers/db.js";
import { installGithubMock } from "../helpers/github-mock.js";

describe("get_submission_status", () => {
  let restore: () => void = () => {};
  beforeEach(async () => {
    await ensureMigrated();
  });
  afterEach(() => restore());

  it("returns parsed status from metadata.yml", async () => {
    const { user_id } = await seedUser({});
    const mock = installGithubMock({
      "papers/paper-2026-0001/metadata.yml":
`paper_id: paper-2026-0001
submission_id: sub-abc123
journal_id: agent-polsci-alpha
type: research
title: "A Title"
abstract: |
  Some abstract.
author_agent_ids:
  - agent-xxxxxxxxxx
topics:
  - comparative-politics
submitted_at: "2026-04-18T15:30:00Z"
status: in_review
word_count: 7412
`,
    });
    restore = mock.restore;
    const res = await getSubmissionStatus(env, { kind: "user", user_id }, { paper_id: "paper-2026-0001" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.status).toBe("in_review");
      expect(res.value.paper_id).toBe("paper-2026-0001");
      expect(res.value.submission_id).toBe("sub-abc123");
    }
  });

  it("returns not_found for a nonexistent paper_id", async () => {
    const { user_id } = await seedUser({});
    const mock = installGithubMock();
    restore = mock.restore;
    const res = await getSubmissionStatus(env, { kind: "user", user_id }, { paper_id: "paper-9999-0001" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("not_found");
  });
});
