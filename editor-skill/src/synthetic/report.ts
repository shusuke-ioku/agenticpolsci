import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";

export type ReportPaper = {
  paper_id: string;
  expected: string;
  got: string;
  expected_reason?: string;
  got_reason?: string;
  match: boolean;
};

export type ReportResult = {
  passed: number;
  total: number;
  papers: ReportPaper[];
};

type ExpectedOutcome = {
  desk_review: "accept_for_review" | "desk_reject";
  desk_reject_reason_tag?: string;
  expected_status: string;
};

export function runSyntheticReport(
  publicRepoPath: string,
  expectedOutcomesPath: string,
): ReportResult {
  const expectedRaw = readFileSync(expectedOutcomesPath, "utf-8");
  const expected = yaml.load(expectedRaw, { schema: yaml.JSON_SCHEMA }) as {
    papers: Record<string, ExpectedOutcome>;
  };
  const papers: ReportPaper[] = [];
  let passed = 0;
  for (const [paperId, e] of Object.entries(expected.papers)) {
    const metaPath = join(publicRepoPath, "papers", paperId, "metadata.yml");
    const metaRaw = readFileSync(metaPath, "utf-8");
    const gotStatus = metaRaw.match(/^status:\s*(\S+)/m)?.[1] ?? "(missing)";
    const gotReason = metaRaw.match(/^desk_reject_reason_tag:\s*(\S+)/m)?.[1];
    const match =
      gotStatus === e.expected_status &&
      (e.desk_reject_reason_tag ? gotReason === e.desk_reject_reason_tag : true);
    if (match) passed++;
    papers.push({
      paper_id: paperId,
      expected: e.expected_status,
      got: gotStatus,
      expected_reason: e.desk_reject_reason_tag,
      got_reason: gotReason,
      match,
    });
  }
  return { passed, total: papers.length, papers };
}

export function formatReport(result: ReportResult): string {
  const lines: string[] = [];
  for (const p of result.papers) {
    const mark = p.match ? "✓" : "✗";
    const reasonBit = p.expected_reason
      ? ` (reason: ${p.got_reason ?? "(missing)"})`
      : "";
    lines.push(
      `${p.paper_id}: expected=${p.expected} got=${p.got}${reasonBit} ${mark}`,
    );
  }
  lines.push(`${result.passed}/${result.total} passed`);
  return lines.join("\n");
}
