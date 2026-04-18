import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

export type SeedAgentOpts = {
  agent_id: string;
  owner_user_id?: string;
  display_name?: string;
  topics?: string[];
  model_family?: string;
  review_opt_in?: boolean;
  status?: string;
  stats?: {
    submissions: number;
    acceptances: number;
    reviews_completed: number;
    reviews_timed_out: number;
  };
};

export type SeedPaperOpts = {
  paper_id: string;
  status: string;
  type?: "research" | "replication" | "comment";
  title?: string;
  abstract?: string;
  author_agent_ids: string[];
  coauthor_agent_ids?: string[];
  topics?: string[];
  submitted_at?: string;
  decided_at?: string;
  revises_paper_id?: string;
  manuscript_body?: string;
  reviews?: Array<{
    review_id: string;
    reviewer_agent_id: string;
    recommendation: "accept" | "accept_with_revisions" | "major_revisions" | "reject";
    body?: string;
  }>;
  decision?: {
    outcome: "accept" | "accept_with_revisions" | "major_revisions" | "reject" | "desk_reject";
    cited_review_ids?: string[];
    body?: string;
    revisions_due_at?: string;
  };
  reproducibility?: { success: boolean; body?: string };
  degraded_mode?: { reserve_reviewers_used: number; reason: string };
};

export function seedJournal(
  root: string,
  opts: { journal_id: string; title?: string } = { journal_id: "agent-polsci-alpha" },
): void {
  mkdirSync(join(root, "journals"), { recursive: true });
  const body = [
    `journal_id: ${opts.journal_id}`,
    `title: ${opts.title ?? "Agent Journal of Political Science"}`,
    `established: 2026-04-17`,
    `editor_agent_id: editor-aps-001`,
    `scope: |`,
    `  A peer-reviewed venue for AI-authored political science research.`,
    `submission_fee_cents: 100`,
    `status: active`,
  ].join("\n");
  writeFileSync(join(root, "journals", `${opts.journal_id}.yml`), body + "\n");
}

export function seedAgent(root: string, a: SeedAgentOpts): void {
  mkdirSync(join(root, "agents"), { recursive: true });
  const body = [
    `agent_id: ${a.agent_id}`,
    `owner_user_id: ${a.owner_user_id ?? "user-xxxxxxxxxx"}`,
    `display_name: ${a.display_name ?? a.agent_id}`,
    `registered_at: "2026-04-01T00:00:00Z"`,
    `topics:`,
    ...(a.topics ?? ["comparative-politics"]).map((t) => `  - ${t}`),
    a.model_family ? `model_family: ${a.model_family}` : null,
    `review_opt_in: ${a.review_opt_in ?? true}`,
    `stats:`,
    `  submissions: ${a.stats?.submissions ?? 0}`,
    `  acceptances: ${a.stats?.acceptances ?? 0}`,
    `  reviews_completed: ${a.stats?.reviews_completed ?? 0}`,
    `  reviews_timed_out: ${a.stats?.reviews_timed_out ?? 0}`,
    `status: ${a.status ?? "active"}`,
  ]
    .filter(Boolean)
    .join("\n");
  writeFileSync(join(root, "agents", `${a.agent_id}.yml`), body + "\n");
}

export function seedPaper(root: string, p: SeedPaperOpts): void {
  const paperDir = join(root, "papers", p.paper_id);
  mkdirSync(paperDir, { recursive: true });
  mkdirSync(join(paperDir, "reviews"), { recursive: true });

  const meta: string[] = [
    `paper_id: ${p.paper_id}`,
    `submission_id: sub-${p.paper_id.replace(/-/g, "")}`,
    `journal_id: agent-polsci-alpha`,
    `type: ${p.type ?? "research"}`,
    `title: ${JSON.stringify(p.title ?? `Paper ${p.paper_id}`)}`,
    `abstract: |`,
    `  ${(p.abstract ?? "A".repeat(80)).split("\n").join("\n  ")}`,
    `author_agent_ids:`,
    ...p.author_agent_ids.map((a) => `  - ${a}`),
    `coauthor_agent_ids:${(p.coauthor_agent_ids ?? []).length ? "\n" + (p.coauthor_agent_ids ?? []).map((a) => `  - ${a}`).join("\n") : " []"}`,
    `topics:`,
    ...(p.topics ?? ["comparative-politics"]).map((t) => `  - ${t}`),
    `submitted_at: "${p.submitted_at ?? "2026-04-18T12:00:00Z"}"`,
    `status: ${p.status}`,
    `word_count: 5000`,
  ];
  if (p.decided_at) meta.push(`decided_at: "${p.decided_at}"`);
  if (p.revises_paper_id) meta.push(`revises_paper_id: ${p.revises_paper_id}`);
  if (p.degraded_mode) {
    meta.push(
      `degraded_mode:`,
      `  reserve_reviewers_used: ${p.degraded_mode.reserve_reviewers_used}`,
      `  reason: ${JSON.stringify(p.degraded_mode.reason)}`,
    );
  }
  writeFileSync(join(paperDir, "metadata.yml"), meta.join("\n") + "\n");
  writeFileSync(
    join(paperDir, "paper.md"),
    `# ${p.title ?? p.paper_id}\n\n${p.manuscript_body ?? "Body paragraph."}\n`,
  );
  writeFileSync(
    join(paperDir, "paper.redacted.md"),
    `# ${p.title ?? p.paper_id}\n\n**Author:** [redacted]\n\n${p.manuscript_body ?? "Body paragraph."}\n`,
  );

  for (const r of p.reviews ?? []) {
    const fm = [
      `---`,
      `review_id: ${r.review_id}`,
      `paper_id: ${p.paper_id}`,
      `reviewer_agent_id: ${r.reviewer_agent_id}`,
      `submitted_at: "2026-04-24T11:00:00Z"`,
      `recommendation: ${r.recommendation}`,
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
      r.body ?? "Review body.",
    ].join("\n");
    writeFileSync(join(paperDir, "reviews", `${r.review_id}.md`), fm + "\n");
  }

  if (p.decision) {
    const cited = (p.decision.cited_review_ids ?? []).map((id) => ({
      review_id: id,
      accepted_concerns: [],
      dismissed_concerns: [],
    }));
    const citedYaml =
      cited.length === 0
        ? "cited_reviews: []"
        : ["cited_reviews:", ...cited.flatMap((c) => [
            `  - review_id: ${c.review_id}`,
            `    accepted_concerns: []`,
            `    dismissed_concerns: []`,
          ])].join("\n");
    const dfm = [
      `---`,
      `paper_id: ${p.paper_id}`,
      `editor_agent_id: editor-aps-001`,
      `decided_at: "2026-04-30T09:00:00Z"`,
      `outcome: ${p.decision.outcome}`,
      citedYaml,
      p.decision.revisions_due_at
        ? `revisions_due_at: "${p.decision.revisions_due_at}"`
        : null,
      `schema_version: 1`,
      `---`,
      ``,
      p.decision.body ?? "Decision body.",
    ]
      .filter(Boolean)
      .join("\n");
    writeFileSync(join(paperDir, "decision.md"), dfm + "\n");
  }

  if (p.reproducibility) {
    const rfm = [
      `---`,
      `paper_id: ${p.paper_id}`,
      `success: ${p.reproducibility.success}`,
      `---`,
      ``,
      p.reproducibility.body ?? "Reproducibility report.",
    ].join("\n");
    writeFileSync(join(paperDir, "reproducibility.md"), rfm + "\n");
  }
}

export function seedIssue(
  root: string,
  opts: {
    issue_id: string;
    journal_id?: string;
    paper_ids: string[];
    editorial_note?: string;
  },
): void {
  mkdirSync(join(root, "issues"), { recursive: true });
  const body = [
    `issue_id: ${opts.issue_id}`,
    `journal_id: ${opts.journal_id ?? "agent-polsci-alpha"}`,
    `published_at: "2026-06-30T00:00:00Z"`,
    `paper_ids:`,
    ...opts.paper_ids.map((p) => `  - ${p}`),
    opts.editorial_note ? `editorial_note: ${JSON.stringify(opts.editorial_note)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  writeFileSync(join(root, "issues", `${opts.issue_id}.yml`), body + "\n");
}

export function cleanupTempDir(path: string): void {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}
