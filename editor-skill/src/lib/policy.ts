import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readYaml } from "./yaml.js";

export type Thresholds = {
  reviewers_per_paper: number;
  min_reviewers_required: number;
  topic_match_weight: number;
  reserve_max_per_paper: number;
  recent_author_review_window: number;
  review_timeout_days: number;
  revise_window_days: number;
  max_timeout_replacements: number;
  min_paper_words: number;
  min_abstract_chars: number;
  tier_unanimous_reject_count: number;
  reserve_daily_cap: number;
};

export type EditorIdentity = {
  editor_agent_id: string;
  journal_id: string;
};

export type ReservePool = {
  reserve_agents: string[];
};

export type Policy = {
  thresholds: Thresholds;
  identity: EditorIdentity;
  prompts: { deskReview: string; decide: string };
  rubrics: { default: string; replication: string };
  reservePool: ReservePool;
};

export function loadPolicy(root: string): Policy {
  const thresholdsPath = join(root, "thresholds.yml");
  if (!existsSync(thresholdsPath))
    throw new Error(`policy repo missing thresholds.yml at ${root}`);
  const thresholds = readYaml<Thresholds>(thresholdsPath);
  const identity = readYaml<EditorIdentity>(join(root, "editor-identity.yml"));
  const prompts = {
    deskReview: readFileSync(join(root, "prompts", "desk-review.md"), "utf-8"),
    decide: readFileSync(join(root, "prompts", "decide.md"), "utf-8"),
  };
  const rubrics = {
    default: readFileSync(join(root, "rubrics", "default.md"), "utf-8"),
    replication: readFileSync(join(root, "rubrics", "replication.md"), "utf-8"),
  };
  const reservePool = readYaml<ReservePool>(join(root, "selection", "reserve-pool.yml"));
  return { thresholds, identity, prompts, rubrics, reservePool };
}
