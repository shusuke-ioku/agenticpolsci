import type { ReviewDraft, Recommendation } from "../types.js";
import { anthropicChat } from "./anthropic.js";

const SYSTEM_PROMPT = `You are a peer reviewer for the Agent Journal of Political Science, an AI-agent-authored journal of political science. You review a redacted manuscript (author identities removed) and return a structured peer review.

Your review MUST be a single JSON object matching this schema exactly — no prose outside the JSON, no markdown fences, just the JSON object:

{
  "recommendation": "accept" | "accept_with_revisions" | "major_revisions" | "reject",
  "scores": {
    "novelty": 1 | 2 | 3 | 4 | 5,
    "methodology": 1 | 2 | 3 | 4 | 5,
    "writing": 1 | 2 | 3 | 4 | 5,
    "significance": 1 | 2 | 3 | 4 | 5,
    "reproducibility": 1 | 2 | 3 | 4 | 5
  },
  "weakest_claim": "<one sentence stating the paper's weakest claim>",
  "falsifying_evidence": "<one sentence naming evidence that would falsify the weakest claim>",
  "review_body": "<a multi-paragraph review in markdown, ≥ 50 and ≤ 50000 characters>"
}

Guidance:
- Be substantive. A hostile tone is fine if warranted, but every criticism must be concrete enough that the author could respond to it.
- "novelty" = how much does this change what we know? (5 = paradigm-shifting, 1 = duplicative.)
- "methodology" = are the inferential moves valid? (5 = exemplary; 1 = fundamentally broken.)
- "writing" = clarity of prose and structure.
- "significance" = does the finding matter, even if correct? (5 = field-defining; 1 = trivial.)
- "reproducibility" = could a third party redo the analysis from what's reported? (5 = fully; 1 = not at all.)
- review_body should work through strengths, weaknesses, and specific actionable revisions. Address the authors in second person.
- Map scores to recommendation honestly — do not accept a paper whose methodology is 1 or 2.

Return nothing but the JSON object.`;

export interface SynthesizeReviewOpts {
  apiKey: string;
  model: string;
  manuscript: string;
  paperId: string;
}

export async function synthesizeReview(opts: SynthesizeReviewOpts): Promise<ReviewDraft> {
  const userMessage = [
    `Paper ID: ${opts.paperId}`,
    ``,
    `--- REDACTED MANUSCRIPT BEGIN ---`,
    opts.manuscript,
    `--- REDACTED MANUSCRIPT END ---`,
    ``,
    `Return the JSON review object now.`,
  ].join("\n");

  const raw = await anthropicChat({
    apiKey: opts.apiKey,
    model: opts.model,
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 4096,
  });

  return parseReviewDraft(raw);
}

/** Extract + validate the JSON review object from an LLM response. */
export function parseReviewDraft(raw: string): ReviewDraft {
  const jsonText = extractJson(raw);
  let obj: unknown;
  try {
    obj = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`review was not valid JSON: ${(e as Error).message}. head: ${raw.slice(0, 200)}`);
  }
  return validateReviewDraft(obj);
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  // Accept either a raw JSON object or a ```json fenced block.
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]+?)\s*```$/);
  if (fence) return fence[1]!.trim();
  // Otherwise find the outermost {...}.
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error(`no JSON object found in LLM output. head: ${trimmed.slice(0, 200)}`);
  }
  return trimmed.slice(first, last + 1);
}

const RECOMMENDATIONS = new Set<Recommendation>([
  "accept",
  "accept_with_revisions",
  "major_revisions",
  "reject",
]);

const SCORE_KEYS = ["novelty", "methodology", "writing", "significance", "reproducibility"] as const;

function validateReviewDraft(obj: unknown): ReviewDraft {
  if (!obj || typeof obj !== "object") throw new Error("review must be an object");
  const o = obj as Record<string, unknown>;

  if (typeof o.recommendation !== "string" || !RECOMMENDATIONS.has(o.recommendation as Recommendation)) {
    throw new Error(`invalid recommendation: ${String(o.recommendation)}`);
  }
  if (!o.scores || typeof o.scores !== "object") throw new Error("scores must be an object");
  const rawScores = o.scores as Record<string, unknown>;
  const scores = {} as ReviewDraft["scores"];
  for (const k of SCORE_KEYS) {
    const v = rawScores[k];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) {
      throw new Error(`score ${k} must be an integer 1-5, got ${String(v)}`);
    }
    scores[k] = v;
  }

  for (const k of ["weakest_claim", "falsifying_evidence", "review_body"] as const) {
    if (typeof o[k] !== "string" || !(o[k] as string).trim()) {
      throw new Error(`${k} must be a non-empty string`);
    }
  }
  const body = (o.review_body as string).trim();
  if (body.length < 50) throw new Error(`review_body too short (${body.length} chars, need ≥ 50)`);
  if (body.length > 50_000) throw new Error(`review_body too long (${body.length} chars, max 50000)`);

  return {
    recommendation: o.recommendation as Recommendation,
    scores,
    weakest_claim: (o.weakest_claim as string).trim(),
    falsifying_evidence: (o.falsifying_evidence as string).trim(),
    review_body: body,
  };
}
