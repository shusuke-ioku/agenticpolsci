import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type SeedAgent = {
  agent_id: string;
  owner_user_id: string;
  topics?: string[];
  model_family?: string;
  review_opt_in?: boolean;
  status?: string;
};

export type SeedPaper = {
  paper_id: string;
  status: string;
  author_agent_ids: string[];
  coauthor_agent_ids?: string[];
  topics?: string[];
  type?: "research" | "replication" | "comment";
  desk_reviewed_at?: string;
  invitations?: Array<{
    review_id: string;
    reviewer_agent_id: string;
    status: "pending" | "submitted" | "timed_out" | "declined" | "accepted";
    due_at?: string;
    assigned_at?: string;
  }>;
  reviews?: Array<{
    review_id: string;
    reviewer_agent_id: string;
    recommendation: string;
    submitted_at?: string;
  }>;
  revises_paper_id?: string;
};

export function seedAgent(root: string, a: SeedAgent): void {
  mkdirSync(join(root, "agents"), { recursive: true });
  const body = [
    `agent_id: ${a.agent_id}`,
    `owner_user_id: ${a.owner_user_id}`,
    `display_name: ${a.agent_id}`,
    `registered_at: "2026-04-01T00:00:00Z"`,
    `topics:`,
    ...(a.topics ?? ["comparative-politics"]).map((t) => `  - ${t}`),
    a.model_family ? `model_family: ${a.model_family}` : null,
    `review_opt_in: ${a.review_opt_in ?? true}`,
    `stats:`,
    `  submissions: 0`,
    `  acceptances: 0`,
    `  reviews_completed: 0`,
    `  reviews_timed_out: 0`,
    `status: ${a.status ?? "active"}`,
  ]
    .filter(Boolean)
    .join("\n");
  writeFileSync(join(root, "agents", `${a.agent_id}.yml`), body + "\n");
}

export function seedPaper(root: string, p: SeedPaper): void {
  const paperDir = join(root, "papers", p.paper_id);
  mkdirSync(paperDir, { recursive: true });
  mkdirSync(join(paperDir, "reviews"), { recursive: true });

  const meta = [
    `paper_id: ${p.paper_id}`,
    `submission_id: sub-${p.paper_id.replace(/-/g, "")}`,
    `journal_id: agent-polsci-alpha`,
    `type: ${p.type ?? "research"}`,
    `title: "Paper ${p.paper_id}"`,
    `abstract: |`,
    `  ${"A".repeat(80)}`,
    `author_agent_ids:`,
    ...p.author_agent_ids.map((a) => `  - ${a}`),
    `coauthor_agent_ids:${(p.coauthor_agent_ids ?? []).length ? "\n" + (p.coauthor_agent_ids ?? []).map((a) => `  - ${a}`).join("\n") : " []"}`,
    `topics:`,
    ...(p.topics ?? ["comparative-politics"]).map((t) => `  - ${t}`),
    `submitted_at: "2026-04-18T12:00:00Z"`,
    `status: ${p.status}`,
    `word_count: 5000`,
    p.desk_reviewed_at ? `desk_reviewed_at: "${p.desk_reviewed_at}"` : null,
    p.revises_paper_id ? `revises_paper_id: ${p.revises_paper_id}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  writeFileSync(join(paperDir, "metadata.yml"), meta + "\n");
  writeFileSync(join(paperDir, "paper.md"), `# ${p.paper_id}\n\n${"body ".repeat(200)}\n`);
  writeFileSync(
    join(paperDir, "paper.redacted.md"),
    `# ${p.paper_id}\n\n**Author:** [redacted]\n\n${"body ".repeat(200)}\n`,
  );

  for (const inv of p.invitations ?? []) {
    const body = [
      `review_id: ${inv.review_id}`,
      `paper_id: ${p.paper_id}`,
      `reviewer_agent_id: ${inv.reviewer_agent_id}`,
      `assigned_at: "${inv.assigned_at ?? "2026-04-18T13:00:00Z"}"`,
      `due_at: "${inv.due_at ?? "2026-04-25T13:00:00Z"}"`,
      `status: ${inv.status}`,
      `redacted_manuscript_path: papers/${p.paper_id}/paper.redacted.md`,
    ].join("\n");
    writeFileSync(
      join(paperDir, "reviews", `${inv.review_id}.invitation.yml`),
      body + "\n",
    );
  }

  for (const rev of p.reviews ?? []) {
    const fm = [
      `---`,
      `review_id: ${rev.review_id}`,
      `paper_id: ${p.paper_id}`,
      `reviewer_agent_id: ${rev.reviewer_agent_id}`,
      `submitted_at: "${rev.submitted_at ?? "2026-04-24T11:00:00Z"}"`,
      `recommendation: ${rev.recommendation}`,
      `scores:`,
      `  novelty: 3`,
      `  methodology: 3`,
      `  writing: 3`,
      `  significance: 3`,
      `  reproducibility: 3`,
      `weakest_claim: "placeholder"`,
      `falsifying_evidence: "placeholder"`,
      `schema_version: 1`,
      `---`,
      ``,
      `Review body.`,
    ].join("\n");
    writeFileSync(join(paperDir, "reviews", `${rev.review_id}.md`), fm + "\n");
  }
}
