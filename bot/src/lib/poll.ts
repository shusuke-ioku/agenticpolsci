import pc from "picocolors";
import { getMyReviewAssignments, submitReview } from "./api.js";
import { synthesizeReview } from "./synthesize-review.js";
import type { Assignment } from "../types.js";

export interface PollDeps {
  log: (msg: string) => void;
  logErr: (msg: string) => void;
  now: () => Date;
  // Swappable for tests.
  getAssignments: (apiUrl: string, token: string) => Promise<{ assignments: Assignment[] }>;
  submit: (apiUrl: string, token: string, body: unknown) => Promise<unknown>;
  synthesize: typeof synthesizeReview;
  sleep: (ms: number) => Promise<void>;
}

const DEFAULT_DEPS: PollDeps = {
  log: console.log,
  logErr: console.error,
  now: () => new Date(),
  getAssignments: getMyReviewAssignments,
  submit: (url, token, body) => submitReview(url, token, body as Parameters<typeof submitReview>[2]),
  synthesize: synthesizeReview,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

export interface PollConfig {
  apiUrl: string;
  agentToken: string;
  anthropicApiKey: string;
  anthropicModel: string;
  pollIntervalMs: number;
}

/** Process every current assignment exactly once. Returns how many reviews it submitted. */
export async function runOneTick(config: PollConfig, deps: Partial<PollDeps> = {}): Promise<number> {
  const d: PollDeps = { ...DEFAULT_DEPS, ...deps };
  let got: { assignments: Assignment[] };
  try {
    got = await d.getAssignments(config.apiUrl, config.agentToken);
  } catch (e) {
    d.logErr(pc.red(`[${d.now().toISOString()}] poll failed: ${(e as Error).message}`));
    return 0;
  }
  if (got.assignments.length === 0) {
    d.log(pc.dim(`[${d.now().toISOString()}] no assignments`));
    return 0;
  }
  d.log(pc.bold(`[${d.now().toISOString()}] ${got.assignments.length} assignment(s)`));

  let submitted = 0;
  for (const a of got.assignments) {
    d.log(`  → reviewing ${a.paper_id} (${a.review_id})`);
    try {
      const draft = await d.synthesize({
        apiKey: config.anthropicApiKey,
        model: config.anthropicModel,
        manuscript: a.redacted_manuscript,
        paperId: a.paper_id,
      });
      await d.submit(config.apiUrl, config.agentToken, {
        review_id: a.review_id,
        paper_id: a.paper_id,
        recommendation: draft.recommendation,
        scores: draft.scores,
        weakest_claim: draft.weakest_claim,
        falsifying_evidence: draft.falsifying_evidence,
        review_body: draft.review_body,
      });
      submitted++;
      d.log(pc.green(`    ✓ submitted (${draft.recommendation})`));
    } catch (e) {
      d.logErr(pc.red(`    ✗ ${(e as Error).message}`));
    }
  }
  return submitted;
}

/** Infinite loop: tick, wait, tick, ... until SIGINT/SIGTERM. */
export async function runForever(config: PollConfig, deps: Partial<PollDeps> = {}): Promise<void> {
  const d: PollDeps = { ...DEFAULT_DEPS, ...deps };
  let stopped = false;
  const stop = () => {
    stopped = true;
    d.log(pc.dim("shutting down after current tick…"));
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  while (!stopped) {
    await runOneTick(config, deps);
    if (stopped) break;
    await d.sleep(config.pollIntervalMs);
  }
}
