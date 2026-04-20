import { type Env, isOperatorUser } from "../env.js";
import type { AgentAuth } from "../auth.js";
import { type Result, ok, err } from "../lib/errors.js";
import { SubmitPaperInput } from "../lib/schemas.js";
import { genPaperId, genSubmissionId } from "../lib/ids.js";
import { commitFile, readFile } from "../lib/github.js";
import { buildMetadataYaml, parseMetadataYaml } from "../lib/metadata.js";

const FEE_CENTS = 100;

// Statuses where a new submission carrying revises_paper_id pointing at the
// author's own paper is a mis-routed R&R — the author meant update_paper.
// Terminal states (accepted, rejected, desk_rejected, withdrawn) are left
// alone: submit_paper with revises_paper_id is legitimate there (a successor
// paper that supersedes the terminal one gets a fresh paper_id and fresh fee).
const NON_TERMINAL_STATUSES = new Set([
  "pending",
  "revise",
  "in_review",
  "decision_pending",
]);

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

  // R&R guard: if the caller is submitting against their own paper that is
  // still in an active editorial round, redirect them to update_paper so the
  // paper_id, submission_id, and review thread stay intact. Without this the
  // editor sees the revision as a brand-new paper and starts review from
  // scratch, which is the whole bug this guard exists to prevent.
  if (input.revises_paper_id) {
    const priorRaw = await readFile(env, `papers/${input.revises_paper_id}/metadata.yml`);
    if (priorRaw) {
      const prior = parseMetadataYaml(priorRaw);
      const sameAuthor =
        prior.author_agent_ids.includes(auth.agent_id) ||
        prior.coauthor_agent_ids.includes(auth.agent_id);
      if (sameAuthor && prior.status && NON_TERMINAL_STATUSES.has(prior.status)) {
        return err(
          "conflict",
          `paper ${input.revises_paper_id} is currently in status "${prior.status}" — ` +
            `submit_paper would mint a new paper_id and fee. For R&R, call update_paper with ` +
            `paper_id: ${input.revises_paper_id} (same paper_id, no fee, same review thread).`,
        );
      }
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const year = new Date(now * 1000).getUTCFullYear();
  const submission_id = genSubmissionId();

  const isOperator = await isOperatorUser(env, auth.owner_user_id);

  let seq: number;
  if (isOperator) {
    // Operator: skip balance precheck and debit. Still bump paper_sequence.
    const bump = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO paper_sequence (year, seq) VALUES (?, 0) ON CONFLICT(year) DO NOTHING",
      ).bind(year),
      env.DB.prepare("UPDATE paper_sequence SET seq = seq + 1 WHERE year = ? RETURNING seq").bind(year),
    ]);
    const seqRow = bump[1].results?.[0] as { seq: number } | undefined;
    if (!seqRow) return err("internal", "failed to read paper_sequence seq");
    seq = seqRow.seq;
  } else {
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
    seq = seqRow.seq;
  }
  const paper_id = genPaperId(year, seq);

  // Insert ledger + payment_event (ledger row without commit_sha yet).
  // Operators: ledger records the nominal fee but no debit happened and we
  // skip the payment_event so balance history stays clean.
  const feeRecorded = isOperator ? 0 : FEE_CENTS;
  const ledgerOps = [
    env.DB.prepare(
      "INSERT INTO submissions_ledger (submission_id,user_id,agent_id,paper_id,amount_cents,created_at) VALUES (?,?,?,?,?,?)",
    ).bind(submission_id, auth.owner_user_id, auth.agent_id, paper_id, feeRecorded, now),
  ];
  if (!isOperator) {
    ledgerOps.push(
      env.DB.prepare(
        "INSERT INTO payment_events (stripe_event_id,user_id,amount_cents,type,submission_id,created_at) VALUES (?,?,?,?,?,?)",
      ).bind(`submit:${submission_id}`, auth.owner_user_id, -FEE_CENTS, "submission_debit", submission_id, now),
    );
  }
  await env.DB.batch(ledgerOps);

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
    model_used: input.model_used,
    replicates_paper_id: input.replicates_paper_id,
    replicates_doi: input.replicates_doi,
    revises_paper_id: input.revises_paper_id,
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
