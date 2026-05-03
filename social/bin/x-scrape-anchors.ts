#!/usr/bin/env tsx
/**
 * Scrape recent posts from each bell-list anchor (top 10 from
 * follow-strategy.md), then write social/reply-queue.md grouped by
 * anchor with empty Draft fields. Operator (or a Claude session)
 * fills the drafts in by hand — per STRATEGY.md, auto-replying hits
 * the −74 mute/block weight.
 *
 * Usage:
 *   npm run x:scrape-anchors                    # 5 most recent per anchor
 *   npm run x:scrape-anchors -- --per 3
 *   npm run x:scrape-anchors -- --max-age 12h   # only posts newer than 12h
 *   npm run x:scrape-anchors -- --handles a,b   # override bell list
 */
import { resolve, join } from "node:path";
import { existsSync, writeFileSync } from "node:fs";
import {
  openXSession,
  detectBlockingChallenge,
  jitterSleep,
  statePath,
} from "../src/x-browser/session.js";
import { readBellList } from "../src/x-browser/strategy-parser.js";

const repoRoot = resolve(process.cwd(), "..");

type Args = { per: number; maxAgeMs: number | null; handles: string[] | null };
function parseArgs(argv: string[]): Args {
  let per = 5;
  let maxAgeMs: number | null = null;
  let handles: string[] | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--per") per = Math.max(1, Number(argv[++i] ?? "5"));
    else if (a === "--max-age") maxAgeMs = parseDuration(argv[++i] ?? "");
    else if (a === "--handles") {
      handles = (argv[++i] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return { per, maxAgeMs, handles };
}

function parseDuration(s: string): number | null {
  const m = /^(\d+)\s*(h|m|d)$/.exec(s.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n * (m[2] === "d" ? 86400000 : m[2] === "h" ? 3600000 : 60000);
}

type ScrapedPost = {
  handle: string;
  url: string;
  tweetId: string;
  timestamp: string;
  text: string;
};

async function scrapeProfile(
  page: import("playwright").Page,
  handle: string,
  per: number,
  maxAgeMs: number | null,
): Promise<ScrapedPost[]> {
  await page.goto(`https://x.com/${handle}`, { waitUntil: "domcontentloaded" });

  // X is an SPA — between profiles the URL changes before React swaps the
  // new profile's content in. Wait until the header UserName matches this
  // handle (case-insensitive) so we don't count stale articles.
  await page
    .waitForFunction(
      (h: string) => {
        const el = document.querySelector('[data-testid="UserName"]');
        return el ? new RegExp(`@${h}\\b`, "i").test(el.textContent || "") : false;
      },
      handle,
      { timeout: 20000 },
    )
    .catch(() => {});
  await jitterSleep(2500, 4000);

  const challenge = await detectBlockingChallenge(page);
  if (challenge.blocked) {
    throw new Error(`blocked on @${handle}: ${challenge.reason}`);
  }

  // Timeline is XHR-rendered. Some profiles take 10–20s on cold cache.
  await page
    .waitForSelector('article[data-testid="tweet"]', { timeout: 30000 })
    .catch(() => {});
  if ((await page.locator('article[data-testid="tweet"]').count()) === 0) {
    await jitterSleep(4000, 6000);
  }

  // Light scroll to surface a few more posts.
  for (let i = 0; i < 2; i++) {
    await page.mouse.wheel(0, 2000);
    await jitterSleep(700, 1400);
  }

  const cutoff = maxAgeMs ? Date.now() - maxAgeMs : 0;
  const lcHandle = handle.toLowerCase();

  const raw = await page.$$eval(
    'article[data-testid="tweet"]',
    (articles) =>
      articles.map((art) => {
        const timeEl = art.querySelector("time");
        const ts = timeEl?.getAttribute("datetime") ?? null;
        const linkEl = timeEl?.closest("a") as HTMLAnchorElement | null;
        const href = linkEl?.getAttribute("href") ?? null;
        const textEl = art.querySelector('[data-testid="tweetText"]');
        const text = textEl ? (textEl as HTMLElement).innerText : "";
        const socialContext = art.querySelector('[data-testid="socialContext"]');
        const isRetweet = !!socialContext &&
          /reposted|retweeted/i.test((socialContext as HTMLElement).innerText);
        // Reply marker: the "Replying to" element appears above the text.
        const isReply = Array.from(art.querySelectorAll("div")).some((d) =>
          /^Replying to /.test((d as HTMLElement).innerText ?? ""),
        );
        return { ts, href, text, isRetweet, isReply };
      }),
  );

  const posts: ScrapedPost[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!r.ts || !r.href) continue;
    if (r.isRetweet || r.isReply) continue;
    const m = /^\/(\w+)\/status\/(\d+)/.exec(r.href);
    if (!m) continue;
    const author = m[1]!.toLowerCase();
    if (author !== lcHandle) continue;
    const tweetId = m[2]!;
    if (seen.has(tweetId)) continue;
    if (cutoff && new Date(r.ts).getTime() < cutoff) continue;
    seen.add(tweetId);
    posts.push({
      handle,
      tweetId,
      timestamp: r.ts,
      url: `https://x.com/${handle}/status/${tweetId}`,
      text: r.text.trim(),
    });
    if (posts.length >= per) break;
  }
  return posts;
}

function renderQueue(byHandle: Record<string, ScrapedPost[]>): string {
  const now = new Date().toISOString();
  const lines: string[] = [];
  lines.push(`# Reply queue — drafts only`);
  lines.push("");
  lines.push(`Generated: ${now}`);
  lines.push("");
  lines.push(
    `Per \`STRATEGY.md\` § F.4 / \`follow-strategy.md\` § "actual growth lever":`,
  );
  lines.push(
    `**never** auto-post these. Substantive = adds methodological insight,`,
  );
  lines.push(
    `surfaces a specific finding, asks a real question. Bot-pattern paper`,
  );
  lines.push(`plugs hit −74 weight.`);
  lines.push("");
  lines.push(
    `Workflow: read each post, draft the reply under "Draft:", then post`,
  );
  lines.push(
    `manually. Delete this file once cleared — it is regenerated each scrape.`,
  );
  lines.push("");

  const handles = Object.keys(byHandle);
  if (handles.length === 0) {
    lines.push("_No posts scraped._");
    return lines.join("\n") + "\n";
  }

  for (const h of handles) {
    const posts = byHandle[h]!;
    lines.push(`## @${h}`);
    lines.push("");
    if (posts.length === 0) {
      lines.push(`_No recent original posts (within window)._`);
      lines.push("");
      continue;
    }
    for (const p of posts) {
      lines.push(`### ${p.timestamp} — [${p.tweetId}](${p.url})`);
      lines.push("");
      lines.push("> " + p.text.replace(/\n/g, "\n> "));
      lines.push("");
      lines.push("**Draft:** _(write reply here, or leave blank to skip)_");
      lines.push("");
    }
  }
  return lines.join("\n") + "\n";
}

async function main() {
  const { per, maxAgeMs, handles: override } = parseArgs(process.argv.slice(2));
  const handles = override && override.length > 0 ? override : readBellList(repoRoot);

  if (!existsSync(statePath(repoRoot))) {
    console.error(
      `No saved session at ${statePath(repoRoot)}. Run \`npm run x:login\` first.`,
    );
    process.exit(1);
  }

  console.log(
    `Scraping up to ${per} recent posts/anchor for ${handles.length} handles${
      maxAgeMs ? ` (max age ${maxAgeMs / 3600000}h)` : ""
    }…`,
  );

  const session = await openXSession(repoRoot, { headless: true });
  const byHandle: Record<string, ScrapedPost[]> = {};

  try {
    for (let i = 0; i < handles.length; i++) {
      const h = handles[i]!;
      // Fresh page per handle: X SPA-routes between profiles in a way that
      // sometimes leaves the new profile's React tree empty. Throwing the
      // page away guarantees a clean DOM.
      const page = await session.context.newPage();
      try {
        const posts = await scrapeProfile(page, h, per, maxAgeMs);
        byHandle[h] = posts;
        console.log(`  @${h}: ${posts.length} post(s)`);
      } catch (err) {
        console.error(`  @${h}: ${(err as Error).message}`);
        byHandle[h] = [];
        if (/captcha|interstitial|login/.test((err as Error).message)) {
          console.error("  Stopping early — resolve session and rerun.");
          await page.close().catch(() => {});
          break;
        }
      } finally {
        await page.close().catch(() => {});
      }
      if (i < handles.length - 1) await jitterSleep(4000, 9000);
    }
  } finally {
    await session.close();
  }

  const queuePath = join(repoRoot, "social/reply-queue.md");
  writeFileSync(queuePath, renderQueue(byHandle), "utf-8");
  console.log(`\nWrote ${queuePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
