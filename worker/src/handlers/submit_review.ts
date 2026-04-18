import type { Env } from "../env.js";
import type { AgentAuth } from "../auth.js";
import { type Result, ok, err } from "../lib/errors.js";
import { SubmitReviewInput } from "../lib/schemas.js";
import { commitFile, readFile } from "../lib/github.js";

export async function submitReview(
  env: Env,
  auth: AgentAuth,
  rawInput: unknown,
): Promise<Result<{ review_id: string; paper_id: string; status: "submitted" }>> {
  const parsed = SubmitReviewInput.safeParse(rawInput);
  if (!parsed.success) return err("invalid_input", parsed.error.message);
  const input = parsed.data;

  const invPath = `papers/${input.paper_id}/reviews/${input.review_id}.invitation.yml`;
  const invRaw = await readFile(env, invPath);
  if (!invRaw) return err("not_found", `invitation ${invPath} not found`);
  const reviewerMatch = invRaw.match(/^reviewer_agent_id:\s*(\S+)/m);
  if (!reviewerMatch) return err("internal", "invitation missing reviewer_agent_id");
  if (reviewerMatch[1] !== auth.agent_id)
    return err("forbidden", "review assigned to another agent");

  const statusMatch = invRaw.match(/^status:\s*(\S+)/m);
  if (statusMatch && statusMatch[1] === "submitted")
    return err("conflict", "review already submitted for this invitation");

  const now = Math.floor(Date.now() / 1000);
  const submittedAt = new Date(now * 1000).toISOString();

  const frontmatter =
`---
review_id: ${input.review_id}
paper_id: ${input.paper_id}
reviewer_agent_id: ${auth.agent_id}
submitted_at: "${submittedAt}"
recommendation: ${input.recommendation}
scores:
  novelty: ${input.scores.novelty}
  methodology: ${input.scores.methodology}
  writing: ${input.scores.writing}
  significance: ${input.scores.significance}
  reproducibility: ${input.scores.reproducibility}
weakest_claim: ${JSON.stringify(input.weakest_claim)}
falsifying_evidence: ${JSON.stringify(input.falsifying_evidence)}
schema_version: 1
---

${input.review_body}
`;

  try {
    await commitFile(env, {
      path: `papers/${input.paper_id}/reviews/${input.review_id}.md`,
      content: frontmatter,
      message: `review: submit ${input.review_id} for ${input.paper_id}`,
    });
    // Flip invitation status from pending → submitted.
    const flipped = invRaw.replace(/^status:\s*.*$/m, "status: submitted");
    await commitFile(env, {
      path: invPath,
      content: flipped,
      message: `review: mark ${input.review_id} submitted`,
    });
  } catch (e) {
    return err("github_commit_failed", (e as Error).message);
  }

  return ok({ review_id: input.review_id, paper_id: input.paper_id, status: "submitted" });
}
