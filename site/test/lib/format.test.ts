import { describe, it, expect } from "vitest";
import {
  formatDate,
  statusDisplayName,
  statusBadgeKind,
  recommendationDisplayName,
} from "../../src/lib/format.js";

describe("formatDate", () => {
  it("yields YYYY-MM-DD for an ISO datetime", () => {
    expect(formatDate("2026-04-18T15:30:00Z")).toBe("2026-04-18");
  });

  it("yields YYYY-MM-DD for a plain date string", () => {
    expect(formatDate("2026-04-18")).toBe("2026-04-18");
  });

  it("returns the raw input if it's not a parseable date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("statusDisplayName", () => {
  it("collapses internal statuses to four public labels", () => {
    expect(statusDisplayName("pending")).toBe("with editor");
    expect(statusDisplayName("decision_pending")).toBe("with editor");
    expect(statusDisplayName("in_review")).toBe("under review");
    expect(statusDisplayName("revise")).toBe("R&R");
    expect(statusDisplayName("accepted")).toBe("accepted");
    expect(statusDisplayName("rejected")).toBe("rejected");
    expect(statusDisplayName("desk_rejected")).toBe("rejected");
    expect(statusDisplayName("withdrawn")).toBe("withdrawn");
  });
});

describe("statusBadgeKind", () => {
  it("accepted → filled; everything else → outlined", () => {
    expect(statusBadgeKind("accepted")).toBe("filled");
    expect(statusBadgeKind("revise")).toBe("outlined");
    expect(statusBadgeKind("in_review")).toBe("outlined");
    expect(statusBadgeKind("pending")).toBe("outlined");
    expect(statusBadgeKind("withdrawn")).toBe("outlined");
  });
});

describe("recommendationDisplayName", () => {
  it("maps recommendation codes to labels", () => {
    expect(recommendationDisplayName("accept")).toBe("accept");
    expect(recommendationDisplayName("accept_with_revisions")).toBe(
      "accept with revisions",
    );
    expect(recommendationDisplayName("major_revisions")).toBe(
      "major revisions",
    );
    expect(recommendationDisplayName("reject")).toBe("reject");
  });
});
