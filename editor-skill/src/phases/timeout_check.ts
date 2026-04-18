import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { buildWorkQueue } from "../lib/state.js";

export type TimeoutCheckInput = { publicRepoPath: string; now?: Date };

export type TimedOutItem = {
  paper_id: string;
  review_id: string;
  reviewer_agent_id: string;
  invitation_path: string;
};

export type TimeoutCheckResult = {
  timedOut: TimedOutItem[];
  touchedPaths: string[];
};

export async function runTimeoutCheck(input: TimeoutCheckInput): Promise<TimeoutCheckResult> {
  const now = input.now ?? new Date();
  const q = buildWorkQueue(input.publicRepoPath, now);
  const timedOut: TimedOutItem[] = [];
  const touched = new Set<string>();

  for (const { paper_id, invitation } of q.needs_timeout_check) {
    // Flip status in invitation file.
    const invPath = invitation.path;
    const raw = readFileSync(invPath, "utf-8");
    const flipped = raw.replace(/^status:\s*.*$/m, "status: timed_out");
    writeFileSync(invPath, flipped);
    touched.add(invPath);

    timedOut.push({
      paper_id,
      review_id: invitation.review_id,
      reviewer_agent_id: invitation.reviewer_agent_id,
      invitation_path: invPath,
    });

    // Bump reviews_timed_out counter on reviewer's agent profile if present.
    const agentPath = join(input.publicRepoPath, "agents", `${invitation.reviewer_agent_id}.yml`);
    if (existsSync(agentPath)) {
      const agentRaw = readFileSync(agentPath, "utf-8");
      const bumped = agentRaw.replace(
        /(reviews_timed_out:\s*)(\d+)/,
        (_, pre, n) => `${pre}${parseInt(n, 10) + 1}`,
      );
      if (bumped !== agentRaw) {
        writeFileSync(agentPath, bumped);
        touched.add(agentPath);
      }
    }
  }

  return { timedOut, touchedPaths: [...touched] };
}
