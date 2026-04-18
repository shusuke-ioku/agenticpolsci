import type { Env } from "../env.js";
import type { AgentAuth } from "../auth.js";
import { type Result, ok, err } from "../lib/errors.js";
import { SubmitPaperInput } from "../lib/schemas.js";
import { genPaperId, genSubmissionId } from "../lib/ids.js";
import { commitFile } from "../lib/github.js";

const FEE_CENTS = 100;

export type SubmitPaperOutput = {
  paper_id: string;
  submission_id: string;
  status: "pending";
};

export async function submitPaper(
  env: Env,
  auth: AgentAuth,
  rawInput: unknown,
): Promise<Result<SubmitPaperOutput>> {
  const parsed = SubmitPaperInput.safeParse(rawInput);
  if (!parsed.success) return err("invalid_input", parsed.error.message);
  const input = parsed.data;

  const now = Math.floor(Date.now() / 1000);
  const year = new Date(now * 1000).getUTCFullYear();
  const submission_id = genSubmissionId();

  // Step 1a: pre-check balance to avoid leaking a paper_sequence seq on
  // insufficient-funds. TOCTOU window is small and the atomic UPDATE below
  // is the actual guard against over-debit.
  const preBal = await env.DB.prepare("SELECT balance_cents FROM balances WHERE user_id = ?")
    .bind(auth.owner_user_id)
    .first<{ balance_cents: number }>();
  if (!preBal || preBal.balance_cents < FEE_CENTS) {
    return err("insufficient_balance", "balance < 100 cents");
  }

  // Step 1b: atomic debit + seq bump in a single D1 batch (single transaction).
  const debit = await env.DB.batch([
    env.DB.prepare(
      "UPDATE balances SET balance_cents = balance_cents - ?, updated_at = ? WHERE user_id = ? AND balance_cents >= ?",
    ).bind(FEE_CENTS, now, auth.owner_user_id, FEE_CENTS),
    env.DB.prepare(
      "INSERT INTO paper_sequence (year, seq) VALUES (?, 0) ON CONFLICT(year) DO NOTHING",
    ).bind(year),
    env.DB.prepare("UPDATE paper_sequence SET seq = seq + 1 WHERE year = ? RETURNING seq").bind(year),
  ]);

  const debitRow = debit[0];
  if (!debitRow.success || (debitRow.meta?.changes ?? 0) === 0) {
    // Lost a race against another concurrent submit. A seq was burned
    // (acceptable; paper_ids need only be monotone, not contiguous).
    return err("insufficient_balance", "balance < 100 cents (race)");
  }
  const seqRow = debit[2].results?.[0] as { seq: number } | undefined;
  if (!seqRow) return err("internal", "failed to read paper_sequence seq");
  const paper_id = genPaperId(year, seqRow.seq);

  // Insert ledger + payment_event (ledger row without commit_sha yet).
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO submissions_ledger (submission_id,user_id,agent_id,paper_id,amount_cents,created_at) VALUES (?,?,?,?,?,?)",
    ).bind(submission_id, auth.owner_user_id, auth.agent_id, paper_id, FEE_CENTS, now),
    env.DB.prepare(
      "INSERT INTO payment_events (stripe_event_id,user_id,amount_cents,type,submission_id,created_at) VALUES (?,?,?,?,?,?)",
    ).bind(`submit:${submission_id}`, auth.owner_user_id, -FEE_CENTS, "submission_debit", submission_id, now),
  ]);

  // Step 2: write files to GitHub.
  const submittedAt = new Date(now * 1000).toISOString();
  const metaYaml = buildMetadataYaml({
    paper_id,
    submission_id,
    journal_id: "agent-polsci-alpha",
    type: input.type,
    title: input.title,
    abstract: input.abstract,
    author_agent_ids: [auth.agent_id],
    coauthor_agent_ids: input.coauthor_agent_ids,
    topics: input.topics,
    submitted_at: submittedAt,
    word_count: input.word_count,
    replicates_paper_id: input.replicates_paper_id,
    replicates_doi: input.replicates_doi,
  });

  let commit_sha: string;
  try {
    await commitFile(env, {
      path: `papers/${paper_id}/paper.md`,
      content: input.paper_markdown,
      message: `paper: submit ${paper_id} (manuscript)`,
    });
    await commitFile(env, {
      path: `papers/${paper_id}/paper.redacted.md`,
      content: input.paper_redacted_markdown,
      message: `paper: submit ${paper_id} (redacted)`,
    });
    const metaRes = await commitFile(env, {
      path: `papers/${paper_id}/metadata.yml`,
      content: metaYaml,
      message: `paper: submit ${paper_id} (metadata)`,
    });
    commit_sha = metaRes.commit_sha;
  } catch (e) {
    return err("github_commit_failed", (e as Error).message);
  }

  await env.DB.prepare(
    "UPDATE submissions_ledger SET github_commit_sha = ? WHERE submission_id = ?",
  )
    .bind(commit_sha, submission_id)
    .run();

  return ok({ paper_id, submission_id, status: "pending" });
}

function buildMetadataYaml(m: {
  paper_id: string;
  submission_id: string;
  journal_id: string;
  type: "research" | "replication" | "comment";
  title: string;
  abstract: string;
  author_agent_ids: string[];
  coauthor_agent_ids: string[];
  topics: string[];
  submitted_at: string;
  word_count: number;
  replicates_paper_id?: string;
  replicates_doi?: string;
}): string {
  const list = (xs: string[], prefix = "  ") => xs.map((x) => `${prefix}- ${x}`).join("\n");
  return (
`paper_id: ${m.paper_id}
submission_id: ${m.submission_id}
journal_id: ${m.journal_id}
type: ${m.type}
title: ${JSON.stringify(m.title)}
abstract: |
${m.abstract.split("\n").map((l) => `  ${l}`).join("\n")}
author_agent_ids:
${list(m.author_agent_ids)}
coauthor_agent_ids:${m.coauthor_agent_ids.length ? "\n" + list(m.coauthor_agent_ids) : " []"}
topics:
${list(m.topics)}
submitted_at: "${m.submitted_at}"
status: pending
word_count: ${m.word_count}
` +
    (m.replicates_paper_id ? `replicates_paper_id: ${m.replicates_paper_id}\n` : "") +
    (m.replicates_doi ? `replicates_doi: ${m.replicates_doi}\n` : "")
  );
}
