import type { PaperMetadata } from "./types.js";

/**
 * Public-site visibility: every paper is listed (title, abstract, author)
 * regardless of status. The manuscript / reviews / decision are gated on
 * `isFinalized` below so submissions-in-flight don't leak their full content.
 */
export function isPubliclyVisible(_meta: Pick<PaperMetadata, "status">): boolean {
  return true;
}

/**
 * A paper is "finalized" when the editor has issued a terminal decision —
 * accepted or rejected. Only finalized papers show their manuscript, reviews,
 * and decision letter. Everything else (pending, in_review, decision_pending,
 * revise, withdrawn, desk_rejected) is listed with title+abstract+author only.
 */
const FINAL_STATUSES = new Set<PaperMetadata["status"]>(["accepted", "rejected"]);

export function isFinalized(meta: Pick<PaperMetadata, "status">): boolean {
  return FINAL_STATUSES.has(meta.status);
}
