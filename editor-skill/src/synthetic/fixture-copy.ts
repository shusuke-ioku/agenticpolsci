import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// editor-skill/src/synthetic/ → ../../test/synthetic/fixtures/
const FIXTURES_DIR = join(__dirname, "..", "..", "test", "synthetic", "fixtures");

export type PreparedFixture = {
  publicRepo: string;
  policyRepo: string;
  expectedOutcomesPath: string;
};

export function prepareSyntheticFixture(targetRoot: string): PreparedFixture {
  mkdirSync(targetRoot, { recursive: true });
  const publicRepo = join(targetRoot, "repo");
  const policyRepo = join(targetRoot, "policy");
  mkdirSync(publicRepo, { recursive: true });

  // Copy policy repo.
  cpSync(join(FIXTURES_DIR, "policy"), policyRepo, { recursive: true });

  // Copy papers.
  mkdirSync(join(publicRepo, "papers"), { recursive: true });
  cpSync(join(FIXTURES_DIR, "papers"), join(publicRepo, "papers"), { recursive: true });

  // Seed journal + agents inline.
  mkdirSync(join(publicRepo, "journals"), { recursive: true });
  mkdirSync(join(publicRepo, "agents"), { recursive: true });
  writeFileSync(
    join(publicRepo, "journals", "agent-polsci-alpha.yml"),
    [
      "journal_id: agent-polsci-alpha",
      "title: Agent Journal of Political Science",
      "established: 2026-04-17",
      "editor_agent_id: editor-aps-001",
      "scope: |",
      "  Peer-reviewed venue for AI-authored political science research.",
      "submission_fee_cents: 100",
      "status: active",
    ].join("\n") + "\n",
  );
  for (const a of [
    { id: "agent-author01", owner: "user-author", opt_in: false },
    { id: "agent-r1", owner: "user-r1", opt_in: true },
    { id: "agent-r2", owner: "user-r2", opt_in: true },
    { id: "agent-r3", owner: "user-r3", opt_in: true },
  ]) {
    writeFileSync(
      join(publicRepo, "agents", `${a.id}.yml`),
      [
        `agent_id: ${a.id}`,
        `owner_user_id: ${a.owner}`,
        `display_name: ${a.id}`,
        `registered_at: "2026-04-01T00:00:00Z"`,
        "topics:",
        "  - comparative-politics",
        "  - electoral-systems",
        "  - replication",
        "  - political-economy",
        "  - institutional-performance",
        "  - voter-turnout",
        "  - misc",
        `review_opt_in: ${a.opt_in}`,
        "stats:",
        "  submissions: 0",
        "  acceptances: 0",
        "  reviews_completed: 0",
        "  reviews_timed_out: 0",
        "status: active",
      ].join("\n") + "\n",
    );
  }

  return {
    publicRepo,
    policyRepo,
    expectedOutcomesPath: join(FIXTURES_DIR, "expected-outcomes.yml"),
  };
}
