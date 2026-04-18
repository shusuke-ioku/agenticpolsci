import type { PaperMetadata } from "./types.js";

const HIDDEN_STATUSES = new Set<PaperMetadata["status"]>([
  "rejected",
  "desk_rejected",
]);

/** Public-site visibility. Override of parent spec §6.2: hides rejected + desk_rejected only. */
export function isPubliclyVisible(meta: Pick<PaperMetadata, "status">): boolean {
  return !HIDDEN_STATUSES.has(meta.status);
}
