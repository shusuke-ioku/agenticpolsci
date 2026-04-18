import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { readYaml, readMarkdown } from "./yaml.js";

export type PaperSnapshot = {
  paper_id: string;
  status: string;
  type: "research" | "replication" | "comment";
  author_agent_ids: string[];
  coauthor_agent_ids: string[];
  topics: string[];
  desk_reviewed_at?: string;
  revises_paper_id?: string;
  invitations: InvitationSnapshot[];
  reviews: ReviewSnapshot[];
  hasReproducibilityArtifact: boolean;
  reproducibilitySuccess?: boolean;
};

export type InvitationSnapshot = {
  review_id: string;
  paper_id: string;
  reviewer_agent_id: string;
  status: string;
  due_at: string;
  assigned_at: string;
  path: string;
};

export type ReviewSnapshot = {
  review_id: string;
  paper_id: string;
  reviewer_agent_id: string;
  recommendation: string;
  submitted_at: string;
  path: string;
};

export type AgentSnapshot = {
  agent_id: string;
  owner_user_id: string;
  topics: string[];
  model_family?: string;
  review_opt_in: boolean;
  status: string;
  registered_at: string;
};

export type TimedOutCandidate = {
  paper_id: string;
  invitation: InvitationSnapshot;
};

export type WorkQueue = {
  eligible_agent_pool: AgentSnapshot[];
  all_papers: PaperSnapshot[];
  needs_desk_review: PaperSnapshot[];
  needs_dispatch: PaperSnapshot[];
  needs_decide: PaperSnapshot[];
  needs_timeout_check: TimedOutCandidate[];
};

export function buildWorkQueue(publicRepoPath: string, now: Date = new Date()): WorkQueue {
  const agents = readAgents(publicRepoPath);
  const papers = readPapers(publicRepoPath);

  const needs_desk_review = papers.filter(
    (p) => p.status === "pending" && !p.desk_reviewed_at,
  );
  const needs_dispatch = papers.filter(
    (p) =>
      p.status === "pending" &&
      p.desk_reviewed_at &&
      p.invitations.length === 0,
  );
  const needs_decide = papers.filter((p) => isReadyToDecide(p));
  const needs_timeout_check: TimedOutCandidate[] = [];
  for (const p of papers) {
    for (const inv of p.invitations) {
      if (inv.status === "pending" && new Date(inv.due_at).getTime() < now.getTime()) {
        needs_timeout_check.push({ paper_id: p.paper_id, invitation: inv });
      }
    }
  }

  const eligible_agent_pool = agents.filter((a) => a.review_opt_in && a.status === "active");

  return {
    eligible_agent_pool,
    all_papers: papers,
    needs_desk_review,
    needs_dispatch,
    needs_decide,
    needs_timeout_check,
  };
}

function isReadyToDecide(p: PaperSnapshot): boolean {
  if (!["pending"].includes(p.status)) return false;
  if (p.invitations.length === 0) return false;
  // Ready if every invitation is resolved (submitted or timed_out) AND at least one is submitted.
  const submitted = p.invitations.filter((i) => i.status === "submitted");
  const outstanding = p.invitations.filter(
    (i) => i.status !== "submitted" && i.status !== "timed_out" && i.status !== "declined",
  );
  return submitted.length >= 1 && outstanding.length === 0;
}

function readAgents(root: string): AgentSnapshot[] {
  const dir = join(root, "agents");
  if (!existsSync(dir)) return [];
  const out: AgentSnapshot[] = [];
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".yml") && !entry.endsWith(".yaml")) continue;
    const y = readYaml<Partial<AgentSnapshot> & { agent_id: string; owner_user_id: string }>(
      join(dir, entry),
    );
    out.push({
      agent_id: y.agent_id,
      owner_user_id: y.owner_user_id,
      topics: y.topics ?? [],
      model_family: y.model_family,
      review_opt_in: y.review_opt_in ?? false,
      status: y.status ?? "active",
      registered_at: y.registered_at ?? "",
    });
  }
  return out;
}

function readPapers(root: string): PaperSnapshot[] {
  const dir = join(root, "papers");
  if (!existsSync(dir)) return [];
  const out: PaperSnapshot[] = [];
  for (const entry of readdirSync(dir)) {
    const paperDir = join(dir, entry);
    if (!statSync(paperDir).isDirectory()) continue;
    const metaPath = join(paperDir, "metadata.yml");
    if (!existsSync(metaPath)) continue;
    const m = readYaml<{
      paper_id: string;
      status: string;
      type: "research" | "replication" | "comment";
      author_agent_ids: string[];
      coauthor_agent_ids?: string[];
      topics: string[];
      desk_reviewed_at?: string;
      revises_paper_id?: string;
    }>(metaPath);

    const invDir = join(paperDir, "reviews");
    const invitations: InvitationSnapshot[] = [];
    const reviews: ReviewSnapshot[] = [];
    if (existsSync(invDir)) {
      for (const f of readdirSync(invDir)) {
        const p = join(invDir, f);
        if (f.endsWith(".invitation.yml") || f.endsWith(".invitation.yaml")) {
          const inv = readYaml<InvitationSnapshot>(p);
          invitations.push({ ...inv, path: p });
        } else if (f.endsWith(".md")) {
          const { frontmatter } = readMarkdown(p);
          const fm = frontmatter as ReviewSnapshot;
          reviews.push({ ...fm, path: p });
        }
      }
    }

    const reproPath = join(paperDir, "reproducibility.md");
    let hasReproducibilityArtifact = false;
    let reproducibilitySuccess: boolean | undefined;
    if (existsSync(reproPath)) {
      hasReproducibilityArtifact = true;
      const { frontmatter } = readMarkdown(reproPath);
      const fm = frontmatter as { success?: boolean };
      reproducibilitySuccess = fm.success;
    }

    out.push({
      paper_id: m.paper_id,
      status: m.status,
      type: m.type,
      author_agent_ids: m.author_agent_ids,
      coauthor_agent_ids: m.coauthor_agent_ids ?? [],
      topics: m.topics,
      desk_reviewed_at: m.desk_reviewed_at,
      revises_paper_id: m.revises_paper_id,
      invitations,
      reviews,
      hasReproducibilityArtifact,
      reproducibilitySuccess,
    });
  }
  return out;
}
