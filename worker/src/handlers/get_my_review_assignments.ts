import type { Env } from "../env.js";
import type { AgentAuth } from "../auth.js";
import { type Result, ok, err } from "../lib/errors.js";
import { readFile, listDir } from "../lib/github.js";

export type Assignment = {
  review_id: string;
  paper_id: string;
  status: string;
  due_at: string;
  redacted_manuscript_path: string;
  redacted_manuscript: string;
};

export async function getMyReviewAssignments(
  env: Env,
  auth: AgentAuth,
): Promise<Result<{ assignments: Assignment[] }>> {
  let paperDirs: string[];
  try {
    paperDirs = await listPaperDirs(env);
  } catch (e) {
    return err("internal", (e as Error).message);
  }

  const assignments: Assignment[] = [];
  for (const paperDir of paperDirs) {
    const reviewsPath = `${paperDir}/reviews`;
    let invitationFiles: string[];
    try {
      invitationFiles = (await listDir(env, reviewsPath)).filter((p) =>
        /\/review-\d{3,}\.invitation\.ya?ml$/.test(p),
      );
    } catch {
      continue; // no reviews dir
    }
    for (const path of invitationFiles) {
      const raw = await readFile(env, path);
      if (!raw) continue;
      const parsed = parseInvitationYaml(raw);
      if (!parsed) continue;
      if (parsed.reviewer_agent_id !== auth.agent_id) continue;
      if (parsed.status !== "pending" && parsed.status !== "accepted") continue;
      const manuscript = await readFile(env, parsed.redacted_manuscript_path);
      if (!manuscript) continue;
      assignments.push({
        review_id: parsed.review_id,
        paper_id: parsed.paper_id,
        status: parsed.status,
        due_at: parsed.due_at,
        redacted_manuscript_path: parsed.redacted_manuscript_path,
        redacted_manuscript: manuscript,
      });
    }
  }
  return ok({ assignments });
}

async function listPaperDirs(env: Env): Promise<string[]> {
  // `papers/` may be a directory listing of subdirs; our helper's listDir
  // only returns files, so we fetch the top-level papers/ and pull unique
  // paper directories from the file paths we get back.
  const files = await listDir(env, "papers").catch(() => [] as string[]);
  if (files.length === 0) {
    // Try listing the top-level dir's immediate children by a different call.
    const top = await listTopDir(env, "papers");
    return top;
  }
  const dirs = new Set<string>();
  for (const f of files) {
    const m = f.match(/^(papers\/[^/]+)\//);
    if (m) dirs.add(m[1]);
  }
  return [...dirs];
}

async function listTopDir(env: Env, path: string): Promise<string[]> {
  // Use raw fetch to list top-level subdirs.
  const url = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${encodeURI(path)}?ref=${encodeURIComponent(env.REPO_BRANCH)}`;
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "user-agent": "agentic-polsci-worker",
      accept: "application/vnd.github+json",
    },
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`github listing ${path} failed: ${res.status}`);
  const entries = (await res.json()) as Array<{ name: string; type: string; path: string }>;
  return entries.filter((e) => e.type === "dir").map((e) => e.path);
}

type InvitationYaml = {
  review_id: string;
  paper_id: string;
  reviewer_agent_id: string;
  assigned_at: string;
  due_at: string;
  status: string;
  redacted_manuscript_path: string;
};

function parseInvitationYaml(raw: string): InvitationYaml | null {
  // Tiny parser tolerant of the exact shape we write. Extract top-level key: value pairs.
  const fields: Partial<Record<keyof InvitationYaml, string>> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1] as keyof InvitationYaml;
    let val = m[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    fields[key] = val;
  }
  if (
    !fields.review_id ||
    !fields.paper_id ||
    !fields.reviewer_agent_id ||
    !fields.assigned_at ||
    !fields.due_at ||
    !fields.status ||
    !fields.redacted_manuscript_path
  ) {
    return null;
  }
  return fields as InvitationYaml;
}
