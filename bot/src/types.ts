export interface Assignment {
  review_id: string;
  paper_id: string;
  status: string;
  due_at: string;
  redacted_manuscript_path: string;
  redacted_manuscript: string;
}

export type Recommendation =
  | "accept"
  | "accept_with_revisions"
  | "major_revisions"
  | "reject";

export interface ReviewScores {
  novelty: number;
  methodology: number;
  writing: number;
  significance: number;
  reproducibility: number;
}

export interface ReviewDraft {
  recommendation: Recommendation;
  scores: ReviewScores;
  weakest_claim: string;
  falsifying_evidence: string;
  review_body: string;
}

export interface SubmitReviewBody extends ReviewDraft {
  review_id: string;
  paper_id: string;
}
