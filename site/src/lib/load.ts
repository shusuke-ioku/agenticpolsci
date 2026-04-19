import { readdirSync, existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import { isPubliclyVisible, isFinalized } from "./filter.js";
import type {
  PaperMetadata,
  PaperRecord,
  ReviewRecord,
  DecisionRecord,
  ReproducibilityRecord,
  AgentProfile,
  AgentRecord,
  JournalMeta,
  JournalRecord,
  IssueMeta,
  IssueRecord,
  ReviewFrontmatter,
  DecisionFrontmatter,
} from "./types.js";

const mdToHtml = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeKatex)
  .use(rehypeStringify, { allowDangerousHtml: true });

function renderMd(md: string): string {
  return String(mdToHtml.processSync(md));
}

function readYaml<T>(path: string): T {
  return yaml.load(readFileSync(path, "utf-8"), { schema: yaml.JSON_SCHEMA }) as T;
}

export function loadJournal(root: string, journalId: string): JournalRecord {
  const path = join(root, "journals", `${journalId}.yml`);
  const meta = readYaml<JournalMeta>(path);
  return { meta };
}

export function loadAllPapers(root: string): PaperRecord[] {
  const dir = join(root, "papers");
  if (!existsSync(dir)) return [];
  const out: PaperRecord[] = [];
  for (const entry of readdirSync(dir)) {
    const paperDir = join(dir, entry);
    if (!statSync(paperDir).isDirectory()) continue;
    const metaPath = join(paperDir, "metadata.yml");
    if (!existsSync(metaPath)) continue;
    const meta = readYaml<PaperMetadata>(metaPath);
    if (!isPubliclyVisible(meta)) continue;
    out.push(loadPaperFromDir(paperDir, meta));
  }
  return out.sort(byNewestSubmittedAt);
}

export function loadPaper(root: string, paperId: string): PaperRecord | null {
  const paperDir = join(root, "papers", paperId);
  const metaPath = join(paperDir, "metadata.yml");
  if (!existsSync(metaPath)) return null;
  const meta = readYaml<PaperMetadata>(metaPath);
  if (!isPubliclyVisible(meta)) return null;
  return loadPaperFromDir(paperDir, meta);
}

function loadPaperFromDir(paperDir: string, meta: PaperMetadata): PaperRecord {
  // Unfinalized papers (pending, in_review, revise, withdrawn, desk_rejected,
  // decision_pending) expose only title/abstract/author. Skip loading their
  // manuscript, reviews, and decision so the site can't leak them.
  if (!isFinalized(meta)) {
    return {
      meta,
      manuscript_html: "",
      reviews: [],
      decision: null,
      reproducibility: null,
      has_pdf: false,
      word_count_full: null,
      word_count_main: null,
    };
  }
  const mdPath = join(paperDir, "paper.md");
  if (!existsSync(mdPath))
    throw new Error(`paper.md missing for ${meta.paper_id} (${paperDir})`);
  const mdRaw = readFileSync(mdPath, "utf-8");
  const manuscript_html = stripLeadingTitleAndAbstract(renderMd(mdRaw));
  const word_count_full = countWhitespaceTokens(mdRaw);
  const word_count_main = countMainTextTokens(mdRaw);
  const reviews = loadReviews(paperDir);
  const decision = loadDecision(paperDir);
  const reproducibility = loadReproducibility(paperDir);
  const has_pdf = existsSync(join(paperDir, "paper.pdf"));
  return {
    meta,
    manuscript_html,
    reviews,
    decision,
    reproducibility,
    has_pdf,
    word_count_full,
    word_count_main,
  };
}

function countWhitespaceTokens(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// Main-text token count: whitespace tokens over paper.md excluding the
// Abstract and References sections (matched by `## ` heading, case-insensitive).
// Appendices count as main text. The excluded sections include their heading
// line; non-excluded section headings count.
function countMainTextTokens(raw: string): number {
  const EXCLUDE = /^(abstract|references)\b/i;
  let total = 0;
  let excluding = false;
  for (const line of raw.split("\n")) {
    const m = line.match(/^## (.*?)\s*$/);
    if (m) excluding = EXCLUDE.test(m[1]);
    if (excluding) continue;
    total += countWhitespaceTokens(line);
  }
  return total;
}

// The paper page already shows the title in its header and the abstract as a
// styled block above the manuscript body. Authors typically open paper.md
// with `# Title` followed by `## Abstract` + abstract paragraph, so rendering
// the raw HTML duplicates both. Strip that leading prefix when present.
function stripLeadingTitleAndAbstract(html: string): string {
  const m = html.match(
    /^\s*<h1[\s\S]*?<\/h1>\s*(?:<h2[^>]*>\s*Abstract\.?\s*<\/h2>\s*<p[\s\S]*?<\/p>\s*)?/i,
  );
  return m ? html.slice(m[0].length) : html;
}

function loadReviews(paperDir: string): ReviewRecord[] {
  const reviewsDir = join(paperDir, "reviews");
  if (!existsSync(reviewsDir)) return [];
  const out: ReviewRecord[] = [];
  for (const f of readdirSync(reviewsDir)) {
    if (!/^review-\d{3,}\.md$/.test(f)) continue;
    const parsed = matter(readFileSync(join(reviewsDir, f), "utf-8"));
    out.push({
      frontmatter: parsed.data as ReviewFrontmatter,
      body_html: renderMd(parsed.content),
    });
  }
  out.sort((a, b) =>
    a.frontmatter.review_id.localeCompare(b.frontmatter.review_id),
  );
  return out;
}

function loadDecision(paperDir: string): DecisionRecord | null {
  const path = join(paperDir, "decision.md");
  if (!existsSync(path)) return null;
  const parsed = matter(readFileSync(path, "utf-8"));
  return {
    frontmatter: parsed.data as DecisionFrontmatter,
    body_html: renderMd(parsed.content),
  };
}

function loadReproducibility(paperDir: string): ReproducibilityRecord | null {
  const path = join(paperDir, "reproducibility.md");
  if (!existsSync(path)) return null;
  const parsed = matter(readFileSync(path, "utf-8"));
  const fm = parsed.data as { success?: boolean };
  return {
    success: fm.success === true,
    body_html: renderMd(parsed.content),
  };
}

export function loadAllAgents(root: string): AgentRecord[] {
  const dir = join(root, "agents");
  if (!existsSync(dir)) return [];
  const profiles: AgentProfile[] = [];
  for (const f of readdirSync(dir)) {
    if (!/\.ya?ml$/.test(f)) continue;
    profiles.push(readYaml<AgentProfile>(join(dir, f)));
  }
  const papers = loadAllPapers(root); // already filtered to visible
  return profiles.map((profile) => {
    const authored = papers.filter(
      (p) =>
        p.meta.author_agent_ids.includes(profile.agent_id) ||
        (p.meta.coauthor_agent_ids ?? []).includes(profile.agent_id),
    );
    const reviewed = papers.flatMap((p) =>
      p.reviews
        .filter((r) => r.frontmatter.reviewer_agent_id === profile.agent_id)
        .map((r) => ({ paper: p, review: r })),
    );
    return {
      profile,
      authored,
      reviewed,
      stats: {
        submissions: authored.length,
        acceptances: authored.filter((p) => p.meta.status === "accepted").length,
        reviews_completed: reviewed.length,
        reviews_timed_out: profile.stats.reviews_timed_out,
      },
    };
  });
}

export function loadAgent(root: string, agentId: string): AgentRecord | null {
  const agents = loadAllAgents(root);
  return agents.find((a) => a.profile.agent_id === agentId) ?? null;
}

export function loadAllIssues(root: string): IssueRecord[] {
  const dir = join(root, "issues");
  if (!existsSync(dir)) return [];
  const out: IssueRecord[] = [];
  for (const f of readdirSync(dir)) {
    if (!/\.ya?ml$/.test(f)) continue;
    out.push({ meta: readYaml<IssueMeta>(join(dir, f)) });
  }
  return out;
}

export function loadIssue(root: string, issueId: string): IssueRecord | null {
  const path = join(root, "issues", `${issueId}.yml`);
  if (!existsSync(path)) return null;
  return { meta: readYaml<IssueMeta>(path) };
}

function byNewestSubmittedAt(a: PaperRecord, b: PaperRecord): number {
  return b.meta.submitted_at.localeCompare(a.meta.submitted_at);
}
