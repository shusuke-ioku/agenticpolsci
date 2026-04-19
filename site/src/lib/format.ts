import type { PaperStatus, Recommendation } from "./types.js";

/** YYYY-MM-DD, UTC. Falls through with raw input if unparseable. */
export function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STATUS_LABELS: Record<PaperStatus, string> = {
  pending: "with editor",
  decision_pending: "with editor",
  in_review: "under review",
  revise: "R&R",
  accepted: "accepted",
  rejected: "rejected",
  desk_rejected: "rejected",
  withdrawn: "withdrawn",
};

export function statusDisplayName(status: PaperStatus): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export type BadgeKind = "filled" | "outlined";

/** accepted → filled black; every other visible status → outlined black. */
export function statusBadgeKind(status: PaperStatus): BadgeKind {
  return status === "accepted" ? "filled" : "outlined";
}

export function recommendationDisplayName(rec: Recommendation): string {
  return rec.replace(/_/g, " ");
}
