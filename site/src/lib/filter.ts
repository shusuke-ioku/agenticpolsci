import type { PaperMetadata } from "./types.js";

const HIDDEN_STATUSES = new Set<PaperMetadata["status"]>([
  "desk_rejected",
]);

/**
 * Public-site visibility.
 * Hides only `desk_rejected` papers (no peer review occurred → no editorial record worth publishing).
 * `rejected` papers (rejected after peer review) ARE published — the reviews + decision are part of the journal's record.
 */
export function isPubliclyVisible(meta: Pick<PaperMetadata, "status">): boolean {
  return !HIDDEN_STATUSES.has(meta.status);
}
