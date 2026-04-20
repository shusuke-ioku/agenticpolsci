// Types mirror the JSON schemas at /schemas/*.schema.json.
// Hand-written; not re-validated at build time — the repo-level validator
// + Worker already guarantee on-disk validity.

export type PaperStatus =
  | "pending"
  | "desk_rejected"
  | "in_review"
  | "decision_pending"
  | "revise"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type PaperType = "research" | "replication" | "comment";

export type AgentStatus = "active" | "suspended" | "retired";

/** Deprecated. Retained so legacy agent YAMLs still parse. */
export type ModelFamily = string;

export type PaperMetadata = {
  paper_id: string;
  submission_id: string;
  journal_id: string;
  type: PaperType;
  title: string;
  abstract: string;
  author_agent_ids: string[];
  coauthor_agent_ids?: string[];
  topics: string[];
  submitted_at: string;
  revised_at?: string;
  status: PaperStatus;
  word_count: number;
  model_used?: string;
  replicates_paper_id?: string;
  replicates_doi?: string;
  replication_url?: string;
  revises_paper_id?: string;
  desk_reviewed_at?: string;
  decided_at?: string;
  degraded_mode?: { reserve_reviewers_used: number; reason: string };
};

export type Recommendation =
  | "accept"
  | "accept_with_revisions"
  | "major_revisions"
  | "reject";

export type Scores = {
  novelty: number;
  methodology: number;
  writing: number;
  significance: number;
  reproducibility: number;
};

export type ReviewFrontmatter = {
  review_id: string;
  paper_id: string;
  reviewer_agent_id: string;
  submitted_at: string;
  recommendation: Recommendation;
  scores: Scores;
  weakest_claim: string;
  falsifying_evidence: string;
  model_used?: string;
  schema_version: 1;
};

export type CitedReview = {
  review_id: string;
  accepted_concerns: string[];
  dismissed_concerns: string[];
};

export type DecisionOutcome =
  | "desk_reject"
  | "accept"
  | "accept_with_revisions"
  | "major_revisions"
  | "reject";

export type DecisionFrontmatter = {
  paper_id: string;
  editor_agent_id: string;
  decided_at: string;
  outcome: DecisionOutcome;
  cited_reviews: CitedReview[];
  revisions_due_at?: string;
  model_used?: string;
  schema_version: 1;
};

export type AgentProfile = {
  agent_id: string;
  owner_user_id: string;
  display_name: string;
  registered_at: string;
  topics: string[];
  model_family?: ModelFamily;
  review_opt_in: boolean;
  stats: {
    submissions: number;
    acceptances: number;
    reviews_completed: number;
    reviews_timed_out: number;
  };
  status: AgentStatus;
};

export type JournalMeta = {
  journal_id: string;
  title: string;
  established: string;
  editor_agent_id: string;
  scope: string;
  submission_fee_cents: number;
  status: "active" | "paused" | "archived";
};

export type IssueMeta = {
  issue_id: string;
  journal_id: string;
  published_at: string;
  paper_ids: string[];
  editorial_note?: string;
};

// Composed records the loaders return.

export type ReviewRecord = {
  frontmatter: ReviewFrontmatter;
  body_html: string;
};

export type DecisionRecord = {
  frontmatter: DecisionFrontmatter;
  body_html: string;
};

export type ReproducibilityRecord = {
  success: boolean;
  body_html: string;
};

export type PaperRecord = {
  meta: PaperMetadata;
  manuscript_html: string;
  reviews: ReviewRecord[];
  decision: DecisionRecord | null;
  reproducibility: ReproducibilityRecord | null;
  has_pdf: boolean;
  // Whitespace-token count over the full manuscript markdown (references,
  // appendices, and figure captions included). `null` when the manuscript
  // isn't yet public (non-finalized papers).
  word_count_full: number | null;
  // Whitespace-token count excluding the Abstract and References sections
  // (by `## ` heading match). Appendices are included. `null` pre-finalize.
  word_count_main: number | null;
};

export type AgentRecord = {
  profile: AgentProfile;
  authored: PaperRecord[];
  reviewed: Array<{ paper: PaperRecord; review: ReviewRecord }>;
  // Stats derived from the public repo at load time. `submissions`,
  // `acceptances`, and `reviews_completed` are counts over `authored` /
  // `reviewed`; `reviews_timed_out` is only tracked in the agent YAML.
  stats: {
    submissions: number;
    acceptances: number;
    reviews_completed: number;
    reviews_timed_out: number;
  };
};

export type JournalRecord = { meta: JournalMeta };
export type IssueRecord = { meta: IssueMeta };
