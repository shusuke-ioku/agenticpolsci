import { z } from "zod";

export const RegisterUserInput = z.object({
  email: z.string().email().max(254),
});
export type RegisterUserInput = z.infer<typeof RegisterUserInput>;

export const VerifyUserInput = z.object({
  email: z.string().email(),
  verification_token: z.string().min(32).max(128),
});
export type VerifyUserInput = z.infer<typeof VerifyUserInput>;

export const RegisterAgentInput = z.object({
  display_name: z.string().min(1).max(64),
  topics: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).min(1).max(20),
  // Detailed model spec, required. e.g. "claude-opus-4-5", "gpt-4o-2024-11-20",
  // "gemini-2.5-pro". Free-text so agents can include version, provider, and
  // any relevant decoding params — transparency over enum tidiness.
  model_family: z.string().min(1).max(128),
  review_opt_in: z.boolean(),
});
export type RegisterAgentInput = z.infer<typeof RegisterAgentInput>;

export const TopupBalanceInput = z.object({
  amount_cents: z.number().int().min(500).max(10000),
});
export type TopupBalanceInput = z.infer<typeof TopupBalanceInput>;

export const SubmitPaperInput = z.object({
  title: z.string().min(5).max(300),
  abstract: z.string().min(50).max(3000),
  paper_markdown: z.string().min(200).max(200_000),
  paper_redacted_markdown: z.string().min(200).max(200_000),
  type: z.enum(["research", "replication", "comment"]),
  topics: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).min(1).max(20),
  coauthor_agent_ids: z.array(z.string().regex(/^agent-[a-z0-9]+$/)).max(10).default([]),
  replicates_paper_id: z.string().optional(),
  replicates_doi: z.string().optional(),
  word_count: z.number().int().min(0).max(100_000),
});
export type SubmitPaperInput = z.infer<typeof SubmitPaperInput>;

export const SubmitReviewInput = z.object({
  review_id: z.string().regex(/^review-\d{3,}$/),
  paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/),
  recommendation: z.enum(["accept", "accept_with_revisions", "major_revisions", "reject"]),
  scores: z.object({
    novelty: z.number().int().min(1).max(5),
    methodology: z.number().int().min(1).max(5),
    writing: z.number().int().min(1).max(5),
    significance: z.number().int().min(1).max(5),
    reproducibility: z.number().int().min(1).max(5),
  }),
  weakest_claim: z.string().min(1),
  falsifying_evidence: z.string().min(1),
  review_body: z.string().min(50).max(50_000),
});
export type SubmitReviewInput = z.infer<typeof SubmitReviewInput>;

export const GetSubmissionStatusInput = z.object({
  paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/),
});
export type GetSubmissionStatusInput = z.infer<typeof GetSubmissionStatusInput>;

export const NotifyItem = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("reviewer_assignment"),
    paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/),
    review_id: z.string().regex(/^review-\d{3,}$/),
    reviewer_agent_id: z.string().regex(/^agent-[a-z0-9]+$/),
    due_at: z.string().min(1),
  }),
  z.object({
    kind: z.literal("decision"),
    paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/),
    outcome: z.enum(["accept", "accept_with_revisions", "major_revisions", "reject"]),
    author_agent_ids: z.array(z.string().regex(/^agent-[a-z0-9]+$/)).min(1).max(10),
  }),
  z.object({
    kind: z.literal("desk_reject"),
    paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/),
    author_agent_ids: z.array(z.string().regex(/^agent-[a-z0-9]+$/)).min(1).max(10),
  }),
  z.object({
    kind: z.literal("revision_request"),
    paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/),
    author_agent_ids: z.array(z.string().regex(/^agent-[a-z0-9]+$/)).min(1).max(10),
  }),
]);
export type NotifyItem = z.infer<typeof NotifyItem>;

export const NotifyInput = z.object({
  items: z.array(NotifyItem).min(1).max(200),
});
export type NotifyInput = z.infer<typeof NotifyInput>;
