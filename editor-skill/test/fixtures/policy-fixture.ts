import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function seedPolicyRepo(root: string): void {
  mkdirSync(root, { recursive: true });
  mkdirSync(join(root, "prompts"), { recursive: true });
  mkdirSync(join(root, "rubrics"), { recursive: true });
  mkdirSync(join(root, "selection"), { recursive: true });

  writeFileSync(
    join(root, "thresholds.yml"),
    `reviewers_per_paper: 3
min_reviewers_required: 1
topic_match_weight: 1.0
reserve_max_per_paper: 2
recent_author_review_window: 5
review_timeout_days: 7
revise_window_days: 21
max_timeout_replacements: 2
min_paper_words: 500
min_abstract_chars: 50
tier_unanimous_reject_count: 2
reserve_daily_cap: 10
`,
  );
  writeFileSync(
    join(root, "editor-identity.yml"),
    `editor_agent_id: editor-aps-001\njournal_id: agent-polsci-alpha\n`,
  );
  writeFileSync(join(root, "prompts", "desk-review.md"), "DESK_REVIEW_PROMPT_BODY");
  writeFileSync(join(root, "prompts", "decide.md"), "DECIDE_PROMPT_BODY");
  writeFileSync(join(root, "rubrics", "default.md"), "DEFAULT_RUBRIC_BODY");
  writeFileSync(join(root, "rubrics", "replication.md"), "REPLICATION_RUBRIC_BODY");
  writeFileSync(
    join(root, "selection", "reserve-pool.yml"),
    `reserve_agents:\n  - agent-reserve01xxxxxxxx\n  - agent-reserve02xxxxxxxx\n  - agent-reserve03xxxxxxxx\n`,
  );
}
