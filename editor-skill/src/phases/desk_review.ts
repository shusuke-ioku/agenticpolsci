import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeMarkdownWithFrontmatter } from "../lib/yaml.js";

export type DeskReviewReasonTag =
  | "out_of_scope"
  | "prompt_injection"
  | "redaction_leak"
  | "below_quality_floor"
  | "schema_violation"
  | "no_eligible_reviewers"
  | "internal_error";

const VALID_REASON_TAGS: DeskReviewReasonTag[] = [
  "out_of_scope",
  "prompt_injection",
  "redaction_leak",
  "below_quality_floor",
  "schema_violation",
  "no_eligible_reviewers",
  "internal_error",
];

export type DeskReviewInput = {
  publicRepoPath: string;
  paperId: string;
  outcome: "accept_for_review" | "desk_reject";
  reasonTag: DeskReviewReasonTag | null;
  prose: string;
  subagentPrompt: string;
  subagentResponse: string;
  editorAgentId?: string;
  now?: Date;
};

export type DeskReviewResult = {
  touchedPaths: string[];
  commitMessage: string;
};

export async function commitDeskReview(input: DeskReviewInput): Promise<DeskReviewResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const paperDir = join(input.publicRepoPath, "papers", input.paperId);
  const metaPath = join(paperDir, "metadata.yml");
  if (!existsSync(metaPath)) throw new Error(`metadata.yml not found for ${input.paperId}`);

  if (input.outcome === "desk_reject") {
    if (!input.reasonTag || !VALID_REASON_TAGS.includes(input.reasonTag))
      throw new Error(`invalid reason_tag: ${input.reasonTag}`);
  }

  const touched: string[] = [];
  const metaRaw = readFileSync(metaPath, "utf-8");

  // Update metadata.yml with desk_reviewed_at (and status/reason on reject).
  let newMeta = metaRaw;
  if (!/^desk_reviewed_at:/m.test(newMeta)) {
    newMeta = newMeta.trimEnd() + `\ndesk_reviewed_at: "${nowIso}"\n`;
  } else {
    newMeta = newMeta.replace(/^desk_reviewed_at:.*$/m, `desk_reviewed_at: "${nowIso}"`);
  }
  if (input.outcome === "desk_reject") {
    newMeta = newMeta.replace(/^status:\s*.*$/m, "status: desk_rejected");
    if (!/^desk_reject_reason_tag:/m.test(newMeta)) {
      newMeta = newMeta.trimEnd() + `\ndesk_reject_reason_tag: ${input.reasonTag}\n`;
    } else {
      newMeta = newMeta.replace(
        /^desk_reject_reason_tag:.*$/m,
        `desk_reject_reason_tag: ${input.reasonTag}`,
      );
    }
  }
  writeFileSync(metaPath, newMeta);
  touched.push(metaPath);

  // On reject, write decision.md.
  if (input.outcome === "desk_reject") {
    const decisionPath = join(paperDir, "decision.md");
    writeMarkdownWithFrontmatter(
      decisionPath,
      {
        paper_id: input.paperId,
        editor_agent_id: input.editorAgentId ?? "editor-aps-001",
        decided_at: nowIso,
        outcome: "desk_reject",
        cited_reviews: [],
        schema_version: 1,
      },
      `## Desk Rejection\n\n**Reason:** ${input.reasonTag}\n\n${input.prose}\n`,
    );
    touched.push(decisionPath);
  }

  // Audit file with full prompt + response.
  const auditDir = join(paperDir, "audit");
  if (!existsSync(auditDir)) mkdirSync(auditDir, { recursive: true });
  const auditPath = join(auditDir, `desk-review-${slugTs(now)}.md`);
  const auditBody =
    `# Desk Review Audit — ${input.paperId}\n\n` +
    `- timestamp: ${nowIso}\n` +
    `- outcome: ${input.outcome}\n` +
    `- reason_tag: ${input.reasonTag ?? "none"}\n\n` +
    `## Subagent prompt\n\n${input.subagentPrompt}\n\n` +
    `## Subagent response\n\n${input.subagentResponse}\n`;
  writeFileSync(auditPath, auditBody);
  touched.push(auditPath);

  const commitMessage =
    input.outcome === "accept_for_review"
      ? `editor: desk-accept ${input.paperId}`
      : `editor: desk-reject ${input.paperId} (${input.reasonTag})`;

  return { touchedPaths: touched, commitMessage };
}

function slugTs(d: Date): string {
  return d.toISOString().replace(/[:.]/g, "-");
}
